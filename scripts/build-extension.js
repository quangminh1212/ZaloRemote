/**
 * Build script for ZaloHub Chrome Extension
 * Copies Vite build output + extension files into chrome-extension/app/
 */
import { cpSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const extDir = join(root, 'chrome-extension');
const appDir = join(extDir, 'app');

// Ensure dist exists
if (!existsSync(distDir)) {
    console.error('❌ dist/ not found. Run "npm run build" first.');
    process.exit(1);
}

// Clean and copy app files
if (existsSync(appDir)) {
    // Remove old app dir
    cpSync(appDir, appDir, { recursive: true }); // noop for clean
}
mkdirSync(appDir, { recursive: true });

// Copy dist → chrome-extension/app/
cpSync(distDir, appDir, { recursive: true });
console.log('✅ Copied dist/ → chrome-extension/app/');

// Generate icons if not exist
const iconsDir = join(extDir, 'icons');
if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
    // Copy from tauri icons as fallback
    const tauriIcons = join(root, 'src-tauri', 'icons');
    if (existsSync(join(tauriIcons, '32x32.png'))) {
        cpSync(join(tauriIcons, '32x32.png'), join(iconsDir, 'icon32.png'));
        cpSync(join(tauriIcons, '128x128.png'), join(iconsDir, 'icon128.png'));
        cpSync(join(tauriIcons, '32x32.png'), join(iconsDir, 'icon16.png'));
        cpSync(join(tauriIcons, '32x32.png'), join(iconsDir, 'icon48.png'));
        console.log('✅ Copied icons from src-tauri/icons/');
    } else {
        console.warn('⚠️ No icons found. Add icons manually to chrome-extension/icons/');
    }
}

console.log('');
console.log('🎉 Chrome Extension built successfully!');
console.log('📂 Output: chrome-extension/');
console.log('');
console.log('To install in Chrome:');
console.log('  1. Go to chrome://extensions/');
console.log('  2. Enable "Developer mode"');
console.log('  3. Click "Load unpacked"');
console.log('  4. Select the chrome-extension/ folder');
