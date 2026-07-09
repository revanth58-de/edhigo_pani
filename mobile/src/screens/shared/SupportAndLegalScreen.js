import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { legalTexts } from '../../stubs/legalTexts';

const SupportAndLegalScreen = ({ navigation }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [submittingEmail, setSubmittingEmail] = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('FarmerHome'); // fallback
    }
  };

  const openDocument = (title, text) => {
    setSelectedDoc({ title, text });
    setDocModalVisible(true);
  };

  const handleSubscribe = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setSubmittingEmail(true);
    // Simulate API call
    setTimeout(() => {
      setSubmittingEmail(false);
      Alert.alert(
        'Success',
        'Thank you for subscribing! We will keep you updated with the latest agricultural trends.',
        [{ text: 'OK', onPress: () => setEmail('') }]
      );
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#022d1a" />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support & Legal</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity 
          style={styles.itemRow} 
          onPress={() => openDocument('Help Center', legalTexts.helpCenter)}
        >
          <Text style={styles.itemText}>Help Center</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.itemRow} 
          onPress={() => openDocument('Safety & Trust', legalTexts.safetyTrust)}
        >
          <Text style={styles.itemText}>Safety & Trust</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.itemRow} 
          onPress={() => openDocument('Contact Us', legalTexts.contactUs)}
        >
          <Text style={styles.itemText}>Contact Us</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.itemRow} 
          onPress={() => openDocument('FAQs', legalTexts.faqs)}
        >
          <Text style={styles.itemText}>FAQs</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Legal Section */}
        <Text style={styles.sectionTitle}>Legal</Text>

        <TouchableOpacity 
          style={styles.itemRow} 
          onPress={() => openDocument('Terms of Service', legalTexts.termsOfService)}
        >
          <Text style={styles.itemText}>Terms of Service</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.itemRow} 
          onPress={() => openDocument('Privacy Policy', legalTexts.privacyPolicy)}
        >
          <Text style={styles.itemText}>Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.itemRow} 
          onPress={() => openDocument('Cookie Policy', legalTexts.cookiePolicy)}
        >
          <Text style={styles.itemText}>Cookie Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.itemRow} 
          onPress={() => openDocument('User Agreement', legalTexts.userAgreement)}
        >
          <Text style={styles.itemText}>User Agreement</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Stay Updated Section */}
        <Text style={styles.sectionTitle}>Stay Updated</Text>
        <Text style={styles.stayUpdatedDesc}>
          Get the latest news on rural tech and agricultural trends.
        </Text>

        <View style={styles.emailContainer}>
          <TextInput
            style={styles.emailInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor="#688C78"
            keyboardType="email-address"
            autoCapitalize="none"
            underlineColorAndroid="transparent"
          />
          <TouchableOpacity 
            style={styles.subscribeBtn} 
            onPress={handleSubscribe}
            disabled={submittingEmail}
          >
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Document Viewer Modal */}
      <Modal
        visible={docModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setDocModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>{selectedDoc?.title}</Text>
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => setDocModalVisible(false)}
            >
              <MaterialIcons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={styles.modalScrollView} 
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.documentBody}>{selectedDoc?.text}</Text>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default SupportAndLegalScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#022d1a', // deep forest green matching the image
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#033f25',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    marginTop: 8,
  },
  itemRow: {
    paddingVertical: 14,
  },
  itemText: {
    color: '#A3BCA3', // muted green-gray as seen in the image
    fontSize: 18,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#033f25',
    marginVertical: 24,
  },
  stayUpdatedDesc: {
    color: '#A3BCA3',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011c10', // darker green for input box background
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#043d23',
    paddingHorizontal: 12,
    height: 54,
  },
  emailInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    height: '100%',
    padding: 0,
  },
  subscribeBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#00a35c', // bright green accent for action button
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#022d1a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#033f25',
  },
  modalHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
    backgroundColor: '#011d11', // extra dark background for reading
  },
  modalContent: {
    padding: 20,
  },
  documentBody: {
    color: '#E8F5E9',
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.3,
  },
});
