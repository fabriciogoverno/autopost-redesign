const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const COOKIES_PATH = path.join(__dirname, '..', 'database', 'instagram_cookies.json');

async function publishToInstagram(mediaPath, caption) {
  const username = process.env.INSTAGRAM_USERNAME || '';
  const password = process.env.INSTAGRAM_PASSWORD || '';

  if (!username || !password) {
    throw new Error('Instagram credentials not configured in .env or settings');
  }

  if (!fs.existsSync(mediaPath)) {
    throw new Error('Media file not found: ' + mediaPath);
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-notifications']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    if (fs.existsSync(COOKIES_PATH)) {
      try {
        const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'));
        if (Array.isArray(cookies) && cookies.length > 0) {
          await page.setCookie(...cookies);
        }
      } catch (e) {
        console.log('Cookie load error:', e.message);
      }
    }

    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);

    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('svg[aria-label="Home"]') !== null ||
             document.querySelector('a[href="/"] svg') !== null ||
             document.querySelector('[role="button"] svg[aria-label="Home"]') !== null;
    });

    if (!isLoggedIn) {
      console.log('Instagram: not logged in, performing login...');

      await page.waitForSelector('input[name="username"]', { visible: true, timeout: 15000 });
      await page.type('input[name="username"]', username, { delay: 50 });
      await page.type('input[name="password"]', password, { delay: 50 });
      await page.click('button[type="submit"]');

      await page.waitForTimeout(5000);

      try {
        const notNowSave = await page.$x('//button[contains(text(), "Save") or contains(text(), "Salvar")]');
        if (notNowSave.length > 0) await notNowSave[0].click();
      } catch (e) {}

      try {
        const notNowNotif = await page.$x('//button[contains(text(), "Not Now") or contains(text(), "Agora nao")]');
        if (notNowNotif.length > 0) await notNowNotif[0].click();
      } catch (e) {}

      const cookies = await page.cookies();
      fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
    }

    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);

    const createBtn = await page.$('svg[aria-label="New post"]') ||
                      await page.$('[aria-label="New post"]') ||
                      await page.$x('//span[contains(text(), "Create") or contains(text(), "Criar")]');

    if (createBtn) {
      if (Array.isArray(createBtn)) {
        if (createBtn.length > 0) await createBtn[0].click();
      } else {
        await createBtn.click();
      }
    } else {
      await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'networkidle2', timeout: 30000 });
    }

    await page.waitForTimeout(4000);

    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('Could not find file input on Instagram create page');
    }

    await fileInput.uploadFile(mediaPath);
    await page.waitForTimeout(6000);

    const clickNext = async () => {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent?.toLowerCase()?.trim(), btn);
        if (text && (text.includes('next') || text.includes('avançar') || text.includes('próximo'))) {
          await btn.click();
          return true;
        }
      }
      return false;
    };

    await clickNext();
    await page.waitForTimeout(3000);
    await clickNext();
    await page.waitForTimeout(3000);

    const captionArea = await page.$('textarea[aria-label="Write a caption..."]') ||
                        await page.$('[placeholder*="caption" i]') ||
                        await page.$('textarea');

    if (captionArea) {
      await captionArea.click();
      await page.waitForTimeout(500);
      await captionArea.type(caption, { delay: 20 });
    }

    await page.waitForTimeout(1500);

    const shareButtons = await page.$$('button');
    for (const btn of shareButtons) {
      const text = await page.evaluate(el => el.textContent?.toLowerCase()?.trim(), btn);
      if (text && (text.includes('share') || text.includes('compartilhar') || text.includes('publicar'))) {
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(10000);

    const success = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      return bodyText.includes('shared') ||
             bodyText.includes('your post') ||
             bodyText.includes('publicado') ||
             bodyText.includes('compartilhado');
    });

    if (!success) {
      const ssPath = path.join(__dirname, '..', 'output', `error_ss_${Date.now()}.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
      throw new Error('Could not verify post success. Screenshot saved to ' + ssPath);
    }

    return { success: true, url: `https://www.instagram.com/${username}/` };
  } finally {
    await browser.close();
  }
}

module.exports = { publishToInstagram };
