/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#202a35',
        muted: '#7b8794',
        brand: '#365d78',
        canvas: '#f6f7f8'
      },
      boxShadow: { soft: '0 2px 8px rgba(20, 35, 50, .04)' }
    }
  },
  plugins: []
};
