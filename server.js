// server.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Упрощенная функция реального парсинга
async function simpleRealParse() {
  console.log('🔍 Упрощенный реальный парсинг...');
  
  try {
    // Пробуем мобильную версию или упрощенные запросы
    const response = await axios.get('https://dzen.ru/id/5ae586563dceb76be76eca19', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // Упрощенный парсинг - ищем любые заголовки и текст
    $('h1, h2, h3, h4, [class*="title"], [class*="header"]').each((i, element) => {
      if (results.length >= 5) return false;
      
      const $el = $(element);
      const title = $el.text().trim();
      const $parent = $el.closest('article, div, section');
      const text = $parent.find('p, span, div').first().text().trim();
      
      if (title && title.length > 10 && text && text.length > 20) {
        results.push({
          title: title.substring(0, 100),
          text: text.substring(0, 300),
          url: 'https://dzen.ru/id/5ae586563dceb76be76eca19',
          source: 'Упрощенный парсинг'
        });
      }
    });
    
    if (results.length > 0) {
      console.log(`✅ Реальный парсинг успешен: ${results.length} статей`);
      return results;
    }
    
    // Если не нашли, пробуем альтернативный метод
    return await alternativeParse();
    
  } catch (error) {
    console.log('❌ Ошибка упрощенного парсинга:', error.message);
    return await alternativeParse();
  }
}

// Альтернативный метод парсинга
async function alternativeParse() {
  try {
    console.log('🔍 Пробуем альтернативный метод...');
    
    // Пробуем другие подходы к парсингу
    const results = [];
    
    // Метод 1: Поиск по структурированным данным
    const response = await axios.get('https://dzen.ru/id/5ae586563dceb76be76eca19', {
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Ищем JSON-LD структурированные данные
    $('script[type="application/ld+json"]').each((i, element) => {
      try {
        const jsonData = JSON.parse($(element).html());
        if (jsonData.headline && jsonData.description) {
          results.push({
            title: jsonData.headline,
            text: jsonData.description,
            url: jsonData.url || 'https://dzen.ru/id/5ae586563dceb76be76eca19',
            source: 'JSON-LD данные'
          });
        }
      } catch (e) {
        // Невалидный JSON, пропускаем
      }
    });
    
    if (results.length > 0) return results;
    
    // Метод 2: Простой поиск контента
    $('article, .content, .post, .item').each((i, element) => {
      if (results.length >= 3) return false;
      
      const $el = $(element);
      const title = $el.find('h1, h2, h3, .title, .header').first().text().trim();
      const text = $el.find('p, .text, .content, .description').first().text().trim();
      
      if (title && text && title.length > 5) {
        results.push({
          title: title.substring(0, 120),
          text: text.substring(0, 400),
          url: 'https://dzen.ru/id/5ae586563dceb76be76eca19',
          source: 'Прямой парсинг'
        });
      }
    });
    
    return results.length > 0 ? results : null;
    
  } catch (error) {
    console.log('❌ Альтернативный метод не сработал:', error.message);
    return null;
  }
}

// Основная функция парсинга
async function parseArticles() {
  console.log('🔍 Запуск РЕАЛЬНОГО парсинга Дзен...');
  
  let results = await simpleRealParse();
  
  // Если реальный парсинг не сработал, используем улучшенные тестовые данные
  if (!results || results.length === 0) {
    console.log('⚠️ Используем улучшенные тестовые данные');
    results = [
      {
        title: 'Нарочно не придумаешь - Свежий юмор',
        text: 'Новые смешные истории и забавные ситуации из жизни. Подписывайтесь на канал чтобы не пропустить лучшее!',
        url: 'https://dzen.ru/id/5ae586563dceb76be76eca19',
        source: 'Тестовые данные (реальный парсинг в разработке)'
      },
      {
        title: 'Лучшие моменты недели',
        text: 'Подборка самых популярных постов и реакций подписчиков за последние дни.',
        url: 'https://dzen.ru/id/5ae586563dceb76be76eca19', 
        source: 'Тестовые данные'
      },
      {
        title: 'Юмор и сатира от Нарочно не придумаешь',
        text: 'Остроумные наблюдения за повседневной жизнью. Юмор, который поднимает настроение.',
        url: 'https://dzen.ru/id/5ae586563dceb76be76eca19',
        source: 'Тестовые данные'
      }
    ];
  }
  
  // Сохраняем в Excel
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Статьи Дзен');
  sheet.columns = [
    { header: 'Заголовок', key: 'title', width: 40 },
    { header: 'Текст', key: 'text', width: 60 },
    { header: 'Ссылка', key: 'url', width: 30 },
    { header: 'Источник', key: 'source', width: 25 }
  ];
  
  results.forEach(row => sheet.addRow(row));
  
  const outputDir = path.join('/tmp', 'zen_articles');
  fs.mkdirSync(outputDir, { recursive: true });
  const excelPath = path.join(outputDir, 'articles.xlsx');
  
  await wb.xlsx.writeFile(excelPath);
  
  console.log(`✅ Итоговый результат: ${results.length} статей`);
  return { 
    success: true, 
    count: results.length, 
    filePath: excelPath,
    source: results[0]?.source || 'Неизвестно',
    isRealData: results[0]?.source !== 'Тестовые данные',
    message: results[0]?.source.includes('Тестовые') ? 
      'Используются тестовые данные (реальный парсинг блокируется)' : 
      'Реальный парсинг успешен!'
  };
}

// Маршруты
app.get('/', async (req, res) => {
  const parseResult = await parseArticles();
  
  const statusClass = parseResult.isRealData ? 'success' : 'warning';
  const statusTitle = parseResult.isRealData ? '✅ РЕАЛЬНЫЙ ПАРСИНГ' : '⚠️ ТЕСТОВЫЙ РЕЖИМ';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Парсер Дзен</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        .success { color: #28a745; background: #f8fff9; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; }
        .warning { color: #856404; background: #fffef0; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; }
        .info { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
        .stat { background: white; padding: 10px; border-radius: 5px; text-align: center; }
      </style>
    </head>
    <body>
      <h1>🎯 Парсер статей Дзен "Нарочно не придумаешь"</h1>
      
      <div class="${statusClass}">
        <h2>${statusTitle}</h2>
        <div class="stats">
          <div class="stat">
            <strong>${parseResult.count}</strong><br>статей собрано
          </div>
          <div class="stat">
            <strong>${parseResult.source}</strong><br>источник данных
          </div>
        </div>
        <p>${parseResult.message}</p>
      </div>
      
      <div class="info">
        <h3>🔧 Технические детали:</h3>
        <p>Парсер пробует следующие методы:</p>
        <ul>
          <li>Упрощенные HTTP запросы</li>
          <li>Парсинг JSON-LD структурированных данных</li>
          <li>Поиск по HTML структуре</li>
          <li>Мобильная версия сайта</li>
        </ul>
        <p><strong>Время выполнения:</strong> ${new Date().toLocaleString('ru-RU')}</p>
      </div>
      
      <hr>
      <p>
        <a href="/download" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          📥 Скачать Excel файл
        </a>
        <a href="/" style="margin-left: 10px; padding: 10px 20px; text-decoration: none; border: 1px solid #007bff; border-radius: 5px; display: inline-block;">
          🔄 Обновить данные
        </a>
      </p>
    </body>
    </html>
  `);
});

// Маршрут для скачивания
app.get('/download', (req, res) => {
  const filePath = path.join('/tmp', 'zen_articles', 'articles.xlsx');
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'статьи_дзен_нарочно_не_придумаешь.xlsx', (err) => {
      if (err) {
        console.log('Ошибка скачивания:', err);
        res.send('Файл временно недоступен');
      }
    });
  } else {
    res.send('Файл не найден. Сначала запустите парсер на главной странице.');
  }
});

app.listen(port, () => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
  console.log('🎯 Упрощенный парсер Дзен готов к работе!');
});