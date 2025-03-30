// metro.config.js
// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add any customizations here, for example:
// config.resolver.assetExts.push('db'); // If you needed custom asset types

module.exports = config;