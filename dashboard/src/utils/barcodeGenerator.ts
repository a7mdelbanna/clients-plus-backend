/**
 * Barcode generation utilities
 */

/**
 * Generate a random barcode number
 * @param prefix - Optional prefix for the barcode
 * @param length - Total length of the barcode (default 13 for EAN-13)
 * @returns Generated barcode string
 */
export function generateBarcode(prefix: string = '', length: number = 13): string {
  const prefixLength = prefix.length;
  const remainingLength = length - prefixLength - 1; // -1 for check digit
  
  if (remainingLength < 0) {
    throw new Error('Prefix is too long for the specified barcode length');
  }

  // Generate random digits
  let barcode = prefix;
  for (let i = 0; i < remainingLength; i++) {
    barcode += Math.floor(Math.random() * 10).toString();
  }

  // Calculate and append check digit (for EAN-13)
  if (length === 13) {
    barcode += calculateEAN13CheckDigit(barcode);
  } else {
    // For other lengths, just add a random digit
    barcode += Math.floor(Math.random() * 10).toString();
  }

  return barcode;
}

/**
 * Calculate EAN-13 check digit
 * @param barcode - 12-digit barcode without check digit
 * @returns Check digit
 */
function calculateEAN13CheckDigit(barcode: string): string {
  if (barcode.length !== 12) {
    throw new Error('EAN-13 barcode must be 12 digits before check digit');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(barcode[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

/**
 * Validate barcode format
 * @param barcode - Barcode to validate
 * @param format - Barcode format (EAN13, CODE128, etc.)
 * @returns Boolean indicating if barcode is valid
 */
export function validateBarcode(barcode: string, format: string = 'CODE128'): boolean {
  if (!barcode || typeof barcode !== 'string') {
    return false;
  }

  switch (format) {
    case 'EAN13':
      // EAN-13 must be exactly 13 digits
      if (!/^\d{13}$/.test(barcode)) {
        return false;
      }
      // Validate check digit
      const checkDigit = barcode[12];
      const calculatedCheckDigit = calculateEAN13CheckDigit(barcode.substring(0, 12));
      return checkDigit === calculatedCheckDigit;

    case 'CODE128':
      // CODE128 can contain alphanumeric characters
      return /^[A-Za-z0-9\-\.\ \$\/\+\%]+$/.test(barcode) && barcode.length > 0;

    case 'CODE39':
      // CODE39 has specific allowed characters
      return /^[A-Z0-9\-\.\ \$\/\+\%\*]+$/.test(barcode) && barcode.length > 0;

    default:
      // Basic validation for any barcode
      return barcode.length > 0 && barcode.length <= 50;
  }
}

/**
 * Generate SKU-based barcode
 * @param sku - Product SKU
 * @param companyPrefix - Company-specific prefix
 * @returns Generated barcode
 */
export function generateSKUBarcode(sku: string, companyPrefix: string = '1234'): string {
  // Clean SKU to only include alphanumeric characters
  const cleanSKU = sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // Create a barcode combining company prefix and SKU
  return `${companyPrefix}${cleanSKU}`;
}

/**
 * Barcode format options for UI
 */
export const BARCODE_FORMATS = [
  { value: 'CODE128', label: 'CODE 128', labelAr: 'كود 128' },
  { value: 'EAN13', label: 'EAN-13', labelAr: 'EAN-13' },
  { value: 'CODE39', label: 'CODE 39', labelAr: 'كود 39' },
  { value: 'EAN8', label: 'EAN-8', labelAr: 'EAN-8' },
  { value: 'UPC', label: 'UPC', labelAr: 'UPC' },
];