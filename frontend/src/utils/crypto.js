// Built-in Web Crypto API E2EE (AES-GCM) helper for client-side chat encryption

const strToBuffer = (str) => new TextEncoder().encode(str);
const bufferToStr = (buf) => new TextDecoder().decode(buf);

const getCryptoKey = async (secret) => {
  // Use PBKDF2 to derive a strong AES key from our shared secret
  const rawKey = strToBuffer(secret.padEnd(32, "vibe"));
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: strToBuffer("vibeshare-salt-2026"),
      iterations: 1000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptText = async (text, secret) => {
  try {
    if (!text || !text.trim()) return "";
    const key = await getCryptoKey(secret);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      strToBuffer(text)
    );
    
    // Prefix with a identifier string so we can easily tell it is encrypted
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    const binary = String.fromCharCode.apply(null, combined);
    return "🔒E2EE:" + btoa(binary);
  } catch (err) {
    console.error("Encryption failed:", err);
    return text;
  }
};

export const decryptText = async (cipherText, secret) => {
  try {
    if (!cipherText || !cipherText.startsWith("🔒E2EE:")) {
      return cipherText;
    }
    const cleanCipher = cipherText.replace("🔒E2EE:", "");
    const key = await getCryptoKey(secret);
    const rawData = new Uint8Array(
      atob(cleanCipher)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const iv = rawData.slice(0, 12);
    const encrypted = rawData.slice(12);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );
    return bufferToStr(decrypted);
  } catch (err) {
    return "[Encrypted Message]";
  }
};
