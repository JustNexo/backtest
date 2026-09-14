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
        tv: {
          bg: '#131722',
          surface: '#1e222d',
          surfaceHover: '#2a2e39',
          border: '#2a2e39',
          borderLight: '#363a45',
          text: '#d1d4dc',
          textMuted: '#787b86',
          blue: '#2962ff',
          blueHover: '#1e53e5',
          green: '#089981',
          greenHover: '#067a67',
          red: '#f23645',
          redHover: '#d32635',
          yellow: '#f7a600',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Trebuchet MS', 'Roboto', 'Ubuntu', 'sans-serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
