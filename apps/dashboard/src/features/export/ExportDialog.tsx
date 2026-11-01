import { exportFileName, loadExport, paymentsCsv, today, type CsvFormat, type ExportRange } from '@zahln/application';
import { asMensaId } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { Button, Dialog, IconButton } from '@zahln/ui-web';
import { useEffect, useMemo, useState } from 'react';

import { useDependencies } from '@/lib/dependencies';
import { formatFileSize, utf8Bytes } from '@/lib/file-size';
import { useRemote } from '@/lib/use-remote';

import { MAX_EXPORT_DAYS, PERIODS, presetRange, rangeProblem, type DayRange, type Period } from './export-range';

/** W6: payments for accounting, in the format their spreadsheet reads. */
export function ExportDialog({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} label={t('dashboard.export.title')}>
      {open ? <ExportForm onClose={onClose} /> : null}
    </Dialog>
  );
}

/**
 * A custom range is loaded once the dates stop changing, so stepping through
 * days in the picker doesn't start an export for each one.
 */
function useSettled<T>(value: T, key: string, ms = 600): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
    // `key` stands for `value`, which may be a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ms]);
  return settled;
}

function ExportForm({ onClose }: { readonly onClose: () => void }) {
  const { t } = useTranslation();
  const { language } = useFormat();
  const { finance, mensas } = useDependencies();
  const current = today(finance);
  const [period, setPeriod] = useState<Period>('yesterday');
  const [custom, setCustom] = useState<DayRange>(() => presetRange('last7', current));
  const [mensaId, setMensaId] = useState('');
  const [format, setFormat] = useState<CsvFormat>('excel_de');

  const problem = period === 'custom' ? rangeProblem(custom, current) : null;
  const settledCustom = useSettled(custom, `${custom.first}/${custom.last}`);
  const days = period === 'custom' ? settledCustom : presetRange(period, current);
  // While a custom range is being typed or is invalid, nothing is asked for.
  const ready = period !== 'custom' || (problem === null && settledCustom.first === custom.first && settledCustom.last === custom.last);
  const range: ExportRange = { ...days, mensaId: mensaId ? asMensaId(mensaId) : undefined };
  const mensaList = useRemote(() => mensas.list(), 'mensas');
  const payments = useRemote(() => loadExport(finance, range), ready ? `export:${JSON.stringify(range)}` : 'export:waiting', ready);
  const csv = useMemo(() => (payments.data && !payments.failed ? paymentsCsv(payments.data, format) : null), [payments.data, payments.failed, format]);
  const preview = csv?.replace(/^\uFEFF/, '').split('\r\n').slice(0, 4).join('\n');

  const download = () => {
    if (!csv) return;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: exportFileName(range.first, range.last) });
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="card-head">
        <h2>{t('dashboard.export.title')}</h2>
        <IconButton icon="close" label={t('dashboard.export.close')} onClick={onClose} />
      </div>
      <fieldset className="field">
        <legend>{t('dashboard.export.period')}</legend>
        <div className="segmented wrap fill">
          {PERIODS.map((p) => (
            <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>
              {t(`dashboard.export.${p}`)}
            </button>
          ))}
        </div>
      </fieldset>
      {period === 'custom' ? (
        <div className="date-range">
          <label className="field">
            <span>{t('dashboard.export.first')}</span>
            <input
              type="date"
              value={custom.first}
              max={current}
              aria-invalid={problem === 'order' || problem === 'tooLong'}
              aria-describedby={problem ? 'range-problem' : undefined}
              onChange={(e) => setCustom((c) => ({ ...c, first: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>{t('dashboard.export.last')}</span>
            <input
              type="date"
              value={custom.last}
              max={current}
              aria-invalid={problem !== null && problem !== 'tooLong'}
              aria-describedby={problem ? 'range-problem' : undefined}
              onChange={(e) => setCustom((c) => ({ ...c, last: e.target.value }))}
            />
          </label>
          {problem ? (
            <p id="range-problem" role="alert" className="field-error small">
              {t(`dashboard.export.rangeProblem.${problem}`, { days: MAX_EXPORT_DAYS })}
            </p>
          ) : null}
        </div>
      ) : null}
      <label className="field">
        <span>{t('dashboard.export.mensa')}</span>
        <select value={mensaId} onChange={(e) => setMensaId(e.target.value)}>
          <option value="">{t('dashboard.export.allMensas')}</option>
          {(mensaList.data ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="field">
        <legend>{t('dashboard.export.format')}</legend>
        <div className="radio-cards">
          {(['excel_de', 'rfc4180'] as const).map((f) => (
            <label key={f} className={format === f ? 'radio-card selected' : 'radio-card'}>
              <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} />
              <strong>{f === 'excel_de' ? t('dashboard.export.excel') : t('dashboard.export.standard')}</strong>
              <span className="muted small">{f === 'excel_de' ? t('dashboard.export.excelHint') : t('dashboard.export.standardHint')}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <section aria-labelledby="preview">
        <h3 id="preview">{t('dashboard.export.preview')}</h3>
        {problem ? null : payments.failed ? (
          <p role="alert" className="notice danger">
            {t('dashboard.export.failed')}
          </p>
        ) : payments.loading || !payments.data ? (
          <p className="muted">{t('dashboard.export.loading')}</p>
        ) : payments.data.length === 0 ? (
          <p className="muted">{t('dashboard.export.empty')}</p>
        ) : (
          <pre className="csv-preview">{preview}</pre>
        )}
      </section>
      <p className="muted small">{t('dashboard.export.unknownNote')}</p>
      <div className="dialog-footer">
        <span className="export-count">
          {csv && payments.data && !problem ? `${t('dashboard.export.rows', { count: payments.data.length })} · ≈ ${formatFileSize(utf8Bytes(csv), language)}` : null}
        </span>
        <Button variant="secondary" onClick={onClose}>
          {t('dashboard.export.cancel')}
        </Button>
        {payments.failed && !problem ? (
          <Button variant="secondary" icon="retry" onClick={payments.retry} disabled={payments.loading}>
            {t('dashboard.offline.retry')}
          </Button>
        ) : null}
        <Button icon="download" onClick={download} disabled={!csv || problem !== null || payments.loading || payments.data?.length === 0}>
          {t('dashboard.export.download')}
        </Button>
      </div>
    </>
  );
}
