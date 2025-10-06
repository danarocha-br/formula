import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  type NextRequest,
  NextResponse,
} from "next/server";
import { LANGUAGE_MAP, getCountryFromIP, getIPAddress } from "./utils/ip-api";

async function setLanguageCookie(
  request: NextRequest,
  response: Response
): Promise<Response> {
  // Skip certain paths
  if (
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return response;
  }

  // Check existing cookie
  const localeCookie = request.cookies.get("NEXT_LOCALE");
  if (localeCookie) {
    return response;
  }

  try {
    const ip = getIPAddress(request);
    const countryCode = await getCountryFromIP(ip);
    const language = LANGUAGE_MAP[countryCode] || LANGUAGE_MAP.default;

    // Create new response with the cookie
    const newResponse = NextResponse.next();
    newResponse.cookies.set("NEXT_LOCALE", language, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    response.headers.forEach((value, key) => {
      newResponse.headers.set(key, value);
    });

    return newResponse;
  } catch (error) {
    console.error("Language middleware error:", error);
    return response;
  }
}

// Define public routes
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/.well-known(.*)",
]);

// Use Clerk's middleware with a custom handler
export default clerkMiddleware((auth, req) => {
  const request = req as NextRequest;

  // If the user is not authenticated and the route is not public, redirect to sign-in
  if (!auth.sessionId && !isPublicRoute(request)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // For all other cases, proceed with the language middleware
  return setLanguageCookie(request, NextResponse.next());
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
