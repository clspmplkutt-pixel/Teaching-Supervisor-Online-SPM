import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * SearchableSelect - Pure React accessible searchable combobox.
 * Replaces jQuery Select2 cleanly without DOM mutation conflicts or hidden-step width bugs.
 *
 * @param {Array<{value: string|number, label: string, subLabel?: string}>} options
 */
const SearchableSelect = ({
  options = [],
  value = '',
  onChange,
  placeholder = '-- เลือกรายการ --',
  searchPlaceholder = 'พิมพ์เพื่อค้นหา...',
  disabled = false,
  required = false,
  clearable = true,
  name = '',
  id = '',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        String(opt.label || '').toLowerCase().includes(q) ||
        String(opt.subLabel || '').toLowerCase().includes(q) ||
        String(opt.value || '').toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutside);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleSelect = (val) => {
    onChange?.(val, name);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className={`position-relative ${className}`} id={id}>
      {/* Hidden input for native HTML5 required form validation */}
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{
            opacity: 0,
            width: '100%',
            height: 0,
            position: 'absolute',
            bottom: 0,
            left: 0,
            pointerEvents: 'none',
          }}
          value={value || ''}
          onChange={() => {}}
          required
        />
      )}

      <div
        role="combobox"
        aria-expanded={open}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((prev) => !prev);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={`form-control d-flex align-items-center justify-content-between ${disabled ? 'bg-light text-muted' : 'bg-white'}`}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '38px',
          height: 'auto',
          paddingRight: '0.65rem',
        }}
      >
        <span className={`text-truncate ${selectedOption ? 'text-dark' : 'text-muted'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="d-inline-flex align-items-center gap-1 ml-2">
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              className="btn btn-link p-0 text-muted"
              style={{ lineHeight: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
              title="ล้างค่าที่เลือก"
            >
              <i className="fa-solid fa-xmark" style={{ fontSize: '12px' }}></i>
            </button>
          )}
          <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'} text-muted`} style={{ fontSize: '11px' }}></i>
        </span>
      </div>

      {open && !disabled && (
        <div
          className="bg-white border rounded shadow-lg mt-1 w-100"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 1060,
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          <div className="p-2 border-bottom bg-light">
            <div className="input-group input-group-sm">
              <div className="input-group-prepend">
                <span className="input-group-text bg-white border-right-0">
                  <i className="fa-solid fa-magnifying-glass text-muted"></i>
                </span>
              </div>
              <input
                ref={inputRef}
                type="text"
                className="form-control border-left-0"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                    setQuery('');
                  } else if (e.key === 'Enter' && filtered.length > 0) {
                    e.preventDefault();
                    handleSelect(filtered[0].value);
                  }
                }}
              />
            </div>
          </div>

          <div style={{ maxHeight: '230px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-muted small">ไม่พบรายการที่ค้นหา</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`dropdown-item d-flex justify-content-between align-items-center py-2 px-3 ${isSelected ? 'active bg-primary text-white' : ''}`}
                    style={{ whiteSpace: 'normal', fontSize: '0.9rem' }}
                  >
                    <div>
                      <div>{opt.label}</div>
                      {opt.subLabel && (
                        <small className={isSelected ? 'text-light' : 'text-muted'}>{opt.subLabel}</small>
                      )}
                    </div>
                    {isSelected && <i className="fa-solid fa-check ml-2"></i>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
