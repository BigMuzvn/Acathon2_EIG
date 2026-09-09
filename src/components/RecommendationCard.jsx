import React from 'react';
import { Trophy, TrendingDown, Sparkles, Zap, ArrowDownRight } from 'lucide-react';

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
    <div className="glass-card p-6 mb-8 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-blue-950/40 relative overflow-hidden shadow-2xl">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        {/* Left Info */}
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-electric text-xs">
                <Sparkles className="w-3 h-3 inline mr-1" /> Choix Optimal Économique
              </span>
            </div>
            
            <h3 className="text-xl md:text-2xl font-extrabold text-white">
              {bestVeh.marque} {bestVeh.modele}
            </h3>

            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
              Sur votre profil de simulation, ce véhicule offre le TCO le plus bas à{' '}
              <strong className="text-emerald-400 font-mono">{bestResult.cout_mensuel_moyen} €/mois</strong>{' '}
              ({bestResult.cout_par_km} €/km).
            </p>
          </div>
        </div>

        {/* Right Savings Stat */}
        {results.length > 1 && savingsTotal > 0 && (
          <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl self-stretch md:self-auto justify-between">
            <div>
              <span className="text-xs text-emerald-300 font-medium block">Économie max estimée</span>
              <div className="flex items-baseline gap-1 text-2xl font-extrabold text-emerald-400 font-mono">
                <span>-{savingsTotal.toLocaleString('fr-FR')} €</span>
              </div>
            </div>

            <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/40 rounded-lg text-emerald-300 text-xs font-bold font-mono flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4" />
              <span>{savingsPercent}%</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
