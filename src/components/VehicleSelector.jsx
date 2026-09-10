import { useState } from 'react';
import { Check, Zap, Fuel, BatteryCharging, Search, Plus, CarFront, X, ArrowDownWideNarrow } from 'lucide-react';
import { CarApiBrowser, CarApiPagination } from './CarApiBrowser';
import { useRef } from 'react';
import { vehicleLabel } from '../../shared/vehicleLabel.js';
import { vehicleIllustration, vehiclePhoto } from '../../shared/vehiclePhotos.js';
const MOTORS = { electrique: { label: 'Électrique', Icon: Zap }, essence: { label: 'Essence', Icon: Fuel }, hybride: { label: 'Hybride', Icon: BatteryCharging }, diesel: { label: 'Diesel', Icon: Fuel } };
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const STUDIO_IMAGES = { veh_001: 'clio', veh_002: 'megane', veh_003: 'e208', veh_004: 'yaris', veh_005: 'model3', veh_006: 'golf' };
function VehicleImage({ vehicle, isMock }) {
  const [failedSource, setFailedSource] = useState(null);
  const photo = !isMock && vehiclePhoto(vehicle);
  const illustration = !isMock && !photo ? vehicleIllustration(vehicle) : null;
  const source = isMock && STUDIO_IMAGES[vehicle.id] ? `/images/${STUDIO_IMAGES[vehicle.id]}.webp` : photo?.src || illustration?.src || vehicle.image_url;
  const className = photo ? 'verified-photo' : illustration ? 'illustrative-photo' : undefined;
  return source && failedSource !== source ? <><img className={className} src={source} alt={photo ? `${photo.title} ; finition et couleur indicatives` : illustration ? `Illustration fictive générique ; catégorie ${illustration.label}` : ''} loading="lazy" decoding="async" width="512" height="330" onError={() => setFailedSource(source)} />{photo && <span className="vehicle-photo-label">Photo du modèle · 2018</span>}{illustration && <span className="vehicle-photo-label illustration-label">Illustration fictive · {illustration.label}</span>}</> : <div className="vehicle-image-placeholder"><CarFront size={64} strokeWidth={1} /><span>Visuel indisponible</span></div>;
}
export default function VehicleSelector({ vehicles, selectedIds, onToggleVehicle, loading, isMock, meta, catalogQuery, onBrowse }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('default');
  const heading = useRef(null);
  const browse = nextQuery => {
    if (['year', 'make', 'model'].some(key => String(nextQuery[key] || '') !== String(catalogQuery?.[key] || (key === 'year' ? meta?.year : '') || ''))) {
      setQuery(''); setFilter('all');
    }
    // Move before loading changes the page layout; keep the current cards in place.
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    onBrowse(nextQuery);
  };
  const filtered = vehicles.filter(v => (filter === 'all' || normalize(v.motorisation) === filter) && normalize(`${v.marque} ${v.modele} ${v.motorisation}`).includes(normalize(query.trim())));
  if (sort === 'price') filtered.sort((a, b) => (a.prix_achat ?? Infinity) - (b.prix_achat ?? Infinity));
  if (sort === 'brand') filtered.sort((a, b) => `${a.marque} ${a.modele}`.localeCompare(`${b.marque} ${b.modele}`, 'fr'));
  const photos = [...new Set(filtered.map(vehiclePhoto).filter(Boolean))];
  return <section className="catalog-panel" aria-labelledby="catalog-title" aria-busy={loading}>
    <div className="catalog-heading"><div><div className="eyebrow catalog-eyebrow"><span className="section-step">01</span> LE POINT DE DÉPART</div><h2 id="catalog-title" ref={heading} tabIndex={-1}>Lesquelles vous font envie ?</h2><p>Sélectionnez les véhicules que vous souhaitez comparer.</p></div><span className="catalog-count">{vehicles.length} {meta ? 'finitions sur cette page' : 'modèles'}</span></div>
    {meta && <CarApiBrowser meta={meta} loading={loading} onBrowse={browse} />}
    {!!meta?.unavailable?.length && <div className="catalog-partial" role="status"><p>{meta.unavailable.length} fiche{meta.unavailable.length > 1 ? 's' : ''} indisponible{meta.unavailable.length > 1 ? 's' : ''} sur cette page. Les autres véhicules restent consultables.</p><button className="button button-outline" disabled={loading} onClick={() => onBrowse({ ...catalogQuery, year: String(meta.year), page: String(meta.page) })}>Réessayer les fiches</button></div>}
    <div className={meta ? 'page-filter-panel' : undefined}>
    {meta && <div className="page-filter-heading"><div><span>SUR CETTE PAGE UNIQUEMENT</span><h3>Affiner les {vehicles.length} finitions affichées</h3></div><p>{filtered.length} sur {vehicles.length} correspondent à vos filtres. Aucun autre véhicule du catalogue n’est recherché ici.</p></div>}
    <div className="catalog-toolbar"><div className="search-field"><Search size={17} /><input aria-label={meta ? 'Filtrer les véhicules de cette page' : 'Rechercher un véhicule'} type="search" placeholder={meta ? 'Chercher dans cette page…' : 'Une marque, un modèle…'} value={query} onChange={e => setQuery(e.target.value)} />{query && <button onClick={() => setQuery('')} aria-label="Effacer la recherche"><X size={15} /></button>}</div><div className="sort-field"><ArrowDownWideNarrow size={16} /><select aria-label="Trier les véhicules" value={sort} onChange={e => setSort(e.target.value)}><option value="default">{meta ? 'Ordre de la page' : 'Notre sélection'}</option><option value="price">Prix croissant</option><option value="brand">Marque : A à Z</option></select></div></div>
    <div className="motor-filters" role="group" aria-label="Filtrer par motorisation"><button aria-pressed={filter === 'all'} className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Tous les véhicules</button>{Object.entries(MOTORS).map(([id, { label, Icon }]) => <button key={id} aria-pressed={filter === id} className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}><Icon size={14} />{label}</button>)}</div>
    </div>
    {loading && <span className="sr-only" role="status">Chargement des véhicules…</span>}
    {loading && !vehicles.length ? <div className="vehicle-grid" aria-label="Chargement des véhicules">{[0, 1, 2, 3, 4, 5].map(n => <div className="vehicle-skeleton" key={n}><div className="skeleton-image" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div> : filtered.length ? <div className="vehicle-grid">{filtered.map(vehicle => {
      const selected = selectedIds.includes(vehicle.id);
      const motorId = normalize(vehicle.motorisation);
      const { label, Icon } = MOTORS[motorId] || { label: vehicle.motorisation, Icon: CarFront };
      return <button key={vehicle.id} className={`vehicle-card ${selected ? 'is-selected' : ''}`} disabled={loading || vehicle.simulable === false} title={vehicle.description || undefined} aria-pressed={selected} aria-label={`${selected ? 'Retirer' : 'Ajouter'} ${vehicleLabel(vehicle)} ${selected ? 'du' : 'au'} comparatif${vehicle.indisponibilite ? ` : ${vehicle.indisponibilite}` : ''}`} onClick={() => onToggleVehicle(vehicle.id)}>
        <span className="vehicle-media"><VehicleImage vehicle={vehicle} isMock={isMock} /><span className={`motor-badge motor-${motorId}`}><Icon size={12} />{label}</span><span className="vehicle-check">{selected ? <Check size={14} strokeWidth={3} /> : <Plus size={15} />}</span></span>
        <span className="vehicle-body"><span className="vehicle-brand">{vehicle.marque}</span><span className="vehicle-name">{vehicle.modele}</span>{vehicle.source === 'carapi' && <span className="vehicle-trim">{vehicle.description}</span>}<span className="vehicle-specs">{vehicle.annee || 'Année non renseignée'}<span>•</span>{vehicle.consommation_moyenne != null ? `${vehicle.consommation_moyenne.toLocaleString('fr-FR')} ${motorId === 'electrique' ? 'kWh' : 'L'}/100 km` : 'Consommation non renseignée'}</span><span className="vehicle-price-row"><span>{vehicle.source === 'carapi' ? 'Référence convertie' : 'Prix d’achat'}<strong>{vehicle.prix_achat != null ? `${vehicle.prix_achat.toLocaleString('fr-FR')} €` : 'Non renseigné'}</strong></span><span className={`vehicle-select-label ${selected ? 'selected' : ''}`}>{vehicle.simulable === false ? 'Non comparable' : selected ? <><Check size={12} /> Sélectionné</> : <>Comparer <Plus size={12} /></>}</span></span>{vehicle.source === 'carapi' && <span className="vehicle-source-price">{vehicle.msrp_usd ? `MSRP ${vehicle.annee} : ${vehicle.msrp_usd.toLocaleString('fr-FR')} $ US` : 'MSRP indisponible'}{vehicle.indisponibilite && <span>{vehicle.indisponibilite}</span>}</span>}</span>
      </button>;
    })}</div> : <div className="empty-catalog"><Search size={29} /><h3>{vehicles.length ? 'Aucun modèle trouvé' : 'Le catalogue est vide'}</h3><p>{vehicles.length ? 'Essayez une autre recherche ou une autre motorisation.' : 'Rechargez le catalogue pour retrouver les véhicules disponibles.'}</p>{vehicles.length > 0 && <button className="button button-outline" onClick={() => { setQuery(''); setFilter('all'); }}>Afficher tous les véhicules</button>}</div>}
    {meta && <CarApiPagination meta={meta} loading={loading} query={catalogQuery} onBrowse={browse} />}
    <div className="catalog-caption"><span>{isMock ? 'Illustrations générées, non contractuelles.' : 'Photos documentées ou illustrations fictives génériques · finition et couleur peuvent différer.'}</span><span>{filtered.length} véhicule{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</span></div>
    {photos.length > 0 && <details className="photo-credits"><summary>Sources et crédits des photos ({photos.length})</summary><p>Photos de modèles de 2018, utilisées pour illustrer les générations 2018–2020. Elles ne représentent pas nécessairement la finition, les équipements ou la couleur sélectionnés. Miniatures Wikimedia, sans retouche, hébergées localement.</p><ul>{photos.map(photo => <li key={photo.src}><a href={photo.source} target="_blank" rel="noreferrer">{photo.title}</a> — {photo.author} · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a></li>)}</ul></details>}
  </section>;
}
