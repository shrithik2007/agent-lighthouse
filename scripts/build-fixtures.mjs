// Builds dist/fixtures/{before,after}/index.html. With POSTHOG_PUBLIC_KEY set (a phc_ project key, public by design),
// the guarded PostHog snippet is activated; without it the copies are byte-identical to the sources and load nothing.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const key = process.env.POSTHOG_PUBLIC_KEY ?? '';
const host = process.env.POSTHOG_PUBLIC_HOST ?? 'https://us.i.posthog.com';
if (key && !/^phc_[A-Za-z0-9_-]+$/.test(key)) throw new Error('POSTHOG_PUBLIC_KEY must look like phc_…');
if (!/^https:\/\/[\w.-]+(:\d+)?$/.test(host)) throw new Error('POSTHOG_PUBLIC_HOST must be an https origin');

for (const variant of ['before', 'after']) {
  const source = await readFile(new URL(`../fixtures/${variant}/index.html`, import.meta.url), 'utf8');
  if (!source.includes("'__POSTHOG_PUBLIC_KEY__'")) throw new Error(`fixtures/${variant} has no PostHog placeholder`);
  const html = key ? source.replace("'__POSTHOG_PUBLIC_KEY__'", `'${key}'`).replace("'__POSTHOG_PUBLIC_HOST__'", `'${host}'`) : source;
  const out = new URL(`../dist/fixtures/${variant}/`, import.meta.url);
  await mkdir(out, { recursive: true });
  await writeFile(new URL('index.html', out), html);
  console.log(`dist/fixtures/${variant}/index.html: PostHog ${key ? `on (${host})` : 'off (POSTHOG_PUBLIC_KEY not set)'}`);
}
