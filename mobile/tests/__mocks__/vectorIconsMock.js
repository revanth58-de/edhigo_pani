/**
 * Mock for @expo/vector-icons
 * Used via moduleNameMapper in jest config so Jest doesn't
 * try to resolve the actual package (which isn't a direct dep).
 */
const React = require('react');

const MockIcon = ({ name, size, color, style, ...props }) =>
  React.createElement('Icon', { testID: name, name, size, color, style, ...props });

module.exports = {
  MaterialIcons: MockIcon,
  Ionicons: MockIcon,
  FontAwesome: MockIcon,
  FontAwesome5: MockIcon,
  AntDesign: MockIcon,
  Feather: MockIcon,
  Entypo: MockIcon,
  MaterialCommunityIcons: MockIcon,
  SimpleLineIcons: MockIcon,
  Octicons: MockIcon,
  EvilIcons: MockIcon,
  Foundation: MockIcon,
  Zocial: MockIcon,
};
