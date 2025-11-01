import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { API } from '../lib/api';

export default function Profile() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [profile, setProfile] = useState(null);
  const [salaryInput, setSalaryInput] = useState('');
  const [savingRateInput, setSavingRateInput] = useState('');

  const fmtCOP = (n) => Number(n || 0).toFixed(2);

  useEffect(() => {
    (async ()=>{
      if (!token) return;
      const res = await fetch(`${API}/profiles/me`, { headers: { Authorization: `Bearer ${token}` }});
      if (res.ok) setProfile(await res.json());
    })();
  }, [token]);

  async function submitProfile(e) {
    e.preventDefault();
    if (!token) return;
    const patch = {};
    if (salaryInput !== '') patch.base_salary = Number(salaryInput);
    if (savingRateInput !== '') patch.saving_rate = Number(savingRateInput);

    if (Object.keys(patch).length === 0) return alert('No hay cambios');

    const res = await fetch(`${API}/profiles/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch)
    });
    if (!res.ok) {
      const err = await res.json().catch(()=> ({}));
      return alert('Error guardando perfil: ' + (err.error || res.status));
    }
    const data = await res.json();
    setProfile(prev => ({ ...prev, ...data }));
    setSalaryInput(''); setSavingRateInput('');
    alert('Guardado');
  }

  return (
    <div className="container">
      <div className="dash-header">
        <h1>Perfil</h1>
      </div>

      <div className="section card">
        <h3 className="block-title">Preferencias</h3>
        <p className="text-muted mb-4">
          Actual: <b>{fmtCOP(profile?.base_salary ?? 0)} COP</b> · Ahorro{' '}
          <b>{profile ? Math.round((profile.saving_rate ?? 0.10)*100) : 10}%</b>
        </p>

        <form className="form" onSubmit={submitProfile}>
          <div className="field-row">
            <div>
              <label className="label">Nuevo salario base</label>
              <input className="input" type="number" step="0.01"
                     value={salaryInput} onChange={e=>setSalaryInput(e.target.value)} />
            </div>
            <div>
              <label className="label">Tasa de ahorro (0.10 = 10%)</label>
              <input className="input" type="number" step="0.01" min="0" max="1"
                     value={savingRateInput} onChange={e=>setSavingRateInput(e.target.value)} />
            </div>
            <div className="actions">
              <button className="btn btn--primary" type="submit">Guardar</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
