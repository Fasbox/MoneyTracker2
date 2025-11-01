import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { supabaseForToken } from '../supabaseClient.js';

const router = Router();

// sanea ints
const toInt = (v, def) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};
// valida YYYY-MM-DD
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * GET /transactions
 * Query:
 *  - limit (1..50)       -> default 20
 *  - before_id           -> cursor para paginar hacia abajo (id DESC)
 *  - from (YYYY-MM-DD)   -> fecha mínima (occurred_at >=)
 *  - to (YYYY-MM-DD)     -> fecha máxima (occurred_at <=)
 *  - category_id         -> filtrar por categoría
 *  - type                -> 'expense' | 'income'
 *  - q                   -> búsqueda en descripción (ILIKE)
 *
 * Devuelve: { items: [...], next_before_id: number | null }
 */
router.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(toInt(req.query.limit, 20), 1), 50);
  const beforeId = toInt(req.query.before_id, null);
  const from = req.query.from;
  const to = req.query.to;
  const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
  const type = req.query.type;
  const q = req.query.q;

  const supabase = supabaseForToken(req.accessToken);

  let query = supabase
    .from('transactions')
    .select('id, occurred_at, amount, description, category_id, type', { head: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (beforeId) query = query.lt('id', beforeId);
  if (isDate(from)) query = query.gte('occurred_at', from);
  if (isDate(to)) query = query.lte('occurred_at', to);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (type === 'expense' || type === 'income') query = query.eq('type', type);
  if (q && typeof q === 'string') query = query.ilike('description', `%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error('GET /transactions error:', error);
    return res.status(500).json({ error: error.message });
  }

  const items = Array.isArray(data) ? data : [];
  const next_before_id = items.length === limit ? items[items.length - 1].id : null;

  return res.json({ items, next_before_id });
});

export default router;
