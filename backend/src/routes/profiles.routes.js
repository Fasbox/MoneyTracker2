import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { supabaseForToken } from '../supabaseClient.js';

const router = Router();

/** GET /profiles/me
 *  Devuelve el perfil. Si no existe, lo crea con defaults.
 */
router.get('/me', requireAuth, async (req, res) => {
  const supabase = supabaseForToken(req.accessToken);

  // intenta leer
  let { data, error } = await supabase
    .from('profiles')
    .select('user_id, currency_code, timezone, locale, base_salary, saving_rate')
    .eq('user_id', req.user.id)
    .single();

  // si no existe, lo crea y vuelve a leer
  if ((error && (error.code === 'PGRST116' || error.details?.includes('Results contain 0 rows'))) || (!data && !error)) {
    const ins = await supabase
      .from('profiles')
      .insert({ user_id: req.user.id }) // defaults: COP, America/Bogota, base_salary=0, saving_rate=0.10
      .select('user_id, currency_code, timezone, locale, base_salary, saving_rate')
      .single();

    if (ins.error) return res.status(500).json({ error: ins.error.message });
    data = ins.data;
  } else if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

/** PUT /profiles/me
 *  Actualiza base_salary y/o saving_rate.
 *  Body: { base_salary?: number, saving_rate?: number }  (p.ej. 0.10 = 10%)
 */
router.put('/me', requireAuth, async (req, res) => {
  const { base_salary, saving_rate } = req.body || {};
  const patch = {};
  if (base_salary != null) patch.base_salary = Number(base_salary);
  if (saving_rate != null) patch.saving_rate = Number(saving_rate);

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const supabase = supabaseForToken(req.accessToken);
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', req.user.id)
    .select('user_id, base_salary, saving_rate')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
