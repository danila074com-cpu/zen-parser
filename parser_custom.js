// parser_custom.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ExcelJS = require('exceljs');

const CHANNEL_NAME = 'Нарочно не придумаешь';
const CHANNEL_URL = 'https://dzen.ru/id/5ae586563dceb76be76eca19?tab=articles';
const MAX_ARTICLES = 5; // Уменьшили для теста

// безопасное имя для папки/файла
const safeName = CHANNEL_NAME.replace(/[<>:"/\\|?*]/g, '_');
// ИСПРАВЛЕНИЕ: для Render используем /tmp вместо Desktop
const OUTPUT_DIR = path.join('/tmp', 'Статьи Дзен', safeName);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

;(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('📂 Папка для вывода:', OUTPUT_DIR);

  // ИСПРАВЛЕНИЕ: Добавляем аргументы для Render
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  console.log(`\n--- Открываем канал ${CHANNEL_URL} ---`);
  await page.goto(CHANNEL_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(3000);

  // собрать ссылки, прокликивая «Загрузить ещё»
  const linksSet = new Set();
  for (let i = 0; i < 3 && linksSet.size < MAX_ARTICLES; i++) { // Уменьшили итерации
    const hrefs = await page.$$eval(
      'a[data-testid="card-article-title-link"]',
      els => els.map(a => a.href)
    );
    hrefs.forEach(h => linksSet.add(h));
    if (linksSet.size >= MAX_ARTICLES) break;
    const more = await page.$('button[data-testid="cards-loadmore-button"]');
    if (!more) break;
    await more.click();
    await sleep(2000);
  }
  const urls = Array.from(linksSet).slice(0, MAX_ARTICLES);
  console.log(`🔗 Всего ссылок: ${urls.length}`);

  const results = [];
  for (const url of urls) {
    console.log(`\n⏬ Загружаем: ${url}`);
    const p = await browser.newPage();
    await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    try {
      await p.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1000);

      const title = await p.evaluate(() => {
        return document.querySelector('h1')?.innerText.trim()
          || document.querySelector('meta[property="og:title"]')?.content.trim()
          || 'Без названия';
      });

      let text = await p.evaluate(() => {
        const sels = ['article p', '[data-zone-name="content"] p', 'main p'];
        let parts = [];
        sels.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            const t = el.innerText.trim();
            if (t) parts.push(t);
          });
        });
        if (parts.length) return parts.join('\n\n');
        return document.querySelector('meta[name="description"]')?.content.trim() || '';
      });

      if (!text) {
        console.log('⏭ Пропущено — текст не найден');
      } else {
        results.push({ title, text, url }); // Добавили URL для отслеживания
        console.log('✅ Добавлено:', title.substring(0, 50) + (title.length > 50 ? '...' : ''));
      }
    } catch (err) {
      console.log('❌ Ошибка:', err.message);
    }
    await p.close();
  }

  await browser.close();

  // запись в Excel
  if (results.length > 0) {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Articles');
    sheet.columns = [
      { header: 'Заголовок', key: 'title', width: 50 },
      { header: 'Текст статьи', key: 'text', width: 100 },
      { header: 'Ссылка', key: 'url', width: 50 }
    ];
    results.forEach(r => sheet.addRow(r));

    const outFile = path.join(OUTPUT_DIR, `${safeName}_articles.xlsx`);
    await wb.xlsx.writeFile(outFile);
    console.log(`\n🎉 Excel сохранён: ${outFile}`);
    console.log(`📊 Всего статей сохранено: ${results.length}`);
  } else {
    console.log('❌ Не удалось собрать статьи');
  }

  process.exit(0);
})();