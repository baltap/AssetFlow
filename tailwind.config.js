/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          charcoal: "#121212",
          slate: "#1e1e1e",
          "slate-light": "#2a2a2a",
          sand: "#d6c9b1",
          "sand-muted": "#b5a992",
          text: "#e0e0e0",
          "text-muted": "#a0a0a0",
          border: "rgba(255, 255, 255, 0.08)",
          "border-light": "rgba(255, 255, 255, 0.15)",
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
