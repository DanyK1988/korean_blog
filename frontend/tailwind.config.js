/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#ffffff",
        paper: "#f8f8f6",
        ink: "#1f2430",
        muted: "#6b7280",
        accent: {
          DEFAULT: "#e05c5c",
          dark: "#c44848",
          soft: "#fbeaea",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 2px 10px rgba(15, 23, 42, 0.06)",
        pop: "0 8px 30px rgba(15, 23, 42, 0.14)",
      },
    },
  },
  plugins: [],
};
