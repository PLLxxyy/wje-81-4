import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './database';
import authRoutes from './routes/auth';
import concertRoutes from './routes/concerts';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import { seedSampleData } from './seed';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

initDatabase();

const shouldSeed = process.env.SEED_DATA !== 'false';
if (shouldSeed) {
  seedSampleData();
}

app.use('/api/auth', authRoutes);
app.use('/api/concerts', concertRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '演唱会票务平台 API 运行正常' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📁 API 文档: http://localhost:${PORT}/api/health`);
});
