import { useEffect, useState } from 'react';
import { Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { getCatalogueOptions } from '../services/api';
import CatalogueAutocomplete from './CatalogueAutocomplete';

function useSuggestions(year, make = '', enabled = true) {
  const key = `${year}:${make}`;
  const [response, setResponse] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      getCatalogueOptions({ year, make, signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setResponse({ key, data }); })
        .catch(() => { if (!controller.signal.aborted) setResponse({ key, error: true }); });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [year, make, enabled, key]);
  return enabled && response?.key === key ? response : null;
}

export function CarApiBrowser({ meta, loading, onBrowse }) {
  const [year, setYear] = useState('2020');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const validYear = Number.isInteger(Number(year)) && Number(year) >= (meta.access === 'public' ? 2015 : 1900) && Number(year) <= (meta.access === 'public' ? 2020 : new Date().getFullYear() + 1);
  const brands = useSuggestions(year, '', validYear);
  const canonicalMake = brands?.data?.makes.find(item => item.toLowerCase() === make.trim().toLowerCase());
  const models = useSuggestions(year, canonicalMake || '', validYear && !!canonicalMake);
  return <div className="carapi-browser">
    <div className="search-scope"><span>TOUT LE CATALOGUE</span><h3>Trouvez votre modèle</h3><p>Recherchez parmi toutes les finitions du millésime choisi, sur toutes les pages.</p></div>
    <div className="carapi-source"><strong>Catalogue CarAPI · {meta.access === 'public' ? 'Accès public 2015–2020' : 'Accès avec compte'}</strong><a href="https://carapi.app/docs/api/trims/" target="_blank" rel="noreferrer">Source des données ↗</a></div>
    <p>Véhicules du marché américain. Les prix sont des tarifs catalogue historiques (MSRP), convertis avec l’hypothèse fixe 1 $ = {meta.usdToEur.toLocaleString('fr-FR')} €. Ce ne sont pas des prix de vente actuels en Europe.</p>
    <form className="remote-search" onSubmit={event => { event.preventDefault(); onBrowse({ year, make: make.trim(), model: model.trim(), page: '1' }); }}>
      <label>Millésime<input aria-label="Millésime CarAPI" type="number" required min={meta.access === 'public' ? 2015 : 1900} max={meta.access === 'public' ? 2020 : new Date().getFullYear() + 1} value={year} onChange={e => { setYear(e.target.value); setModel(''); }} /></label>
      <CatalogueAutocomplete label="Marque" name="Marque CarAPI" placeholder="Ex. Toyota, Tesla" value={make} onChange={value => { setMake(value); setModel(''); }} options={brands?.data?.makes || []} />
      <CatalogueAutocomplete label="Modèle" name="Modèle CarAPI" placeholder={make ? 'Ex. Camry, Model 3' : 'Choisissez une marque'} value={model} onChange={setModel} options={models?.data?.models || []} />
      <button className="button button-dark" type="submit" disabled={loading}><Search size={15} />Rechercher</button>
    </form>
    <small role="status">{brands?.error || models?.error ? 'Suggestions temporairement indisponibles. Vous pouvez toujours saisir une marque et un modèle librement.' : canonicalMake && !models ? 'Chargement des modèles…' : 'Suggestions adaptées au millésime et à la marque. La saisie libre reste possible.'}</small>
  </div>;
}

export function CarApiPagination({ meta, loading, query, onBrowse }) {
  const navigate = page => onBrowse({ ...query, year: String(meta.year), page: String(page) });
  return <nav className="catalog-pagination" aria-label="Pagination des véhicules">
    <p aria-live="polite">{meta.total.toLocaleString('fr-FR')} finitions dans cette recherche · page {meta.page} sur {Math.max(meta.pages, 1)}</p>
    <div className="catalog-page-buttons">
      <button className="button button-outline" disabled={loading || meta.page <= 1} onClick={() => navigate(meta.page - 1)}><ArrowLeft size={15} />Précédent</button>
      <button className="button button-outline" disabled={loading || !meta.hasMore} onClick={() => navigate(meta.page + 1)}>Suivant<ArrowRight size={15} /></button>
    </div>
    {meta.pages > 1 && <PageJump key={`${meta.page}:${meta.pages}:${meta.year}:${query?.make}:${query?.model}`} page={meta.page} pages={meta.pages} loading={loading} navigate={navigate} />}
  </nav>;
}

function PageJump({ page, pages, loading, navigate }) {
  const [target, setTarget] = useState(String(page));
  return <form className="page-jump" onSubmit={event => {
    event.preventDefault();
    const next = Number(target);
    if (Number.isInteger(next) && next >= 1 && next <= pages && next !== page && !loading) navigate(next);
  }}><label htmlFor="catalog-page-target">Aller à la page</label><input id="catalog-page-target" type="number" inputMode="numeric" min="1" max={pages} step="1" required value={target} disabled={loading} onChange={event => setTarget(event.target.value)} /><span>sur {pages}</span><button className="button button-dark" disabled={loading || Number(target) === page} type="submit">Aller</button></form>;
}
