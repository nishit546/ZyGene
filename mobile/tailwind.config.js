/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: "#1B5E20",
        primaryDark: "#144517",
        primaryLight: "#E8F5E9",
        accent: "#2E7D32",
        farmBg: "#F8FAF8",
        surface: "#FFFFFF",
        surfaceSubtle: "#F4F6F4",
        surfaceMuted: "#EAEFEA",
        farmBorder: "#E2E8E2",
        farmBorderLight: "#EEF2EE",
        farmBorderDark: "#CBD5CB",
        textPrimary: "#1C2526",
        textSecondary: "#5A6B63",
        textMuted: "#8C9B93",
        danger: "#C62828",
        dangerBg: "#FFEBEE",
        warning: "#B45309",
        warningBg: "#FEF3C7",
      },
    },
  },
  plugins: [],
};
