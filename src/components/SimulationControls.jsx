import React from 'react';
import { Calendar, Gauge, Sparkles, Building2, Car, Route, Clock, Globe } from 'lucide-react';

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
    { label: 'Urbain Modéré', km: 8000, years: 3, icon: <Building2 className="w-3.5 h-3.5 text-slate-700" /> },
    { label: 'Standard / Mixte', km: 15000, years: 5, icon: <Car className="w-3.5 h-3.5 text-slate-700" /> },
    { label: 'Grand Rouleur', km: 30000, years: 4, icon: <Route className="w-3.5 h-3.5 text-slate-700" /> },
    { label: 'Long Terme', km: 20000, years: 8, icon: <Clock className="w-3.5 h-3.5 text-slate-700" /> },
  ];

  return (
    <section className="glass-card p-6 md:p-8 mb-8 border-slate-200 shadow-xs">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white text-sm font-black flex items-center justify-center shrink-0 font-mono shadow-xs">
            2
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Ajustez vos paramètres d'utilisation
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5">
              Les coûts se recalculent automatiquement lorsque vous déplacez les curseurs.
            </p>
          </div>
        </div>

        {/* Quick Presets (Lucide Icons, ZERO Emojis) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Profils :
          </span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onApplyPreset(p.km, p.years)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs rounded-xl border border-slate-300 transition-all duration-150 font-semibold flex items-center gap-1.5"
            >
              {p.icon}
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kilométrage Annuel */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-slate-700 shrink-0" /> Kilométrage annuel
            </label>
            <span className="text-sm font-bold text-slate-900 font-mono bg-white px-3 py-1 rounded-lg border border-slate-300 shadow-xs shrink-0">
              {params.kilometrage_annuel.toLocaleString('fr-FR')} km/an
            </span>
          </div>

          <div className="py-2">
            <input
              type="range"
              min="2000"
              max="60000"
              step="1000"
              value={params.kilometrage_annuel}
              onChange={handleSliderKm}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex justify-between text-xs text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200">
            <span>2 000 km</span>
            <span>30 000 km</span>
            <span>60 000 km</span>
          </div>
        </div>

        {/* Durée de possession */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-700 shrink-0" /> Durée de possession
            </label>
            <span className="text-sm font-bold text-slate-900 font-mono bg-white px-3 py-1 rounded-lg border border-slate-300 shadow-xs shrink-0">
              {params.duree_annees} {params.duree_annees > 1 ? 'ans' : 'an'}
            </span>
          </div>

          <div className="py-2">
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={params.duree_annees}
              onChange={handleSliderYears}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex justify-between text-xs text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200">
            <span>1 an</span>
            <span>5 ans</span>
            <span>12 ans</span>
          </div>
        </div>

        {/* Région / Pays (Lucide Globe Icon, ZERO Emojis) */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-700 shrink-0" /> Région & Prix Énergie
            </label>
            <span className="text-xs text-slate-600 font-mono font-semibold">Tarif local</span>
          </div>

          <select
            value={params.region}
            onChange={handleRegionChange}
            className="form-select text-sm py-2.5 my-1 bg-white border-slate-300"
          >
            <option value="FR">France (Tarif Standard)</option>
            <option value="BE">Belgique (Taxes & énergie moyenne)</option>
            <option value="DE">Allemagne (Énergie haute)</option>
            <option value="CH">Suisse (Tarifs majorés)</option>
            <option value="ES">Espagne (Région Sud)</option>
          </select>

          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
            Ajuste automatiquement les coûts de carburant et d'électricité.
          </p>
        </div>

      </div>
    </section>
  );
}
