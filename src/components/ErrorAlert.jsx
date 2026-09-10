import { AlertCircle, RefreshCw, X } from 'lucide-react';
export default function ErrorAlert({ error, onDismiss, onRetry }) {
  if (!error) return null;
  return <div className="error-alert" role="alert"><AlertCircle size={21} /><div><strong>{error.status === 429 ? 'Un instant avant de continuer' : error.status === 404 ? 'Un véhicule n’est plus disponible' : error.status === 400 ? 'Vérifiez vos paramètres' : 'Nous n’avons pas pu terminer'}</strong><p>{error.message || 'Une erreur est survenue. Veuillez réessayer.'}{error.retryAfter ? ` Délai indiqué : ${error.retryAfter} secondes.` : ''}</p></div><div className="error-actions">{onRetry && <button className="button button-outline" onClick={onRetry}><RefreshCw size={14} /> Réessayer</button>}<button className="icon-button" onClick={onDismiss} aria-label="Fermer le message"><X size={18} /></button></div></div>;
}
