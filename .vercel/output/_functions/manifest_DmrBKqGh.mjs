import 'piccolore';
import { o as decodeKey } from './chunks/astro/server_zxR_juSk.mjs';
import 'clsx';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/astro-designed-error-pages_DIAej2p9.mjs';
import 'es-module-lexer';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///Users/braydoncoyer/Development/personal/theme-park-analytics/","cacheDir":"file:///Users/braydoncoyer/Development/personal/theme-park-analytics/node_modules/.astro/","outDir":"file:///Users/braydoncoyer/Development/personal/theme-park-analytics/dist/","srcDir":"file:///Users/braydoncoyer/Development/personal/theme-park-analytics/src/","publicDir":"file:///Users/braydoncoyer/Development/personal/theme-park-analytics/public/","buildClientDir":"file:///Users/braydoncoyer/Development/personal/theme-park-analytics/dist/client/","buildServerDir":"file:///Users/braydoncoyer/Development/personal/theme-park-analytics/dist/server/","adapterName":"@astrojs/vercel","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"analytics/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/analytics","isIndex":true,"type":"page","pattern":"^\\/analytics\\/?$","segments":[[{"content":"analytics","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/analytics/index.astro","pathname":"/analytics","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/parks.json","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/parks.json","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/parks\\.json\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"parks.json","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/parks.json.ts","pathname":"/api/parks.json","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"plan/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/plan","isIndex":true,"type":"page","pattern":"^\\/plan\\/?$","segments":[[{"content":"plan","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/plan/index.astro","pathname":"/plan","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/entertainment/[id].json","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/entertainment\\/([^/]+?)\\.json\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"entertainment","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false},{"content":".json","dynamic":false,"spread":false}]],"params":["id"],"component":"src/pages/api/entertainment/[id].json.ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/park-hours/[id].json","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/park-hours\\/([^/]+?)\\.json\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"park-hours","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false},{"content":".json","dynamic":false,"spread":false}]],"params":["id"],"component":"src/pages/api/park-hours/[id].json.ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/parks/[id].json","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/parks\\/([^/]+?)\\.json\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"parks","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false},{"content":".json","dynamic":false,"spread":false}]],"params":["id"],"component":"src/pages/api/parks/[id].json.ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/index.TGv2AVMo.css"},{"type":"external","src":"/_astro/_id_.GErZFUU5.css"}],"routeData":{"route":"/parks/[id]","isIndex":false,"type":"page","pattern":"^\\/parks\\/([^/]+?)\\/?$","segments":[[{"content":"parks","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false}]],"params":["id"],"component":"src/pages/parks/[id].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/Users/braydoncoyer/Development/personal/theme-park-analytics/src/pages/analytics/index.astro",{"propagation":"none","containsHead":true}],["/Users/braydoncoyer/Development/personal/theme-park-analytics/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/Users/braydoncoyer/Development/personal/theme-park-analytics/src/pages/parks/[id].astro",{"propagation":"none","containsHead":true}],["/Users/braydoncoyer/Development/personal/theme-park-analytics/src/pages/plan/index.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:src/pages/analytics/index@_@astro":"pages/analytics.astro.mjs","\u0000@astro-page:src/pages/api/entertainment/[id].json@_@ts":"pages/api/entertainment/_id_.json.astro.mjs","\u0000@astro-page:src/pages/api/park-hours/[id].json@_@ts":"pages/api/park-hours/_id_.json.astro.mjs","\u0000@astro-page:src/pages/api/parks/[id].json@_@ts":"pages/api/parks/_id_.json.astro.mjs","\u0000@astro-page:src/pages/api/parks.json@_@ts":"pages/api/parks.json.astro.mjs","\u0000@astro-page:src/pages/parks/[id]@_@astro":"pages/parks/_id_.astro.mjs","\u0000@astro-page:src/pages/plan/index@_@astro":"pages/plan.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_DmrBKqGh.mjs","/Users/braydoncoyer/Development/personal/theme-park-analytics/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_DfOnzAkg.mjs","/Users/braydoncoyer/Development/personal/theme-park-analytics/src/components/park-detail/ParkDetailPage":"_astro/ParkDetailPage.DpgEUR_7.js","/Users/braydoncoyer/Development/personal/theme-park-analytics/src/components/landing/LandingPage":"_astro/LandingPage.COnoI3Rv.js","/Users/braydoncoyer/Development/personal/theme-park-analytics/src/components/analytics/AnalyticsDashboardWithProvider":"_astro/AnalyticsDashboardWithProvider.B6wrPk-Y.js","/Users/braydoncoyer/Development/personal/theme-park-analytics/src/components/plan-wizard/PlanWizardWithProvider":"_astro/PlanWizardWithProvider.DeJTVk9r.js","@astrojs/react/client.js":"_astro/client.SlIoTHO_.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/_id_.GErZFUU5.css","/_astro/index.TGv2AVMo.css","/_astro/index.CgA8EmNX.css","/favicon.svg","/_astro/AnalyticsDashboardWithProvider.8yjMKIDV.css","/_astro/AnalyticsDashboardWithProvider.B6wrPk-Y.js","/_astro/LandingPage.COnoI3Rv.js","/_astro/LineChart.jpPcoxuW.js","/_astro/ParkDetailPage.DpgEUR_7.js","/_astro/PlanWizardWithProvider.CDbK7xlc.css","/_astro/PlanWizardWithProvider.DeJTVk9r.js","/_astro/_id_.DB6U_f94.css","/_astro/api.BwuCBAwO.js","/_astro/client.SlIoTHO_.js","/_astro/index.1wiy9QGF.css","/_astro/index.4ifBoAec.js","/_astro/index.Da02gyCa.js","/_astro/jsx-runtime.D_zvdyIk.js","/_astro/moon.Baz6JR5F.js","/_astro/parkImages.BwOBi-JW.js","/_astro/resortPairings.BcELqoxQ.js","/_astro/zap.Vi7uFTV2.js","/analytics/index.html","/api/parks.json","/plan/index.html","/index.html"],"buildFormat":"directory","checkOrigin":true,"allowedDomains":[],"serverIslandNameMap":[],"key":"Z27bdEZj6M3xJnqibg3YZZRmiQTw7/ch6bOt3ujEZ/0="});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = null;

export { manifest };
