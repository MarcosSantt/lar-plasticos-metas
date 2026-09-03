import express from 'express';
import cors from 'cors';
import metasRouter from './routes/metas.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '15mb' })); // PDFs de ranking chegam em base64

// Rotas de dominio
app.use('/api/metas', metasRouter);

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', servico: 'lar-plasticos-metas', horario: new Date().toISOString() });
});

// 404 padrao
app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota nao encontrada.' });
});

app.listen(PORT, () => {
  console.log(`\n  Backend Lar Plasticos - Metas`);
  console.log(`  API disponivel em: http://localhost:${PORT}/api`);
  console.log(`  Healthcheck:       http://localhost:${PORT}/api/health\n`);
});
