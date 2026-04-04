import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fiesta: {
          bg: '#FFFBF0',
          orange: '#FF6B35',
          'orange-dark': '#c94a00',
          rose: '#FF3CAC',
          'rose-dark': '#c4006b',
          yellow: '#FFD700',
          'yellow-dark': '#b89a00',
          dark: '#1a1a2e',
          red: '#EF4444',
          blue: '#3B82F6',
          'red-team-bg': '#FFF0EE',
          'blue-team-bg': '#EEF3FF',
        },
      },
      fontFamily: {
        playful: ['Fredoka One', 'Trebuchet MS', 'sans-serif'],
      },
      keyframes: {
        targetPop: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shakeVibrate: {
          '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
          '20%': { transform: 'translateX(-6px) rotate(-5deg)' },
          '40%': { transform: 'translateX(6px) rotate(5deg)' },
          '60%': { transform: 'translateX(-4px) rotate(-3deg)' },
          '80%': { transform: 'translateX(4px) rotate(3deg)' },
        },
      },
      animation: {
        'target-pop': 'targetPop 0.25s ease-out',
        'shake-vibrate': 'shakeVibrate 0.3s infinite',
      },
      boxShadow: {
        'btn-orange': '0 4px 0 #c94a00',
        'btn-rose': '0 4px 0 #c4006b',
        'btn-yellow': '0 4px 0 #b89a00',
      },
    },
  },
  plugins: [],
}
export default config
