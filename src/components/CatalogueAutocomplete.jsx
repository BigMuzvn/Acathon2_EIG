import { useEffect, useId, useState } from 'react';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function CatalogueAutocomplete({ label, name, value, onChange, options, placeholder }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = options.filter(option => normalize(option).includes(normalize(value.trim())));
  const expanded = open && matches.length > 0;
  useEffect(() => {
    if (expanded && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [expanded, active, id]);
  const choose = option => { onChange(option); setOpen(false); setActive(-1); };
  return <div className="catalogue-autocomplete">
    <label htmlFor={id}>{label}</label>
    <input id={id} aria-label={name} role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-list`} aria-activedescendant={expanded && active >= 0 && active < matches.length ? `${id}-option-${active}` : undefined} placeholder={placeholder} maxLength={80} value={value}
      onFocus={() => { setOpen(true); setActive(-1); }} onBlur={() => setOpen(false)}
      onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1); }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setActive(-1); }
        if (['ArrowDown', 'ArrowUp'].includes(event.key) && matches.length) {
          event.preventDefault(); setOpen(true);
          const next = event.key === 'ArrowDown' ? (active + 1) % matches.length : (active <= 0 ? matches.length : active) - 1;
          setActive(next);
        }
        if (event.key === 'Enter' && expanded && active >= 0 && matches[active]) { event.preventDefault(); choose(matches[active]); }
      }} />
    <ul id={`${id}-list`} role="listbox" aria-label={`Suggestions de ${label.toLowerCase()}`} hidden={!expanded}>{matches.map((option, index) => <li id={`${id}-option-${index}`} key={option} role="option" aria-selected={active === index} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>{option}</li>)}</ul>
  </div>;
}
