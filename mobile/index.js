import { registerRootComponent } from 'expo';
import { Platform, Alert } from 'react-native';
import App from './App';

if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons, options) => {
    const text = [title, message].filter(Boolean).join('\n');
    if (!buttons || buttons.length === 0) {
      window.alert(text);
      return;
    }
    
    if (buttons.length === 1) {
      window.alert(text);
      if (buttons[0].onPress) {
        buttons[0].onPress();
      }
      return;
    }
    
    if (buttons.length === 2) {
      const cancelBtn = buttons[0];
      const confirmBtn = buttons[1];
      const confirmed = window.confirm(text);
      if (confirmed) {
        if (confirmBtn.onPress) confirmBtn.onPress();
      } else {
        if (cancelBtn.onPress) cancelBtn.onPress();
      }
      return;
    }
    
    // More than 2 buttons (e.g. multi-option dialogs)
    const confirmMessage = `${text}\n\n` + buttons.map((b, idx) => `${idx + 1}: ${b.text}`).join('\n');
    const response = window.prompt(confirmMessage, "1");
    if (response !== null) {
      const selectedIndex = parseInt(response, 10) - 1;
      if (selectedIndex >= 0 && selectedIndex < buttons.length) {
        if (buttons[selectedIndex].onPress) {
          buttons[selectedIndex].onPress();
        }
      }
    }
  };
}

registerRootComponent(App);
