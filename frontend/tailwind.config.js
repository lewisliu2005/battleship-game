/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rajdhani', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
      colors: {
        // Industrial dark palette
        steel: {
          950: '#0e0e14',
          900: '#1a1a24',
          800: '#22222e',
          700: '#2d2d3a',
          600: '#3a3a4a',
          500: '#4a4a5e',
        },
        // Construction yellow
        yellow: {
          600: '#B87B00',
          500: '#D4920A',
          400: '#F5A623',
          300: '#FFBE50',
        },
        // Machinery blue
        blue: {
          700: '#2D4A7A',
          600: '#3A5A8E',
          500: '#4A6FA5',
          400: '#6B8EC0',
          300: '#90AEDD',
        },
        // Alert orange
        alert: '#E8622A',
        hit: '#EF4444',
        miss: '#1a1a2e',
        sunk: '#E8622A',
        // Aliases for backwards-compat
        navy: {
          900: '#0e0e14',
          800: '#1a1a24',
          700: '#22222e',
          600: '#2d2d3a',
        },
        ocean: {
          500: '#4A6FA5',
          400: '#6B8EC0',
          300: '#90AEDD',
        },
      },
      animation: {
        'ping-once': 'ping 0.5s ease-out 1',
        'shake': 'shake 0.4s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow-yellow 2s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'flicker': 'flicker 0.15s ease-in-out',
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
          '50%': { transform: 'translateY(-6px)' },
        },
        'glow-yellow': {
          '0%,100%': { boxShadow: '0 0 8px rgba(245,166,35,0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(245,166,35,0.7)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%,100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
      },
    },
  },
  plugins: [],
};
