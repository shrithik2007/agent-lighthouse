import { copyFile } from 'node:fs/promises';
await copyFile(new URL('../fixtures/before/index.html', import.meta.url), new URL('../site/index.html', import.meta.url));
console.log('Restored site/index.html from the BEFORE fixture. Evidence and results were preserved.');
