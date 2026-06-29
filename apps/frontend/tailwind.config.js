/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ig: {
          bg: '#000000',
          text: '#FFFFFF',
          surface: '#121212',
          border: '#262626',
          muted: '#8e8e8e',
          accent: '#E1306C',
          link: '#0095f6',
        },
      },
      animation: {
        'heart-pop': 'heartPop 0.75s ease-out forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        heartPop: {
          '0%': { transform: 'scale(0) rotate(-12deg)', opacity: '1' },
          '20%': { transform: 'scale(1.25) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1.1) rotate(0deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
