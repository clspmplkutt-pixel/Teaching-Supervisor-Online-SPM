import React, { useMemo } from 'react';

const THAI_MONTHS = [
  { value: '01', label: 'มกราคม' },
  { value: '02', label: 'กุมภาพันธ์' },
  { value: '03', label: 'มีนาคม' },
  { value: '04', label: 'เมษายน' },
  { value: '05', label: 'พฤษภาคม' },
  { value: '06', label: 'มิถุนายน' },
  { value: '07', label: 'กรกฎาคม' },
  { value: '08', label: 'สิงหาคม' },
  { value: '09', label: 'กันยายน' },
  { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' },
  { value: '12', label: 'ธันวาคม' },
];

/**
 * ThaiDatePicker - Pure React Day / Thai Month / พ.ศ. Year (พร้อมวงเล็บ ค.ศ.) selector.
 * Eliminates browser locale confusion between Buddhist Era (พ.ศ.) and Christian Era (ค.ศ.).
 * Emits standard ISO `YYYY-MM-DD` (Christian Era) via onChange(isoString).
 */
const ThaiDatePicker = ({
  value = '',
  onChange,
  minAgeYears = 0,
  maxAgeYears = 85,
  futureYears = 2,
  mode = 'general', // 'birthday' | 'general'
  required = false,
  disabled = false,
  id = '',
  className = '',
}) => {
  const currentYearAD = new Date().getFullYear();

  const parsed = useMemo(() => {
    if (!value) return { yearAD: '', month: '', day: '' };
    const clean = String(value).trim().slice(0, 10);
    const parts = clean.split('-');
    if (parts.length !== 3) return { yearAD: '', month: '', day: '' };
    let y = parseInt(parts[0], 10);
    if (Number.isNaN(y)) return { yearAD: '', month: '', day: '' };
    if (y >= 2400) y -= 543; // auto-normalize Buddhist Era if stored in legacy rows
    return {
      yearAD: String(y),
      month: parts[1].padStart(2, '0'),
      day: parts[2].padStart(2, '0'),
    };
  }, [value]);

  const yearsAD = useMemo(() => {
    const list = [];
    if (mode === 'birthday') {
      const start = currentYearAD - Math.max(18, minAgeYears);
      const end = currentYearAD - maxAgeYears;
      for (let y = start; y >= end; y -= 1) {
        list.push(y);
      }
    } else {
      const start = currentYearAD + futureYears;
      const end = currentYearAD - 15;
      for (let y = start; y >= end; y -= 1) {
        list.push(y);
      }
    }
    if (parsed.yearAD && !list.includes(Number(parsed.yearAD))) {
      list.unshift(Number(parsed.yearAD));
    }
    return list;
  }, [currentYearAD, futureYears, maxAgeYears, minAgeYears, mode, parsed.yearAD]);

  const maxDaysInMonth = useMemo(() => {
    const y = Number(parsed.yearAD) || currentYearAD;
    const m = Number(parsed.month) || 1;
    return new Date(y, m, 0).getDate();
  }, [currentYearAD, parsed.month, parsed.yearAD]);

  const days = useMemo(() => {
    return Array.from({ length: maxDaysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
  }, [maxDaysInMonth]);

  const handlePartChange = (part, nextVal) => {
    const nextYear = part === 'year' ? nextVal : parsed.yearAD;
    const nextMonth = part === 'month' ? nextVal : parsed.month;
    let nextDay = part === 'day' ? nextVal : parsed.day;

    if (!nextYear && !nextMonth && !nextDay) {
      onChange?.('');
      return;
    }

    const effYear = nextYear || String(mode === 'birthday' ? currentYearAD - 30 : currentYearAD);
    const effMonth = nextMonth || '01';
    const maxD = new Date(Number(effYear), Number(effMonth), 0).getDate();
    if (!nextDay) nextDay = '01';
    if (Number(nextDay) > maxD) nextDay = String(maxD).padStart(2, '0');

    onChange?.(`${effYear}-${effMonth}-${nextDay}`);
  };

  return (
    <div id={id} className={`d-flex align-items-center gap-2 ${className}`}>
      <select
        className="custom-select"
        style={{ flex: '0 0 82px' }}
        value={parsed.day}
        onChange={(e) => handlePartChange('day', e.target.value)}
        disabled={disabled}
        required={required}
        aria-label="วัน"
      >
        <option value="">วัน</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {Number(d)}
          </option>
        ))}
      </select>

      <select
        className="custom-select"
        style={{ flex: '1 1 130px' }}
        value={parsed.month}
        onChange={(e) => handlePartChange('month', e.target.value)}
        disabled={disabled}
        required={required}
        aria-label="เดือน"
      >
        <option value="">-- เดือน --</option>
        {THAI_MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <select
        className="custom-select"
        style={{ flex: '1 1 145px' }}
        value={parsed.yearAD}
        onChange={(e) => handlePartChange('year', e.target.value)}
        disabled={disabled}
        required={required}
        aria-label="ปี พ.ศ."
      >
        <option value="">-- ปี พ.ศ. --</option>
        {yearsAD.map((y) => (
          <option key={y} value={String(y)}>
            พ.ศ. {y + 543} ({y})
          </option>
        ))}
      </select>
    </div>
  );
};

export default ThaiDatePicker;
