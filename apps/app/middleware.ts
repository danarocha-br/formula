import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { getCountryFromIP, getIPAddress, LANGUAGE_MAP } from "./utils/ip-api";

// export default clerkMiddleware();

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
  if (localeCookie) return response;

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

export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  const clerkResponse = await clerkMiddleware()(request, event);

  const response = clerkResponse || NextResponse.next();

  return await setLanguageCookie(request, response);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
