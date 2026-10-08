/**
 * Thai National ID Utilities
 * - Validates checksum
 * - Cleans and formats into standard X-XXXX-XXXXX-XX-X format
 */

export const cleanThaiId = (raw) => {
  if (!raw) return '';
  return String(raw).replace(/\D/g, '').slice(0, 13);
};

export const formatThaiId = (raw) => {
  const digits = cleanThaiId(raw);
  if (!digits) return '';
  
  // Format: X-XXXX-XXXXX-XX-X
  const parts = [];
  if (digits.length > 0) parts.push(digits.slice(0, 1));
  if (digits.length > 1) parts.push(digits.slice(1, 5));
  if (digits.length > 5) parts.push(digits.slice(5, 10));
  if (digits.length > 10) parts.push(digits.slice(10, 12));
  if (digits.length > 12) parts.push(digits.slice(12, 13));
  
  return parts.join('-');
};

export const isValidThaiId = (id) => {
  if (!id) return false;
  const digitsOnly = cleanThaiId(id);
  if (digitsOnly.length !== 13) return false;
  
  const digits = digitsOnly.split('').map((d) => parseInt(d, 10));
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += digits[i] * (13 - i);
  }
  const check = (11 - (sum % 11)) % 10;
  return check === digits[12];
};

export const getThaiIdInfo = (raw) => {
  const cleaned = cleanThaiId(raw);
  const formatted = formatThaiId(raw);
  const isComplete = cleaned.length === 13;
  const isValid = isValidThaiId(cleaned);
  
  return {
    cleaned,
    formatted,
    length: cleaned.length,
    isComplete,
    isValid,
  };
};
