import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
const dest = resolve(root, 'public/la-senda.apk');

if (!existsSync(src)) {
  console.error(`No se encontró el APK en ${src}. Corré primero "npm run android:debug".`);
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`APK copiado a ${dest}`);
