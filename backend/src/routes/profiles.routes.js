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
    .select('user_id, currency_code, timezone, locale, base_salary, saving_rate, display_name')
    .eq('user_id', req.user.id)
    .single();

  // si no existe, lo crea y vuelve a leer
  if (
    (error && (error.code === 'PGRST116' || error.details?.includes('Results contain 0 rows'))) ||
    (!data && !error)
  ) {
    const fromMeta = req.user?.user_metadata?.full_name || null;

    const ins = await supabase
      .from('profiles')
      .insert({
        user_id: req.user.id,
        display_name: fromMeta ?? null, // nuevo
      })
      .select('user_id, currency_code, timezone, locale, base_salary, saving_rate, display_name')
      .single();

    if (ins.error) return res.status(500).json({ error: ins.error.message });
    data = ins.data;
  } else if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

/** PUT /profiles/me
 *  Actualiza base_salary, saving_rate y display_name (opcional).
 *  Body: { base_salary?: number, saving_rate?: number, display_name?: string }
 */
router.put('/me', requireAuth, async (req, res) => {
  const { base_salary, saving_rate, display_name } = req.body || {};
  const patch = {};
  if (base_salary != null) patch.base_salary = Number(base_salary);
  if (saving_rate != null) patch.saving_rate = Number(saving_rate);
  if (display_name !== undefined) patch.display_name = display_name;

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const supabase = supabaseForToken(req.accessToken);
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', req.user.id)
    .select('user_id, base_salary, saving_rate, display_name')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
