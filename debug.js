const fs = require('fs');
const path = require('path');

console.log('=== ДЕБАГ PARSER ===');
console.log('Текущая директория:', __dirname);
console.log('Платформа:', process.platform);

// Проверим существование parser.js
console.log('parser.js существует:', fs.existsSync('./parser.js'));

// Проверим, куда пытается писать парсер
const testPath = './test-output';
if (!fs.existsSync(testPath)) {
    fs.mkdirSync(testPath, { recursive: true });
}
console.log('Тестовая папка создана:', testPath);

// Запишем тестовый файл
fs.writeFileSync(path.join(testPath, 'test.txt'), 'Тест записи файла');
console.log('Тестовый файл создан');