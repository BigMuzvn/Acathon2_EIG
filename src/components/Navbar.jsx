import { ArrowUpRight, ArrowLeftRight, Download, LoaderCircle } from 'lucide-react';
export default function Navbar({ onExport, isExporting, canExport }) {
  return <header className="site-header"><div className="page-width nav-inner">
    <a className="brand" href="#accueil" aria-label="AutoCompare, accueil"><span className="brand-mark"><ArrowLeftRight size={21} strokeWidth={2.5} /></span><span>auto<span className="brand-light">compare</span><span className="brand-dot">.</span></span></a>
    <nav className="main-nav" aria-label="Navigation principale"><a className="nav-active" href="#comparateur">Le comparateur</a><a href="#methode">Comment ça marche <ArrowUpRight size={13} /></a></nav>
    <button className="button button-outline nav-export" aria-label={isExporting ? 'Création du PDF…' : 'Exporter mon comparatif'} onClick={onExport} disabled={!canExport || isExporting}>{isExporting ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />}<span>{isExporting ? 'Création du PDF…' : 'Exporter mon comparatif'}</span></button>
  </div></header>;
}
