const { normalizePhone, escapeXml, twimlMessage, formatTimestamp } = require('../../src/utils/helpers');

describe('Helpers', () => {
  describe('normalizePhone', () => {
    it('should normalize whatsapp format phone number', () => {
      expect(normalizePhone('whatsapp:+15551234567')).toBe('+15551234567');
    });

    it('should keep regular phone format', () => {
      expect(normalizePhone('+15551234567')).toBe('+15551234567');
    });

    it('should return null for empty input', () => {
      expect(normalizePhone(null)).toBe(null);
      expect(normalizePhone('')).toBe(null);
    });

    it('should remove non-numeric characters except +', () => {
      expect(normalizePhone('whatsapp: +1 (555) 123-4567')).toBe('+15551234567');
    });
  });

  describe('escapeXml', () => {
    it('should escape XML special characters', () => {
      expect(escapeXml('<tag>')).toBe('&lt;tag&gt;');
      expect(escapeXml('Hello & goodbye')).toBe('Hello &amp; goodbye');
      expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
      expect(escapeXml("it's")).toBe('it&apos;s');
    });

    it('should escape multiple characters', () => {
      expect(escapeXml('<hello & "goodbye">')).toBe('&lt;hello &amp; &quot;goodbye&quot;&gt;');
    });
  });

  describe('twimlMessage', () => {
    it('should create valid TwiML response', () => {
      const result = twimlMessage('Hello World');
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<Response>');
      expect(result).toContain('<Message>Hello World</Message>');
      expect(result).toContain('</Response>');
    });

    it('should escape special characters in message', () => {
      const result = twimlMessage('Hello <user>');
      expect(result).toContain('&lt;user&gt;');
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp with date', () => {
      const timestamp = new Date('2024-01-15T14:30:00');
      const result = formatTimestamp(timestamp, true);
      expect(result).toContain('14:30');
    });

    it('should format timestamp without date', () => {
      const timestamp = new Date('2024-01-15T14:30:00');
      const result = formatTimestamp(timestamp, false);
      expect(result).toContain('14:30');
      expect(result).not.toContain('15/01');
    });
  });
});
