/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Exact DG brand palette from DG_Master_Email_Design_System
        canvas:      '#1D1B1C',   // bg-primary — main background
        surface:     '#262323',   // card-bg — elevated surfaces
        surface2:    '#2E2B2B',   // slightly lighter surface
        border:      '#333131',   // divider-subtle
        cream:       '#FEFCF5',   // text-primary
        cream2:      '#EEECE7',   // text-secondary
        muted:       '#C4C4C4',   // text-muted
        chartreuse:  '#DEE548',   // accent / cta-bg
        dim:         'rgba(254,252,245,0.6)', // text-dim
      },
      fontFamily: {
        // GT Pressura is loaded via @font-face in index.css
        sans: ['GT Pressura', 'Arial', 'Helvetica', 'sans-serif'],
      },
      letterSpacing: {
        label: '0.12em',
        wide:  '0.06em',
      },
    },
  },
  plugins: [],
}
