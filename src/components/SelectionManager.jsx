import { useRef } from 'react';
import { X, ListChecks } from 'lucide-react';
import { vehicleLabel } from '../../shared/vehicleLabel.js';

export default function SelectionManager({ vehicles, selectedIds, onRemove }) {
  const container = useRef(null);
  const remove = (id, index) => {
    // Keep keyboard focus in the list when its focused removal button disappears.
    const buttons = container.current?.querySelectorAll('button') || [];
    (buttons[index + 1] || buttons[index - 1] || container.current?.querySelector('summary'))?.focus({ preventScroll: true });
    onRemove(id);
  };
  return <details className="selection-manager" ref={container}>
    <summary><ListChecks size={19} /><span>Ma sélection ({selectedIds.length})</span><small>Consulter et retirer mes véhicules</small></summary>
    <p className="selection-manager-intro">Tous vos véhicules, y compris ceux sélectionnés sur d’autres pages.</p>
    {selectedIds.length ? <ul className="selection-manager-list">{selectedIds.map((id, index) => {
      const vehicle = vehicles.find(item => item.id === id);
      return <li key={id}><span className="selection-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{vehicleLabel(vehicle, { details: false })}</strong>{vehicle?.description && <p>{vehicle.description}</p>}{vehicle?.indisponibilite && <p>{vehicle.indisponibilite}</p>}</div><button className="icon-button" onClick={() => remove(id, index)} aria-label={`Retirer ${vehicleLabel(vehicle)} de ma sélection`}><X size={18} /></button></li>;
    })}</ul> : <p className="selection-manager-intro" role="status">Votre sélection est vide. Choisissez un véhicule dans le catalogue.</p>}
  </details>;
}
