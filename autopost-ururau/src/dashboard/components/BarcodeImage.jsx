'use client';

import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

export function BarcodeImage({ value = '7891234567890', format = 'EAN13', width = 2, height = 80, displayValue = true, fg = '#000', bg = '#fff' }) {
  const ref = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, { format, width, height, displayValue, lineColor: fg, background: bg });
      setError(false);
    } catch (e) {
      console.error('Barcode error:', e);
      setError(true);
    }
  }, [value, format, width, height, displayValue, fg, bg]);

  if (error) return <div className="text-xs text-destructive">Código inválido para {format}</div>;
  return <svg ref={ref} />;
}

export async function generateBarcodeDataURL(value, opts = {}) {
  if (typeof window === 'undefined') return '';
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value || '7891234567890', { format: opts.format || 'EAN13', width: opts.width || 2, height: opts.height || 80, displayValue: opts.displayValue !== false, lineColor: opts.fg || '#000', background: opts.bg || '#fff' });
  return canvas.toDataURL('image/png');
}
