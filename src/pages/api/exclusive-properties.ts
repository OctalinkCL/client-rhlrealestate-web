import type { APIRoute } from "astro";
import { getExclusiveProperties } from "../../lib/easybroker";

export const GET: APIRoute = async () => {
  const properties = await getExclusiveProperties();

  return new Response(JSON.stringify(properties), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=60",
    },
  });
};
