import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import { TrendingUp, Layers } from 'lucide-react';

export default function CostCharts({ results, vehicles }) {
  const [activeTab, setActiveTab] = useState('breakdown'); // 'breakdown' | 'evolution'

  if (!results || results.length === 0) return null;

  // Prepare Breakdown Data for Stacked Bar Chart
  const breakdownData = results.map(res => {
    const veh = vehicles.find(v => v.id === res.vehicule_id) || { marque: '', modele: res.vehicule_id };
    return {
      name: `${veh.marque} ${veh.modele}`,
      carburant: res.detail?.carburant || 0,
      entretien: res.detail?.entretien || 0,
      assurance: res.detail?.assurance || 0,
      decote: res.detail?.decote_estimee || 0,
      autres: res.detail?.autres || 0,
      total: res.cout_total
    };
  });

  // Prepare Evolution Data for Line Chart
  const maxYears = results[0]?.evolution_annuelle?.length || 5;
  const evolutionData = [];

  for (let i = 0; i < maxYears; i++) {
    const yearNumber = i + 1;
    const dataPoint = { year: `Année ${yearNumber}` };

    results.forEach(res => {
      const veh = vehicles.find(v => v.id === res.vehicule_id) || { marque: '', modele: res.vehicule_id };
      const label = `${veh.marque} ${veh.modele}`;
      const yearStat = res.evolution_annuelle?.find(e => e.annee === yearNumber);
      dataPoint[label] = yearStat ? yearStat.cout_cumule : 0;
    });

    evolutionData.push(dataPoint);
  }

  const COLORS = ['#d97706', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-white/15 p-4 rounded-xl shadow-2xl backdrop-blur-md text-xs font-sans">
          <p className="font-bold text-white mb-2 border-b border-white/10 pb-1.5 text-sm">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-300 font-medium" style={{ color: entry.color }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                  {entry.name} :
                </span>
                <span className="font-bold font-mono text-white text-xs">{entry.value.toLocaleString('fr-FR')} €</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="glass-card p-6 md:p-8 mb-8 border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 text-base font-extrabold flex items-center justify-center border border-amber-500/40 shrink-0 font-mono">
            3
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Analyse Graphique Interactive
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Visualisez la ventilation détaillée des coûts et leur projection annuelle.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('breakdown')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 ${
              activeTab === 'breakdown'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-900/40 border border-amber-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Répartition par poste
          </button>
          <button
            onClick={() => setActiveTab('evolution')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 ${
              activeTab === 'evolution'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-900/40 border border-amber-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Évolution annuelle
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[420px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'breakdown' ? (
            <BarChart data={breakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} dy={10} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v / 1000}k €`} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              <Bar dataKey="carburant" name="Carburant / Électricité" stackId="a" fill="#10b981" />
              <Bar dataKey="entretien" name="Entretien" stackId="a" fill="#d97706" />
              <Bar dataKey="assurance" name="Assurance" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="decote" name="Décote estimée" stackId="a" fill="#06b6d4" />
              <Bar dataKey="autres" name="Autres frais" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={evolutionData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} dy={10} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v / 1000}k €`} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              {results.map((res, index) => {
                const veh = vehicles.find(v => v.id === res.vehicule_id) || { marque: '', modele: res.vehicule_id };
                const name = `${veh.marque} ${veh.modele}`;
                return (
                  <Line
                    key={res.vehicule_id}
                    type="monotone"
                    dataKey={name}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={3}
                    dot={{ r: 5, fill: COLORS[index % COLORS.length], strokeWidth: 2, stroke: '#070c18' }}
                    activeDot={{ r: 8 }}
                  />
                );
              })}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
