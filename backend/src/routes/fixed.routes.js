import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { supabaseForToken } from '../supabaseClient.js';

const router = Router();

function isMonthDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// Asegurar instancias del mes
router.post('/ensure', requireAuth, async (req, res) => {
  const month = req.query.month;
  if (!isMonthDate(month)) {
    return res.status(400).json({ error: 'month must be YYYY-MM-01' });
  }
  const supabase = supabaseForToken(req.accessToken);
  const { error } = await supabase.rpc('ensure_fixed_for_month', { month_date: month });
  if (error) {
    console.error('POST /fixed/ensure supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ ensured: true });
});

// Listar fijos del mes
router.get('/', requireAuth, async (req, res) => {
  const month = req.query.month;
  if (!isMonthDate(month)) {
    return res.status(400).json({ error: 'month must be YYYY-MM-01' });
  }

  const supabase = supabaseForToken(req.accessToken);
  const { data, error } = await supabase
    .from('fixed_instances')
    .select('id,is_paid,name_snapshot,amount_snapshot,due_day_snapshot,month_date')
    .eq('month_date', month)
    .order('id', { ascending: false });

  if (error) {
    console.error('GET /fixed supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Marcar pagado
router.post('/:id/pay', requireAuth, async (req, res) => {
  const supabase = supabaseForToken(req.accessToken);
  const { data, error } = await supabase
    .from('fixed_instances')
    .update({ is_paid: true })
    .match({ id: Number(req.params.id), user_id: req.user.id })
    .select('id,is_paid,name_snapshot,amount_snapshot,due_day_snapshot,month_date')
    .single();

  if (error) {
    console.error('POST /fixed/:id/pay error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Marcar NO pagado
router.post('/:id/unpay', requireAuth, async (req, res) => {
  const supabase = supabaseForToken(req.accessToken);
  const { data, error } = await supabase
    .from('fixed_instances')
    .update({ is_paid: false })
    .match({ id: Number(req.params.id), user_id: req.user.id })
    .select('id,is_paid,name_snapshot,amount_snapshot,due_day_snapshot,month_date')
    .single();

  if (error) {
    console.error('POST /fixed/:id/unpay error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Soft-delete del mes (RPC)
router.delete('/:id', requireAuth, async (req, res) => {
  const supabase = supabaseForToken(req.accessToken);
  const id = Number(req.params.id);

  const { error } = await supabase.rpc('fixed_instance_soft_delete', { p_id: id });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('not owned')) {
      return res.status(404).json({ error: 'Not found' });
    }
    console.error('DELETE /fixed/:id RPC error:', error);
    return res.status(500).json({ error: error.message });
  }
  return res.status(204).end();
});

export default router;
