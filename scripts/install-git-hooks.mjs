/**
 * Install post-commit hook (git push after every commit)
 */
import { copyFileSync, chmodSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const hooksDir = path.join(root, '.git', 'hooks');
const src = path.join(root, 'scripts', 'post-commit.hook');
const dest = path.join(hooksDir, 'post-commit');

if (!existsSync(path.join(root, '.git'))) {
  console.error('Not a git repository');
  process.exit(1);
}

mkdirSync(hooksDir, { recursive: true });
copyFileSync(src, dest);

try {
  chmodSync(dest, 0o755);
} catch {
  // Windows: optional
}

console.log('Installed:', dest);
