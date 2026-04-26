// Dynamic Expo config — includes native plugins only during EAS Build
const IS_EAS_BUILD = process.env.EAS_BUILD === 'true' || process.env.EAS_BUILD_RUNNER;

const config = {
  expo: {
    name: 'Washingo',
    slug: 'washingo',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'washingo',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      package: 'com.washingo.app',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './android/app/google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#1565C0',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#1565C0',
        },
      ],
      // Native Firebase plugins — only included during EAS Build
      ...(IS_EAS_BUILD
        ? [
            '@react-native-firebase/app',
            '@react-native-firebase/auth',
            'expo-dev-client',
          ]
        : []),
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: 'a405b922-0ee4-4472-a14e-2dba5d9092e5',
      },
    },
  },
};

module.exports = config;
