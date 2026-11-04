import express from 'express';
import { fileURLToPath } from 'node:url';
import productsRouter from './routes/products.routes.js';
import HttpError from './errors/http-error.js';

const app = express();
const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));

app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(2)} ms`);
  });

  next();
});

app.use(express.json());
app.use(express.static(publicDirectory));

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok', uptime: process.uptime() } });
});

app.use('/api/products', productsRouter);

app.use((req, res) => {
  throw new HttpError(404, 'Not found.');
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599
    ? err.status
    : Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode <= 599
      ? err.statusCode
      : 500;
  const production = process.env.NODE_ENV === 'production';
  const message = status >= 500 && production ? 'Internal server error' : err.message;
  const error = { message };

  if (err.fields) {
    error.fields = err.fields;
  }
  if (!production && err.stack) {
    error.stack = err.stack;
  }
  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ error });
});

export default app;
