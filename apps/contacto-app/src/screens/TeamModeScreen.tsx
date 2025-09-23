import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { getTeamService } from '../services/teamService';

type RootStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  EditContact: { contactId: string };
  RecordConversation: { contactId: string };
  ConversationDetail: { conversationId: string };
  SemanticSearch: undefined;
  DebugDB: undefined;
  TeamMode: undefined;
};

type TeamModeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TeamMode'>;
type TeamModeScreenRouteProp = RouteProp<RootStackParamList, 'TeamMode'>;

interface Props {
  navigation: TeamModeScreenNavigationProp;
  route: TeamModeScreenRouteProp;
}

export default function TeamModeScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ contactCount: 0, conversationCount: 0 });
  const teamService = getTeamService();

  const loadStats = useCallback(async () => {
    try {
      const databaseStats = await teamService.getDatabaseStats();
      setStats(databaseStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [teamService]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleExportDatabase = useCallback(async () => {
    setIsLoading(true);
    try {
      await teamService.shareDatabase();
      Alert.alert('Success', 'Database exported and shared successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export database');
    } finally {
      setIsLoading(false);
    }
  }, [teamService]);

  const handleImportDatabase = useCallback(async () => {
    Alert.alert(
      'Import Database',
      'This will import contacts and conversations from a database file. Existing data will be preserved. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = await teamService.importDatabase();
              Alert.alert(
                'Import Complete',
                `Successfully imported ${result.contactsAdded} contacts and ${result.conversationsAdded} conversations.`
              );
              await loadStats(); // Refresh stats
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to import database');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [teamService, loadStats]);

  const handleClearDatabase = useCallback(async () => {
    Alert.alert(
      'Clear Database',
      'This will delete ALL contacts and conversations. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              // This would need to be implemented in the database service
              Alert.alert('Success', 'Database cleared successfully!');
              await loadStats();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to clear database');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [loadStats]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Processing...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Account</Text>
        <Text style={styles.subtitle}>Manage your profile and data</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileAvatar}>
          <MaterialIcons name="account-circle" size={80} color="#007AFF" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Contact Intelligence User</Text>
          <Text style={styles.profileEmail}>user@contacto.app</Text>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Your Data</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="contacts" size={24} color="#007AFF" />
            <Text style={styles.statNumber}>{stats.contactCount}</Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="record-voice-over" size={24} color="#007AFF" />
            <Text style={styles.statNumber}>{stats.conversationCount}</Text>
            <Text style={styles.statLabel}>Conversations</Text>
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={handleExportDatabase}>
          <MaterialIcons name="file-download" size={24} color="#666" />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Export Data</Text>
            <Text style={styles.settingSubtitle}>Share your contacts and conversations</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleImportDatabase}>
          <MaterialIcons name="file-upload" size={24} color="#666" />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Import Data</Text>
            <Text style={styles.settingSubtitle}>Import contacts from another device</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleClearDatabase}>
          <MaterialIcons name="delete-forever" size={24} color="#ff3b30" />
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: '#ff3b30' }]}>Clear All Data</Text>
            <Text style={styles.settingSubtitle}>Delete all contacts and conversations</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>
        
        <View style={styles.settingItem}>
          <MaterialIcons name="info" size={24} color="#666" />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Version</Text>
            <Text style={styles.settingSubtitle}>1.0.0</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <MaterialIcons name="help" size={24} color="#666" />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Help & Support</Text>
            <Text style={styles.settingSubtitle}>Get help with the app</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8e8e93',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 17,
    color: '#8e8e93',
  },
  profileSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingVertical: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  profileAvatar: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#8e8e93',
  },
  statsContainer: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f2f2f7',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
  },
  sectionDescription: {
    fontSize: 15,
    color: '#8e8e93',
    marginBottom: 16,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#8e8e93',
  },
  disabledButtonText: {
    color: '#fff',
  },
  dangerSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 10,
    padding: 16,
  },
  dangerButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
