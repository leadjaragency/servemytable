import QRCode from "qrcode";

/**
 * Returns the URL that gets encoded into the QR code.
 * Format: {baseUrl}/table/{tableNumber}?restaurant={restaurantSlug}
 */
export function buildTableUrl(
  baseUrl: string,
  tableNumber: number,
  restaurantSlug: string,
): string {
  return `${baseUrl}/table/${tableNumber}?restaurant=${restaurantSlug}`;
}

/**
 * Generates a QR code as a base64 PNG data URL from any URL.
 * Uses H-level error correction so up to ~30% can be obscured (e.g. logo overlay).
 */
export async function generateQR(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

/**
 * Generates a QR code as a base64 PNG data URL for a table's customer URL.
 */
export async function generateTableQR(
  baseUrl: string,
  tableNumber: number,
  restaurantSlug: string,
): Promise<string> {
  return generateQR(buildTableUrl(baseUrl, tableNumber, restaurantSlug));
}
