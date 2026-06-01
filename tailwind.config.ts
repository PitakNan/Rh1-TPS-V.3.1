import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx,css}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sarabun', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: { 900: '#0f172a', 800: '#1e293b', 700: '#334155' },
      },
    },
  },
  plugins: [],
}

export default config
