import { c as createComponent } from './astro-component_DACHeocT.mjs';
import 'piccolore';
import { h as addAttribute, o as renderHead, p as renderSlot, r as renderTemplate } from './entrypoint_DJA_N4oD.mjs';
import 'clsx';

const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Layout;
  return renderTemplate`<html lang="es"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="icon" href="/favicon.ico"><meta name="generator"${addAttribute(Astro2.generator, "content")}><title>Astro Basics</title>${renderHead()}</head> <body> ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "/Users/maurelia/Workspace/Octalink/Clients/RHLRealEstate/client-rhlrealestate-web/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
