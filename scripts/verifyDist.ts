import { exists } from 'node:fs/promises';

const entries = ['index', 'conformance', 'runtime', 'ssr', 'testing', 'web'];

for (const entry of entries) {
	for (const extension of ['js', 'd.ts']) {
		const path = `dist/${entry}.${extension}`;
		if (!(await exists(path))) throw new Error(`Missing ${path}`);
	}
}

const modulePath = '../dist/index.js';
const module = await import(modulePath);
if (typeof module.http?.get !== 'function')
	throw new Error('Published index does not expose http.get().');

console.log('Verified @absolutejs/http distribution entries.');
