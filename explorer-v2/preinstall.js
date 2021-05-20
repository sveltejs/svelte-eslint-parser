import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';

const cwd = join(resolve(), '..');
const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf-8'));

execSync('npm install', { cwd, stdio: 'inherit' });
execSync('npm run build', { cwd, stdio: 'inherit' });
execSync('npm pack', { cwd, stdio: 'inherit' });
execSync(`mv svelte-eslint-parser-${pkg.version}.tgz svelte-eslint-parser.tgz`, {
	cwd,
	stdio: 'inherit'
});
