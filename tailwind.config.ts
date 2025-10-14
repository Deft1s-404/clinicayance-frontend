import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#28A17B',
          dark: '#1f7f63',
          light: '#5cd3aa'
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
