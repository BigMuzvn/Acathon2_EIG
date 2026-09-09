import React from 'react';
import { CarFront, ShieldCheck, Gauge, TrendingUp, Sparkles } from 'lucide-react';

export default function HeroBanner({ vehicleCount }) {
  return (
    <div className="glass-card mb-8 p-6 md:p-10 border-slate-200 bg-white relative overflow-hidden shadow-sm no-print">
      
      <div className="max-w-4xl relative z-10">
        
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>Simulateur d'usage & budget automobile</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight mb-4">
          Combien vous coûte vraiment votre <span className="text-amber-800 underline decoration-amber-300 underline-offset-4">voiture au quotidien</span> ?
        </h1>

        {/* Subtitle */}
        <p className="text-base text-slate-600 leading-relaxed max-w-2xl mb-8">
          Ne vous fiez pas uniquement au prix d'achat. Calculez les vraies dépenses sur 1 à 12 ans : carburant ou électricité, assurance, entretien et dépréciation.
        </p>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-2">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 shadow-xs">
              <CarFront className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Catalogue</span>
              <strong className="text-sm font-bold text-slate-900 font-mono">{vehicleCount} Modèles</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 shadow-xs">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Calcul</span>
              <strong className="text-sm font-bold text-slate-900 font-mono">Au km près</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Projection</span>
              <strong className="text-sm font-bold text-slate-900 font-mono">1 à 12 ans</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Dépenses</span>
              <strong className="text-sm font-bold text-slate-900 font-mono">5 Postes clés</strong>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
