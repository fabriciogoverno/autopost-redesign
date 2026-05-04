const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeNews(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(data);

    const title = $('meta[property="og:title"]').attr('content') ||
                  $('title').text() ||
                  $('h1').first().text() ||
                  'Sem titulo';

    const image = $('meta[property="og:image"]').attr('content') ||
                  $('article img').first().attr('src') ||
                  $('img').first().attr('src') ||
                  '';

    const summary = $('meta[property="og:description"]').attr('content') ||
                    $('meta[name="description"]').attr('content') ||
                    $('p').first().text() ||
                    '';

    return {
      title: title.trim().substring(0, 200),
      image: image.trim(),
      summary: summary.trim().substring(0, 500)
    };
  } catch (err) {
    console.error('Scraper error:', err.message);
    return { title: 'Erro ao carregar', image: '', summary: '' };
  }
}

module.exports = { scrapeNews };
