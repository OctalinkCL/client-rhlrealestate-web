export const CONTACT_EMAIL = "contacto@rhlrealestate.cl";
export const CONTACT_WHATSAPP = "56948043836";

interface PropertyRef {
  title: string;
  publicId: string;
}

function propertyMessage({ title, publicId }: PropertyRef) {
  return `Hola, me interesa esta propiedad: "${title}" (ID: ${publicId})`;
}

/** Link de WhatsApp con mensaje prellenado sobre la propiedad. */
export function propertyWhatsappHref(property: PropertyRef) {
  const text = encodeURIComponent(propertyMessage(property));
  return `https://api.whatsapp.com/send/?phone=${CONTACT_WHATSAPP}&text=${text}&type=phone_number&app_absent=0`;
}

/** Link mailto con asunto y cuerpo prellenados sobre la propiedad. */
export function propertyMailHref(property: PropertyRef) {
  const subject = encodeURIComponent(`Consulta propiedad ${property.publicId}`);
  const body = encodeURIComponent(propertyMessage(property));
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}
