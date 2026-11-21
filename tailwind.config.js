const hb = (name) => `rgb(var(--hb-${name}) / <alpha-value>)`;
const scale = (name, steps) => Object.fromEntries(steps.map((s) => [s, hb(`${name}-${s}`)]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Palette alignée sur le site principal. Les valeurs vivent dans des variables CSS
      // (index.css) : l'admin (conteneur .hb-admin) les redéfinit avec les couleurs Tailwind d'origine.
      colors: {
        gray: scale('gray', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        orange: scale('orange', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        amber: scale('amber', [300, 400, 500, 600, 700]),
      },
    },
  },
  plugins: [],
}
