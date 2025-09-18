import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  AddContact: undefined;
  EditContact: { contactId: string };
  RecordConversation: { contactId: string };
  ConversationDetail: { conversationId: string };
  SemanticSearch: undefined;
  Settings: undefined;
};

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;
type SettingsScreenRouteProp = RouteProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
  route: SettingsScreenRouteProp;
}

const API_KEY_STORAGE_KEY = 'openai_api_key';

export default function SettingsScreen({ navigation }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiFeaturesEnabled, setAiFeaturesEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedApiKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
      if (storedApiKey) {
        setApiKey(storedApiKey);
        setAiFeaturesEnabled(true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your OpenAI API key');
      return;
    }

    // Basic validation for OpenAI API key format
    if (!apiKey.startsWith('sk-')) {
      Alert.alert(
        'Invalid API Key',
        'OpenAI API keys should start with "sk-". Please check your key and try again.',
        [
          { text: 'OK' },
          { text: 'Get API Key', onPress: () => openOpenAIDocs() },
        ]
      );
      return;
    }

    setIsSaving(true);
    try {
      await AsyncStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      setAiFeaturesEnabled(true);
      Alert.alert('Success', 'API key saved successfully! AI features are now enabled.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key');
      console.error('Error saving API key:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApiKey = () => {
    Alert.alert(
      'Delete API Key',
      'Are you sure you want to delete your API key? This will disable all AI features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(API_KEY_STORAGE_KEY);
              setApiKey('');
              setAiFeaturesEnabled(false);
              Alert.alert('Success', 'API key deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete API key');
              console.error('Error deleting API key:', error);
            }
          },
        },
      ]
    );
  };

  const openOpenAIDocs = () => {
    // In a real app, you might want to open the browser
    Alert.alert(
      'Get OpenAI API Key',
      'Visit https://platform.openai.com/api-keys to create your API key.\n\nYou\'ll need to:\n1. Create an OpenAI account\n2. Add payment method\n3. Generate a new API key\n4. Copy the key and paste it here',
      [{ text: 'OK' }]
    );
  };

  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return key;
    return key.substring(0, 8) + '•'.repeat(key.length - 8);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Configure your Contact Intelligence App</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Features</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>AI Features Status</Text>
              <Text style={styles.settingDescription}>
                {aiFeaturesEnabled ? 'Enabled' : 'Disabled'} - Controls transcription, summaries, and semantic search
              </Text>
            </View>
            <Switch
              value={aiFeaturesEnabled}
              onValueChange={(value) => {
                if (!value) {
                  Alert.alert(
                    'Disable AI Features',
                    'This will disable all AI features including conversation transcription, summaries, and semantic search.',
                    [
                      { text: 'Cancel', onPress: () => {} },
                      { text: 'Disable', onPress: () => setAiFeaturesEnabled(false) },
                    ]
                  );
                } else {
                  setAiFeaturesEnabled(value);
                }
              }}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor={aiFeaturesEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OpenAI API Configuration</Text>
          
          <View style={styles.apiKeySection}>
            <Text style={styles.apiKeyLabel}>API Key</Text>
            <Text style={styles.apiKeyDescription}>
              Required for AI features. Your key is stored securely on your device.
            </Text>
            
            <TextInput
              style={styles.apiKeyInput}
              placeholder="Enter your OpenAI API key (sk-...)"
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowApiKey(!showApiKey)}
            >
              <Text style={styles.toggleButtonText}>
                {showApiKey ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>

            <View style={styles.apiKeyActions}>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSaveApiKey}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save API Key'}
                </Text>
              </TouchableOpacity>
              {apiKey ? (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteApiKey}
                >
                  <Text style={styles.deleteButtonText}>Delete Key</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.helpButton}
              onPress={openOpenAIDocs}
            >
              <Text style={styles.helpButtonText}>How to get an API key</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Features Overview</Text>
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>🎤 Audio Transcription (Whisper)</Text>
            <Text style={styles.featureItem}>📝 Conversation Summaries</Text>
            <Text style={styles.featureItem}>🏷️ Automatic Contact Tagging</Text>
            <Text style={styles.featureItem}>🔍 Semantic Search</Text>
            <Text style={styles.featureItem}>📊 Sentiment Analysis</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <Text style={styles.privacyText}>
            • Your API key is stored securely on your device only
            • Audio recordings are stored locally on your device
            • Conversations are processed by OpenAI's secure servers
            • No data is shared with third parties
          </Text>
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
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  apiKeySection: {
    marginTop: 8,
  },
  apiKeyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  apiKeyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  apiKeyInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  apiKeyDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  apiKeyText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'monospace',
  },
  toggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  apiKeyActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  updateButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  helpButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
