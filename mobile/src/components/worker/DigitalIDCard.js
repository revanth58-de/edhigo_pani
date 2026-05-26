import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const DigitalIDCard = React.memo(({ user }) => {
  return (
    <View style={styles.idCardContainer}>
      <LinearGradient
        colors={['#1F8A3D', '#166534']}
        style={styles.idCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.idCardHeader}>
          <Text style={styles.idCardBrand}>DINASARI ID</Text>
          <View style={styles.verifiedChip}>
            <MaterialIcons name="verified" size={14} color="#FFF" />
            <Text style={styles.verifiedChipText}>VERIFIED</Text>
          </View>
        </View>

        <View style={styles.idCardBody}>
          <View style={styles.idAvatarWrap}>
            <View style={styles.idAvatar}>
              {user?.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} style={styles.idPhoto} />
              ) : (
                <MaterialIcons name={user?.avatarIcon || 'person'} size={40} color={colors.primary} />
              )}
            </View>
          </View>
          <View style={styles.idInfo}>
            <Text style={styles.idName}>{user?.name?.toUpperCase()}</Text>
            <Text style={styles.idRole}>PROFESSIONAL {user?.role?.toUpperCase()}</Text>
            <Text style={styles.idNumber}>ID: DS-{user?.id?.substring(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.idQRWrap}>
            <MaterialIcons name="qr-code-2" size={60} color="#FFF" />
          </View>
        </View>
        
        <View style={styles.idCardFooter}>
          <Text style={styles.validText}>Valid across all Indian Mandis</Text>
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  idCardContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 12,
    shadowColor: '#1F8A3D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  idCardGradient: {
    borderRadius: 24,
    padding: 20,
  },
  idCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  idCardBrand: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  verifiedChipText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
  idCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  idAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFF',
    padding: 2,
  },
  idAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  idInfo: {
    flex: 1,
  },
  idName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  idRole: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  idNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  idQRWrap: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idCardFooter: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  validText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});

export default DigitalIDCard;
