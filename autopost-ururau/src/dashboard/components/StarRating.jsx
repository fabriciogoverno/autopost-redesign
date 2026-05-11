'use client';

import { Star } from 'lucide-react';

export function StarRating({ value = 5, max = 5, size = 32, fill = '#FFC107', empty = '#E5E7EB' }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={size} fill={i < value ? fill : empty} color={i < value ? fill : empty} />
      ))}
    </div>
  );
}

// Renderiza como SVG string para usar como dataURL no Konva
export function starRatingSVG(value, max = 5, size = 80, fill = '#FFC107', empty = '#E5E7EB') {
  const w = size * max + (max - 1) * 8;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size}" viewBox="0 0 ${w} ${size}">`;
  for (let i = 0; i < max; i++) {
    const x = i * (size + 8);
    const color = i < value ? fill : empty;
    svg += `<polygon points="${x + size/2},2 ${x + size*0.62},${size*0.38} ${x + size},${size*0.38} ${x + size*0.69},${size*0.62} ${x + size*0.81},${size-2} ${x + size/2},${size*0.78} ${x + size*0.19},${size-2} ${x + size*0.31},${size*0.62} ${x},${size*0.38} ${x + size*0.38},${size*0.38}" fill="${color}"/>`;
  }
  svg += '</svg>';
  return 'data:image/svg+xml;base64,' + btoa(svg);
}
