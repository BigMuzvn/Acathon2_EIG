import React from 'react';
import { AlertTriangle, AlertCircle, RefreshCw, X } from 'lucide-react';

export default function ErrorAlert({ error, onDismiss, onRetry }) {
  if (!error) return null;

  const getStyle = () => {
    switch (error.status) {
      case 400:
        return {
          bg: 'bg-amber-950/60 border-amber-500/40 text-amber-200',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
          title: 'Paramètres invalides (Code 400)'
        };
      case 404:
        return {
          bg: 'bg-rose-950/60 border-rose-500/40 text-rose-200',
          icon: <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />,
          title: 'Véhicule introuvable (Code 404)'
        };
      case 500:
      default:
        return {
          bg: 'bg-red-950/60 border-red-500/50 text-red-200',
          icon: <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
          title: 'Erreur serveur API (Code 500)'
        };
    }
  };

  const style = getStyle();

  return (
    <div className={`p-4 rounded-xl border mb-6 flex items-start justify-between gap-4 shadow-xl backdrop-blur-md transition-all ${style.bg}`}>
      <div className="flex items-start gap-3">
        {style.icon}
        <div>
          <h4 className="text-sm font-bold tracking-tight mb-0.5">{style.title}</h4>
          <p className="text-xs text-slate-300 leading-relaxed">{error.message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn btn-secondary text-xs py-1.5 px-3 bg-white/10 hover:bg-white/20 border-white/20 text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Réessayer
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
