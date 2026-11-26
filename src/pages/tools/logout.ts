import type { APIRoute } from "astro";
import { TOOLS_COOKIE } from "@/lib/tools-auth";

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(TOOLS_COOKIE, { path: "/" });
  return redirect("/tools/login", 303);
};
