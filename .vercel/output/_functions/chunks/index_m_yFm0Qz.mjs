import { c as createComponent } from './astro-component_DACHeocT.mjs';
import 'piccolore';
import { n as renderComponent, r as renderTemplate, m as maybeRenderHead } from './entrypoint_DJA_N4oD.mjs';
import { $ as $$Layout } from './Layout_BhHNpMPF.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {}, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1>Inicio</h1> ` })}`;
}, "/Users/maurelia/Workspace/Octalink/Clients/RHLRealEstate/client-rhlrealestate-web/src/pages/index.astro", void 0);

const $$file = "/Users/maurelia/Workspace/Octalink/Clients/RHLRealEstate/client-rhlrealestate-web/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
