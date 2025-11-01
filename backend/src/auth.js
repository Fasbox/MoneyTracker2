import { createClient } from '@supabase/supabase-js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    // Cliente público creado aquí (ya con process.env cargado)
    const publicClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data, error } = await publicClient.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

    req.user = data.user;
    req.accessToken = token;
    next();
  } catch (e) {
    console.error(e);
    res.status(401).json({ error: 'Auth error' });
  }
}
