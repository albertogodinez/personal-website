/*
  verify-site: the agent's way to look at this site.

  Screenshots pages from the dev server and from the production build (dist/)
  and pixel-diffs them, because the bugs this repo keeps shipping only show up
  in one of the two (CSS imported from a client:only component vanishes from
  the production bundle; see CODING_STANDARDS.md).

  Run `pnpm verify:site --help` for usage. Skill: .agents/skills/verify-site.
*/
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import pixelmatch from 'pixelmatch';
import { type Browser, chromium } from 'playwright';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PAGES_DIR = path.join(ROOT, 'src/pages');
const DIST_DIR = path.join(ROOT, 'dist');
const OUT_DIR = path.join(ROOT, '.verify');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 }
} as const;
type ViewportName = keyof typeof VIEWPORTS;

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

type Mode = 'dev' | 'prod';

/*
  Hidden in parity because they aren't pixel-stable between two loads of the
  same build: WebGL output and autoplaying video (/404 lands on a different
  frame each load). visibility:hidden keeps their layout box, so parity still
  compares the page around them. Masking was tried first and dropped: a mask
  paints the element's box, so a canvas that hadn't resized yet (seen on cold
  headless starts, cause unexplained) read as a ~94% mismatch.
  `shot` leaves them visible: it is how the canvas gets looked at.
*/
// [data-verify-unstable] opts in anything else driven by JS timing or pointer
// input, which `animations: 'disabled'` (CSS only) can't freeze.
const HIDE_UNSTABLE_CSS = 'canvas, video, [data-verify-unstable] { visibility: hidden !important; }';

const NETWORK_IDLE_CAP_MS = 10_000;

const HELP = `verify-site — look at this site the way a visitor would.

Usage: pnpm verify:site <command> [options]

Commands:
  parity              Screenshot every route on the dev server AND the production
                      build, pixel-diff each pair, exit 1 on any mismatch.
  shot <route>        Screenshot one route; prints the PNG path.
  routes              List the routes derived from src/pages.
  serve               Serve dist/ like Netlify does (replaces \`astro preview\`,
                      which the Netlify adapter does not support).

Options:
  --route <path>      Limit parity to this route. Repeatable. Default: all routes.
  --viewport <name>   desktop | mobile. Repeatable. Default: both.
  --theme <name>      light | dark. Repeatable. Default: both.
  --mode <name>       shot only: dev | prod. Default: dev.
  --no-build          Reuse the existing dist/ instead of running \`pnpm build\`.
  --max-diff <ratio>  Mismatched-pixel ratio allowed per pair. Default: 0.001.
  --port <n>          serve only. Default: 4321.
  --json              Print the full report as JSON on stdout.
  -h, --help          Show this help.

Output: .verify/<run-id>/ holds <route>.<viewport>.<theme>.{dev,prod,diff}.png
and report.json. Read the diff PNG: red pixels are the mismatch.

Examples:
  pnpm verify:site parity
  pnpm verify:site parity --no-build --route / --viewport mobile
  pnpm verify:site shot /moodboard --mode prod --theme dark
`;

class UsageError extends Error {}

function fail(message: string): never {
  throw new UsageError(message);
}

// --- routes -----------------------------------------------------------------

/*
  Derived from src/pages so a new page is covered the day it lands, with no
  list to keep in sync. Endpoints (.ts) and dynamic segments are skipped:
  neither has a single canonical page to screenshot.
*/
function listRoutes(pagesDir = PAGES_DIR): string[] {
  const routes: string[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.includes('[')) continue;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), `${prefix}/${entry.name}`);
        continue;
      }
      const match = /^(.+)\.(astro|md|mdx)$/.exec(entry.name);
      if (!match) continue;
      const name = match[1];
      routes.push(name === 'index' ? prefix || '/' : `${prefix}/${name}`);
    }
  };
  walk(pagesDir, '');
  return routes.toSorted();
}

function routeSlug(route: string): string {
  return route === '/' ? 'index' : route.slice(1).replaceAll('/', '__');
}

// --- servers ----------------------------------------------------------------

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') resolve(address.port);
        else reject(new Error('Could not allocate a free port.'));
      });
    });
  });
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain'
};

/*
  Resolves a URL path the way Netlify serves a static Astro build:
  /about -> about/index.html or about.html, unknown -> 404.html with status 404.
  Server routes (src/pages/api) are NOT served: they run in a Netlify Function.
*/
function resolveDistFile(urlPath: string, distDir = DIST_DIR): { file: string; status: number } {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/\/+$/, '');
  const candidates = [
    path.join(distDir, clean),
    path.join(distDir, clean, 'index.html'),
    `${path.join(distDir, clean)}.html`
  ];
  for (const candidate of candidates) {
    if (!candidate.startsWith(distDir)) break;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return { file: candidate, status: 200 };
  }
  return { file: path.join(distDir, '404.html'), status: 404 };
}

function serveDist(port: number): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const { file, status } = resolveDistFile(req.url ?? '/');
    if (!fs.existsSync(file)) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(status, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

async function waitForHttp(url: string, deadline: number, log: () => string): Promise<void> {
  const up = await fetch(url).then(
    (response) => response.status < 500,
    () => false
  );
  if (up) return;
  if (Date.now() > deadline) fail(`Dev server did not answer ${url} in time. Last output:\n${log()}`);
  await new Promise((r) => setTimeout(r, 300));
  return waitForHttp(url, deadline, log);
}

interface DevServer {
  origin: string;
  stop: () => void;
  // When Vite last re-optimized dependencies; each pass full-reloads every open page.
  lastOptimizeAt: () => number;
}

async function startDev(): Promise<DevServer> {
  const port = await freePort();
  let output = '';
  const child: ChildProcess = spawn('pnpm', ['exec', 'astro', 'dev', '--port', String(port), '--host', '127.0.0.1'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    // VERIFY_SITE disables the dev toolbar (see astro.config.mjs). NETLIFY_DEV
    // makes @netlify/vite-plugin skip its emulation layer, whose edge-functions
    // server fails to start on the Linux CI runner and replaces dev pages with
    // an "Unhandled rejection" overlay. The site uses no edge functions or
    // blobs in dev; /api routes are served by Astro itself.
    env: { ...process.env, VERIFY_SITE: '1', NETLIFY_DEV: '1' },
    detached: true
  });
  let lastOptimizeAt = 0;
  const capture = (chunk: Buffer) => {
    const text = chunk.toString();
    if (/dependencies optimized|optimized dependencies changed/.test(text)) lastOptimizeAt = Date.now();
    output = (output + text).slice(-4000);
  };
  child.stdout?.on('data', capture);
  child.stderr?.on('data', capture);
  const origin = `http://127.0.0.1:${port}`;
  // Kill the whole process group: pnpm -> astro -> vite.
  const stop = () => {
    if (child.pid) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        // already exited
      }
    }
  };
  try {
    await waitForHttp(origin, Date.now() + 60_000, () => output);
  } catch (error) {
    stop();
    throw error;
  }
  return { origin, stop, lastOptimizeAt: () => lastOptimizeAt };
}

async function startProd(build: boolean): Promise<{ origin: string; stop: () => void }> {
  if (build) {
    const result = spawnSync('pnpm', ['build'], { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] });
    if (result.status !== 0) fail('`pnpm build` failed (output above). Fix the build, then rerun.');
  } else if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    fail('dist/index.html does not exist. Drop --no-build so the production build runs first.');
  }
  const port = await freePort();
  const server = await serveDist(port);
  return { origin: `http://127.0.0.1:${port}`, stop: () => server.close() };
}

// --- screenshots ------------------------------------------------------------

interface ShotSpec {
  route: string;
  viewport: ViewportName;
  theme: Theme;
}

async function screenshot(
  browser: Browser,
  origin: string,
  spec: ShotSpec,
  mode: Mode,
  file: string,
  { hideUnstable }: { hideUnstable: boolean }
): Promise<void> {
  const context = await browser.newContext({
    viewport: VIEWPORTS[spec.viewport],
    colorScheme: spec.theme,
    reducedMotion: 'reduce',
    deviceScaleFactor: 1
  });
  try {
    const page = await context.newPage();
    await page.goto(origin + spec.route, { waitUntil: 'load', timeout: 45_000 });
    // Best-effort: the moodboard canvas streams textures through
    // /api/proxy-image for as long as it renders, so it never goes idle.
    await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_CAP_MS }).catch(() => undefined);
    if (hideUnstable) await page.addStyleTag({ content: HIDE_UNSTABLE_CSS });
    await page.evaluate(() => document.fonts.ready);
    // R3F sizes its <canvas> from a ResizeObserver after mount, so an early
    // `shot` would show it at the default 300x150. Wait until every canvas's
    // size has held for 3 polls.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const started = Date.now();
          const poll = (last: string, stable: number) => {
            const now = Array.from(
              document.querySelectorAll('canvas'),
              (c) => `${c.clientWidth}x${c.clientHeight}`
            ).join();
            const held = now === last ? stable + 1 : 0;
            if (held >= 3 || Date.now() - started > 5000) resolve();
            else setTimeout(() => poll(now, held), 100);
          };
          poll('', 0);
        })
    );
    // networkidle can fire with images still in flight, and /moodboard's
    // images have no fixed size, so page height would depend on timing.
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images, (img) => (img.complete ? undefined : img.decode().catch(() => undefined)))
      )
    );
    await page.screenshot({
      path: file,
      fullPage: true,
      animations: 'disabled',
      caret: 'hide'
    });
  } finally {
    await context.close();
  }
}

// --- diff -------------------------------------------------------------------

function padTo(png: PNG, width: number, height: number): PNG {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  // Padding is transparent magenta so it always counts as a mismatch.
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 255;
    out.data[i + 2] = 255;
  }
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

interface DiffResult {
  mismatchedPixels: number;
  ratio: number;
  devSize: [number, number];
  prodSize: [number, number];
}

function diffPngs(devFile: string, prodFile: string, diffFile: string): DiffResult {
  const dev = PNG.sync.read(fs.readFileSync(devFile));
  const prod = PNG.sync.read(fs.readFileSync(prodFile));
  const width = Math.max(dev.width, prod.width);
  const height = Math.max(dev.height, prod.height);
  const diff = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(
    padTo(dev, width, height).data,
    padTo(prod, width, height).data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );
  fs.writeFileSync(diffFile, PNG.sync.write(diff));
  return {
    mismatchedPixels,
    ratio: mismatchedPixels / (width * height),
    devSize: [dev.width, dev.height],
    prodSize: [prod.width, prod.height]
  };
}

// --- commands ---------------------------------------------------------------

interface PairReport extends ShotSpec, DiffResult {
  pass: boolean;
  dev: string;
  prod: string;
  diff: string;
}

/*
  A fresh dev server compiles each page on first request, and Vite discovers
  dependencies in waves (measured: a second wave ~13s in, from /moodboard's
  lazy imports). Each wave full-reloads every open page, destroying any page
  mid-screenshot. So every route stays open in a real browser (HTML alone
  doesn't trigger discovery) until Vite has gone quiet.
*/
const DEV_QUIET_MS = 3_000;
const DEV_SETTLE_CAP_MS = 30_000;

async function waitForQuiet(dev: DevServer, deadline: number): Promise<void> {
  if (Date.now() - dev.lastOptimizeAt() >= DEV_QUIET_MS || Date.now() > deadline) return;
  await new Promise((r) => setTimeout(r, 250));
  return waitForQuiet(dev, deadline);
}

async function warmUp(browser: Browser, dev: DevServer, routes: string[]): Promise<void> {
  const deadline = Date.now() + DEV_SETTLE_CAP_MS;
  const pages = await Promise.all(
    routes.map(async (route) => {
      const page = await browser.newPage();
      await page.goto(dev.origin + route, { waitUntil: 'load', timeout: 60_000 });
      return page;
    })
  );
  try {
    // Hold DEV_QUIET_MS even when nothing has been optimized yet, so a wave
    // that starts just after load is still caught.
    await new Promise((r) => setTimeout(r, DEV_QUIET_MS));
    await waitForQuiet(dev, deadline);
  } finally {
    await Promise.all(pages.map((page) => page.close()));
  }
}

// One retry for a reload that still lands mid-screenshot; a real failure fails twice.
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(
      `verify-site: retrying ${label} once after: ${error instanceof Error ? error.message.split('\n')[0] : error}`
    );
    return fn();
  }
}

// Pairs screenshotted at once. Each pair opens two browser contexts.
const PARALLEL_PAIRS = 4;

async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let next = 0;
  const worker = async (): Promise<void> => {
    const index = next++;
    if (index >= items.length) return;
    results[index] = await fn(items[index]);
    return worker();
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return results;
}

function newRunDir(): string {
  const dir = path.join(OUT_DIR, new Date().toISOString().replaceAll(':', '-').replace(/\..+$/, ''));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function pick<T extends string>(values: string[] | undefined, allowed: readonly T[], flag: string): T[] {
  if (!values?.length) return [...allowed];
  for (const value of values) {
    if (!allowed.includes(value as T)) fail(`Unknown ${flag} "${value}". Use one of: ${allowed.join(', ')}.`);
  }
  return values as T[];
}

function pickRoutes(values: string[] | undefined): string[] {
  const all = listRoutes();
  if (!values?.length) return all;
  for (const value of values) {
    if (!all.includes(value)) fail(`Unknown route "${value}". Known routes: ${all.join(', ')}.`);
  }
  return values;
}

async function parity(options: Options): Promise<number> {
  const routes = pickRoutes(options.route);
  const viewports = pick(options.viewport, Object.keys(VIEWPORTS) as ViewportName[], '--viewport');
  const themes = pick(options.theme, THEMES, '--theme');
  const maxDiff = Number(options['max-diff'] ?? 0.001);
  if (!Number.isFinite(maxDiff) || maxDiff < 0) fail('--max-diff must be a non-negative number, e.g. 0.001.');

  const prod = await startProd(!options['no-build']);
  const dev = await startDev().catch((error: unknown) => {
    prod.stop();
    throw error;
  });
  const browser = await chromium.launch();
  const runDir = newRunDir();
  const specs = routes.flatMap((route) =>
    viewports.flatMap((viewport) => themes.map((theme): ShotSpec => ({ route, viewport, theme })))
  );
  const runPair = async (spec: ShotSpec): Promise<PairReport> => {
    const base = path.join(runDir, `${routeSlug(spec.route)}.${spec.viewport}.${spec.theme}`);
    const files = { dev: `${base}.dev.png`, prod: `${base}.prod.png`, diff: `${base}.diff.png` };
    await Promise.all([
      withRetry(`${spec.route} ${spec.viewport} ${spec.theme} dev`, () =>
        screenshot(browser, dev.origin, spec, 'dev', files.dev, { hideUnstable: true })
      ),
      withRetry(`${spec.route} ${spec.viewport} ${spec.theme} prod`, () =>
        screenshot(browser, prod.origin, spec, 'prod', files.prod, { hideUnstable: true })
      )
    ]);
    const result = diffPngs(files.dev, files.prod, files.diff);
    return { ...spec, ...result, ...files, pass: result.ratio <= maxDiff };
  };
  let pairs: PairReport[] = [];
  try {
    await warmUp(browser, dev, routes);
    pairs = await mapPool(specs, PARALLEL_PAIRS, runPair);
  } finally {
    await browser.close();
    dev.stop();
    prod.stop();
  }

  const failed = pairs.filter((p) => !p.pass);
  const report = { pass: failed.length === 0, maxDiff, runDir, pairs };
  fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2));

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const p of pairs) {
      const size =
        p.devSize.join('x') === p.prodSize.join('x')
          ? ''
          : ` (page size dev ${p.devSize.join('x')} vs prod ${p.prodSize.join('x')})`;
      console.log(
        `${p.pass ? 'PASS' : 'FAIL'}  ${p.route} ${p.viewport} ${p.theme}  ${(p.ratio * 100).toFixed(3)}%${size}`
      );
    }
    console.log(`\nReport: ${path.relative(ROOT, path.join(runDir, 'report.json'))}`);
  }
  if (failed.length) {
    console.error(
      `\n${failed.length} of ${pairs.length} pairs differ between dev and the production build.\n` +
        `Open the .diff.png next to each FAIL (red = mismatch). The usual cause in this repo is CSS\n` +
        `imported from inside a client:only component: import it from the Astro layout or page instead.`
    );
    return 1;
  }
  return 0;
}

async function shot(routeArg: string | undefined, options: Options): Promise<number> {
  if (!routeArg) fail('shot needs a route, e.g. `pnpm verify:site shot /`.');
  const [route] = pickRoutes([routeArg]);
  const [viewport] = pick(options.viewport?.slice(0, 1), Object.keys(VIEWPORTS) as ViewportName[], '--viewport');
  const [theme] = pick(options.theme?.slice(0, 1), THEMES, '--theme');
  const mode = (options.mode ?? 'dev') as Mode;
  if (mode !== 'dev' && mode !== 'prod') fail(`Unknown --mode "${mode}". Use dev or prod.`);

  const server = mode === 'dev' ? await startDev() : await startProd(!options['no-build']);
  const browser = await chromium.launch();
  const file = path.join(newRunDir(), `${routeSlug(route)}.${viewport}.${theme}.${mode}.png`);
  try {
    // Canvas and video stay visible: shot is how a canvas gets looked at.
    await screenshot(browser, server.origin, { route, viewport, theme }, mode, file, { hideUnstable: false });
  } finally {
    await browser.close();
    server.stop();
  }
  console.log(options.json ? JSON.stringify({ file, route, viewport, theme, mode }) : file);
  return 0;
}

async function serve(options: Options): Promise<number> {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) fail('dist/ is empty. Run `pnpm build` first.');
  const port = Number(options.port ?? 4321);
  await serveDist(port);
  console.log(`Serving dist/ at http://127.0.0.1:${port} (static pages only; src/pages/api is not served).`);
  await new Promise(() => {});
  return 0;
}

// --- entry ------------------------------------------------------------------

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    route: { type: 'string', multiple: true },
    viewport: { type: 'string', multiple: true },
    theme: { type: 'string', multiple: true },
    mode: { type: 'string' },
    'no-build': { type: 'boolean' },
    'max-diff': { type: 'string' },
    port: { type: 'string' },
    json: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' }
  }
});
type Options = typeof options;

async function main(): Promise<number> {
  const [command, arg] = positionals;
  if (options.help || !command) {
    console.log(HELP);
    return command || options.help ? 0 : 1;
  }
  switch (command) {
    case 'parity':
      return parity(options);
    case 'shot':
      return shot(arg, options);
    case 'routes':
      console.log(options.json ? JSON.stringify(listRoutes()) : listRoutes().join('\n'));
      return 0;
    case 'serve':
      return serve(options);
    default:
      fail(`Unknown command "${command}". Run \`pnpm verify:site --help\`.`);
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof UsageError ? `verify-site: ${error.message}` : error);
    process.exit(error instanceof UsageError ? 2 : 1);
  }
);
