// constants/Colors.ts

const tintColorLight = '#0a7ea4'; // Example Primary Blue
const tintColorDark = '#38bdf8'; // Lighter Blue for Dark Mode (Sky Blue 500)

// Define specific colors for clarity
const darkBackground = '#111827'; // Very Dark Blue/Gray (Gray 900)
const darkCardBackground = '#1f2937'; // Darker Gray/Blue (Gray 800)
const darkInputBackground = '#374151'; // Medium Dark Gray/Blue (Gray 700)
const darkInputBorder = '#4b5563'; // Gray 600
const darkText = '#f9fafb'; // Off-white (Gray 50)
const darkTextSecondary = '#9ca3af'; // Lighter Gray (Gray 400)
const darkPlaceholderText = '#6b7280'; // Gray 500
const darkBorder = '#374151'; // Gray 700 (Same as input bg for subtle borders)
const darkDanger = '#f87171'; // Lighter Red (Red 400)

const lightBackground = '#f8fafc'; // Very Light Gray (Slate 50)
const lightCardBackground = '#ffffff'; // White
const lightInputBackground = '#ffffff'; // White
const lightInputBorder = '#e5e7eb'; // Gray 200
const lightText = '#1f2937'; // Dark Gray (Gray 800)
const lightTextSecondary = '#6b7280'; // Medium Gray (Gray 500)
const lightPlaceholderText = '#9ca3af'; // Gray 400
const lightBorder = '#e5e7eb'; // Gray 200
const lightDanger = '#dc2626'; // Standard Red (Red 600)


export const Colors = {
  light: {
    text: lightText,
    background: lightBackground,
    tint: tintColorLight,
    icon: '#687076', // Default icon color
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Specifics
    cardBackground: lightCardBackground,
    inputBackground: lightInputBackground,
    inputBorder: lightInputBorder,
    placeholderText: lightPlaceholderText,
    textSecondary: lightTextSecondary,
    border: lightBorder,
    danger: lightDanger,
    success: '#16a34a', // Green 600
    // Add other necessary light theme colors
  },
  dark: {
    text: darkText,
    background: darkBackground,
    tint: tintColorDark,
    icon: '#9BA1A6', // Default icon color
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // Specifics
    cardBackground: darkCardBackground,
    inputBackground: darkInputBackground,
    inputBorder: darkInputBorder,
    placeholderText: darkPlaceholderText,
    textSecondary: darkTextSecondary,
    border: darkBorder,
    danger: darkDanger,
    success: '#22c55e', // Green 500
    // Add other necessary dark theme colors
  },
  // Common colors (optional)
  white: '#fff',
  black: '#000',
  grey: '#ccc',
  // ...
};

// Optional: Export common colors directly if needed elsewhere
// export const commonColors = { ... };