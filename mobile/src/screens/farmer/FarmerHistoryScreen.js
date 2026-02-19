// FarmerHistoryScreen - History of jobs posted by the farmer
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { jobAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';

const STATUS_META = {
    pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7', icon: 'schedule' },
    accepted: { label: 'Accepted', color: '#3B82F6', bg: '#EFF6FF', icon: 'check-circle' },
    in_progress: { label: 'In Progress', color: '#8B5CF6', bg: '#F5F3FF', icon: 'play-circle' },
    completed: { label: 'Completed', color: '#10B981', bg: '#D1FAE5', icon: 'task-alt' },
    cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2', icon: 'cancel' },
};

const WORK_ICONS = {
    Sowing: 'grass',
    Harvesting: 'agriculture',
    Irrigation: 'water-drop',
    Labour: 'engineering',
    Tractor: 'agriculture',
};

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const JobCard = ({ job }) => {
    const status = STATUS_META[job.status] || STATUS_META.pending;
    const workIcon = WORK_ICONS[job.workType] || 'work';

    return (
        <View style={styles.card}>
            {/* Header row */}
            <View style={styles.cardHeader}>
                <View style={[styles.workIconCircle, { backgroundColor: `${colors.primary}15` }]}>
                    <MaterialIcons name={workIcon} size={28} color={colors.primary} />
                </View>
                <View style={styles.cardHeaderText}>
                    <Text style={styles.workType}>{job.workType || 'Farm Work'}</Text>
                    <Text style={styles.jobDate}>{formatDate(job.createdAt)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <MaterialIcons name={status.icon} size={14} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
            </View>

            {/* Details */}
            <View style={styles.cardDetails}>
                {job.village ? (
                    <View style={styles.detailRow}>
                        <MaterialIcons name="location-on" size={16} color="#9CA3AF" />
                        <Text style={styles.detailText}>{job.village}</Text>
                    </View>
                ) : null}
                {job.workerCount ? (
                    <View style={styles.detailRow}>
                        <MaterialIcons name="people" size={16} color="#9CA3AF" />
                        <Text style={styles.detailText}>{job.workerCount} workers</Text>
                    </View>
                ) : null}
                {job.wagePerDay ? (
                    <View style={styles.detailRow}>
                        <MaterialIcons name="currency-rupee" size={16} color="#9CA3AF" />
                        <Text style={styles.detailText}>₹{job.wagePerDay}/day</Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
};

const FarmerHistoryScreen = ({ navigation }) => {
    const user = useAuthStore((state) => state.user);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchJobs = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            // Use authenticated endpoint — reads farmerId from JWT, no client-side id needed
            const response = await jobAPI.getMyJobs();
            const jobList = response?.data?.data || [];
            setJobs(Array.isArray(jobList) ? jobList : []);
        } catch (err) {
            console.error('Fetch jobs error:', err);
            setError('Could not load job history. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.centeredBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading your jobs...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.centeredBox}>
                    <MaterialIcons name="error-outline" size={56} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => fetchJobs()}>
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (jobs.length === 0) {
            return (
                <View style={styles.centeredBox}>
                    <MaterialIcons name="history" size={72} color={`${colors.primary}44`} />
                    <Text style={styles.emptyTitle}>No Jobs Posted Yet</Text>
                    <Text style={styles.emptySubtitle}>Your posted jobs will appear here once you start hiring workers.</Text>
                    <TouchableOpacity
                        style={styles.postJobBtn}
                        onPress={() => navigation.navigate('FarmerHome')}
                    >
                        <MaterialIcons name="add" size={20} color="#FFFFFF" />
                        <Text style={styles.postJobBtnText}>Post a Job</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>{jobs.length} job{jobs.length !== 1 ? 's' : ''} posted</Text>
                </View>
                {jobs.map((job, i) => (
                    <JobCard key={job.id || i} job={job} />
                ))}
            </>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <TopBar title="Job History" showBack navigation={navigation} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchJobs(true)}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {renderContent()}
            </ScrollView>

            <BottomNavBar role="farmer" activeTab="History" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100, flexGrow: 1 },

    summaryRow: { marginBottom: 12 },
    summaryText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },

    // Job Card
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    workIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardHeaderText: { flex: 1 },
    workType: { fontSize: 17, fontWeight: '700', color: '#131811' },
    jobDate: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 9999,
    },
    statusText: { fontSize: 12, fontWeight: '700' },

    cardDetails: { gap: 6 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { fontSize: 14, color: '#6B7280' },

    // Empty / Error / Loading
    centeredBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: 60,
        gap: 12,
    },
    loadingText: { fontSize: 16, color: '#9CA3AF', marginTop: 8 },
    errorText: { fontSize: 15, color: '#EF4444', textAlign: 'center' },
    retryBtn: {
        marginTop: 8,
        paddingHorizontal: 28,
        paddingVertical: 12,
        backgroundColor: colors.primary,
        borderRadius: 9999,
    },
    retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#131811', textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
    postJobBtn: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
        backgroundColor: colors.primary,
        borderRadius: 9999,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    postJobBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});

export default FarmerHistoryScreen;
