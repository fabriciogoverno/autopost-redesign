/**
 * Converte uma URL de imagem externa para passar pelo proxy server-side.
 * Imagens locais (data:, blob:, /...) não passam pelo proxy.
 *
 * Resolve CORS quando o site da matéria não libera Access-Control-Allow-Origin
 * para canvas/Konva carregar.
 */
export function proxiedUrl(src) {
  if (!src) return src;
  if (src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (!src.startsWith('http')) return src;
  return `/api/proxy-image?url=${encodeURIComponent(src)}`;
}

/**
 * Carrega a identidade visual salva no localStorage.
 * Retorna { primaryColor, logos: { light, dark, colored } }.
 */
export function loadVisualIdentity() {
  if (typeof window === 'undefined') return { primaryColor: '#2563EB', logos: {} };
  try {
    const stored = JSON.parse(localStorage.getItem('ururau-visual-identity-v1') || '{}');
    return {
      primaryColor: stored.primaryColor || '#2563EB',
      logos: stored.logos || {},
    };
  } catch {
    return { primaryColor: '#2563EB', logos: {} };
  }
}
