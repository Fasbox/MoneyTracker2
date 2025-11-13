import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { API } from '../lib/api';

const fmtCOP = (n) =>
  Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 });

function firstDayOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function lastDayOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export default function Transactions() {
  const { session } = useAuth();
  const token = session?.access_token;

  // --- Form "Nueva transacción" ---
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [txnType, setTxnType] = useState('expense'); // 'expense' | 'income'

  // Categorías
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');

  // --- Filtros del listado ---
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(lastDayOfMonth());
  const [fltCat, setFltCat] = useState('');
  const [fltType, setFltType] = useState('todos'); // 'todos' | 'expense' | 'income'
  const [fltQ, setFltQ] = useState('');

  // --- Listado + paginación ---
  const [rows, setRows] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);

  const catMap = useMemo(() => {
    const m = new Map();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  // Cargar categorías
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/categories`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setCategories(await res.json());
      } catch {}
    })();
  }, [token]);

  // Cargar listado con filtros
  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const url = new URL(`${API}/transactions`);
        url.searchParams.set('limit', '20');
        if (from) url.searchParams.set('from', from);
        if (to) url.searchParams.set('to', to);
        if (fltCat) url.searchParams.set('category_id', fltCat);
        if (fltType && fltType !== 'todos') url.searchParams.set('type', fltType);
        if (fltQ) url.searchParams.set('q', fltQ);

        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRows(data.items || []);
        setNextCursor(data.next_before_id || null);
      } catch (e) {
        console.error('load transactions', e);
        setRows([]);
        setNextCursor(null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, from, to, fltCat, fltType, fltQ]);

  // Paginación
  async function loadMore() {
    if (!token || !nextCursor) return;
    setLoading(true);
    try {
      const url = new URL(`${API}/transactions`);
      url.searchParams.set('limit', '20');
      url.searchParams.set('before_id', String(nextCursor));
      if (from) url.searchParams.set('from', from);
      if (to) url.searchParams.set('to', to);
      if (fltCat) url.searchParams.set('category_id', fltCat);
      if (fltType && fltType !== 'todos') url.searchParams.set('type', fltType);
      if (fltQ) url.searchParams.set('q', fltQ);

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(prev => [...prev, ...(data.items || [])]);
      setNextCursor(data.next_before_id || null);
    } catch (e) {
      console.error('load more transactions', e);
    } finally {
      setLoading(false);
    }
  }

  // Crear transacción
  async function submitExpense(e) {
    e.preventDefault();
    if (!token) return;

    const body = {
      amount: Number(expAmount),
      description: expDesc,
      occurred_at: expDate,
      type: txnType,                   // <- importante
      category_id: categoryId || null,
      category_name: categoryName || ''
    };

    const res = await fetch(`${API}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert('Error creando transacción: ' + (err.error || res.status));
    }

    // limpiar form
    setExpAmount('');
    setExpDesc('');
    setCategoryId('');
    setCategoryName('');

    alert(txnType === 'income' ? 'Ingreso creado' : 'Gasto creado');
  }

  // Conveniencia: si eliges la categoría "Ingresos", cambiamos el tipo a income
  useEffect(() => {
    if (!categoryId) return;
    const sel = categories.find(c => String(c.id) === String(categoryId));
    if (sel && (sel.name || '').toLowerCase() === 'ingresos') setTxnType('income');
  }, [categoryId, categories]);

  return (
    <div className="container">
      <div className="dash-header">
        <h1>Transacciones</h1>
      </div>

      {/* FILTROS */}
      <div className="section card">
        <h3 className="block-title">Listado y filtros</h3>
        <form className="form" onSubmit={e => e.preventDefault()}>
          <div className="field-row">
            <div>
              <label className="label">Desde</label>
              <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div>
              <label className="label">Tipo</label>
              {/* FIX: usar fltType + setFltType */}
              <select className="select" value={fltType} onChange={e => setFltType(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="expense">Gastos</option>
                <option value="income">Ingresos</option>
              </select>
            </div>
          </div>

          <div className="field-row">
            <div>
              <label className="label">Categoría</label>
              <select className="select" value={fltCat} onChange={e => setFltCat(e.target.value)}>
                <option value="">Todas</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.user_id ? '' : ' (global)'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Buscar</label>
              <input
                className="input"
                value={fltQ}
                onChange={e => setFltQ(e.target.value)}
                placeholder="Descripción contiene…"
              />
            </div>
          </div>
        </form>

        {/* LISTADO */}
        <ul className="list mt-4">
          {rows.length === 0 && !loading && <p className="text-muted">No hay transacciones en este rango.</p>}
          {rows.map(row => (
            <li key={row.id} className="list-item">
              <div style={{ minWidth: 110 }} className="list-item__meta">
                {new Date(row.occurred_at).toLocaleDateString('es-CO')}
              </div>
              <div className="text-strong">
                {row.description || <span className="text-muted">Sin descripción</span>}
                {row.category_id ? (
                  <span className="list-item__meta" style={{ marginLeft: 8 }}>
                    • {catMap.get(row.category_id) || '—'}
                  </span>
                ) : null}
              </div>
              <div style={{ marginLeft: 'auto' }} className="text-strong">
                {row.type === 'income' ? '+' : '-'}{fmtCOP(row.amount)}
              </div>
            </li>
          ))}
        </ul>

        {nextCursor && (
          <div className="actions mt-4">
            <button className="btn btn--ghost" disabled={loading} onClick={loadMore}>
              {loading ? 'Cargando…' : 'Cargar más'}
            </button>
          </div>
        )}
      </div>

      {/* NUEVA TRANSACCIÓN */}
      <div className="section card">
        <h3 className="block-title">Agregar gasto único</h3>
        <form className="form" onSubmit={submitExpense}>
          <div className="field-row">
            <div>
              <label className="label">Monto</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={expAmount}
                onChange={e => setExpAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Descripción</label>
              <input className="input" value={expDesc} onChange={e => setExpDesc(e.target.value)} />
            </div>

            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={expDate} onChange={e => setExpDate(e.target.value)} />
            </div>
          </div>

          <div className="field-row">
            <div>
              <label className="label">Tipo</label>
              <select className="select" value={txnType} onChange={e => setTxnType(e.target.value)}>
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </div>

            <div>
              <label className="label">Categoría</label>
              <select
                className="select"
                value={categoryId}
                onChange={e => { setCategoryId(e.target.value); setCategoryName(''); }}
              >
                <option value="">— Selecciona —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.user_id ? '' : ' (global)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">o crea una nueva</label>
              <input
                className="input"
                placeholder="Nueva categoría (opcional)"
                value={categoryName}
                onChange={e => { setCategoryName(e.target.value); setCategoryId(''); }}
              />
            </div>
          </div>

          <div className="actions mt-4">
            <button className="btn btn--primary">Crear</button>
          </div>
        </form>
      </div>
    </div>
  );
}
