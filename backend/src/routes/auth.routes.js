// backend/src/routes/auth.routes.js
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Cliente de supabase en backend (oculta la anon key en el server)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // no uses service key aquí
);

/** POST /auth/login
 * body: { email, password }
 * Devuelve { user, access_token, refresh_token } o 401
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y password son obligatorios' });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  const { session, user } = data || {};
  if (!session) return res.status(500).json({ error: 'No se obtuvo sesión' });

  // Puedes setear cookies httpOnly si quieres; por ahora devolvemos los tokens
  return res.json({
    user,
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });
});

/** POST /auth/register (opcional, por si quieres mover también el registro)
 * body: { email, password }
 */
router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y password son obligatorios' });

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });

  return res.status(201).json({ user: data.user });
});

export default router;
