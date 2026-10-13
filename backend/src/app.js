const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const logger = require('./config/logger');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:8080' }));
app.use(express.json({ limit: '3mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'connectf-api' }));
app.use('/api', routes);
app.use('/', routes);
app.use((req, res) => res.status(404).json({ message: 'Không tìm thấy API.' }));
app.use((error, _req, res, _next) => {
  logger.error('Request failed', { message: error.message, stack: error.stack });
  return res.status(500).json({ message: 'Đã có lỗi máy chủ.' });
});

module.exports = app;
