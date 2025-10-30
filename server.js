// server.js
const express = require('express');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Функция парсинга статей (упрощенная)
async function parseArticles() {
  console.log('🔍 Запуск парсера...');
  
  try {
    // Пока используем тестовые данные
    const results = [
      {
        title: 'Нарочно не придумаешь - Юмор дня',
        text: 'Свежие юмористические истории из жизни. Смешные ситуации и забавные случаи.',
        url: 'https://dzen.ru/id/5ae586563dceb76be76eca19',
        date: new Date().toLocaleDateString('ru-RU')
      },
      {
        title: 'Сатира и ирония от Нарочно не придумаешь',
        text: 'Остроумные наблюдения за повседневной жизнью. Юмор, который поднимает настроение.',
        url: 'https://dzen.ru/id/5ae586563dceb76be76eca19', 
        date: new Date().toLocaleDateString('ru-RU')
      },
      {
        title: 'Лучшие моменты канала',
        text: 'Подборка самых популярных постов и реакций подписчиков.',
        url: 'https://dzen.ru/id/5ae586563dceb76be76eca19',
        date: new Date().toLocaleDateString('ru-RU')
      }
    ];

    // Сохраняем в Excel
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Статьи Дзен');
    sheet.columns = [
      { header: 'Заголовок', key: 'title', width: 40 },
      { header: 'Текст', key: 'text', width: 60 },
      { header: 'Ссылка', key: 'url', width: 30 },
      { header: 'Дата', key: 'date', width: 15 }
    ];
    
    results.forEach(row => sheet.addRow(row));
    
    const outputDir = path.join('/tmp', 'zen_articles');
    fs.mkdirSync(outputDir, { recursive: true });
    const excelPath = path.join(outputDir, 'articles.xlsx');
    
    await wb.xlsx.writeFile(excelPath);
    
    console.log(`✅ Успешно создано ${results.length} статей`);
    return { 
      success: true, 
      count: results.length, 
      filePath: excelPath,
      message: 'Парсер работает в тестовом режиме'
    };
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
    return { 
      success: false, 
      error: error.message,
      message: 'Используем тестовые данные'
    };
  }
}

// Маршруты
app.get('/', async (req, res) => {
  const parseResult = await parseArticles();
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Парсер Дзен</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .info { background: #f8f9fa; padding: 15px; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h1>🎉 Парсер статей Дзен</h1>
      
      ${parseResult.success ? 
        `<div class="success">
          <h3>✅ Успешно!</h3>
          <p>Создано статей: <strong>${parseResult.count}</strong></p>
          <p>Файл: ${parseResult.filePath}</p>
        </div>` : 
        `<div class="error">
          <h3>⚠️ Используем тестовые данные</h3>
          <p>${parseResult.message}</p>
        </div>`
      }
      
      <div class="info">
        <h3>📊 Статус системы:</h3>
        <p><strong>Сервер:</strong> 🟢 Работает</p>
        <p><strong>Парсер:</strong> 🟡 Тестовый режим</p>
        <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
      </div>
      
      <hr>
      <h3>🔧 Следующие шаги:</h3>
      <ul>
        <li>Добавить реальный парсинг с Дзен</li>
        <li>Настроить автоматический запуск</li>
        <li>Добавить скачивание Excel файла</li>
      </ul>
      
      <p><a href="/download">📥 Скачать Excel файл (скоро)</a></p>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Zen Parser',
    timestamp: new Date().toISOString(),
    version: '1.0'
  });
});

app.listen(port, () => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
  console.log('📊 Парсер статей Дзен готов к работе!');
});