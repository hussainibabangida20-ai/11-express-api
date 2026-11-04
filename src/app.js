import express from 'express';
import { fileURLToPath } from 'node:url';
import productsRouter from './routes/products.routes.js';

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
  res.status(404).json({ error: { message: 'Not found' } });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const message = status >= 500 ? 'Internal server error' : err.message;
  res.status(status).json({ error: { message } });
});

export default app;
