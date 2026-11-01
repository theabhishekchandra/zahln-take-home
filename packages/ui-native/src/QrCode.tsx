import { qr } from '@zahln/ui-tokens';
import { create } from 'qrcode';
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export interface QrCodeProps {
  readonly value: string;
  readonly size: number;
  readonly accessibilityLabel: string;
}

/** Modules of white space around the code, as the QR standard asks. */
const QUIET_ZONE = 2;

/** A QR code drawn as one SVG path: black on white in both schemes, so any scanner reads it. */
export function QrCode({ value, size, accessibilityLabel }: QrCodeProps) {
  const { path, cells } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: 'M' });
    let d = '';
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.get(row, col)) d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
    return { path: d, cells: modules.size + QUIET_ZONE * 2 };
  }, [value]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${cells} ${cells}`} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Rect width={cells} height={cells} fill={qr.ground} />
      <Path d={path} fill={qr.ink} />
    </Svg>
  );
}
