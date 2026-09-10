import { execFileSync } from 'node:child_process';

// Inspect the Git index, including staged changes, without reading any secret value.
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const forbidden = files.filter(path => {
  const name = path.split('/').at(-1);
  return (name === '.env' || name.startsWith('.env.')) && name !== '.env.example';
});
if (forbidden.length) {
  console.error('Fichiers d’environnement à retirer du suivi Git :', forbidden.join(', '));
  process.exitCode = 1;
} else console.log('OK : aucun fichier .env privé dans le suivi Git.');
