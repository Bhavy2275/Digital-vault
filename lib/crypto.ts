import CryptoJS from 'crypto-js';

/**
 * Derives a robust secret key from a password and a salt/entropy string.
 * [Security Ethics] Hashing is performed strictly client-side to ensure 
 * zero-knowledge compliance; the raw password never touches the network.
 */
export const deriveKey = (password: string, salt: string): string => {
  return CryptoJS.SHA256(password + salt).toString();
};

/**
 * Encrypts a plaintext string using a derived key.
 * Prepends the salt to the ciphertext (format: salt|ciphertext)
 */
export const encryptMessage = (plaintext: string, password: string, entropy: string): string => {
  if (!plaintext || !password || !entropy) return '';
  const salt = CryptoJS.SHA256(entropy).toString().substring(0, 16); // Short salt
  const key = deriveKey(password, salt);
  const ciphertext = CryptoJS.AES.encrypt(plaintext, key).toString();
  return `${salt}|${ciphertext}`;
};

/**
 * Decrypts a message in the format (salt|ciphertext).
 */
export const decryptMessage = (packed: string, password: string): string => {
  if (!packed || !password) return '';
  const parts = packed.split('|');
  if (parts.length !== 2) return '';

  const [salt, ciphertext] = parts;
  try {
    const key = deriveKey(password, salt);
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
};
