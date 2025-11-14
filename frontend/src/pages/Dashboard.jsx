// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { API } from '../lib/api';
import { toMonthDate } from '../lib/date';

// Chart.js
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

// Paleta de colores para los gráficos
const COLORS = [
  '#3B82F6', // azul
  '#10B981', // verde
  '#F59E0B', // naranja
  '#EF4444', // rojo suave
  '#8B5CF6', // violeta
  '#06B6D4', // cian
  '#F43F5E', // rosa
  '#A3A3A3', // gris neutro
];


// registrar una sola vez
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

export default function Dashboard() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [summary, setSummary] = useState(null);
  const [fixed, setFixed] = useState([]);

  // Crear plantilla
  const [tplName, setTplName] = useState('');
  const [tplAmount, setTplAmount] = useState('');
  const [tplDue, setTplDue] = useState('');

  // Datos para gráficos
  const [chartTab, setChartTab] = useState('salary'); // 'salary' | 'category' | 'daily'
  const [catAnalytics, setCatAnalytics] = useState([]); // [{type,category,total}]
  const [dailyNet, setDailyNet] = useState([]);         // [{day,net}]

  const fmtCOP = (n) =>
    Number(n || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    (async () => {
      if (!token) return;
      const monthDate = toMonthDate(month);
      if (!monthDate) return;

      // asegura fijos
      await fetch(`${API}/fixed/ensure?month=${monthDate}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      await refreshSummary(monthDate);
      await refreshFixed(monthDate);
      await refreshAnalytics(monthDate);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, month]);

  async function refreshSummary(monthDateOverride) {
    const monthDate = monthDateOverride || toMonthDate(month);
    if (!monthDate) return;
    const res = await fetch(`${API}/summary?month=${monthDate}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setSummary(null);
      return;
    }
    setSummary(await res.json());
  }

  async function refreshFixed(monthDateOverride) {
    const monthDate = monthDateOverride || toMonthDate(month);
    if (!monthDate) return;
    const res = await fetch(`${API}/fixed?month=${monthDate}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setFixed([]);
      return;
    }
    setFixed(await res.json());
  }

  async function refreshAnalytics(monthDateOverride) {
    const monthDate = monthDateOverride || toMonthDate(month);
    if (!monthDate) return;

    try {
      const res = await fetch(
        `${API}/analytics/monthly?month=${monthDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCatAnalytics(data.byCategory || []);
      setDailyNet(data.dailyNet || []);
    } catch (err) {
      console.error('GET /analytics/monthly error', err);
      setCatAnalytics([]);
      setDailyNet([]);
    }
  }

  async function togglePaid(item) {
    const path = item.is_paid ? `/fixed/${item.id}/unpay` : `/fixed/${item.id}/pay`;
    const res = await fetch(API + path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return alert('No se pudo actualizar');
    const updated = await res.json();
    setFixed((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    await refreshSummary();
  }

  async function removeFromMonth(id) {
    if (!confirm('¿Eliminar este gasto fijo SOLO de este mes?')) return;
    const res = await fetch(`${API}/fixed/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 204) {
      setFixed((prev) => prev.filter((x) => x.id !== id));
      await refreshSummary();
    } else {
      const err = await res.json().catch(() => ({}));
      alert('No se pudo eliminar: ' + (err.error || res.status));
    }
  }

  async function submitTemplate(e) {
    e.preventDefault();
    const name = (tplName || '').trim();
    const amount = Number(tplAmount);
    const due_day = tplDue !== '' ? Number(tplDue) : null;
    if (!name) return alert('El nombre es obligatorio');
    if (Number.isNaN(amount)) return alert('Monto inválido');

    const res = await fetch(`${API}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, amount, due_day }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert('Error creando plantilla: ' + (err.error || res.status));
    }
    setTplName('');
    setTplAmount('');
    setTplDue('');
    const monthDate = toMonthDate(month);
    if (monthDate) {
      await fetch(`${API}/fixed/ensure?month=${monthDate}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    await refreshFixed();
  }

  // =======================
  //  Datos para Chart.js
  // =======================

  // 1) Distribución salario / gastos
  const salaryChartData = summary
    ? {
        labels: [
          'Ingresos extra',
          'Gastos variables',
          'Fijos pagados',
          'Ahorro objetivo',
          'Saldo restante',
        ],
        datasets: [
          {
            data: [
              summary.extra_income || 0,
              summary.variable_expense || 0,
              summary.fixed_paid || 0,
              summary.saving_target || 0,
              summary.remaining || 0,
            ],
            backgroundColor: COLORS.slice(0, 5),
            borderColor: '#0f172a',
            borderWidth: 2,
          },
        ],
      }
    : null;

  // 2) Gastos por categoría (solo type='expense')
  const expenseByCat = catAnalytics.filter((r) => r.type === 'expense');
  const expensesChartData =
    expenseByCat.length > 0
      ? {
          labels: expenseByCat.map((r) => r.category),
          datasets: [
            {
              data: expenseByCat.map((r) => r.total),
              backgroundColor: expenseByCat.map(
                (_, i) => COLORS[i % COLORS.length]
              ),
              borderColor: '#0f172a',
              borderWidth: 2,
            },
          ],
        }
      : null;

  // 3) Flujo diario neto
  const dailyChartData =
    dailyNet.length > 0
      ? {
          labels: dailyNet.map((r) => r.day.slice(8, 10)), // solo día
          datasets: [
            {
              label: 'Neto diario',
              data: dailyNet.map((r) => r.net),
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.3)',
              borderWidth: 3,
              tension: 0.3,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        }
      : null;

  const doughnutOptions = {
    plugins: { legend: { position: 'bottom' } },
    maintainAspectRatio: false,
  };

  const lineOptions = {
    plugins: { legend: { display: false } },
    maintainAspectRatio: false,
  };

  return (
    <div className="container">
      <div className="dash-header">
        <h1>Dashboard</h1>
        <div className="actions">
          <label className="label" htmlFor="month">
            Mes
          </label>
          <input
            id="month"
            className="input month-picker"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      </div>

      {/* Fila: Resumen + Gráficas */}
      <div className="grid grid-cols-2 section">
        <div className="card">
          <h3 className="block-title">Resumen mensual</h3>
          {summary ? (
            <ul className="summary-list">
              <li>
                <span>Salario base</span>
                <b>{fmtCOP(summary.base_salary)} COP</b>
              </li>
              <li>
                <span>Ingresos extra</span>
                <b>{fmtCOP(summary.extra_income)} COP</b>
              </li>
              <li>
                <span>Gastos variables</span>
                <b>{fmtCOP(summary.variable_expense)} COP</b>
              </li>
              <li>
                <span>Fijos pagados</span>
                <b>{fmtCOP(summary.fixed_paid)} COP</b>
              </li>
              <li>
                <span>% ahorro</span>
                <b>{Math.round(summary.saving_rate * 100)}%</b>
              </li>
              <li>
                <span>Ahorro objetivo</span>
                <b>{fmtCOP(summary.saving_target)} COP</b>
              </li>
              <li>
                <span>Saldo restante</span>
                <b>{fmtCOP(summary.remaining)} COP</b>
              </li>
            </ul>
          ) : (
            <p className="text-muted">Cargando resumen…</p>
          )}
        </div>

        <div className="card">
          <h3 className="block-title">Gráficas</h3>

          <div className="chart-tabs">
            <button
              className={
                'chart-tabs__btn' +
                (chartTab === 'salary' ? ' chart-tabs__btn--active' : '')
              }
              type="button"
              onClick={() => setChartTab('salary')}
            >
              Distribución
            </button>
            <button
              className={
                'chart-tabs__btn' +
                (chartTab === 'category' ? ' chart-tabs__btn--active' : '')
              }
              type="button"
              onClick={() => setChartTab('category')}
            >
              Por categoría
            </button>
            <button
              className={
                'chart-tabs__btn' +
                (chartTab === 'daily' ? ' chart-tabs__btn--active' : '')
              }
              type="button"
              onClick={() => setChartTab('daily')}
            >
              Flujo diario
            </button>
          </div>

          <div className="chart-panel">
            {chartTab === 'salary' && salaryChartData && (
              <Doughnut data={salaryChartData} options={doughnutOptions} />
            )}

            {chartTab === 'category' && expensesChartData && (
              <Doughnut data={expensesChartData} options={doughnutOptions} />
            )}

            {chartTab === 'daily' && dailyChartData && (
              <Line data={dailyChartData} options={lineOptions} />
            )}

            {/* Mensajes de vacío */}
            {chartTab === 'salary' && !salaryChartData && (
              <p className="text-muted">Sin datos para este mes.</p>
            )}
            {chartTab === 'category' && !expensesChartData && (
              <p className="text-muted">No hay gastos en este mes.</p>
            )}
            {chartTab === 'daily' && !dailyChartData && (
              <p className="text-muted">No hay movimientos en este mes.</p>
            )}
          </div>
        </div>
      </div>

      {/* Fijos del mes */}
      <div className="section card">
        <h3 className="block-title">Gastos fijos del mes</h3>
        {Array.isArray(fixed) && fixed.length > 0 ? (
          <ul className="list">
            {fixed.map((x) => (
              <li key={x.id} className="list-item">
                <input
                  type="checkbox"
                  checked={x.is_paid}
                  onChange={() => togglePaid(x)}
                />
                <span className="fixed-item__name">{x.name_snapshot}</span>
                <span className="fixed-item__amount">
                  — {fmtCOP(x.amount_snapshot)} COP
                </span>
                {x.due_day_snapshot ? (
                  <span className="fixed-item__due">
                    (venc: {x.due_day_snapshot})
                  </span>
                ) : null}
                <div style={{ marginLeft: 'auto' }} className="actions">
                  <button
                    className="btn btn--danger"
                    onClick={() => removeFromMonth(x.id)}
                  >
                    Eliminar del mes
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No hay instancias para este mes.</p>
        )}
      </div>

      {/* Agregar plantilla */}
      <div className="section card">
        <h3 className="block-title">Agregar plantilla (gasto fijo)</h3>
        <form className="form" onSubmit={submitTemplate}>
          <div className="field-row">
            <div>
              <label className="label">Nombre</label>
              <input
                className="input"
                placeholder="Netflix / Arriendo"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Monto</label>
              <input
                className="input"
                placeholder="0"
                type="number"
                step="0.01"
                value={tplAmount}
                onChange={(e) => setTplAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Día venc.</label>
              <input
                className="input"
                placeholder="15"
                type="number"
                min="1"
                max="31"
                value={tplDue}
                onChange={(e) => setTplDue(e.target.value)}
              />
            </div>
          </div>
          <div className="actions mt-4">
            <button className="btn btn--primary">Crear plantilla</button>
          </div>
        </form>
      </div>
    </div>
  );
}
