import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { supabaseForToken } from '../supabaseClient.js';

const router = Router();

/** GET /summary?month=YYYY-MM-01 */
router.get('/', requireAuth, async (req, res) => {
  const month = req.query.month;
  if (!month) return res.status(400).json({ error: 'Missing month=YYYY-MM-01' });

  const supabase = supabaseForToken(req.accessToken);
  const { data, error } = await supabase.rpc('get_monthly_summary', { p_month: month });
  if (error) return res.status(500).json({ error: error.message });

  const row = Array.isArray(data) ? data[0] : data;
  res.json(row || {
    base_salary: 0,
    saving_rate: 0.10,
    extra_income: 0,
    variable_expense: 0,
    fixed_paid: 0,
    saving_target: 0,
    remaining: 0
  });
});

export default router;
