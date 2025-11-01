import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Register() {
  const [email,setEmail]=useState(''), [password,setPassword]=useState('');
  async function onRegister(e){ e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message); else alert('Revisa tu correo para confirmar');
  }
  return (
    <form onSubmit={onRegister}>
      <h1>Crear cuenta</h1>
      <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button>Registrarme</button>
    </form>
  );
}
