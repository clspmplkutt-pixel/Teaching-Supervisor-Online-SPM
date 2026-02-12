export const isValidThaiId = (id) => {
  if (!id) return false;
  const trimmed = String(id).trim();
  if (!/^\d{13}$/.test(trimmed)) return false;
  const digits = trimmed.split('').map((d) => parseInt(d, 10));
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += digits[i] * (13 - i);
  }
  const check = (11 - (sum % 11)) % 10;
  return check === digits[12];
};
