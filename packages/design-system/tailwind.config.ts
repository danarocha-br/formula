import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import containerQueries from "@tailwindcss/container-queries";
import defaultTheme from "tailwindcss/defaultTheme";
import typographyConfig from "./typography.config";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./node_modules/@repo/design-system/components/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
  ],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "hsl(var(--color-white) / <alpha-value>)",

      neutral: {
        50: "hsl(var(--color-neutral-50) / <alpha-value>)",
        100: "hsl(var(--color-neutral-100) / <alpha-value>)",
        200: "hsl(var(--color-neutral-200) / <alpha-value>)",
        300: "hsl(var(--color-neutral-300) / <alpha-value>)",
        400: "hsl(var(--color-neutral-400) / <alpha-value>)",
        500: "hsl(var(--color-neutral-500) / <alpha-value>)",
        600: "hsl(var(--color-neutral-600) / <alpha-value>)",
        700: "hsl(var(--color-neutral-700) / <alpha-value>)",
        800: "hsl(var(--color-neutral-800) / <alpha-value>)",
        900: "hsl(var(--color-neutral-900) / <alpha-value>)",
      },

      cyan: {
        50: "hsl(var(--color-cyan-50) / <alpha-value>)",
        100: "hsl(var(--color-cyan-100) / <alpha-value>)",
        200: "hsl(var(--color-cyan-200) / <alpha-value>)",
        300: "hsl(var(--color-cyan-300) / <alpha-value>)",
        400: "hsl(var(--color-cyan-400) / <alpha-value>)",
        500: "hsl(var(--color-cyan-500) / <alpha-value>)",
        600: "hsl(var(--color-cyan-600) / <alpha-value>)",
        700: "hsl(var(--color-cyan-700) / <alpha-value>)",
        800: "hsl(var(--color-cyan-800) / <alpha-value>)",
        900: "hsl(var(--color-cyan-900) / <alpha-value>)",
      },

      green: {
        50: "hsl(var(--color-green-50) / <alpha-value>)",
        100: "hsl(var(--color-green-100) / <alpha-value>)",
        200: "hsl(var(--color-green-200) / <alpha-value>)",
        300: "hsl(var(--color-green-300) / <alpha-value>)",
        400: "hsl(var(--color-green-400) / <alpha-value>)",
        500: "hsl(var(--color-green-500) / <alpha-value>)",
        600: "hsl(var(--color-green-600) / <alpha-value>)",
        700: "hsl(var(--color-green-700) / <alpha-value>)",
        800: "hsl(var(--color-green-800) / <alpha-value>)",
        900: "hsl(var(--color-green-900) / <alpha-value>)",
      },

      yellow: {
        50: "hsl(var(--color-yellow-50) / <alpha-value>)",
        100: "hsl(var(--color-yellow-100) / <alpha-value>)",
        200: "hsl(var(--color-yellow-200) / <alpha-value>)",
        300: "hsl(var(--color-yellow-300) / <alpha-value>)",
        400: "hsl(var(--color-yellow-400) / <alpha-value>)",
        500: "hsl(var(--color-yellow-500) / <alpha-value>)",
        600: "hsl(var(--color-yellow-600) / <alpha-value>)",
        700: "hsl(var(--color-yellow-700) / <alpha-value>)",
        800: "hsl(var(--color-yellow-800) / <alpha-value>)",
        900: "hsl(var(--color-yellow-900) / <alpha-value>)",
      },

      froly: {
        50: "hsl(var(--color-froly-50) / <alpha-value>)",
        100: "hsl(var(--color-froly-100) / <alpha-value>)",
        200: "hsl(var(--color-froly-200) / <alpha-value>)",
        300: "hsl(var(--color-froly-300) / <alpha-value>)",
        400: "hsl(var(--color-froly-400) / <alpha-value>)",
        500: "hsl(var(--color-froly-500) / <alpha-value>)",
        600: "hsl(var(--color-froly-600) / <alpha-value>)",
        700: "hsl(var(--color-froly-700) / <alpha-value>)",
        800: "hsl(var(--color-froly-800) / <alpha-value>)",
        900: "hsl(var(--color-froly-900) / <alpha-value>)",
      },

      purple: {
        50: "hsl(var(--color-purple-50) / <alpha-value>)",
        100: "hsl(var(--color-purple-100) / <alpha-value>)",
        200: "hsl(var(--color-purple-200) / <alpha-value>)",
        300: "hsl(var(--color-purple-300) / <alpha-value>)",
        400: "hsl(var(--color-purple-400) / <alpha-value>)",
        500: "hsl(var(--color-purple-500) / <alpha-value>)",
        600: "hsl(var(--color-purple-600) / <alpha-value>)",
        700: "hsl(var(--color-purple-700) / <alpha-value>)",
        800: "hsl(var(--color-purple-800) / <alpha-value>)",
        900: "hsl(var(--color-purple-900) / <alpha-value>)",
      },

      border: "hsl(var(--border) / <alpha-value>)",
      input: "hsl(var(--input) / <alpha-value>)",
      ring: "hsl(var(--ring) / <alpha-value>)",
      background: "hsl(var(--background) / <alpha-value>)",
      foreground: "hsl(var(--foreground) / <alpha-value>)",
      subdued: "hsl(var(--subdued) / <alpha-value>)",
      primary: {
        DEFAULT: "hsl(var(--primary) / <alpha-value>)",
        foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
      },
      secondary: {
        DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
        foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
      },
      destructive: {
        DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
        foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
      },
      muted: {
        DEFAULT: "hsl(var(--muted) / <alpha-value>)",
        foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
      },
      accent: {
        DEFAULT: "hsl(var(--accent) / <alpha-value>)",
        foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
      },
      popover: {
        DEFAULT: "hsl(var(--popover) / <alpha-value>)",
        foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
      },
      card: {
        DEFAULT: "hsl(var(--card) / <alpha-value>)",
        foreground: "hsl(var(--card-foreground) / <alpha-value>)",
      },
      success: {
        DEFAULT: "hsl(var(--success) / <alpha-value>)",
        foreground: "hsl(var(--success-foreground) / <alpha-value>)",
      },
      warning: {
        DEFAULT: "hsl(var(--warning) / <alpha-value>)",
        foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
      },
      brand: {
        DEFAULT: "hsl(var(--primary) / <alpha-value>)",
        foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
      },
      sidebar: {
        DEFAULT: "hsl(var(--sidebar-background))",
        foreground: "hsl(var(--sidebar-foreground))",
        primary: "hsl(var(--sidebar-primary))",
        "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
        accent: "hsl(var(--sidebar-accent))",
        "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
        border: "hsl(var(--sidebar-border))",
        ring: "hsl(var(--sidebar-ring))",
      },
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      borderRadius: {
        none: "0px",
        sm: "8px",
        md: "17px",
        lg: "21px",
        xl: "24px",
        pill: "9999px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...defaultTheme.fontFamily.mono],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      typography: typographyConfig,
    },
  },
  plugins: [animate, typography, containerQueries],
};

export default config;
