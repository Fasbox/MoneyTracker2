// frontend/src/pages/Login.jsx
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { API } from '../lib/api';
import '../styles/pages/login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onLogin(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      // 1) pedir sesión al backend
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // 2) inyectar sesión en el cliente de Supabase del front
      const { error } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token
      });
      if (error) throw error;

      // 3) redirigir
      window.location.href = '/';
    } catch (e) {
      setErr(e.message || 'Error al iniciar sesión');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-split">
      <div className="auth-split__left" aria-hidden>
        {/* Puedes cambiar por una imagen estática en /public o un gradiente */}
        <div className="brand-hero">
          <h2>MoneyTracker</h2>
          <p>Tu dinero, claro y ordenado.</p>
        </div>
      </div>
      <div className="auth-split__right">
        <form className="auth-card" onSubmit={onLogin}>
          <h1>Iniciar sesión</h1>
          {err && <div className="auth-error">{err}</div>}
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <label className="label">Contraseña</label>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button className="btn btn--primary" disabled={busy} style={{ width: '100%', marginTop: '1rem' }}>
            {busy ? 'Ingresando…' : 'Entrar'}
          </button>

          <p className="auth-muted">
            ¿No tienes cuenta?&nbsp;
            <a href="/register">Crear cuenta</a>
          </p>
        </form>
      </div>
    </div>
  );
}
