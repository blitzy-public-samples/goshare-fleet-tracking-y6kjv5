// @babel/core version: ^7.20.0
// @babel/runtime version: ^7.20.0
// metro-react-native-babel-preset version: ^0.76.0

/*
Human Tasks:
1. Ensure @babel/core, @babel/runtime, and metro-react-native-babel-preset are installed in package.json
2. Verify react-native-reanimated is installed for animation support
3. Install babel-plugin-transform-remove-console for production builds
*/

module.exports = {
  // Requirement addressed: Mobile Applications (1.1 System Overview/Core Components/3)
  // Using official React Native preset for optimal mobile performance and cross-platform compatibility
  presets: ['module:metro-react-native-babel-preset'],

  // Requirement addressed: Technical Implementation (1.2 Scope/Technical Implementation)
  // Configuring plugins for offline capabilities and multi-platform support
  plugins: [
    // Enable React Native Reanimated plugin for smooth animations in the driver app interface
    'react-native-reanimated/plugin'
  ],

  // Environment-specific configurations
  env: {
    production: {
      plugins: [
        // Remove console statements in production for better performance and smaller bundle size
        'transform-remove-console'
      ]
    }
  }
};