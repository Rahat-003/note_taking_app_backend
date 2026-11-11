const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { HttpError } = require('./utils/errors');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
const { rolesRouter, permissionsRouter } = require('./routes/roles');
app.use('/api/roles', rolesRouter);
app.use('/api/permissions', permissionsRouter);

app.use((_req, _res, next) => next(new HttpError(404, 'Not found')));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    return res.status(409).json({ error: `That ${field} is already in use` });
  }
  if (err instanceof mongoose.Error.ValidationError) return res.status(400).json({ error: err.message });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
