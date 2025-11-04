/**
 * Normalize phone number by removing non-digit characters except '+'
 * @param {string} raw - Raw phone number from Twilio
 * @returns {string|null} Normalized phone number
 */
function normalizePhone(raw) {
  if (!raw) return null;
  // Twilio format 'whatsapp:+1555...' or '+1555...'
  return raw.replace(/[^+0-9]/g, '');
}

/**
 * Escape special XML characters for TwiML responses
 * @param {string} unsafe - Unsafe text
 * @returns {string} XML-safe text
 */
function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create a TwiML XML response with a message
 * @param {string} text - Message text
 * @returns {string} TwiML XML string
 */
function twimlMessage(text) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${escapeXml(text)}</Message></Response>`;
}

/**
 * Format timestamp to Brazilian locale
 * @param {Date|string} timestamp - Timestamp to format
 * @param {boolean} includeDate - Include date in output
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp, includeDate = true) {
  const date = new Date(timestamp);
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  };

  if (includeDate) {
    options.day = '2-digit';
    options.month = '2-digit';
  }

  return date.toLocaleString('pt-BR', options);
}

module.exports = {
  normalizePhone,
  escapeXml,
  twimlMessage,
  formatTimestamp
};
