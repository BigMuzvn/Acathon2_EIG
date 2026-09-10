import { useId, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line,
} from 'recharts';
import { ChartNoAxesCombined, ChartNoAxesColumnIncreasing } from 'lucide-react';
import './results.css';
import { vehicleLabel } from '../../shared/vehicleLabel.js';

const COSTS = [
  { key: 'carburant', label: 'Énergie', color: '#263b2d' },
  { key: 'entretien', label: 'Entretien', color: '#8dad6e' },
  { key: 'assurance', label: 'Assurance', color: '#c4ed63' },
  { key: 'decote_estimee', label: 'Décote', color: '#8eaaa9' },
  { key: 'autres', label: 'Autres frais', color: '#d7dddb' },
];
const VEHICLE_COLORS = ['#263b2d', '#87a846', '#547e99', '#b47954', '#83709d', '#89979b'];
const TABS = ['breakdown', 'evolution'];
const currency = (value) => Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const tickCurrency = (value) => `${Number(value) >= 1000 ? `${Number(value / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k` : currency(value)} €`;

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{payload[0]?.payload?.identity || label}</strong>
      {payload.map((entry) => (
        <div className="chart-tooltip-row" key={entry.dataKey}>
          <span><i style={{ backgroundColor: entry.color }} />{entry.name}</span>
          <b>{currency(entry.value)} €</b>
        </div>
      ))}
    </div>
  );
}

export default function CostCharts({ results, vehicles, params }) {
  const [activeTab, setActiveTab] = useState('breakdown');
  const chartId = useId();
  if (!results?.length) return null;

  const series = results.map((result, index) => {
    const vehicle = vehicles.find(item => String(item.id) === String(result.vehicule_id));
    const name = vehicle ? vehicleLabel(vehicle) : `Véhicule ${result.vehicule_id}`;
    const axisName = vehicle?.source === 'carapi' ? `${index + 1}. ${vehicleLabel(vehicle, { details: false })}` : name;
    return { result, key: `vehicle_${index}`, name, axisName, color: VEHICLE_COLORS[index % VEHICLE_COLORS.length] };
  });
  const breakdown = series.map(({ result, name, axisName }) => ({ name: axisName, identity: name, ...result.detail }));
  const years = [...new Set(results.flatMap(result => (result.evolution_annuelle || []).map(item => Number(item.annee))))].sort((a, b) => a - b);
  const evolution = years.map(year => {
    const row = { year: `Année ${year}` };
    series.forEach(({ result, key }) => {
      const entry = result.evolution_annuelle?.find(item => Number(item.annee) === year);
      row[key] = entry?.cout_cumule ?? null;
    });
    return row;
  });
  const isBreakdown = activeTab === 'breakdown';
  const legend = isBreakdown ? COSTS : series.map(item => ({ key: item.key, label: item.name, color: item.color }));

  const handleTabKey = (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : (TABS.indexOf(activeTab) + 1) % 2;
    setActiveTab(TABS[next]);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
  };

  return (
    <section className="result-card chart-card" aria-labelledby={`${chartId}-heading`}>
      <div className="result-card-header">
        <div>
          <span className="result-eyebrow">COMPRENDRE VOTRE BUDGET</span>
          <h3 id={`${chartId}-heading`}>Où va votre argent ?</h3>
          <p>{isBreakdown ? 'Chaque poste de dépense, pour chaque véhicule.' : 'Le coût de possession cumulé au fil des années.'}</p>
        </div>
        <div className="chart-tabs" role="tablist" aria-label="Affichage du graphique">
          {TABS.map((tab, index) => (
            <button
              type="button"
              key={tab}
              id={`${chartId}-${tab}-tab`}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`${chartId}-panel`}
              tabIndex={activeTab === tab ? 0 : -1}
              onKeyDown={handleTabKey}
              onClick={() => setActiveTab(tab)}
            >
              {index === 0 ? <ChartNoAxesColumnIncreasing size={15} aria-hidden="true" /> : <ChartNoAxesCombined size={15} aria-hidden="true" />}
              {index === 0 ? 'Répartition' : 'Évolution'}
            </button>
          ))}
        </div>
      </div>

      <div id={`${chartId}-panel`} role="tabpanel" aria-labelledby={`${chartId}-${activeTab}-tab`} tabIndex={0} className="chart-panel">
        <div className="chart-meta">
          <ul className="chart-legend" aria-label="Légende du graphique">
            {legend.map(item => <li key={item.key}><span style={{ backgroundColor: item.color }} />{item.label}</li>)}
          </ul>
          <span className="chart-period">{isBreakdown && params?.duree_annees ? `Total sur ${params.duree_annees} ${params.duree_annees === 1 ? 'an' : 'ans'}` : 'Montants en euros'}</span>
        </div>

        {!isBreakdown && !years.length ? (
          <p className="chart-empty">L’évolution annuelle n’est pas disponible pour cette simulation. Retrouvez les montants dans le tableau ci-dessous.</p>
        ) : (
          <div className="chart-canvas" style={{ height: isBreakdown ? Math.max(260, results.length * 70 + 50) : 310 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {isBreakdown ? (
                <BarChart data={breakdown} layout="vertical" margin={{ top: 10, right: 14, bottom: 8, left: 0 }} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 5" stroke="#e9ecea" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#77817b', fontSize: 11 }} tickFormatter={tickCurrency} tickMargin={12} />
                  <YAxis type="category" dataKey="name" width={130} axisLine={false} tickLine={false} tick={{ fill: '#344039', fontSize: 11, fontWeight: 500 }} tickMargin={12} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f4f6f2' }} />
                  {COSTS.map((cost, index) => (
                    <Bar key={cost.key} dataKey={cost.key} name={cost.label} stackId="costs" fill={cost.color} maxBarSize={38} radius={index === COSTS.length - 1 ? [0, 5, 5, 0] : 0} isAnimationActive={false} />
                  ))}
                </BarChart>
              ) : (
                <LineChart data={evolution} margin={{ top: 15, right: 18, bottom: 8, left: 0 }} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 5" stroke="#e9ecea" vertical={false} />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#77817b', fontSize: 11 }} tickMargin={12} minTickGap={18} />
                  <YAxis width={65} axisLine={false} tickLine={false} tick={{ fill: '#77817b', fontSize: 11 }} tickFormatter={tickCurrency} />
                  <Tooltip content={<ChartTooltip />} />
                  {series.map(item => (
                    <Line key={item.key} name={item.name} dataKey={item.key} type="monotone" stroke={item.color} strokeWidth={3} dot={{ r: 3, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
        <p className="chart-footnote">La décote correspond à la perte de valeur estimée du véhicule. Tous les montants sont détaillés dans le comparatif.</p>
      </div>
    </section>
  );
}
