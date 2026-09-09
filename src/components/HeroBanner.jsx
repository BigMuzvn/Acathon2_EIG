import React from 'react';
import { CarFront, ShieldCheck, Gauge, TrendingUp, Sparkles, ChevronDown } from 'lucide-react';

export default function HeroBanner({ vehicleCount, onScrollToSelector }) {
  return (
    <div className="glass-card mb-8 p-6 md:p-10 border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 relative overflow-hidden shadow-2xl no-print">
      
      {/* Background Decorative Ambient Blur */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl relative z-10">
        
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-extrabold uppercase tracking-wider mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Plateforme Haute Précision · TCO 2025</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-none mb-4">
          Comparez le coût réel de votre <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-white bg-clip-text text-transparent">futur véhicule</span>.
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mb-8">
          Analyse financière complète sur mesure : dépréciation, carburant/électricité, assurance et entretien calculés en temps réel.
        </p>

        {/* Floating Stats Bar (Shakuro Style) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-950/80 rounded-2xl border border-white/10 shadow-inner mb-6">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
              <CarFront className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Catalogue</span>
              <strong className="text-sm font-extrabold text-white font-mono">{vehicleCount} Modèles</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Précision</span>
              <strong className="text-sm font-extrabold text-white font-mono">Au km près</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/15 border border-cyan-500/30 rounded-xl text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Projection</span>
              <strong className="text-sm font-extrabold text-white font-mono">1 à 12 ans</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Postes de coût</span>
              <strong className="text-sm font-extrabold text-white font-mono">5 Dépenses</strong>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
