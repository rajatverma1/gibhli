import { useState, useRef, useEffect } from 'react';
import { api } from '../../api/client';
import type { BeneficiaryRecord } from '../../types/lc';

interface BeneficiarySearchProps {
  onSelect: (r: BeneficiaryRecord) => void;
}

export function BeneficiarySearch({ onSelect }: BeneficiarySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BeneficiaryRecord[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = (q: string) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await api.searchBeneficiaries(q);
      setResults(res.data);
      setOpen(true);
    }, 300);
  };

  const select = (r: BeneficiaryRecord) => {
    onSelect(r);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="bic-wrap" ref={wrapRef}>
      <input
        className="field-input"
        value={query}
        onChange={e => search(e.target.value)}
        placeholder="Search saved beneficiaries…"
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="bic-dropdown">
          {results.map(r => (
            <li key={r.id} className="bic-option" onMouseDown={() => select(r)}>
              <span className="bic-name">{r.name}</span>
              <span className="bic-country">{r.city}, {r.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
