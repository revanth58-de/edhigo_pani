// RegisterScreen - User registration after language selection
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    TextInput,
    Alert,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';

const LABELS = {
    te: {
        title: 'నమోదు చేయండి',
        subtitle: 'మీ వివరాలు నమోదు చేయండి',
        name: 'పూర్తి పేరు',
        namePlaceholder: 'మీ పేరు నమోదు చేయండి',
        phone: 'మొబైల్ నంబర్',
        phonePlaceholder: '10 అంకెల నంబర్',
        village: 'గ్రామం / జిల్లా',
        villagePlaceholder: 'మీ గ్రామం పేరు',
        role: 'మీరు ఎవరు?',
        farmer: 'రైతు',
        worker: 'కూలీ',
        leader: 'గ్రూప్ లీడర్',
        continue: 'కొనసాగించు',
        required: 'అన్ని ఫీల్డ్‌లు అవసరం',
        phoneError: 'సరైన 10 అంకెల నంబర్ నమోదు చేయండి',
    },
    hi: {
        title: 'पंजीकरण करें',
        subtitle: 'अपनी जानकारी दर्ज करें',
        name: 'पूरा नाम',
        namePlaceholder: 'अपना नाम दर्ज करें',
        phone: 'मोबाइल नंबर',
        phonePlaceholder: '10 अंकों का नंबर',
        village: 'गाँव / जिला',
        villagePlaceholder: 'अपने गाँव का नाम',
        role: 'आप कौन हैं?',
        farmer: 'किसान',
        worker: 'मजदूर',
        leader: 'ग्रुप लीडर',
        continue: 'जारी रखें',
        required: 'सभी फ़ील्ड आवश्यक हैं',
        phoneError: 'सही 10 अंकों का नंबर दर्ज करें',
    },
    en: {
        title: 'Register',
        subtitle: 'Enter your details to get started',
        name: 'Full Name',
        namePlaceholder: 'Enter your name',
        phone: 'Mobile Number',
        phonePlaceholder: '10-digit number',
        village: 'Village / District',
        villagePlaceholder: 'Your village name',
        role: 'Who are you?',
        farmer: 'Farmer',
        worker: 'Worker',
        leader: 'Group Leader',
        continue: 'Continue',
        required: 'All fields are required',
        phoneError: 'Enter a valid 10-digit number',
    },
};

const ROLES = [
    { key: 'farmer', icon: 'agriculture', color: '#4CAF50' },
    { key: 'worker', icon: 'construction', color: '#FF9800' },
    { key: 'leader', icon: 'groups', color: '#2196F3' },
];

const RegisterScreen = ({ navigation }) => {
    const language = useAuthStore((state) => state.language);
    const sendOTP = useAuthStore((state) => state.sendOTP);
    const isLoading = useAuthStore((state) => state.isLoading);

    const L = LABELS[language] || LABELS.en;

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [village, setVillage] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [showExistsModal, setShowExistsModal] = useState(false);

    const handleContinue = async () => {
        if (!name.trim() || !phone.trim() || !village.trim() || !selectedRole) {
            Alert.alert('⚠️', L.required);
            return;
        }
        if (!/^\d{10}$/.test(phone.trim())) {
            Alert.alert('⚠️', L.phoneError);
            return;
        }

        try {
            const result = await sendOTP(phone.trim());

            // Already a registered user — show full-page modal
            if (result?.isExistingUser) {
                setShowExistsModal(true);
                return;
            }

            navigation.navigate('OTP', {
                phone: phone.trim(),
                name: name.trim(),
                village: village.trim(),
                role: selectedRole,
                fromRegister: true,
                otp: result?.otp,
            });
        } catch (error) {
            Alert.alert('Error', 'Could not send OTP. Please try again.');
        }
    };

    return (
        <View style={{ flex: 1 }}>
            {/* ── Already-registered modal ── */}
            <Modal
                transparent
                animationType="fade"
                visible={showExistsModal}
                onRequestClose={() => setShowExistsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconWrap}>
                            <MaterialIcons name="info" size={52} color={colors.primary} />
                        </View>
                        <Text style={styles.modalTitle}>Already Registered!</Text>
                        <Text style={styles.modalBody}>
                            This phone number is already registered.{'\n'}Please login to access your account.
                        </Text>
                        <TouchableOpacity
                            style={styles.modalLoginBtn}
                            onPress={() => {
                                setShowExistsModal(false);
                                navigation.navigate('Login');
                            }}
                        >
                            <MaterialIcons name="login" size={22} color="#FFFFFF" />
                            <Text style={styles.modalLoginBtnText}>Login Now</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalDismissBtn}
                            onPress={() => setShowExistsModal(false)}
                        >
                            <Text style={styles.modalDismiss}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Main registration form ── */}
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <MaterialIcons name="arrow-back" size={28} color={colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.logoCircle}>
                        <MaterialIcons name="person-add" size={48} color={colors.primary} />
                    </View>
                    <Text style={styles.title}>{L.title}</Text>
                    <Text style={styles.subtitle}>{L.subtitle}</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>

                    {/* Name */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>
                            <MaterialIcons name="person" size={16} color={colors.primary} /> {L.name}
                        </Text>
                        <View style={styles.inputRow}>
                            <MaterialIcons name="person-outline" size={22} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder={L.namePlaceholder}
                                placeholderTextColor="#9CA3AF"
                                autoCapitalize="words"
                                underlineColorAndroid="transparent"
                            />
                        </View>
                    </View>

                    {/* Phone */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>
                            <MaterialIcons name="phone" size={16} color={colors.primary} /> {L.phone}
                        </Text>
                        <View style={styles.inputRow}>
                            <Text style={styles.countryCode}>+91</Text>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder={L.phonePlaceholder}
                                placeholderTextColor="#9CA3AF"
                                keyboardType="phone-pad"
                                maxLength={10}
                                underlineColorAndroid="transparent"
                            />
                        </View>
                    </View>

                    {/* Village */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>
                            <MaterialIcons name="location-on" size={16} color={colors.primary} /> {L.village}
                        </Text>
                        <View style={styles.inputRow}>
                            <MaterialIcons name="place" size={22} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={village}
                                onChangeText={setVillage}
                                placeholder={L.villagePlaceholder}
                                placeholderTextColor="#9CA3AF"
                                underlineColorAndroid="transparent"
                            />
                        </View>
                    </View>

                    {/* Role Selection */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>{L.role}</Text>
                        <View style={styles.roleRow}>
                            {ROLES.map((role) => {
                                const isSelected = selectedRole === role.key;
                                const roleLabel = L[role.key];
                                return (
                                    <TouchableOpacity
                                        key={role.key}
                                        style={[
                                            styles.roleCard,
                                            isSelected && { borderColor: role.color, backgroundColor: `${role.color}15` },
                                        ]}
                                        onPress={() => setSelectedRole(role.key)}
                                    >
                                        <View style={[styles.roleIconCircle, { backgroundColor: `${role.color}20` }]}>
                                            <MaterialIcons name={role.icon} size={32} color={role.color} />
                                        </View>
                                        <Text style={[styles.roleLabel, isSelected && { color: role.color, fontWeight: 'bold' }]}>
                                            {roleLabel}
                                        </Text>
                                        {isSelected && (
                                            <MaterialIcons name="check-circle" size={20} color={role.color} style={styles.roleCheck} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Continue Button */}
                    <TouchableOpacity
                        style={[styles.continueBtn, isLoading && { opacity: 0.7 }]}
                        onPress={handleContinue}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <>
                                <Text style={styles.continueBtnText}>{L.continue}</Text>
                                <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Already have account */}
                    <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginLinkText}>Already registered? </Text>
                        <Text style={[styles.loginLinkText, { color: colors.primary, fontWeight: 'bold' }]}>Login</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundLight },
    content: { padding: 16 },

    header: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, position: 'relative' },
    backBtn: { position: 'absolute', top: 32, left: 0, padding: 8 },
    logoCircle: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: `${colors.primary}1A`, borderWidth: 3, borderColor: colors.primary,
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    title: { fontSize: 32, fontWeight: 'bold', color: '#131811', textAlign: 'center', marginBottom: 6 },
    subtitle: { fontSize: 16, color: '#6f8961', textAlign: 'center' },

    form: { gap: 20, marginTop: 8 },
    fieldGroup: { gap: 8 },
    label: { fontSize: 15, fontWeight: '600', color: '#131811' },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8F6',
        borderRadius: 12,
        paddingHorizontal: 14, height: 56,
    },
    inputIcon: { marginRight: 10 },
    countryCode: {
        fontSize: 16, fontWeight: '600', color: '#131811', marginRight: 10,
        paddingRight: 10, borderRightWidth: 1, borderRightColor: '#E5E7EB',
    },
    input: { flex: 1, fontSize: 16, color: '#131811', borderWidth: 0, underlineColorAndroid: 'transparent' },

    roleRow: { flexDirection: 'row', gap: 10 },
    roleCard: {
        flex: 1, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16,
        padding: 14, borderWidth: 2, borderColor: '#E5E7EB', gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
        position: 'relative',
    },
    roleIconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    roleLabel: { fontSize: 12, color: '#6f8961', textAlign: 'center' },
    roleCheck: { position: 'absolute', top: 8, right: 8 },

    continueBtn: {
        flexDirection: 'row', height: 58, backgroundColor: colors.primary,
        borderRadius: 9999, justifyContent: 'center', alignItems: 'center', gap: 12,
        marginTop: 8, shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    },
    continueBtnText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },

    loginLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
    loginLinkText: { fontSize: 15, color: '#6f8961' },

    // Modal styles
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalCard: {
        backgroundColor: '#FFFFFF', borderRadius: 28, padding: 32,
        alignItems: 'center', width: '100%', gap: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3, shadowRadius: 32, elevation: 20,
    },
    modalIconWrap: {
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: `${colors.primary}15`,
        justifyContent: 'center', alignItems: 'center',
    },
    modalTitle: { fontSize: 24, fontWeight: '900', color: '#131811', textAlign: 'center' },
    modalBody: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24 },
    modalLoginBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: colors.primary, paddingHorizontal: 36, paddingVertical: 16,
        borderRadius: 9999, width: '100%', justifyContent: 'center',
        shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
    },
    modalLoginBtnText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
    modalDismissBtn: { paddingVertical: 8 },
    modalDismiss: { fontSize: 15, color: '#9CA3AF', textDecorationLine: 'underline' },
});

export default RegisterScreen;
