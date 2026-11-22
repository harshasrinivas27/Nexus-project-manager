/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Flat tokens so bg-main, bg-surface, bg-card, bg-elevated work directly
        main: '#171923',
        surface: '#222635',
        card: '#222635',
        elevated: '#292F40',
        hover: '#31384D',
        subtle: '#1C202C',

        // Direct aliases for bg-* utilities
        'bg-main': '#171923',
        'bg-surface': '#222635',
        'bg-card': '#222635',
        'bg-elevated': '#292F40',
        'bg-hover': '#31384D',
        'bg-subtle': '#1C202C',

        // Nested namespace so bg-bg-main, bg-bg-card, text-bg-main work
        bg: {
          DEFAULT: '#171923',
          main: '#171923',
          surface: '#222635',
          card: '#222635',
          elevated: '#292F40',
          hover: '#31384D',
          subtle: '#1C202C',
        },

        // Accent palette (soft lavender & periwinkle)
        accent: {
          DEFAULT: '#A78BFA',
          primary: '#A78BFA',
          hover: '#BBA2FB',
          secondary: '#8B9CF7',
          glow: 'rgba(167, 139, 250, 0.15)',
        },
        'accent-primary': '#A78BFA',
        'accent-hover': '#BBA2FB',
        'accent-secondary': '#8B9CF7',

        // Content & Typography tokens
        content: {
          DEFAULT: '#F1F2F7',
          primary: '#F1F2F7',
          secondary: '#A0A8BA',
          muted: '#6B7488',
        },
        'content-primary': '#F1F2F7',
        'content-secondary': '#A0A8BA',
        'content-muted': '#6B7488',

        // Borders & dividers
        line: {
          DEFAULT: '#2E3446',
          subtle: '#2E3446',
          hover: '#3D455C',
          active: '#525D7A',
        },
        border: {
          DEFAULT: '#2E3446',
          subtle: '#2E3446',
          hover: '#3D455C',
          active: '#525D7A',
        },
        'line-subtle': '#2E3446',
        'line-hover': '#3D455C',
        'border-subtle': '#2E3446',
        'border-hover': '#3D455C',

        // Status indicators
        status: {
          green: '#34D399',
          amber: '#FBBF24',
          red: '#F87171',
          purple: '#A78BFA',
          blue: '#8B9CF7',
        },
        'status-green': '#34D399',
        'status-amber': '#FBBF24',
        'status-red': '#F87171',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.25), 0 1px 2px -1px rgba(0, 0, 0, 0.25)',
        'elevated': '0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 2px 6px -1px rgba(0, 0, 0, 0.2)',
        'glow-purple': '0 0 20px -3px rgba(167, 139, 250, 0.25)',
      }
    },
  },
  plugins: [],
}
