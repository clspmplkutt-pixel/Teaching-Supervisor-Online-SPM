const monthTh = {
  '01': 'มกราคม',
  '02': 'กุมภาพันธ์',
  '03': 'มีนาคม',
  '04': 'เมษายน',
  '05': 'พฤษภาคม',
  '06': 'มิถุนายน',
  '07': 'กรกฎาคม',
  '08': 'สิงหาคม',
  '09': 'กันยายน',
  '10': 'ตุลาคม',
  '11': 'พฤศจิกายน',
  '12': 'ธันวาคม',
};

const monthThShort = {
  '01': 'ม.ค.',
  '02': 'ก.พ.',
  '03': 'มี.ค.',
  '04': 'เม.ย.',
  '05': 'พ.ค.',
  '06': 'มิ.ย.',
  '07': 'ก.ค.',
  '08': 'ส.ค.',
  '09': 'ก.ย.',
  '10': 'ต.ค.',
  '11': 'พ.ย.',
  '12': 'ธ.ค.',
};

export const thaiYear = (year) => {
  const num = parseInt(year, 10);
  if (Number.isNaN(num)) return year;
  return String(num + 543);
};

export const thaiDateFull = (dateStr, format = 2) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length < 3) return dateStr;
  const [y, m, d] = parts;
  const day = d.startsWith('0') ? d.slice(1) : d;
  if (format === 2) {
    return `${day} ${monthThShort[m] || m} ${thaiYear(y)}`;
  }
  if (format === 1 || format === 5) {
    return `${day} ${monthTh[m] || m} ${format === 1 ? 'พ.ศ. ' : ''}${thaiYear(y)}`.trim();
  }
  return `${day} ${monthThShort[m] || m} ${y}`;
};
