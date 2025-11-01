import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { supabaseForToken } from '../supabaseClient.js';

const router = Router();

/** POST /expenses (ahora crea transacciones genéricas)
 *  body: { amount, category_id?, category_name?, description?, occurred_at?, type? }
 *  - type: 'expense' | 'income' (default 'expense')
 */
router.post('/', requireAuth, async (req, res) => {
  let {
    amount,
    category_id = null,
    category_name = '',
    description = '',
    occurred_at = null,
    type = 'expense'
  } = req.body || {};

  if (amount == null) return res.status(400).json({ error: 'amount is required' });
  amount = Number(amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  type = String(type) === 'income' ? 'income' : 'expense';
  const dateIso = occurred_at || new Date().toISOString().slice(0, 10);

  const supabase = supabaseForToken(req.accessToken);

  // Si no llega category_id pero sí category_name => crea/usa categoría del usuario (o global si existe)
  let catId = category_id ? Number(category_id) : null;
  if (!catId && category_name && category_name.trim()) {
    const name = category_name.trim();

    // 1) ¿Existe global con ese nombre?
    let { data: existing, error: exErr } = await supabase
      .from('categories')
      .select('id')
      .is('user_id', null)
      .eq('name', name)
      .maybeSingle();
    if (exErr) return res.status(500).json({ error: exErr.message });

    if (!existing) {
      // 2) ¿Existe del usuario?
      const { data: myCat, error: myErr } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('name', name)
        .maybeSingle();
      if (myErr) return res.status(500).json({ error: myErr.message });

      if (myCat) {
        existing = myCat;
      } else {
        // 3) Crear categoría del usuario
        const { data: created, error: cErr } = await supabase
          .from('categories')
          .insert({ user_id: req.user.id, name })
          .select('id')
          .single();
        if (cErr) return res.status(500).json({ error: cErr.message });
        existing = created;
      }
    }
    catId = existing?.id ?? null;
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: req.user.id,
      type,              // <-- clave
      amount,            // positivo
      category_id: catId,
      description,
      occurred_at: dateIso
    })
    .select('id, user_id, type, amount, category_id, description, occurred_at')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
