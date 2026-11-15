// ── z-books ARAP — PBKDF2 Password Hash Generator ──
// Usage: node scripts/generate-password-hash.mjs <password>
//        node scripts/generate-password-hash.mjs   (prompts)

import crypto from 'crypto';
import readline from 'readline';

const ITERATIONS = 100000, KEY_LENGTH = 32, SALT_LENGTH = 16;

async function getPassword() {
  if (process.argv[2]) return process.argv[2];
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question('Enter admin password: ', (pwd) => { rl.close(); resolve(pwd); });
  });
}

const password = await getPassword();
const salt = crypto.randomBytes(SALT_LENGTH);
const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
const hashString = `${salt.toString('hex')}:${hash.toString('hex')}`;

console.log('\n─────────────────────────────────────────────────');
console.log('PBKDF2 Password Hash Generated');
console.log('─────────────────────────────────────────────────');
console.log(`\nHash: ${hashString}\n`);
console.log('Run this SQL in D1 dashboard or via Wrangler:\n');
console.log(`UPDATE users SET password_hash = '${hashString}' WHERE username = 'admin';`);
console.log('\nOr via CLI:');
console.log(`npx wrangler d1 execute jjb-arap-db --remote --command="UPDATE users SET password_hash = '${hashString}' WHERE username = 'admin';"`);
console.log('\n⚠️  Uses PBKDF2 (100K iterations, SHA-256). Matches _jwt.js verifyPassword().');
console.log('─────────────────────────────────────────────────\n');
