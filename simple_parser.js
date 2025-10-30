// simple_parser.js
const axios = require('axios');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Простой парсер без Puppeteer
async function simpleParser() {
  console.log('🚀 Запуск простого парсера...');
  
  try {
    // Здесь будет простой парсинг через API или прямые запросы
    const results = [
      {
        title: 'Тестовая статья 1',
        text: 'Это тестовый текст статьи. Парсер работает без Puppeteer.',
        url: 'https://dzen.ru/test1'
      },
      {
        title: 'Тестовая статья 2', 
        text: 'Вторая тестовая статья. Мы можем добавить реальный парсинг позже.',
        url: 'https://dzen.ru/test2'
      }
    ];

    // Сохранение в Excel
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Articles');
    sheet.columns = [
      { header: 'Заголовок', key: 'title', width: 50 },
      { header: 'Текст', key: 'text', width: 100 },
      { header: 'Ссылка', key: 'url', width: 50 }
    ];
    
    results.forEach(r => sheet.addRow(r));
    
    const outputDir = path.join('/tmp', 'Статьи Дзен');
    fs.mkdirSync(outputDir, { recursive: true });
    const outFile = path.join(outputDir, 'test_articles.xlsx');
    
    await wb.xlsx.writeFile(outFile);
    console.log(`✅ Excel сохранён: ${outFile}`);
    console.log(`📊 Сохранено статей: ${results.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

simpleParser();