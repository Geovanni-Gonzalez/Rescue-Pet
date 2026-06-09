/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        rescue: {
          50: 'oklch(0.96 0.02 175)',
          100: 'oklch(0.92 0.04 175)',
          500: 'oklch(0.60 0.14 175)',
          600: 'oklch(0.51 0.14 175)',
          700: 'oklch(0.48 0.12 175)',
          900: 'oklch(0.25 0.06 175)',
        },
        warm: {
          50: 'oklch(0.96 0.02 70)',
          100: 'oklch(0.92 0.04 70)',
          500: 'oklch(0.75 0.16 70)',
          600: 'oklch(0.68 0.16 70)',
          700: 'oklch(0.60 0.14 70)',
        },
        status: {
          success: {
            DEFAULT: 'var(--status-success-bg)',
            fg: 'var(--status-success-fg)',
            bd: 'var(--status-success-bd)',
            solid: 'var(--status-success-solid)',
          },
          caution: {
            DEFAULT: 'var(--status-caution-bg)',
            fg: 'var(--status-caution-fg)',
            bd: 'var(--status-caution-bd)',
          },
          info: {
            DEFAULT: 'var(--status-info-bg)',
            fg: 'var(--status-info-fg)',
            bd: 'var(--status-info-bd)',
            solid: 'var(--status-info-solid)',
          },
          adopted: {
            DEFAULT: 'var(--status-adopted-bg)',
            fg: 'var(--status-adopted-fg)',
            bd: 'var(--status-adopted-bd)',
          },
          neutral: {
            DEFAULT: 'var(--status-neutral-bg)',
            fg: 'var(--status-neutral-fg)',
            bd: 'var(--status-neutral-bd)',
          },
          danger: {
            DEFAULT: 'var(--status-danger-bg)',
            fg: 'var(--status-danger-fg)',
            bd: 'var(--status-danger-bd)',
            solid: 'var(--status-danger-solid)',
          },
          'on-solid': 'var(--status-on-solid)',
        },
      },
      transitionTimingFunction: {
        'out-strong': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out-strong': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'drawer': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
