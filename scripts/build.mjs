// Builds the paste-ready embed files in wix/embeds/ from src/embeds/,
// inlining the shared code in src/lib/ so each file works on its own.
//   <script data-include="lib/x.js"></script>  →  <script>…contents…</script>
//   <link data-include="lib/x.css">            →  <style>…contents…</style>
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const srcDir = join(root, 'src/embeds');
const outDir = join(root, 'wix/embeds');
await mkdir(outDir, { recursive: true });

const include = async (path) => (await readFile(join(root, 'src', path), 'utf8')).trimEnd();
const pattern = /<script data-include="([^"]+)"><\/script>|<link data-include="([^"]+)">/g;

for (const name of (await readdir(srcDir)).filter((f) => f.endsWith('.html')).sort()) {
  const html = await readFile(join(srcDir, name), 'utf8');
  const parts = [`<!-- Built from src/embeds/${name}. Paste this whole file into a Wix Embed HTML box (Code). -->\n`];
  let last = 0;
  for (const m of html.matchAll(pattern)) {
    parts.push(html.slice(last, m.index));
    if (m[1]) parts.push(`<script>\n/* ${m[1]} */\n${await include(m[1])}\n</script>`);
    else parts.push(`<style>\n/* ${m[2]} */\n${await include(m[2])}\n</style>`);
    last = m.index + m[0].length;
  }
  parts.push(html.slice(last));
  const built = parts.join('');
  // Every inline script must at least parse, so a typo can't reach Wix.
  for (const [, code] of built.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    try { new Function(code); } catch (err) {
      console.error(`✗ ${name}: script error: ${err.message}`);
      process.exitCode = 1;
    }
  }
  await writeFile(join(outDir, name), built);
  console.log('built wix/embeds/' + name);
}
