'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QRCodeImage({ value = 'https://ururau.com.br', size = 200, fg = '#000000', bg = '#FFFFFF' }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: fg, light: bg },
      errorCorrectionLevel: 'M',
    }).then(setSrc).catch(console.error);
  }, [value, size, fg, bg]);

  if (!src) return <div className="bg-gray-100 flex items-center justify-center" style={{ width: size, height: size }}>…</div>;
  return <img src={src} alt={`QR ${value}`} width={size} height={size} className="block" />;
}

// Helper para usar no editor Konva: retorna dataURL
export async function generateQRCodeDataURL(value, { size = 400, fg = '#000', bg = '#fff' } = {}) {
  return QRCode.toDataURL(value || ' ', {
    width: size,
    margin: 1,
    color: { dark: fg, light: bg },
    errorCorrectionLevel: 'M',
  });
}
