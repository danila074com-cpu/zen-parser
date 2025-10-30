// server.js
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  console.log('✅ Парсер запущен!');
  res.send(`
    <h1>🎉 Парсер успешно работает на Render!</h1>
    <p>Статус: <strong>LIVE</strong></p>
    <p>Следующий шаг: добавим парсинг статей</p>
    <hr>
    <p>Время: ${new Date().toLocaleString('ru-RU')}</p>
  `);
});

app.listen(port, () => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
  console.log('📊 Готов к добавлению парсера статей');
});