// parser_custom.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ExcelJS = require('exceljs');

// Настройки для Render.com
const CHANNEL_NAME = 'Нарочно не придумаешь';
const CHANNEL_URL = 'https://dzen.ru/id/5ae586563dceb76be76eca19?tab=articles';
const MAX_ARTICLES = 10;

// Безопасное имя для папки/файла
const safeName = CHANNEL_NAME.replace(/[<>:"/\\|?*]/g, '_');

// Для Render.com используем /tmp директорию вместо Desktop
const OUTPUT_DIR = path.join('/tmp', 'Статьи Дзен', safeName);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Функция для создания браузера с настройками для Render
async function createBrowser() {
  return await puppeteer.launch({
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
}

async function parseArticles() {
  try {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('📂 Папка для вывода:', OUTPUT_DIR);

    const browser = await createBrowser();
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log(`\n--- Открываем канал ${CHANNEL_URL} ---`);
    await page.goto(CHANNEL_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(5000);

    // Собрать ссылки, прокликивая «Загрузить ещё»
    const linksSet = new Set();
    for (let i = 0; i < 5 && linksSet.size < MAX_ARTICLES; i++) {
      const hrefs = await page.$$eval(
        'a[data-testid="card-article-title-link"]',
        els => els.map(a => a.href)
      );
      hrefs.forEach(h => linksSet.add(h));
      console.log(`🔗 Найдено ссылок: ${linksSet.size}`);
      
      if (linksSet.size >= MAX_ARTICLES) break;
      
      const more = await page.$('button[data-testid="cards-loadmore-button"]');
      if (!more) break;
      
      await more.click();
      await sleep(3000);
    }
    
    const urls = Array.from(linksSet).slice(0, MAX_ARTICLES);
    console.log(`🔗 Всего ссылок для парсинга: ${urls.length}`);

    const results = [];
    for (const [index, url] of urls.entries()) {
      console.log(`\n⏬ [${index + 1}/${urls.length}] Загружаем: ${url}`);
      const p = await browser.newPage();
      await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      try {
        await p.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await sleep(2000);

        const title = await p.evaluate(() => {
          return document.querySelector('h1')?.innerText.trim() ||
            document.querySelector('meta[property="og:title"]')?.content.trim() ||
            'Без названия';
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
          results.push({ title, text, url });
          console.log('✅ Добавлено:', title.substring(0, 50) + '...');
        }
      } catch (err) {
        console.log('❌ Ошибка:', err.message);
      }
      await p.close();
    }

    await browser.close();

    // Запись в Excel
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
      
      return {
        success: true,
        filePath: outFile,
        articlesCount: results.length,
        message: `Успешно сохранено ${results.length} статей`
      };
    } else {
      console.log('❌ Не удалось собрать статьи');
      return {
        success: false,
        message: 'Не удалось собрать статьи'
      };
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    return {
      success: false,
      message: `Критическая ошибка: ${error.message}`
    };
  }
}

// Экспорт функции для использования в веб-сервере
module.exports = { parseArticles };

// Автономный запуск если файл запущен напрямую
if (require.main === module) {
  console.log('🚀 Запуск парсера в автономном режиме...');
  parseArticles()
    .then(result => {
      console.log('✅ Парсинг завершен:', result.message);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Ошибка при парсинге:', error);
      process.exit(1);
    });
}