import { useState, useRef, useEffect } from 'react';
import { api } from '../../api/client';
import type { BICRecord } from '../../types/lc';

interface BICSearchProps {
  value: string;
  onChange: (bic: string, record?: BICRecord) => void;
  placeholder?: string;
}

export function BICSearch({ value, onChange, placeholder = 'Search BIC or bank name…' }: BICSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<BICRecord[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

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
      const res = await api.searchBIC(q);
      setResults(res.data);
      setOpen(true);
    }, 300);
  };

  const select = (r: BICRecord) => {
    setQuery(r.bic);
    onChange(r.bic, r);
    setOpen(false);
  };

  return (
    <div className="bic-wrap" ref={wrapRef}>
      <input
        className="field-input"
        value={query}
        onChange={e => search(e.target.value)}
        onBlur={() => { if (!open) onChange(query); }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="bic-dropdown">
          {results.map(r => (
            <li key={r.bic} className="bic-option" onMouseDown={() => select(r)}>
              <span className="bic-code">{r.bic}</span>
              <span className="bic-name">{r.bank_name}</span>
              <span className="bic-country">{r.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
