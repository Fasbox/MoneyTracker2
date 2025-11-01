// backend/src/routes/categories.routes.js
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { supabaseForToken } from '../supabaseClient.js';

const router = Router();

/** GET /categories  -> globales + propias activas */
router.get('/', requireAuth, async (req, res) => {
  const supabase = supabaseForToken(req.accessToken);
  const { data, error } = await supabase
    .from('categories')
    .select('id,name,user_id,is_active')
    .or(`user_id.is.null,user_id.eq.${req.user.id}`)
    .eq('is_active', true)
    .order('user_id', { ascending: true })
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

export default router;
