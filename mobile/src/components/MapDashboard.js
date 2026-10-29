import { Platform } from 'react-native';

let MapDashboard;
if (Platform.OS === 'web') {
  MapDashboard = require('./MapDashboard.web').default;
} else {
  MapDashboard = require('./MapDashboard.native').default;
}

export default MapDashboard;
