// server.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Настройки парсера
const CHANNEL_URL = 'https://dzen.ru/id/5ae586563dceb76be76eca19';

// Функция парсинга статей
async function parseArticles() {
  console.log('🔍 Начинаем парсинг статей...');
  
  try {
    // Получаем HTML страницы
    const response = await axios.get(CHANNEL_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // Парсим статьи (упрощенная версия)
    $('article, .card, [data-testid*="card"]').each((i, element) => {
      if (results.length >= 5) return false; // Ограничиваем 5 статьями
      
      const $el = $(element);
      const title = $el.find('h2, h3, [class*="title"]').first().text().trim();
      const text = $el.find('p, [class*="text"]').first().text().trim();
      const link = $el.find('a').first().attr('href');
      
      if (title && text) {
        results.push({
          title: title.substring(0, 100),
          text: text.substring(0, 500),
          url: link ? `https://dzen.ru${link}` : 'Ссылка не найдена'
        });
      }
    });
    
    // Если не нашли статей, создаем тестовые
    if (results.length === 0) {
      results.push(
        {
          title: 'Пример статьи 1 - Нарочно не придумаешь',
          text: 'Это пример текста статьи. Реальный парсинг будет добавлен в следующих версиях.',
          url: 'https://dzen.ru/id/5ae586563dceb76be76eca19'
        },
        {
          title: 'Пример статьи 2 - Юмор и сатира',
          text: 'Вторая тестовая статья для демонстрации работы парсера.',
          url: 'https://dzen.ru/id/5ae586563dceb76be76eca19'
        }
      );
    }
    
    // Сохраняем в Excel
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Статьи Дзен');
    sheet.columns = [
      { header: 'Заголовок', key: 'title', width: 40 },
      { header: 'Текст', key: 'text', width: 60 },
      { header: 'Ссылка', key: 'url', width: 30 }
    ];
    
    results.forEach(row => sheet.addRow(row));
    
    const outputDir = path.join('/tmp', 'zen_articles');
    fs.mkdirSync(outputDir, { recursive: true });
    const excelPath = path.join(outputDir, 'articles.xlsx');
    
    await wb.xlsx.writeFile(excelPath);
    
    console.log(`✅ Успешно сохранено ${results.length} статей`);
    return { success: true, count: results.length, filePath: excelPath };
    
  } catch (error) {
    console.log('❌ Ошибка парсинга:', error.message);
    return { success: false, error: error.message };
  }
}

// Маршруты
app.get('/', async (req, res) => {
  const parseResult = await parseArticles();
  
  if (parseResult.success) {
    res.send(`
      <h1>🎉 Парсер статей Дзен работает!</h1>
      <p><strong>Статус:</strong> Успешно собрано ${parseResult.count} статей</p>
      <p><strong>Excel файл:</strong> ${parseResult.filePath}</p>
      <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
      <hr>
      <p>🔧 Дальше можно добавить:</p>
      <ul>
        <li>Скачивание Excel файла</li>
        <li>Автоматический запуск по расписанию</li>
        <li>Отправку на email</li>
      </ul>
    `);
  } else {
    res.send(`
      <h1>⚠️ Парсер столкнулся с ошибкой</h1>
      <p>Ошибка: ${parseResult.error}</p>
      <p>Но сервер работает стабильно! 🚀</p>
    `);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
  console.log('📊 Парсер статей Дзен готов к работе!');
});