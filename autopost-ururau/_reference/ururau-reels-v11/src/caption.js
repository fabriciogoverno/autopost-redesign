const axios = require('axios');
const db = require('./db');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

async function generateCaption(title, summary, category) {
  const apiKey = db.prepare('SELECT value FROM settings WHERE key = ?').get('gemini_api_key')?.value;

  if (!apiKey) {
    console.log('Gemini API key not configured, using fallback caption');
    return generateFallbackCaption(title, summary, category);
  }

  const prompt = `Voce e um jornalista do portal Ururau (19 anos de historia em Campos dos Goytacazes/RJ).
Crie uma legenda INSTAGRAM REELS para esta noticia:
Titulo: ${title}
Resumo: ${summary}
Categoria: ${category}

Regras:
- Maximo 150 palavras
- Tom jornalistico mas leve
- Inclua 3-5 hashtags relevantes (em portugues)
- Termine com "Leia mais: ururau.com.br"
- Nao use emojis excessivos
- Seja direto e informativo`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
      },
      { timeout: 15000 }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');

    return text.trim();
  } catch (err) {
    console.error('Gemini error:', err.message);
    return generateFallbackCaption(title, summary, category);
  }
}

function generateFallbackCaption(title, summary, category) {
  const hashtags = {
    'OPINIAO': '#Opiniao #Ururau #CamposDosGoytacazes',
    'POLITICA': '#Politica #Ururau #RJ',
    'ESPORTE': '#Esporte #Ururau #Campos',
    'SEGURANCA': '#Seguranca #Ururau #RJ',
    'ECONOMIA': '#Economia #Ururau #Brasil',
    'GERAL': '#Noticias #Ururau #CamposDosGoytacazes'
  };

  return `${title}

${summary.substring(0, 200)}${summary.length > 200 ? '...' : ''}

${hashtags[category] || hashtags['GERAL']}

Leia mais: ururau.com.br`;
}

module.exports = { generateCaption };
