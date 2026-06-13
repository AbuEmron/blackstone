/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0C0E",
        panel: "#141619",
        panel2: "#1B1E22",
        line: "#2A2E34",
        steel: "#8A929E",
        plat2: "#9AA3AF",
        platinum: "#D6DAE0",
        ice: "#7FB2C9",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
