/**
 * Cipherly Cryptographic Engine
 * Zero-trust local crypto implementation using Web Crypto API.
 */

// Generate 32-byte random encryption key as Base64
export function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

// Calculate hex fingerprint of a key (e.g., A1B2:C3D4:E5F6:7890)
export async function getFingerprint(keyB64: string): Promise<string> {
  const binaryString = atob(keyB64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
  
  // Format into 4-char groups separated by colons
  return hex.substring(0, 16).match(/.{1,4}/g)?.join(':') || hex.substring(0, 16);
}

// PBKDF2 Key Derivation from password and salt
export async function deriveMasterKey(password: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);
  
  const saltBinary = atob(saltB64);
  const saltBuffer = new Uint8Array(saltBinary.length);
  for (let i = 0; i < saltBinary.length; i++) {
    saltBuffer[i] = saltBinary.charCodeAt(i);
  }

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate random 16-byte salt as Base64
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

// AES-256-GCM Text Encryption
export async function encryptTextGCM(plainText: string, keyB64: string): Promise<string> {
  const enc = new TextEncoder();
  const rawKey = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  
  // Hash key to ensure 256-bit size
  const keyHash = await window.crypto.subtle.digest('SHA-256', rawKey);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyHash,
    'AES-GCM',
    false,
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    enc.encode(plainText)
  );

  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);

  return btoa(String.fromCharCode(...combined));
}

// AES-256-GCM Text Decryption
export async function decryptTextGCM(cipherB64: string, keyB64: string): Promise<string> {
  try {
    const rawKey = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
    const keyHash = await window.crypto.subtle.digest('SHA-256', rawKey);
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyHash,
      'AES-GCM',
      false,
      ['decrypt']
    );

    const combined = Uint8Array.from(atob(cipherB64.trim()), c => c.charCodeAt(0));
    if (combined.length < 13) {
      throw new Error('Ciphertext too short.');
    }

    const iv = combined.subarray(0, 12);
    const ciphertext = combined.subarray(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err: any) {
    throw new Error('Decryption failed. Invalid key or corrupted payload.');
  }
}
