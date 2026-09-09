import React from 'react';
import { Calendar, MapPin, Gauge, Sparkles, Building2, Car, Route, Clock, Globe } from 'lucide-react';

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
    { label: 'Urbain Modéré', km: 8000, years: 3, icon: <Building2 className="w-3.5 h-3.5 text-amber-400" /> },
    { label: 'Standard / Mixte', km: 15000, years: 5, icon: <Car className="w-3.5 h-3.5 text-amber-400" /> },
    { label: 'Grand Rouleur', km: 30000, years: 4, icon: <Route className="w-3.5 h-3.5 text-amber-400" /> },
    { label: 'Long Terme', km: 20000, years: 8, icon: <Clock className="w-3.5 h-3.5 text-amber-400" /> },
  ];

  return (
    <section className="glass-card p-6 md:p-8 mb-8 border border-white/10 shadow-2xl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 text-base font-extrabold flex items-center justify-center border border-amber-500/40 shrink-0 font-mono">
            2
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Paramètres de votre profil de conduite
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              La simulation se met à jour en temps réel lors du déplacement des curseurs.
            </p>
          </div>
        </div>

        {/* Quick Presets (Lucide Icons, ZERO Emojis) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Presets :
          </span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onApplyPreset(p.km, p.years)}
              className="px-3 py-1.5 bg-slate-800/90 hover:bg-amber-600/25 hover:border-amber-500/50 active:scale-95 text-slate-200 text-xs rounded-xl border border-white/10 transition-all duration-150 font-semibold flex items-center gap-1.5 shadow-sm"
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
        <div className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-3">
            <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-amber-400 shrink-0" /> Kilométrage annuel
            </label>
            <span className="text-sm font-bold text-amber-400 font-mono bg-amber-500/15 px-3 py-1 rounded-lg border border-amber-500/30 shrink-0">
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
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex justify-between text-xs text-slate-400 font-mono mt-2 pt-2 border-t border-white/5">
            <span>2 000 km</span>
            <span>30 000 km</span>
            <span>60 000 km</span>
          </div>
        </div>

        {/* Durée de possession */}
        <div className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-3">
            <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" /> Durée de possession
            </label>
            <span className="text-sm font-bold text-amber-400 font-mono bg-amber-500/15 px-3 py-1 rounded-lg border border-amber-500/30 shrink-0">
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
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex justify-between text-xs text-slate-400 font-mono mt-2 pt-2 border-t border-white/5">
            <span>1 an</span>
            <span>5 ans</span>
            <span>12 ans</span>
          </div>
        </div>

        {/* Région / Pays (Lucide Globe Icon, NO Emojis) */}
        <div className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-3">
            <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400 shrink-0" /> Région / Tarif Énergie
            </label>
            <span className="text-xs text-amber-400 font-mono font-semibold">Tarif local</span>
          </div>

          <select
            value={params.region}
            onChange={handleRegionChange}
            className="form-select text-sm py-2.5 my-1"
          >
            <option value="FR">France (Tarif Standard)</option>
            <option value="BE">Belgique (Taxes & énergie moyenne)</option>
            <option value="DE">Allemagne (Énergie haute)</option>
            <option value="CH">Suisse (Tarifs majorés)</option>
            <option value="ES">Espagne (Région Sud)</option>
          </select>

          <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-white/5">
            Impacte l'estimation du tarif au litre et au kWh.
          </p>
        </div>

      </div>
    </section>
  );
}
