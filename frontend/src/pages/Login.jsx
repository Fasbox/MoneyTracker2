import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';


export default function Login() {
  const [email,setEmail]=useState(''), [password,setPassword]=useState('');
  async function onLogin(e){ e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message); else window.location.href='/';
  }
  return (
    <form onSubmit={onLogin}>
      <h1>Iniciar sesión</h1>
      <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button>Entrar</button>
      <p><a href="/register">Crear cuenta</a></p>
    </form>
  );
}
