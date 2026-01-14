import { e as createComponent, f as createAstro, h as addAttribute, l as renderHead, n as renderSlot, r as renderTemplate, m as maybeRenderHead } from './astro/server_zxR_juSk.mjs';
import 'piccolore';
import 'clsx';
/* empty css                         */

const $$Astro$1 = createAstro();
const $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$BaseLayout;
  const {
    title = "Theme Park Analytics",
    description = "Make informed decisions about when to visit your favorite theme parks with real-time wait times and crowd analytics",
    showFooter = false
  } = Astro2.props;
  return renderTemplate`<html lang="en" data-astro-cid-37fxchfa> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description"${addAttribute(description, "content")}><meta name="generator"${addAttribute(Astro2.generator, "content")}><!-- Open Graph --><meta property="og:title"${addAttribute(title, "content")}><meta property="og:description"${addAttribute(description, "content")}><meta property="og:type" content="website"><!-- Favicon --><link rel="icon" type="image/svg+xml" href="/favicon.svg"><!-- Preload critical fonts --><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><title>${title}</title>${renderHead()}</head> <body data-astro-cid-37fxchfa> ${renderSlot($$result, $$slots["default"])} ${showFooter && renderTemplate`<footer class="attribution" data-astro-cid-37fxchfa> <div class="container" data-astro-cid-37fxchfa> <p data-astro-cid-37fxchfa>
Data powered by${" "} <a href="https://queue-times.com" target="_blank" rel="noopener noreferrer" data-astro-cid-37fxchfa>
Queue-Times.com
</a> </p> </div> </footer>`} </body></html>`;
}, "/Users/braydoncoyer/Development/personal/theme-park-analytics/src/layouts/BaseLayout.astro", void 0);

const $$Astro = createAstro();
const $$Header = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Header;
  const pathname = Astro2.url.pathname;
  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/analytics", label: "Analytics" },
    { href: "/plan", label: "Plan My Visit" }
  ];
  function isActive(href, pathname2) {
    if (href === "/") {
      return pathname2 === "/";
    }
    return pathname2.startsWith(href);
  }
  return renderTemplate`${maybeRenderHead()}<header class="header" data-astro-cid-qlfjksao> <div class="header-container" data-astro-cid-qlfjksao> <a href="/" class="logo" data-astro-cid-qlfjksao> <span class="logo-icon" data-astro-cid-qlfjksao>🎢</span> <span class="logo-text" data-astro-cid-qlfjksao>ParkPlannerAI</span> </a> <nav class="nav" data-astro-cid-qlfjksao> ${navItems.map((item) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(`nav-link ${isActive(item.href, pathname) ? "active" : ""}`, "class")} data-astro-cid-qlfjksao> ${item.label} </a>`)} </nav> <div class="header-actions" data-astro-cid-qlfjksao> <a href="/plan" class="cta-button" data-astro-cid-qlfjksao>
Create Plan
</a> </div> </div> </header> `;
}, "/Users/braydoncoyer/Development/personal/theme-park-analytics/src/components/layout/Header.astro", void 0);

export { $$BaseLayout as $, $$Header as a };
