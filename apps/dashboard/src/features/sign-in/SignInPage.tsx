import { FINANCE_LOGIN } from '@zahln/api-client';
import { useTranslation } from '@zahln/i18n';
import { Button } from '@zahln/ui-web';
import { useState, type FormEvent } from 'react';

import { LanguageToggle } from '@/components/LanguageToggle';
import { useAuth, type SignInResult } from '@/lib/auth';

/** W1. Zahln seeds one finance login; the page names it, since this is a test environment. */
export function SignInPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Exclude<SignInResult, 'ok'> | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const outcome = await auth.signIn(username, password);
    setBusy(false);
    if (outcome !== 'ok') setResult(outcome);
  };

  const messages = { failed: t('dashboard.signIn.failed'), unreachable: t('dashboard.signIn.unreachable'), not_finance: t('dashboard.signIn.notFinance') };
  const error = result ? messages[result] : auth.ended ? t('dashboard.sessionEnded') : null;
  return (
    <div className="sign-in">
      <section className="sign-in-hero">
        <div className="sign-in-brand">
          {t('common.appName')} <span className="hero-pill">{t('dashboard.finance')}</span>
        </div>
        <div className="sign-in-pitch">
          <h1>{t('dashboard.signIn.heroTitle')}</h1>
          <p>{t('dashboard.signIn.heroBody')}</p>
        </div>
        <HeroBars />
      </section>
      <section className="sign-in-side">
        <form className="card sign-in-card" onSubmit={(event) => void submit(event)} noValidate>
          <div className="sign-in-top">
            <div>
              <h2>{t('dashboard.signIn.title')}</h2>
              <p className="muted">{t('dashboard.org')}</p>
            </div>
            <LanguageToggle />
          </div>
          <label className="field">
            <span>{t('dashboard.signIn.username')}</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required aria-invalid={result === 'failed'} />
          </label>
          <label className="field">
            <span>{t('dashboard.signIn.password')}</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required aria-invalid={result === 'failed'} />
          </label>
          {error ? (
            <p role="alert" className="field-error">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy || !username || !password}>
            {busy ? t('dashboard.signIn.submitting') : t('dashboard.signIn.submit')}
          </Button>
          <div className="info-box">
            <span>{t('dashboard.signIn.testLogin')}</span>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setUsername(FINANCE_LOGIN.username);
                setPassword(FINANCE_LOGIN.password);
              }}>
              {t('dashboard.signIn.fillTestLogin')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/** A week of takings as decoration: five weekdays, a quiet weekend, today highlighted. */
const HERO_BARS: readonly { readonly height: number; readonly tone: 'day' | 'weekend' | 'today'; readonly opacity?: number }[] = [
  { height: 62, tone: 'day', opacity: 0.5 },
  { height: 78, tone: 'day', opacity: 0.6 },
  { height: 70, tone: 'day', opacity: 0.7 },
  { height: 18, tone: 'weekend' },
  { height: 8, tone: 'weekend' },
  { height: 86, tone: 'day', opacity: 0.85 },
  { height: 100, tone: 'today' },
];

function HeroBars() {
  return (
    <div aria-hidden className="hero-bars">
      {HERO_BARS.map((bar, i) => (
        <span key={i} className={`hero-bar ${bar.tone}`} style={{ height: `${bar.height}%`, opacity: bar.opacity, animationDelay: `${i * 50}ms` }} />
      ))}
    </div>
  );
}
