// backend/src/routes/analytics.routes.js
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { supabaseForToken } from '../supabaseClient.js';

const router = Router();

/**
 * GET /analytics/monthly?month=YYYY-MM-01
 *
 * Devuelve:
 * {
 *   byCategory: [{ type, category, total }],
 *   dailyNet:   [{ day, net }]
 * }
 *
 * - type: 'income' | 'expense'
 * - category: nombre de la categoría (o "Sin categoría")
 * - total / net: números positivos (net puede ser ±)
 */
router.get('/monthly', requireAuth, async (req, res) => {
  const month = req.query.month;
  if (!month) {
    return res.status(400).json({ error: 'Missing month=YYYY-MM-01' });
  }

  const supabase = supabaseForToken(req.accessToken);

  // Traemos SOLO las transacciones del mes del usuario, con join a categorías
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type, occurred_at, category_id, categories(name)')
    .eq('user_id', req.user.id)
    .eq('month_date', month)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: true });

  if (error) {
    console.error('GET /analytics/monthly error:', error);
    return res.status(500).json({ error: error.message });
  }

  const rows = Array.isArray(data) ? data : [];

  // --------- Agregación por categoría + tipo ----------
  const byCatMap = new Map(); // key: `${type}|${categoryName}` -> total

  for (const row of rows) {
    const catName = row.categories?.name || 'Sin categoría';
    const key = `${row.type}|${catName}`;
    const prev = byCatMap.get(key) || 0;
    byCatMap.set(key, prev + Number(row.amount || 0));
  }

  const byCategory = Array.from(byCatMap.entries()).map(([key, total]) => {
    const [type, category] = key.split('|');
    return { type, category, total };
  });

  // --------- Flujo diario neto ----------
  const dailyMap = new Map(); // day -> net

  for (const row of rows) {
    const day = String(row.occurred_at).slice(0, 10);
    const delta = row.type === 'income'
      ? Number(row.amount || 0)
      : -Number(row.amount || 0);
    const prev = dailyMap.get(day) || 0;
    dailyMap.set(day, prev + delta);
  }

  const dailyNet = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, net]) => ({ day, net }));

  return res.json({ byCategory, dailyNet });
});

export default router;
