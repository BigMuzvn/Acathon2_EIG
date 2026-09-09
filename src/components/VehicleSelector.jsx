import React, { useState } from 'react';
import { Check, Zap, Fuel, BatteryFull, CarFront, Search, Info } from 'lucide-react';

export default function VehicleSelector({ vehicles, selectedIds, onToggleVehicle, loading }) {
  const [filterMotorisation, setFilterMotorisation] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVehicles = vehicles.filter(v => {
    const matchesMotor = filterMotorisation === 'all' || v.motorisation.toLowerCase() === filterMotorisation.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      v.marque.toLowerCase().includes(query) || 
      v.modele.toLowerCase().includes(query) ||
      v.motorisation.toLowerCase().includes(query);
    return matchesMotor && matchesSearch;
  });

  const getMotorBadge = (motorisation) => {
    switch (motorisation.toLowerCase()) {
      case 'electrique':
        return <span className="badge badge-electric"><Zap className="w-3.5 h-3.5" /> Électrique</span>;
      case 'essence':
        return <span className="badge badge-essence"><Fuel className="w-3.5 h-3.5" /> Essence</span>;
      case 'hybride':
        return <span className="badge badge-hybride"><BatteryFull className="w-3.5 h-3.5" /> Hybride</span>;
      case 'diesel':
        return <span className="badge badge-diesel"><CarFront className="w-3.5 h-3.5" /> Diesel</span>;
      default:
        return <span className="badge bg-slate-800 text-slate-300">{motorisation}</span>;
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 mb-8">
        <div className="h-6 w-48 skeleton mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-44 skeleton rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="glass-card p-6 md:p-8 mb-8 border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 text-base font-extrabold flex items-center justify-center border border-amber-500/40 shrink-0 font-mono">
            1
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Sélection des véhicules à comparer
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Cliquez sur les cartes pour ajouter ou retirer un véhicule de la comparaison.
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 px-4 py-2 rounded-xl border border-white/10 shrink-0">
          <span className="text-xs text-slate-400 font-semibold">Sélectionnés :</span>
          <span className="text-sm font-bold text-amber-400 font-mono">
            {selectedIds.length} / {vehicles.length}
          </span>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher marque, modèle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input pl-10 text-sm py-2.5"
          />
        </div>

        {/* Motorisation Pills (Pure Lucide SVG, ZERO Emoji) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
          {[
            { id: 'all', label: 'Tous', icon: null },
            { id: 'electrique', label: 'Électrique', icon: <Zap className="w-3.5 h-3.5 inline mr-1" /> },
            { id: 'essence', label: 'Essence', icon: <Fuel className="w-3.5 h-3.5 inline mr-1" /> },
            { id: 'hybride', label: 'Hybride', icon: <BatteryFull className="w-3.5 h-3.5 inline mr-1" /> },
            { id: 'diesel', label: 'Diesel', icon: <CarFront className="w-3.5 h-3.5 inline mr-1" /> }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterMotorisation(btn.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 flex items-center ${
                filterMotorisation === btn.id
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-900/40 border border-amber-500/50'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white border border-white/10'
              }`}
            >
              {btn.icon}
              <span>{btn.label}</span>
            </button>
          ))}
        </div>

      </div>

      {/* Vehicles Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
          <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Aucun véhicule ne correspond à vos critères de recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map(veh => {
            const isSelected = selectedIds.includes(veh.id);

            return (
              <div
                key={veh.id}
                onClick={() => onToggleVehicle(veh.id)}
                className={`glass-card glass-card-interactive p-5 relative flex flex-col justify-between active:scale-[0.98] transition-all duration-150 ${
                  isSelected ? 'glass-card-selected' : 'hover:border-slate-700'
                }`}
              >
                {/* Checkbox Indicator */}
                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isSelected 
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40 scale-100' 
                    : 'bg-slate-800/80 border border-white/15 text-transparent scale-90'
                }`}>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>

                {/* Card Title & Brand */}
                <div className="mb-4 pr-8">
                  <span className="text-[11px] uppercase tracking-widest text-amber-500/90 font-bold block mb-1">
                    {veh.marque}
                  </span>
                  <h3 className="text-lg font-extrabold text-white leading-snug">
                    {veh.modele}
                  </h3>
                </div>

                {/* Motorisation Badge & Price */}
                <div className="flex items-center justify-between py-3 my-2 border-t border-b border-white/10 gap-2">
                  <div>
                    {getMotorBadge(veh.motorisation)}
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">Prix catalogue :</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {veh.prix_achat ? veh.prix_achat.toLocaleString('fr-FR') + ' €' : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Specs Footer */}
                <div className="flex items-center justify-between text-xs text-slate-300 pt-2 px-3 py-2 bg-slate-950/70 rounded-xl border border-white/5 font-mono">
                  <span>Conso : <strong className="text-white">{veh.consommation_moyenne}</strong> {veh.motorisation === 'electrique' ? 'kWh/100km' : 'L/100km'}</span>
                  <span>Année : <strong className="text-white">{veh.annee}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
