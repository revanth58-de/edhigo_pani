// mobile/app.config.js
// Dynamic Expo configuration to securely inject environment variables without committing secrets.
const path = require('path');

try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '.env') });
  dotenv.config({ path: path.resolve(__dirname, '.env.production') });
} catch (e) {
  // dotenv might not be bundled in some production CI pipelines
}

module.exports = ({ config }) => {
  const googleMapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    '';

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...(config.ios?.config || {}),
        googleMapsApiKey: googleMapsApiKey || undefined,
      },
    },
    android: {
      ...config.android,
      config: {
        ...(config.android?.config || {}),
        googleMaps: {
          ...(config.android?.config?.googleMaps || {}),
          apiKey: googleMapsApiKey || undefined,
        },
      },
    },
    web: {
      ...config.web,
      config: {
        ...(config.web?.config || {}),
        googleMaps: {
          ...(config.web?.config?.googleMaps || {}),
          apiKey: googleMapsApiKey || undefined,
        },
      },
    },
  };
};
