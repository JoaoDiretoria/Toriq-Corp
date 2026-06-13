import crypto from 'crypto';
import { env } from '../config/env';

const ENCRYPTED_PREFIX = 'enc:v1:';

const getEncryptionKey = (): Buffer => {
  const rawKey = env.INTEGRATION_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY não configurada');
  }

  // Deriva uma chave AES-256 de tamanho fixo a partir da variável de ambiente.
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest();
};

export const isEncryptedValue = (value: string): boolean => value.startsWith(ENCRYPTED_PREFIX);

export const encryptText = (plainText: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`;
};

export const decryptText = (encryptedValue: string): string => {
  if (!isEncryptedValue(encryptedValue)) {
    return encryptedValue;
  }

  const payload = encryptedValue.slice(ENCRYPTED_PREFIX.length);
  const [ivB64, contentB64, authTagB64] = payload.split(':');

  if (!ivB64 || !contentB64 || !authTagB64) {
    throw new Error('Formato de segredo criptografado inválido');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, 'base64');
  const content = Buffer.from(contentB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const plain = Buffer.concat([decipher.update(content), decipher.final()]);
  return plain.toString('utf8');
};

export const maskSecret = (value: string | null): string | null => {
  if (!value) return null;
  if (value.length <= 4) return '****';
  return `${'*'.repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`;
};
