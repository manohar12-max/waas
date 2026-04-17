/**
 * Normalizes email addresses by trimming whitespace and converting to lowercase.
 * This ensures consistency with the backend identity resolution.
 */
export const normalizeEmail = (email: string): string => {
  return email ? email.trim().toLowerCase() : '';
};

/**
 * Normalizes phone numbers by trimming whitespace.
 */
export const normalizePhone = (phone: string): string => {
  return phone ? phone.trim() : '';
};

/**
 * Normalizes general text inputs by trimming whitespace.
 */
export const normalizeText = (text: string): string => {
  return text ? text.trim() : '';
};
