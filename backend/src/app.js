import express from 'express';
import cors from 'cors';

import analyticsRouter from './routes/analytics.routes.js';
import fixedRoutes from './routes/fixed.routes.js';
import templateRoutes from './routes/templates.routes.js';
import expenseRoutes from './routes/expenses.routes.js';
import profileRoutes from './routes/profiles.routes.js';
import summaryRoutes from './routes/summary.routes.js'; 
import categoriesRoutes from './routes/categories.routes.js';
import transactionsRoutes from './routes/transactions.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/analytics', analyticsRouter);
app.use('/fixed', fixedRoutes);       // /fixed/...
app.use('/templates', templateRoutes);// /templates/...
app.use('/expenses', expenseRoutes);  // /expenses/...
app.use('/profiles', profileRoutes);   
app.use('/summary', summaryRoutes);   
app.use('/categories', categoriesRoutes);
app.use('/transactions', transactionsRoutes);

export default app;
