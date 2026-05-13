/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Source Serif 4"', '"Newsreader"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: 'var(--ink)',
        bg: 'var(--bg)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        rule: 'var(--rule)',
        card: 'var(--card)',
      },
      maxWidth: {
        prose: '42rem',
        page: '68rem',
      },
      typography: {
        DEFAULT: {
          css: {
            color: 'var(--ink)',
          },
        },
      },
    },
  },
  plugins: [],
};
