/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f7f7f3",
        foreground: "#1f2937",
        card: "#ffffff",
        primary: "#0b7285",
        "primary-foreground": "#ffffff",
        accent: "#ffe8cc",
        muted: "#f1f5f9",
        danger: "#b91c1c"
      }
    }
  },
  plugins: []
};

