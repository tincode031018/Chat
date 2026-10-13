const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const routes = require('./routes');
const logger = require('./config/logger');
const getClientOrigins = require('./config/clientOrigins');

const app = express();
app.use(helmet());
app.use(cors({ origin: getClientOrigins() }));
app.use(express.json({ limit: '3mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'connectf-api' }));
app.use('/api', routes);
app.use('/', routes);
const frontendDirectory = path.resolve(__dirname, '..', 'public');
if (fs.existsSync(frontendDirectory)) {
  app.use(express.static(frontendDirectory));
  app.get('*', (req, res, next) => {
    if (/^\/(api|auth|chat|meeting|user|group)(\/|$)/.test(req.path)) return next();
    return res.sendFile(path.join(frontendDirectory, 'index.html'));
  });
}
app.use((req, res) => res.status(404).json({ message: 'Không tìm thấy API.' }));
app.use((error, _req, res, _next) => {
  logger.error('Request failed', { message: error.message, stack: error.stack });
  return res.status(500).json({ message: 'Đã có lỗi máy chủ.' });
});

module.exports = app;
