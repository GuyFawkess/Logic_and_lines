import { renderers } from './renderers.mjs';
import { c as createExports } from './chunks/entrypoint_B_ztEt5o.mjs';
import { manifest } from './manifest_DL1k4qh1.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/404.astro.mjs');
const _page2 = () => import('./pages/api/meta-conversions.astro.mjs');
const _page3 = () => import('./pages/contact.astro.mjs');
const _page4 = () => import('./pages/en/404.astro.mjs');
const _page5 = () => import('./pages/en/contact.astro.mjs');
const _page6 = () => import('./pages/en/landing-lead.astro.mjs');
const _page7 = () => import('./pages/en/privacy-policy.astro.mjs');
const _page8 = () => import('./pages/en/service/_id_.astro.mjs');
const _page9 = () => import('./pages/en.astro.mjs');
const _page10 = () => import('./pages/politica-de-privacidad.astro.mjs');
const _page11 = () => import('./pages/service/_id_.astro.mjs');
const _page12 = () => import('./pages/thankyou.astro.mjs');
const _page13 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/.pnpm/astro@5.7.10_@types+node@22_187671bb292faded1b1688ebc865538c/node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/404.astro", _page1],
    ["src/pages/api/meta-conversions.ts", _page2],
    ["src/pages/contact.astro", _page3],
    ["src/pages/en/404.astro", _page4],
    ["src/pages/en/contact.astro", _page5],
    ["src/pages/en/landing-lead.astro", _page6],
    ["src/pages/en/privacy-policy.astro", _page7],
    ["src/pages/en/service/[id].astro", _page8],
    ["src/pages/en/index.astro", _page9],
    ["src/pages/politica-de-privacidad.astro", _page10],
    ["src/pages/service/[id].astro", _page11],
    ["src/pages/thankyou.astro", _page12],
    ["src/pages/index.astro", _page13]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "b6c2933c-9c80-4ccc-9dd4-e999b2292ab5",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;

export { __astrojsSsrVirtualEntry as default, pageMap };
