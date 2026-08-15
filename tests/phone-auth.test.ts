import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber } from '../src/validators/phone.validator';

// ─── Phone Number Normalization Tests ─────────────────────────────────────────

describe('Phone Number Normalization', () => {
  it('should convert 0555123456 to +213555123456', () => {
    expect(normalizePhoneNumber('0555123456')).toBe('+213555123456');
  });

  it('should convert 0655123456 to +213655123456', () => {
    expect(normalizePhoneNumber('0655123456')).toBe('+213655123456');
  });

  it('should convert 0755123456 to +213755123456', () => {
    expect(normalizePhoneNumber('0755123456')).toBe('+213755123456');
  });

  it('should convert 213555123456 (without +) to +213555123456', () => {
    expect(normalizePhoneNumber('213555123456')).toBe('+213555123456');
  });

  it('should leave +213555123456 unchanged', () => {
    expect(normalizePhoneNumber('+213555123456')).toBe('+213555123456');
  });

  it('should strip spaces and dashes from phone number', () => {
    expect(normalizePhoneNumber('0555 123 456')).toBe('+213555123456');
    expect(normalizePhoneNumber('0555-123-456')).toBe('+213555123456');
  });
});
