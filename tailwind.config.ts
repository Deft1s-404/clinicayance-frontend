import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Atualiza paleta primária para o dourado da marca
        primary: {
          DEFAULT: '#d4a44f',
          dark: '#b8832f',
          light: '#f0d8a3'
        },
        slate: {
          950: '#0f172a'
        }
      }
    }
  },
  plugins: []
};

export default config;
