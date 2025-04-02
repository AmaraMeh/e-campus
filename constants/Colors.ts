// constants/Colors.ts

// Common Tint Colors (can be adjusted)
const tintColorLight = '#2962FF'; // A vibrant blue (Indigo 600)
const tintColorDark = '#448AFF'; // A brighter blue (Light Blue A200)

// Define Light Mode Colors
const light = {
    text: '#212121',           // Very Dark Gray (almost black)
    background: '#FAFAFA',     // Light Gray
    tint: tintColorLight,      // Primary Blue
    icon: '#757575',           // Medium Gray
    tabIconDefault: '#9E9E9E', // Gray
    tabIconSelected: tintColorLight,
    cardBackground: '#FFFFFF', // White
    inputBackground: '#F5F5F5',  // Lighter Gray
    inputBorder: '#E0E0E0',     // Light Gray
    placeholderText: '#9E9E9E', // Gray
    textSecondary: '#757575',   // Medium Gray
    border: '#E0E0E0',        // Light Gray
    danger: '#D32F2F',        // Dark Red
    success: '#388E3C',       // Dark Green
    shadow: '#000000',       // Black for shadow (adjust opacity)
    gradientColors: ['#4FC3F7', '#29B6F6'], // Light Blue Gradient
};

// Define Dark Mode Colors
const dark = {
    text: '#E0E0E0',           // Light Gray
    background: '#121212',     // Near Black (Dark Theme Background)
    tint: tintColorDark,      // Lighter Blue
    icon: '#BDBDBD',           // Light Gray
    tabIconDefault: '#616161', // Dark Gray
    tabIconSelected: tintColorDark,
    cardBackground: '#1E1E1E', // Darker Gray
    inputBackground: '#2C2C2C',  // Slightly Lighter Dark Gray
    inputBorder: '#424242',     // Medium Dark Gray
    placeholderText: '#616161', // Dark Gray
    textSecondary: '#BDBDBD',   // Light Gray
    border: '#424242',        // Medium Dark Gray
    danger: '#F44336',        // Red
    success: '#4CAF50',       // Green
    shadow: '#000000',       // Black for shadow (adjust opacity)
    gradientColors: ['#1976D2', '#1565C0'], // Darker Blue Gradient
};

export const Colors = {
  light,
  dark,
  // Common colors (optional)
  white: '#fff',
  black: '#000',
  grey: '#ccc',
  // ...
};