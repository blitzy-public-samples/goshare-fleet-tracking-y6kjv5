/**
 * Metro configuration for React Native Android driver application
 * 
 * Requirements addressed:
 * - Mobile Applications (1.1/3): React Native driver applications with offline-first architecture
 * - Technical Implementation (1.2): Multi-platform support and offline data handling capabilities
 * - Performance Requirements (1.2): Efficient resource utilization and offline operation support
 * 
 * @version metro-config: ^0.76.0
 * @version metro-react-native-babel-transformer: ^0.76.0
 */

const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  // Fetch the default Metro configuration
  const {
    resolver: { sourceExts, assetExts }
  } = await getDefaultConfig();

  return {
    // Transformer configuration for code processing
    transformer: {
      // Use the official Metro transformer for React Native
      babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
      
      // Configure transformation options for optimal performance
      getTransformOptions: async () => ({
        transform: {
          // Enable Babel runtime for better performance
          enableBabelRuntime: true,
          // Disable .babelrc lookup for consistent transformation
          enableBabelRCLookup: false,
          // Additional transform options can be added here
        },
      }),
    },

    // Resolver configuration for module resolution
    resolver: {
      // Define supported source file extensions
      sourceExts: [
        ...sourceExts, // Include default extensions
        'js',
        'jsx',
        'ts',
        'tsx',
        'json'
      ],

      // Define supported asset extensions
      assetExts: [
        ...assetExts, // Include default asset extensions
        'png',
        'jpg',
        'jpeg',
        'gif',
        'webp',
        'mp4',
        'mp3',
        'ttf'
      ],

      // Define supported platforms
      platforms: [
        'android',
        'native'
      ],

      // Block specific patterns from being processed
      blockList: [
        /\.git\//,
        /\.hg\//,
        /\.svn\//,
        /\.DS_Store$/,
        /\.idea\//
      ],
    },

    // Cache configuration for better build performance
    cacheVersion: '1.0',
    
    // Configure maximum number of worker processes
    maxWorkers: 4,
    
    // Cache management settings
    resetCache: false,
    
    // Enable symlink resolution for development
    enableSymlinks: true,
  };
})();