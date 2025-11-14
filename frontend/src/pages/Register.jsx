// src/pages/Register.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onRegister(e) {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password || !password2) {
      return setError('Por favor completa todos los campos.');
    }
    if (password !== password2) {
      return setError('Las contraseñas no coinciden.');
    }

    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        alert('Cuenta creada. Revisa tu correo para confirmar.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split">
      {/* Panel izquierdo */}
      <div className="auth-split__left">
        <div className="brand-hero">
          <h2>Bienvenido a MoneyTracker2</h2>
          <p>Crea tu cuenta y comienza a administrar tus finanzas fácilmente.</p>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="auth-split__right">
        <div className="auth-card">
          <h1>Crear cuenta</h1>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={onRegister}>

            {/* NOMBRE */}
            <div className="auth-field">
              <label className="label">Nombre / usuario</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            {/* EMAIL */}
            <div className="auth-field">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            {/* PASS */}
            <div className="auth-field">
              <label className="label">Contraseña</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {/* PASS 2 */}
            <div className="auth-field">
              <label className="label">Repite la contraseña</label>
              <input
                className="input"
                type="password"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
              />
            </div>

            <button className="btn btn--primary" disabled={loading}>
              {loading ? 'Creando cuenta…' : 'Registrarme'}
            </button>
          </form>

          <p className="auth-muted">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
