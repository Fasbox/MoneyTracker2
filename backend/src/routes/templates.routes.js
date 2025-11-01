import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { supabaseForToken } from '../supabaseClient.js';

const router = Router();

/** POST /templates
 *  body: { name, amount, category_id?, due_day?, is_active? }
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    let { name, amount, category_id = null, due_day = null, is_active = true } = req.body || {};

    if (!name || amount == null || Number.isNaN(Number(amount))) {
      return res.status(400).json({ error: 'name and amount are required' });
    }
    amount = Number(amount); // numeric en COP

    if (due_day != null) {
      due_day = Number(due_day);
      if (Number.isNaN(due_day) || due_day < 1 || due_day > 31) {
        return res.status(400).json({ error: 'due_day must be between 1 and 31' });
      }
    }

    const supabase = supabaseForToken(req.accessToken);
    const { data, error } = await supabase
      .from('fixed_templates')
      .insert({
        user_id: req.user.id,
        name,
        amount,
        category_id,
        due_day,
        is_active
      })
      .select()
      .single();

    if (error) {
      console.error('POST /templates supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (e) {
    console.error('POST /templates unexpected error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
