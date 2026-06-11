// Desbloqueo biométrico local. En app nativa (Capacitor) usa la biometría
// del SO (Face ID / Touch ID / huella Android). En web usa WebAuthn.
// No reemplaza el login server: tras un login válido se guarda la sesión
// "recordada" y la biometría sirve para desbloquearla en este dispositivo.

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { BiometricAuth, BiometryError } from '@aparajita/capacitor-biometric-auth';

const CRED_KEY = '@lasenda/bio-cred';
const SESSION_KEY = '@lasenda/bio-session';

// Guardamos credenciales (no el token): el token de APEX expira, así que al
// desbloquear con biometría hay que re-loguear para obtener uno fresco.
export type RememberedSession = { username: string; password: string; name: string };

const isNative = Capacitor.isNativePlatform();

/* ---------- almacenamiento (Preferences en nativo, localStorage en web) ---------- */
async function store(key: string, value: string) {
  if (isNative) await Preferences.set({ key, value });
  else localStorage.setItem(key, value);
}
async function load(key: string): Promise<string | null> {
  if (isNative) return (await Preferences.get({ key })).value;
  return localStorage.getItem(key);
}
async function remove(key: string) {
  if (isNative) await Preferences.remove({ key });
  else localStorage.removeItem(key);
}

/* ---------- WebAuthn (solo web) ---------- */
const bufToB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b64ToBuf = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
const randomBytes = (n: number) => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
};

/* ---------- API pública ---------- */

/** ¿El dispositivo soporta biometría? */
export async function isBiometricAvailable(): Promise<boolean> {
  if (isNative) {
    try {
      return (await BiometricAuth.checkBiometry()).isAvailable;
    } catch {
      return false;
    }
  }
  if (!window.PublicKeyCredential || !window.isSecureContext) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** ¿Ya hay biometría activada en este dispositivo? */
export async function isBiometricEnabled(): Promise<boolean> {
  const session = await load(SESSION_KEY);
  if (!session) return false;
  if (isNative) return true;
  return !!(await load(CRED_KEY));
}

export async function getRememberedUsername(): Promise<string | null> {
  const raw = await load(SESSION_KEY);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as RememberedSession).username;
  } catch {
    return null;
  }
}

/** Activa biometría: pide verificación y guarda la sesión a desbloquear. */
export async function enableBiometric(session: RememberedSession): Promise<void> {
  if (isNative) {
    await BiometricAuth.authenticate({
      reason: 'Activá el ingreso biométrico para La Senda',
      cancelTitle: 'Cancelar',
      allowDeviceCredential: true,
      iosFallbackTitle: 'Usar código',
      androidTitle: 'Ingreso biométrico',
      androidSubtitle: 'Verificá tu identidad',
    });
    await store(SESSION_KEY, JSON.stringify(session));
    return;
  }

  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'La Senda' },
      user: { id: randomBytes(16), name: session.username, displayName: session.name },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('No se pudo registrar la biometría');

  await store(CRED_KEY, bufToB64(cred.rawId));
  await store(SESSION_KEY, JSON.stringify(session));
}

/** Pide biometría y, si verifica, devuelve la sesión guardada. */
export async function unlockBiometric(): Promise<RememberedSession> {
  const raw = await load(SESSION_KEY);
  if (!raw) throw new Error('Biometría no configurada');

  if (isNative) {
    try {
      await BiometricAuth.authenticate({
        reason: 'Ingresá a La Senda',
        cancelTitle: 'Cancelar',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Usar código',
        androidTitle: 'Ingreso biométrico',
        androidSubtitle: 'Verificá tu identidad',
      });
    } catch (e) {
      throw e instanceof BiometryError ? new Error(e.message) : e;
    }
    return JSON.parse(raw) as RememberedSession;
  }

  const credId = await load(CRED_KEY);
  if (!credId) throw new Error('Biometría no configurada');
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: 'public-key', id: b64ToBuf(credId) }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  if (!assertion) throw new Error('Verificación cancelada');
  return JSON.parse(raw) as RememberedSession;
}

export async function disableBiometric(): Promise<void> {
  await remove(CRED_KEY);
  await remove(SESSION_KEY);
}
