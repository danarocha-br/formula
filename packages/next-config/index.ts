import withBundleAnalyzer from "@next/bundle-analyzer";

// @ts-expect-error No declaration file
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";
import { withSentryConfig } from "@sentry/nextjs";
import withVercelToolbar from "@vercel/toolbar/plugins/next";
import type { NextConfig } from "next";
import { createSecureHeaders } from "next-secure-headers";

// Compose the base config first
export const config: NextConfig = withVercelToolbar()({
  // i18n: {
  //   locales: ["en", "pt-BR"],
  //   defaultLocale: "en",
  // },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },

  // biome-ignore lint/suspicious/useAwait: rewrites is async
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
        basePath: false,
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
        basePath: false,
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
        basePath: false,
      },
    ];
  },

  // biome-ignore lint/suspicious/useAwait: headers is async
  async headers() {
    const apiPathPattern =
      process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\/[^\/]+/, "") ||
      "/api/:path*";

    const isDevelopment = process.env.NODE_ENV === "development";

    return [
      {
        source: "/(.*)",
        headers: [
          ...createSecureHeaders({
            forceHTTPSRedirect: [
              true,
              { maxAge: 63_072_000, includeSubDomains: true, preload: true },
            ],
          }),
          {
            key: "Access-Control-Allow-Origin",
            value: isDevelopment
              ? "http://localhost:3002"
              : process.env.NEXT_PUBLIC_API_URL || "",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
        ],
      },
      {
        source: apiPathPattern,
        headers: [
          ...createSecureHeaders({
            forceHTTPSRedirect: [
              true,
              { maxAge: 63_072_000, includeSubDomains: true, preload: true },
            ],
          }),
          // Add CORS headers
          {
            key: "Access-Control-Allow-Origin",
            value: isDevelopment
              ? "http://localhost:3000"
              : process.env.NEXT_PUBLIC_APP_URL || "",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
        ],
      },
    ];
  },

  webpack(config, { isServer }) {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }

    return config;
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  // Add server configuration
  experimental: {},

  poweredByHeader: false,
});

export const sentryConfig: Parameters<typeof withSentryConfig>[1] = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  /*
   * For all available options, see:
   * https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
   */

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  /*
   * Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
   * This can increase your server load as well as your hosting bill.
   * Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
   * side errors will fail.
   */
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  /*
   * Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
   * See the following for more information:
   * https://docs.sentry.io/product/crons/
   * https://vercel.com/docs/cron-jobs
   */
  automaticVercelMonitors: true,
};

export const withSentry = (sourceConfig: NextConfig): NextConfig =>
  withSentryConfig(sourceConfig, sentryConfig);

export const withAnalyzer = (sourceConfig: NextConfig): NextConfig =>
  withBundleAnalyzer()(sourceConfig);

export { withLogtail } from "@logtail/next";
