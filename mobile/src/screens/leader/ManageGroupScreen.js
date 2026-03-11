import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { groupAPI } from '../../services/api';

const KEYPAD_ROWS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [null, '0', 'backspace'],
];

const ManageGroupScreen = ({ navigation, route }) => {
    const routeGroupId = route.params?.groupId;
    const routeGroupName = route.params?.groupName;

    const [resolvedGroupId, setResolvedGroupId] = useState(routeGroupId || null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingMember, setEditingMember] = useState(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        initGroup();
    }, []);

    const initGroup = async () => {
        setLoading(true);
        try {
            let gid = resolvedGroupId;

            // If no groupId passed, fetch the leader's own groups
            if (!gid) {
                const res = await groupAPI.getMyGroups();
                const groups = res?.data?.groups || res?.data || [];
                if (groups.length > 0) {
                    gid = groups[0].id;
                    setResolvedGroupId(gid);
                } else {
                    // No group yet — redirect to create
                    Alert.alert(
                        'No Group Found',
                        'You don\'t have a group yet. Create one first!',
                        [{ text: 'Create Group', onPress: () => navigation.replace('GroupSetup') }]
                    );
                    setLoading(false);
                    return;
                }
            }

            await fetchMembers(gid);
        } catch (err) {
            console.warn('initGroup error', err);
            setLoading(false);
        }
    };

    const fetchMembers = async (gid) => {
        try {
            const res = await groupAPI.getGroupDetails(gid);
            const rawMembers =
                res?.data?.group?.members ||
                res?.data?.members ||
                [];
            // Flatten nested worker data so display is simple
            const memberList = rawMembers.map(m => ({
                id: m.id,
                workerId: m.workerId || m.worker?.id,
                name: m.name || m.worker?.name || 'Member',
                phone: m.worker?.phone || m.phone || '',
                role: m.role || 'Member',
            }));
            setMembers(memberList);
        } catch (error) {
            console.error('Fetch Group Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Removed dialpad handlers as AddMemberScreen handles member addition

    const removeMember = async (workerId) => {
        Alert.alert('Remove Member', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await groupAPI.removeMember(resolvedGroupId, workerId);
                        setMembers(prev => prev.filter(m => m.workerId !== workerId));
                    } catch {
                        Alert.alert('Error', 'Failed to remove member');
                    }
                },
            },
        ]);
    };

    const handleUpdateMember = async () => {
        if (!editName) return;
        setUpdating(true);
        try {
            await groupAPI.updateMember(resolvedGroupId, editingMember.workerId, {
                name: editName, role: editRole,
            });
            setMembers(prev =>
                prev.map(m => m.workerId === editingMember.workerId
                    ? { ...m, name: editName, role: editRole } : m)
            );
            setEditingMember(null);
        } catch {
            Alert.alert('Error', 'Failed to update member');
        } finally {
            setUpdating(false);
        }
    };

    const handleGoLive = async () => {
        if (members.length === 0) {
            Alert.alert('Empty Group', 'Add members before going live.');
            return;
        }
        try {
            await groupAPI.updateGroupStatus(resolvedGroupId, 'available');
            navigation.navigate('GroupMap', { groupId: resolvedGroupId, workerCount: members.length });
        } catch {
            Alert.alert('Error', 'Failed to start group session');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.backgroundDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage your group</Text>
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => navigation.navigate('LeaderProfile')}
                >
                    <MaterialIcons name="person-add-alt" size={24} color={colors.backgroundDark} />
                </TouchableOpacity>
            </View>

            {/* ── Member list ───────────────────────────────────────────── */}
            <>
                <View style={styles.titleSection}>
                    <Text style={styles.sectionTitle}>Group Members</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{members.length} Active</Text>
                    </View>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 220 }}>
                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                    ) : members.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="groups" size={80} color="#E5E7EB" />
                            <Text style={styles.emptyText}>No members yet</Text>
                            <Text style={styles.emptySubText}>Tap ADD MEMBER to get started</Text>
                        </View>
                    ) : (
                        members.map((item) => (
                            <View key={item.id || item.workerId} style={styles.memberCard}>
                                <TouchableOpacity style={styles.memberInfo} onPress={() => { setEditingMember(item); setEditName(item.name || ''); setEditRole(item.role || ''); }}>
                                    <Image
                                        source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Worker')}&background=random` }}
                                        style={styles.avatar}
                                    />
                                    <View>
                                        <Text style={styles.memberName}>{item.name || 'Unknown'}</Text>
                                        <Text style={styles.memberRole}>{item.phone || item.role || 'Member'}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => removeMember(item.workerId)}>
                                    <MaterialIcons name="delete-outline" size={24} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddMember', { groupId: resolvedGroupId, groupName: routeGroupName })}>
                        <MaterialIcons name="person-add" size={24} color="#111827" />
                        <Text style={styles.addButtonText}>ADD MEMBER</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.goLiveButton} onPress={handleGoLive} disabled={!resolvedGroupId}>
                        <Text style={styles.goLiveButtonText}>GO LIVE (G{members.length})</Text>
                    </TouchableOpacity>
                </View>
            </>

            {/* Edit member modal */}
            <Modal visible={!!editingMember} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Member</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>FULL NAME</Text>
                            <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} placeholder="Member Name" />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>ROLE</Text>
                            <TextInput style={styles.modalInput} value={editRole} onChangeText={setEditRole} placeholder="e.g. Site Supervisor" />
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingMember(null)}>
                                <Text style={styles.cancelButtonText}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={handleUpdateMember} disabled={updating}>
                                {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>SAVE</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAF7' },

    // Header — same as all screens
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 48,
        paddingBottom: 16,
        backgroundColor: colors.primary,
    },
    headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.backgroundDark}22`, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: colors.backgroundDark },

    // Member list
    titleSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20 },
    sectionTitle: { fontSize: 26, fontWeight: '900', color: '#111827' },
    badge: { backgroundColor: `${colors.primary}1A`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
    badgeText: { fontSize: 14, fontWeight: '900', color: colors.primary },
    content: { flex: 1, paddingHorizontal: 20 },
    memberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 99, backgroundColor: '#FFFFFF', marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E5E7EB' },
    memberName: { fontSize: 16, fontWeight: '800', color: '#111827' },
    memberRole: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    emptyState: { alignItems: 'center', marginTop: 80, gap: 8 },
    emptyText: { color: '#9CA3AF', fontSize: 18, fontWeight: '700' },
    emptySubText: { color: '#D1D5DB', fontSize: 14 },

    // Footer
    footer: { position: 'absolute', bottom: 20, left: 0, right: 0, paddingHorizontal: 20, gap: 12 },
    addButton: { height: 68, backgroundColor: colors.primary, borderRadius: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 6, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
    addButtonText: { fontSize: 20, fontWeight: '900', color: '#111827' },
    goLiveButton: { height: 52, backgroundColor: '#374151', borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    goLiveButtonText: { color: '#FFF', fontWeight: '900', fontSize: 16 },

    // ── Dialpad ──
    nameSection: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
    nameLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    nameLabel: { fontSize: 12, fontWeight: '500', color: '#6f8961', letterSpacing: 2 },
    nameInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
        fontWeight: '700',
        color: '#131811',
        borderWidth: 1.5,
        borderColor: `${colors.primary}44`,
    },
    displaySection: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, alignItems: 'center' },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    label: { fontSize: 12, fontWeight: '500', color: '#6f8961', letterSpacing: 2 },
    phoneDisplay: { fontSize: 36, fontWeight: 'bold', color: '#131811', letterSpacing: 2, paddingVertical: 12 },
    phoneDisplayRow: { flexDirection: 'row', alignItems: 'center', minHeight: 70 },
    activeCursor: { width: 3, height: 36, backgroundColor: colors.primary, borderRadius: 2 },
    activeChar: { color: colors.primary },
    ghostTap: { position: 'absolute', right: -20, width: 40, height: 70 },
    displayUnderline: { width: '100%', height: 2, backgroundColor: `${colors.primary}4D` },
    keypadContainer: { padding: 16 },
    keypad: { gap: 10 },
    keypadRow: { flexDirection: 'row', gap: 10 },
    keypadKey: { flex: 1, height: 74, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    keypadKeyActive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#dfe6db', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    keypadKeyText: { fontSize: 28, fontWeight: 'bold', color: '#131811' },
    dialpadButtons: { flexDirection: 'row', gap: 10, paddingHorizontal: 4, paddingTop: 16 },
    cancelDialBtn: { flex: 1, height: 60, borderRadius: 9999, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    cancelDialBtnText: { fontSize: 16, fontWeight: 'bold', color: '#6B7280' },
    addBtn: { flex: 2, flexDirection: 'row', height: 60, borderRadius: 9999, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 8 },
    addBtnDisabled: { opacity: 0.45 },
    addBtnText: { fontSize: 17, fontWeight: 'bold', color: colors.backgroundDark },

    // Edit modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 20 },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#6B7280', marginBottom: 6, letterSpacing: 1 },
    modalInput: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, fontSize: 16, fontWeight: 'bold', borderWidth: 1, borderColor: '#F3F4F6' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelButton: { flex: 1, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
    cancelButtonText: { fontWeight: 'bold', color: '#374151' },
    saveButton: { flex: 2, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    saveButtonText: { fontWeight: '900', color: colors.backgroundDark },
});

export default ManageGroupScreen;
