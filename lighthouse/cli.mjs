#!/usr/bin/env node
// lighthouse loop --flow book --threshold 80 --max-attempts 3 --mode propose|apply [--runs 3]
import { fileURLToPath } from 'node:url';
const [command, ...rest] = process.argv.slice(2);
if (command !== 'loop') {
  console.error('usage: lighthouse loop --flow book --threshold 80 --max-attempts 3 --mode propose|apply');
  process.exit(2);
}
process.argv = [process.argv[0], fileURLToPath(new URL('./loop.mjs', import.meta.url)), ...rest];
await import('./loop.mjs');
