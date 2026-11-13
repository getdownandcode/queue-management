require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { router: authRouter } = require('./auth');
const queuesRouter = require('./queues');
const analyticsRouter = require('./analytics');

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required. Copy server/.env.example to server/.env and set a secret.');
const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api', queuesRouter);
app.use('/api', analyticsRouter);
app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError) return res.status(400).json({ error: 'Request body must be valid JSON.' });
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => process.stdout.write(`Queue Manager API listening on port ${port}\n`));
