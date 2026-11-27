/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1F6FA8",
          dark: "#17507E",
          navy: "#14304F",
          accent: "#2FA3C4",
          light: "#E6F1F9",
        },
        border: "hsl(var(--border, 214.3 31.8% 91.4%))",
        input: "hsl(var(--input, 214.3 31.8% 91.4%))",
        ring: "hsl(var(--ring, 222.2 84% 4.9%))",
        background: "hsl(var(--background, 0 0% 100%))",
        foreground: "hsl(var(--foreground, 222.2 84% 4.9%))",
        primary: {
          DEFAULT: "hsl(var(--primary, 221.2 83.2% 53.3%))",
          foreground: "hsl(var(--primary-foreground, 210 40% 98%))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 210 40% 96.1%))",
          foreground: "hsl(var(--secondary-foreground, 222.2 47.4% 11.2%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive, 0 84.2% 60.2%))",
          foreground: "hsl(var(--destructive-foreground, 210 40% 98%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 210 40% 96.1%))",
          foreground: "hsl(var(--muted-foreground, 215.4 16.3% 46.9%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, 210 40% 96.1%))",
          foreground: "hsl(var(--accent-foreground, 222.2 47.4% 11.2%))",
        },
        card: {
          DEFAULT: "hsl(var(--card, 0 0% 100%))",
          foreground: "hsl(var(--card-foreground, 222.2 84% 4.9%))",
        },
      },
      keyframes: {
        // One small jump when a notification arrives, then it settles.
        belljump: {
          '0%': { transform: 'translateY(0) rotate(0deg)' },
          '15%': { transform: 'translateY(-6px) rotate(-12deg)' },
          '30%': { transform: 'translateY(0) rotate(10deg)' },
          '45%': { transform: 'translateY(-3px) rotate(-6deg)' },
          '60%': { transform: 'translateY(0) rotate(0deg)' },
          '100%': { transform: 'translateY(0) rotate(0deg)' },
        },
        // The unread badge flashes twice so a change is noticeable even when
        // the jump happens while the user is looking elsewhere.
        badgeflash: {
          '0%, 100%': { backgroundColor: '#ef4444', transform: 'scale(1)' },
          '50%': { backgroundColor: '#f59e0b', transform: 'scale(1.25)' },
        },
      },
      animation: {
        belljump: 'belljump 0.9s ease-in-out 1',
        badgeflash: 'badgeflash 0.45s ease-in-out 3',
      },
    },
  },
  plugins: [],
}
