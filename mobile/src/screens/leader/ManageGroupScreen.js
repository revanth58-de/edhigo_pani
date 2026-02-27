import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    Image,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { groupAPI } from '../../services/api';

const ManageGroupScreen = ({ navigation, route }) => {
    const { groupId, groupName } = route.params || {};
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingMember, setEditingMember] = useState(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchGroupDetails();
    }, []);

    const fetchGroupDetails = async () => {
        try {
            const res = await groupAPI.getGroupDetails(groupId);
            setMembers(res.data.group.members || []);
        } catch (error) {
            console.error('Fetch Group Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const removeMember = async (workerId) => {
        Alert.alert(
            'Remove Member',
            'Are you sure you want to remove this member?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await groupAPI.removeMember(groupId, workerId);
                            setMembers(prev => prev.filter(m => m.workerId !== workerId));
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove member');
                        }
                    }
                }
            ]
        );
    };

    const handleUpdateMember = async () => {
        if (!editName) return;
        setUpdating(true);
        try {
            await groupAPI.updateMember(groupId, editingMember.workerId, {
                name: editName,
                role: editRole,
            });
            setMembers(prev => prev.map(m =>
                m.workerId === editingMember.workerId ? { ...m, name: editName, role: editRole } : m
            ));
            setEditingMember(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to update member');
        } finally {
            setUpdating(false);
        }
    };

    const openEditModal = (member) => {
        setEditingMember(member);
        setEditName(member.name || '');
        setEditRole(member.role || '');
    };

    const handleGoLive = async () => {
        if (members.length === 0) {
            Alert.alert('Empty Group', 'Add members before going live.');
            return;
        }
        try {
            await groupAPI.updateGroupStatus(groupId, 'active');
            navigation.navigate('GroupMap', { groupId, workerCount: members.length });
        } catch (error) {
            Alert.alert('Error', 'Failed to start group session');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <View style={styles.micCircle}>
                    <MaterialIcons name="mic" size={24} color={colors.primary} />
                </View>
                <Text style={styles.headerTitle}>Manage your group</Text>
                <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('LeaderProfile')}>
                    <MaterialIcons name="person-add-alt" size={24} color="#374151" />
                </TouchableOpacity>
            </View>

            <View style={styles.titleSection}>
                <Text style={styles.sectionTitle}>Group Members</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{members.length} Active</Text>
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                ) : members.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="groups" size={80} color="#E5E7EB" />
                        <Text style={styles.emptyText}>No members yet</Text>
                    </View>
                ) : (
                    members.map((item) => (
                        <View key={item.id} style={styles.memberCard}>
                            <TouchableOpacity style={styles.memberInfo} onPress={() => openEditModal(item)}>
                                <Image
                                    source={{ uri: `https://ui-avatars.com/api/?name=${item.name || 'Worker'}&background=random` }}
                                    style={styles.avatar}
                                />
                                <View>
                                    <Text style={styles.memberName}>{item.name || 'Unknown'}</Text>
                                    <Text style={styles.memberRole}>{item.role || 'Member'}</Text>
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
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('AddMember', { groupId })}
                >
                    <MaterialIcons name="person-add" size={24} color="#111827" />
                    <Text style={styles.addButtonText}>ADD MEMBER</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.goLiveButton} onPress={handleGoLive}>
                    <Text style={styles.goLiveButtonText}>GO LIVE (G3)</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('LeaderHome')}>
                    <MaterialIcons name="home" size={24} color="#9CA3AF" />
                    <Text style={styles.navText}>HOME</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
                    <MaterialIcons name="group" size={24} color={colors.primary} />
                    <Text style={[styles.navText, styles.navTextActive]}>GROUP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcons name="settings" size={24} color="#9CA3AF" />
                    <Text style={styles.navText}>SETTINGS</Text>
                </TouchableOpacity>
            </View>
            <Modal visible={!!editingMember} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Member Details</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>FULL NAME</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Member Name"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>ROLE</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={editRole}
                                onChangeText={setEditRole}
                                placeholder="e.g. Site Supervisor"
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setEditingMember(null)}
                            >
                                <Text style={styles.cancelButtonText}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleUpdateMember}
                                disabled={updating}
                            >
                                {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>SAVE CHANGES</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    micCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.primary}1A`, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
    profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    titleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
        paddingTop: 32,
    },
    sectionTitle: { fontSize: 28, fontWeight: '900', color: '#111827' },
    badge: { backgroundColor: `${colors.primary}1A`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
    badgeText: { fontSize: 14, fontWeight: '900', color: colors.primary },
    content: { flex: 1, paddingHorizontal: 24 },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 99, // Pill shape like in image
        backgroundColor: '#F9FAFB',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    memberName: { fontSize: 18, fontWeight: '900', color: '#111827' },
    memberRole: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
    footer: { position: 'absolute', bottom: 100, left: 0, right: 0, paddingHorizontal: 24, gap: 12 },
    addButton: {
        height: 72,
        backgroundColor: colors.primary,
        borderRadius: 36,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        elevation: 4,
    },
    addButtonText: { fontSize: 20, fontWeight: '900', color: '#111827' },
    goLiveButton: {
        height: 56,
        backgroundColor: '#374151',
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goLiveButtonText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: '#FFF',
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
    navItemActive: { borderTopWidth: 2, borderTopColor: colors.primary },
    navText: { fontSize: 10, fontWeight: '900', color: '#9CA3AF' },
    navTextActive: { color: colors.primary },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, color: '#9CA3AF', fontSize: 18, fontWeight: '500' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 24 },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#6B7280', marginBottom: 8, letterSpacing: 1 },
    modalInput: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 'bold', borderWidth: 1, borderColor: '#F3F4F6' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
    cancelButton: { flex: 1, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
    cancelButtonText: { fontWeight: 'bold', color: '#374151' },
    saveButton: { flex: 2, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    saveButtonText: { fontWeight: '900', color: '#111827' },
});

export default ManageGroupScreen;
