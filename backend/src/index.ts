import express from 'express';
import cors from 'cors';
import lcRoutes from './routes/lc';
import lookupRoutes from './routes/lookup';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/lc', lcRoutes);
app.use('/api/lookup', lookupRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`CITrade API running on http://localhost:${PORT}`);
});
