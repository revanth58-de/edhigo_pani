import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const MapDashboard = ({ height = 300 }) => {
    return (
        <View style={[styles.container, { height }]}>
            <View style={styles.placeholder}>
                <MaterialIcons name="map" size={64} color={colors.gray300} />
                <Text style={styles.text}>Map View is available on Mobile</Text>
                <Text style={styles.subtext}>Please use Expo Go to view the live map</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: colors.gray50,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.gray600,
        marginTop: 16,
        textAlign: 'center',
    },
    subtext: {
        fontSize: 14,
        color: colors.gray400,
        marginTop: 8,
        textAlign: 'center',
    },
});

export default MapDashboard;
