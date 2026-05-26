import type { APIRoute } from "astro";
import { sendContactEmail } from "../../lib/resend";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const result = await sendContactEmail(body);

  return new Response(
    JSON.stringify(result.ok ? { ok: true } : { error: result.error }),
    { status: result.status }
  );
};
