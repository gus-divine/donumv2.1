import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4003;

// Restrict CORS to app origins (comma-separated in CORS_ORIGINS, or allow all in dev)
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:2003', 'http://admin.localhost:3000', 'http://admin.localhost:2003'];
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'donum-backend' });
});

// API placeholder - expand as you migrate routes from Next.js
app.get('/api', (req, res) => {
  res.json({ message: 'Donum Backend API', version: '0.1.0' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});
