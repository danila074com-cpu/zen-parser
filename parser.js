// parser.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const CHANNEL_NAME = 'Нарочно не придумаешь';
const CHANNEL_URL = 'https://dzen.ru/id/5ae586563dceb76be76eca19?tab=articles';
const MAX_ARTICLES = 5; // Уменьшил для теста

// Безопасное имя для папки/файла
const safeName = CHANNEL_NAME.replace(/[<>:"/\\|?*]/g, '_');
// Для Render используем /tmp вместо Desktop
const OUTPUT_DIR = path.join('/tmp', 'Статьи Дзен', safeName);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

;(async () => {
  console.log('🚀 Запуск твоего оригинального парсера...');
  
  try {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('📂 Папка для вывода:', OUTPUT_DIR);

    // Запуск браузера с настройками для Render
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
    
    // Улучшенный User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log(`\n--- Открываем канал ${CHANNEL_URL} ---`);
    
    // Переходим на страницу
    await page.goto(CHANNEL_URL, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    await sleep(5000);

    // Собрать ссылки, прокликивая «Загрузить ещё»
    const linksSet = new Set();
    
    for (let i = 0; i < 3 && linksSet.size < MAX_ARTICLES; i++) {
      console.log(`🔍 Итерация ${i + 1}: поиск ссылок...`);
      
      const hrefs = await page.$$eval(
        'a[data-testid="card-article-title-link"]',
        els => els.map(a => a.href)
      );
      
      hrefs.forEach(h => linksSet.add(h));
      console.log(`📎 Найдено ссылок: ${linksSet.size}`);
      
      if (linksSet.size >= MAX_ARTICLES) break;
      
      // Пробуем найти кнопку "Загрузить ещё"
      const moreButton = await page.$('button[data-testid="cards-loadmore-button"]');
      if (!moreButton) {
        console.log('❌ Кнопка "Загрузить ещё" не найдена');
        break;
      }
      
      console.log('🔄 Кликаем "Загрузить ещё"...');
      await moreButton.click();
      await sleep(3000);
    }
    
    const urls = Array.from(linksSet).slice(0, MAX_ARTICLES);
    console.log(`🔗 Всего ссылок для парсинга: ${urls.length}`);

    const results = [];
    
    // Парсим каждую статью
    for (const [index, url] of urls.entries()) {
      console.log(`\n⏬ [${index + 1}/${urls.length}] Загружаем: ${url}`);
      
      const articlePage = await browser.newPage();
      await articlePage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      try {
        await articlePage.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Прокручиваем страницу для загрузки всего контента
        await articlePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await sleep(2000);

        // Получаем заголовок
        const title = await articlePage.evaluate(() => {
          return document.querySelector('h1')?.innerText.trim() ||
            document.querySelector('meta[property="og:title"]')?.content.trim() ||
            'Без названия';
        });

        // Получаем текст статьи
        let text = await articlePage.evaluate(() => {
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

        if (!text || text.length < 50) {
          console.log('⏭ Пропущено — текст не найден или слишком короткий');
        } else {
          results.push({ 
            title: title.substring(0, 100),
            text: text.substring(0, 1000), // Ограничиваем длину текста
            url: url 
          });
          console.log('✅ Добавлено:', title.substring(0, 50) + '...');
        }
      } catch (err) {
        console.log('❌ Ошибка при парсинге статьи:', err.message);
      }
      
      await articlePage.close();
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
      
      // Создаем простой веб-сервер для отображения результатов
      const http = require('http');
      const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Парсер Дзен - Результаты</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
              .success { color: #28a745; background: #f8fff9; padding: 20px; border-radius: 10px; }
              .article { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>🎉 Парсер Дзен успешно выполнен!</h1>
            <div class="success">
              <h3>✅ Результаты парсинга</h3>
              <p><strong>Сохранено статей:</strong> ${results.length}</p>
              <p><strong>Файл:</strong> ${outFile}</p>
              <p><strong>Канал:</strong> ${CHANNEL_NAME}</p>
            </div>
            
            <h2>📄 Собранные статьи:</h2>
            ${results.map((article, index) => `
              <div class="article">
                <h3>${index + 1}. ${article.title}</h3>
                <p>${article.text.substring(0, 200)}...</p>
                <a href="${article.url}" target="_blank">Открыть оригинал</a>
              </div>
            `).join('')}
            
            <hr>
            <p><small>Время выполнения: ${new Date().toLocaleString('ru-RU')}</small></p>
          </body>
          </html>
        `);
      });
      
      server.listen(process.env.PORT || 3000, () => {
        console.log(`🌐 Сервер запущен на порту ${process.env.PORT || 3000}`);
        console.log('📊 Результаты доступны по веб-интерфейсу');
      });
      
    } else {
      console.log('❌ Не удалось собрать статьи');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  }
})();