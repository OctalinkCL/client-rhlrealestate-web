import { c as createComponent } from './astro-component_DACHeocT.mjs';
import 'piccolore';
import { n as renderComponent, r as renderTemplate, m as maybeRenderHead } from './entrypoint_DJA_N4oD.mjs';
import { $ as $$Layout } from './Layout_BhHNpMPF.mjs';

const $$id = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {}, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1>Detalle de propiedad</h1> ` })}`;
}, "/Users/maurelia/Workspace/Octalink/Clients/RHLRealEstate/client-rhlrealestate-web/src/pages/propiedades/[id].astro", void 0);

const $$file = "/Users/maurelia/Workspace/Octalink/Clients/RHLRealEstate/client-rhlrealestate-web/src/pages/propiedades/[id].astro";
const $$url = "/propiedades/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
