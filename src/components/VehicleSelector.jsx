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
        return <span className="badge bg-slate-100 text-slate-800 border border-slate-300">{motorisation}</span>;
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 mb-8">
        <div className="h-6 w-48 skeleton mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-52 skeleton rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="glass-card p-6 md:p-8 mb-8 border-slate-200 shadow-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white text-sm font-black flex items-center justify-center shrink-0 font-mono shadow-xs">
            1
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Sélectionnez les véhicules à comparer
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5">
              Cliquez sur une carte pour ajouter ou retirer un modèle du comparateur.
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 shrink-0">
          <span className="text-xs text-slate-600 font-medium">Sélectionnés :</span>
          <span className="text-sm font-extrabold text-slate-900 font-mono">
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
            className="form-input pl-10 text-sm py-2.5 bg-white border-slate-300"
          />
        </div>

        {/* Motorisation Pills (Lucide SVG, ZERO Emojis) */}
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
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 active:scale-95 flex items-center ${
                filterMotorisation === btn.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {btn.icon}
              <span>{btn.label}</span>
            </button>
          ))}
        </div>

      </div>

      {/* Vehicle Cards Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
          <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 text-sm">Aucun véhicule ne correspond à vos critères de recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map(veh => {
            const isSelected = selectedIds.includes(veh.id);

            return (
              <div
                key={veh.id}
                onClick={() => onToggleVehicle(veh.id)}
                className={`glass-card glass-card-interactive group relative flex flex-col justify-between overflow-hidden rounded-2xl border active:scale-[0.98] transition-all duration-150 ${
                  isSelected 
                    ? 'glass-card-selected' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {/* Image Banner */}
                {veh.image_url && (
                  <div className="h-36 w-full relative overflow-hidden bg-slate-100 border-b border-slate-100">
                    <img 
                      src={veh.image_url} 
                      alt={`${veh.marque} ${veh.modele}`} 
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Top Motor Badge */}
                    <div className="absolute top-3 left-3">
                      {getMotorBadge(veh.motorisation)}
                    </div>
                  </div>
                )}

                {/* Checkbox Indicator */}
                <div className={`absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isSelected 
                    ? 'bg-slate-900 text-white shadow-sm scale-100' 
                    : 'bg-white/90 border border-slate-300 text-transparent scale-90'
                }`}>
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>

                {/* Card Content Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {!veh.image_url && (
                      <div className="mb-2">
                        {getMotorBadge(veh.motorisation)}
                      </div>
                    )}
                    <span className="text-[11px] uppercase tracking-widest text-slate-500 font-extrabold block mb-0.5">
                      {veh.marque}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {veh.modele}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between py-3 my-3 border-t border-b border-slate-100 gap-2">
                    <span className="text-xs text-slate-500 font-medium">Prix d'achat :</span>
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      {veh.prix_achat ? veh.prix_achat.toLocaleString('fr-FR') + ' €' : 'N/A'}
                    </span>
                  </div>

                  {/* Specs Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono">
                    <span>Conso : <strong className="text-slate-900">{veh.consommation_moyenne}</strong> {veh.motorisation === 'electrique' ? 'kWh/100km' : 'L/100km'}</span>
                    <span>Année : <strong className="text-slate-900">{veh.annee}</strong></span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
