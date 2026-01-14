import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_BkwsDmP3.mjs';
import { manifest } from './manifest_DmrBKqGh.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/analytics.astro.mjs');
const _page2 = () => import('./pages/api/entertainment/_id_.json.astro.mjs');
const _page3 = () => import('./pages/api/park-hours/_id_.json.astro.mjs');
const _page4 = () => import('./pages/api/parks/_id_.json.astro.mjs');
const _page5 = () => import('./pages/api/parks.json.astro.mjs');
const _page6 = () => import('./pages/parks/_id_.astro.mjs');
const _page7 = () => import('./pages/plan.astro.mjs');
const _page8 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/analytics/index.astro", _page1],
    ["src/pages/api/entertainment/[id].json.ts", _page2],
    ["src/pages/api/park-hours/[id].json.ts", _page3],
    ["src/pages/api/parks/[id].json.ts", _page4],
    ["src/pages/api/parks.json.ts", _page5],
    ["src/pages/parks/[id].astro", _page6],
    ["src/pages/plan/index.astro", _page7],
    ["src/pages/index.astro", _page8]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "d09aa965-2a4e-4dc7-9177-c5cfe9461a4c",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
