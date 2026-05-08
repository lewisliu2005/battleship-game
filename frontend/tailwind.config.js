/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        navy: {
          900: '#0a0f1e',
          800: '#0d1530',
          700: '#101d42',
          600: '#162354',
        },
        ocean: {
          500: '#0ea5e9',
          400: '#38bdf8',
          300: '#7dd3fc',
        },
        hit: '#ef4444',
        miss: '#6b7280',
        sunk: '#f97316',
      },
      animation: {
        'ping-once': 'ping 0.5s ease-out 1',
        'shake': 'shake 0.4s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          '0%,100%': { boxShadow: '0 0 8px rgba(14,165,233,0.4)' },
          '50%': { boxShadow: '0 0 24px rgba(14,165,233,0.8)' },
        },
      },
    },
  },
  plugins: [],
};
