/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js}', // Scan alle HTML- en JS-bestanden in de src-map
        './dashboard/**/*.{html,js}',  // Alle HTML- en JS-bestanden in de dashboardmap
        './login/**/*.{html,js}',      // Alle HTML- en JS-bestanden in de loginmap
        './teamleader/**/*.{html,js}', // Alle HTML- en JS-bestanden in de teamleadermap
        './js/**/*.{js}',              // Alle JS-bestanden in de js-map (bijv. voor scripts die Tailwind gebruiken)
      ],
      theme: {
        extend: {},
      },
      plugins: [],
    }
    
