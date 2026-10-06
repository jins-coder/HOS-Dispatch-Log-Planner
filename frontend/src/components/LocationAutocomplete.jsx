import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Crosshair, Loader2, X } from 'lucide-react';

export default function LocationAutocomplete({
  label,
  value,
  onChange,
  onPickOnMap,
  isPicking,
  placeholder,
  iconColor = '#0284c7',
  required = true,
  apiBaseUrl = '/api'
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    onChange(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/geocode/?q=${encodeURIComponent(text.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setIsOpen(data.length > 0);
        }
      } catch (err) {
        console.error("Geocode autocomplete error:", err);
      } finally {
        setLoading(false);
      }
    }, 280);
  };

  const handleSelectSuggestion = (s) => {
    setQuery(s.display_name);
    onChange(s.display_name, s);
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div className="form-group" ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>
          <span>{label}</span>
          {required && <span className="req">*</span>}
        </label>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onPickOnMap}
            className={`action-pill-btn ${isPicking ? 'active-picking' : ''}`}
            title="Click to select this location directly on the interactive map"
          >
            <Crosshair size={12} />
            <span>{isPicking ? 'Cancel Picking' : 'Pick on Map'}</span>
          </button>
        </div>
      </div>

      <div className="input-with-icon">
        <MapPin size={17} className="input-icon" style={{ color: iconColor }} />
        <input
          type="text"
          className="form-input"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />

        {loading && (
          <div style={{ position: 'absolute', right: '0.85rem', color: '#94a3b8' }}>
            <Loader2 size={16} className="spin-anim" />
          </div>
        )}

        {!loading && query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onChange('');
              setSuggestions([]);
              setIsOpen(false);
            }}
            style={{
              position: 'absolute',
              right: '0.85rem',
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="autocomplete-dropdown">
          {suggestions.map((s, idx) => (
            <li
              key={idx}
              className="autocomplete-item"
              onMouseDown={() => handleSelectSuggestion(s)}
            >
              <MapPin size={14} style={{ color: iconColor, flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.85rem' }}>
                  {s.display_name.split(',')[0]}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.display_name}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
