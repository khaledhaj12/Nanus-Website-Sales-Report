import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const ProfileItem = ({ icon, title, value }: any) => (
    <View style={styles.profileItem}>
      <MaterialIcons name={icon} size={24} color="#6b7280" />
      <View style={styles.profileContent}>
        <Text style={styles.profileTitle}>{title}</Text>
        <Text style={styles.profileValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={40} color="#ffffff" />
          </View>
          <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.userRole}>{user?.role?.toUpperCase()}</Text>
        </View>

        {/* Profile Information */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <ProfileItem
            icon="person"
            title="Username"
            value={user?.username}
          />
          
          <ProfileItem
            icon="email"
            title="Email"
            value={user?.email || 'Not provided'}
          />
          
          <ProfileItem
            icon="badge"
            title="Role"
            value={user?.role}
          />
          
          <ProfileItem
            icon="check-circle"
            title="Status"
            value={user?.isActive ? 'Active' : 'Inactive'}
          />
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <MaterialIcons name="settings" size={24} color="#374151" />
            <Text style={styles.actionText}>Settings</Text>
            <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <MaterialIcons name="help" size={24} color="#374151" />
            <Text style={styles.actionText}>Help & Support</Text>
            <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.logoutButton]} 
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={24} color="#dc2626" />
            <Text style={[styles.actionText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileSection: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  profileContent: {
    marginLeft: 16,
    flex: 1,
  },
  profileTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  profileValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  actionsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 16,
    flex: 1,
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#dc2626',
  },
});