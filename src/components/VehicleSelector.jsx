import React, { useState } from 'react';
import { Check, Zap, Flame, Search, Info } from 'lucide-react';

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
        return <span className="badge badge-electric"><Zap className="w-3 h-3 inline mr-1" /> Électrique</span>;
      case 'essence':
        return <span className="badge badge-essence"><Flame className="w-3 h-3 inline mr-1" /> Essence</span>;
      case 'hybride':
        return <span className="badge badge-hybride"><Zap className="w-3 h-3 inline mr-1" /> Hybride</span>;
      case 'diesel':
        return <span className="badge badge-diesel"><Flame className="w-3 h-3 inline mr-1" /> Diesel</span>;
      default:
        return <span className="badge bg-slate-700 text-slate-300">{motorisation}</span>;
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 mb-8">
        <div className="h-6 w-48 skeleton mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-36 skeleton rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="glass-card p-6 mb-8 border border-white/10 shadow-2xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-extrabold border border-blue-500/40 shrink-0">
              1
            </span>
            <span>Sélection des véhicules à comparer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Sélectionnez 1 ou plusieurs véhicules pour lancer la simulation comparative.
          </p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-xl border border-white/10 shrink-0">
          <span className="text-xs text-slate-400 font-medium">Sélectionnés :</span>
          <span className="text-sm font-bold text-blue-400 font-mono">
            {selectedIds.length} / {vehicles.length}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher marque, modèle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input pl-10 text-sm"
          />
        </div>

        {/* Motorisation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'electrique', label: '⚡ Électrique' },
            { id: 'essence', label: '⛽ Essence' },
            { id: 'hybride', label: '🔋 Hybride' },
            { id: 'diesel', label: '🚗 Diesel' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterMotorisation(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterMotorisation === btn.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
          <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Aucun véhicule ne correspond à vos critères de recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map(veh => {
            const isSelected = selectedIds.includes(veh.id);

            return (
              <div
                key={veh.id}
                onClick={() => onToggleVehicle(veh.id)}
                className={`glass-card glass-card-interactive p-4 relative overflow-hidden transition-all duration-200 ${
                  isSelected ? 'glass-card-selected' : 'hover:border-slate-700'
                }`}
              >
                {/* Selection Checkmark */}
                <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40' : 'bg-slate-800/80 border border-white/10 text-transparent'
                }`}>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>

                <div className="flex items-start justify-between mb-3 pr-8">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">{veh.marque}</span>
                    <h3 className="text-lg font-bold text-white tracking-tight leading-tight">{veh.modele}</h3>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/5">
                  <div>{getMotorBadge(veh.motorisation)}</div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Prix catalogue :</span>
                    <span className="text-sm font-bold text-slate-200 font-mono">
                      {veh.prix_achat ? veh.prix_achat.toLocaleString('fr-FR') + ' €' : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Additional metrics */}
                <div className="mt-3 text-xs text-slate-400 flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-lg border border-white/5">
                  <span>Conso : <strong className="text-slate-200 font-mono">{veh.consommation_moyenne}</strong> {veh.motorisation === 'electrique' ? 'kWh/100km' : 'L/100km'}</span>
                  <span>Année : <strong className="text-slate-200 font-mono">{veh.annee}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
