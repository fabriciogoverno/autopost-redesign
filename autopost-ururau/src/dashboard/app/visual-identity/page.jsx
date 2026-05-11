'use client';

import { useState, useEffect } from 'react';
import { Upload, Pipette } from 'lucide-react';

const LOGO_CLARO_KEY  = 'ururau-logo-claro';
const LOGO_ESCURO_KEY = 'ururau-logo-escuro';
const LOGO_COLORIDO_KEY = 'ururau-logo-colorido';
const COR_PRIMARIA_KEY = 'ururau-cor-primaria';

export default function VisualIdentityPage() {
  const [logos, setLogos] = useState({ claro: null, escuro: null, colorido: null });
  const [cor, setCor] = useState('#000000');

  useEffect(() => {
    setLogos({
      claro: localStorage.getItem(LOGO_CLARO_KEY),
      escuro: localStorage.getItem(LOGO_ESCURO_KEY),
      colorido: localStorage.getItem(LOGO_COLORIDO_KEY),
    });
    setCor(localStorage.getItem(COR_PRIMARIA_KEY) || '#000000');
  }, []);

  function uploadLogo(key, file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      localStorage.setItem(key, e.target.result);
      const k = key === LOGO_CLARO_KEY ? 'claro' : key === LOGO_ESCURO_KEY ? 'escuro' : 'colorido';
      setLogos((prev) => ({ ...prev, [k]: e.target.result }));
    };
    reader.readAsDataURL(file);
  }

  function updateCor(value) {
    setCor(value);
    localStorage.setItem(COR_PRIMARIA_KEY, value);
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Identidade Visual</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure os logos e cores que serão utilizadas nos seus templates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LogoCard label="Logo Fundo Claro" sub="Para fundos brancos ou claros" bg="bg-white border-2 border-dashed border-gray-200" value={logos.claro} onUpload={(f) => uploadLogo(LOGO_CLARO_KEY, f)} />
        <LogoCard label="Logo Fundo Escuro" sub="Para fundos pretos ou escuros" bg="bg-gradient-to-br from-gray-700 to-gray-900" value={logos.escuro} onUpload={(f) => uploadLogo(LOGO_ESCURO_KEY, f)} dark />
        <LogoCard label="Logo Fundo Colorido" sub="Para usar com sua cor primária" bg="bg-blue-600" value={logos.colorido} onUpload={(f) => uploadLogo(LOGO_COLORIDO_KEY, f)} dark />
      </div>

      <hr className="border-border" />

      <div>
        <h2 className="text-sm font-bold text-foreground mb-2">Cor Primária</h2>
        <div className="flex items-center gap-3">
          <input type="color" value={cor} onChange={(e) => updateCor(e.target.value)} className="w-12 h-10 rounded cursor-pointer" />
          <Pipette size={14} className="text-muted-foreground" />
          <input value={cor} onChange={(e) => updateCor(e.target.value)} className="w-32 bg-card border border-border rounded-md px-3 py-1.5 text-sm font-mono" />
        </div>
      </div>
    </div>
  );
}

function LogoCard({ label, sub, bg, value, dark, onUpload }) {
  return (
    <div>
      <label className={`cursor-pointer block ${bg} rounded-xl p-8 flex items-center justify-center text-center hover:opacity-95 transition-opacity h-44`}>
        {value ? (
          <img src={value} alt={label} className="max-h-28 object-contain" />
        ) : (
          <div className={`flex flex-col items-center ${dark ? 'text-white/80' : 'text-muted-foreground'}`}>
            <Upload size={20} className="mb-1" />
            <span className="text-sm">Clique para enviar</span>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && onUpload(e.target.files[0])} />
      </label>
      <p className="font-medium text-sm text-foreground mt-3">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
