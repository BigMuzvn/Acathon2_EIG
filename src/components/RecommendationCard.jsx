import React from 'react';
import { Trophy, Sparkles, ArrowDownRight } from 'lucide-react';

export default function RecommendationCard({ results, vehicles }) {
  if (!results || results.length === 0) return null;

  // Find lowest cost vehicle
  const sorted = [...results].sort((a, b) => a.cout_total - b.cout_total);
  const bestResult = sorted[0];
  const worstResult = sorted[sorted.length - 1];

  const bestVeh = vehicles.find(v => v.id === bestResult.vehicule_id) || {
    marque: "Véhicule",
    modele: bestResult.vehicule_id
  };

  const savingsTotal = worstResult ? worstResult.cout_total - bestResult.cout_total : 0;
  const savingsPercent = worstResult && worstResult.cout_total > 0
    ? Math.round((savingsTotal / worstResult.cout_total) * 100)
    : 0;

  return (
    <div className="glass-card p-6 md:p-8 mb-8 border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900/95 to-slate-950/90 relative overflow-hidden shadow-2xl">
      {/* Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        {/* Left Info */}
        <div className="flex items-start gap-4">
          <div className="p-4 bg-gradient-to-tr from-amber-600 via-amber-700 to-amber-900 border border-amber-500/50 rounded-2xl text-white shadow-xl shadow-amber-900/30 shrink-0">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="badge badge-electric text-xs py-1 px-3 border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-emerald-400" /> Choix Optimal Économique
              </span>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {bestVeh.marque} {bestVeh.modele}
            </h3>

            <p className="text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
              Sur votre profil de simulation, ce véhicule présente le coût global le plus bas avec{' '}
              <span className="text-amber-400 font-mono font-bold text-base px-1.5 py-0.5 bg-amber-500/15 rounded-md border border-amber-500/30">
                {bestResult.cout_mensuel_moyen} €/mois
              </span>{' '}
              ({bestResult.cout_par_km} €/km).
            </p>
          </div>
        </div>

        {/* Right Savings Stat */}
        {results.length > 1 && savingsTotal > 0 && (
          <div className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/30 p-4 md:p-5 rounded-2xl shrink-0 self-stretch md:self-auto justify-between shadow-lg">
            <div>
              <span className="text-xs text-amber-300 font-semibold block mb-0.5">Économie max estimée</span>
              <div className="text-2xl md:text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
                -{savingsTotal.toLocaleString('fr-FR')} €
              </div>
            </div>

            <div className="px-3.5 py-1.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-200 text-xs font-extrabold font-mono flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4 text-amber-400" />
              <span>{savingsPercent}%</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
