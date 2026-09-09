import React from 'react';
import { Sliders, Calendar, MapPin, Gauge, Sparkles } from 'lucide-react';

export default function SimulationControls({ params, onChange, onApplyPreset }) {
  const handleSliderKm = (e) => {
    onChange({ ...params, kilometrage_annuel: Number(e.target.value) });
  };

  const handleSliderYears = (e) => {
    onChange({ ...params, duree_annees: Number(e.target.value) });
  };

  const handleRegionChange = (e) => {
    onChange({ ...params, region: e.target.value });
  };

  const presets = [
    { label: 'Urbain Modéré', km: 8000, years: 3, icon: '🏙️' },
    { label: 'Standard / Mixte', km: 15000, years: 5, icon: '🚘' },
    { label: 'Grand Rouleur', km: 30000, years: 4, icon: '🛣️' },
    { label: 'Long Terme', km: 20000, years: 8, icon: '⏳' },
  ];

  return (
    <section className="glass-card p-6 mb-8 border border-white/10 shadow-2xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-extrabold border border-blue-500/40">2</span>
            Paramètres de votre profil de conduite
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Les résultats se mettent à jour automatiquement dès la modification d'un critère.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Presets rapide:
          </span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onApplyPreset(p.km, p.years)}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-blue-600/30 hover:border-blue-500/50 text-slate-300 text-xs rounded-lg border border-white/10 transition-all font-medium flex items-center gap-1"
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kilométrage Annuel */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-400" /> Kilométrage annuel
            </label>
            <span className="text-base font-bold text-blue-400 font-mono bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
              {params.kilometrage_annuel.toLocaleString('fr-FR')} km/an
            </span>
          </div>

          <input
            type="range"
            min="2000"
            max="60000"
            step="1000"
            value={params.kilometrage_annuel}
            onChange={handleSliderKm}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer my-4"
          />

          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>2 000 km</span>
            <span>30 000 km</span>
            <span>60 000 km</span>
          </div>
        </div>

        {/* Durée de possession */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" /> Durée de possession
            </label>
            <span className="text-base font-bold text-indigo-400 font-mono bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
              {params.duree_annees} {params.duree_annees > 1 ? 'ans' : 'an'}
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="12"
            step="1"
            value={params.duree_annees}
            onChange={handleSliderYears}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer my-4"
          />

          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>1 an</span>
            <span>5 ans</span>
            <span>12 ans</span>
          </div>
        </div>

        {/* Région / Pays */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> Région / Pays (Prix énergie)
            </label>
            <span className="text-xs text-emerald-400 font-mono">FR / BE / DE...</span>
          </div>

          <select
            value={params.region}
            onChange={handleRegionChange}
            className="form-select mt-2 text-sm"
          >
            <option value="FR">🇫🇷 France (Tarif Standard ER)</option>
            <option value="BE">🇧🇪 Belgique (Taxes & énergie moyenne)</option>
            <option value="DE">🇩🇪 Allemagne (Énergie haute)</option>
            <option value="CH">🇨🇭 Suisse (Tarifs majorés)</option>
            <option value="ES">🇪🇸 Espagne (Région Sud)</option>
          </select>

          <p className="text-xs text-slate-400 mt-3">
            Impacte l'estimation du tarif du carburant et du kWh sur le calcul total.
          </p>
        </div>

      </div>
    </section>
  );
}
