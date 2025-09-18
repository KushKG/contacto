import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Conversation, Contact } from '@contacto/shared';
import { getConversationService } from '../services/conversationService';
import { getContactService } from '../services/contactService';

type RootStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  AddContact: undefined;
  EditContact: { contactId: string };
  RecordConversation: { contactId: string };
  ConversationDetail: { conversationId: string };
};

type ConversationDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ConversationDetail'>;
type ConversationDetailScreenRouteProp = RouteProp<RootStackParamList, 'ConversationDetail'>;

interface Props {
  navigation: ConversationDetailScreenNavigationProp;
  route: ConversationDetailScreenRouteProp;
}

export default function ConversationDetailScreen({ navigation, route }: Props) {
  const { conversationId } = route.params;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const conversationService = getConversationService();
  const contactService = getContactService();

  useEffect(() => {
    loadConversation();
  }, []);

  const loadConversation = async () => {
    try {
      const conversationData = await conversationService.getConversation(conversationId);
      if (conversationData) {
        setConversation(conversationData);
        const contactData = await contactService.getContact(conversationData.contactId);
        setContact(contactData);
      } else {
        Alert.alert('Error', 'Conversation not found');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load conversation');
      console.error('Error loading conversation:', error);
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!conversation?.audioFilePath) {
      Alert.alert('Error', 'No audio file available');
      return;
    }

    try {
      setIsPlaying(true);
      await conversationService.playConversationAudio(conversationId);
    } catch (error) {
      Alert.alert('Error', 'Failed to play audio');
      console.error('Error playing audio:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleDeleteConversation = () => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await conversationService.deleteConversation(conversationId);
              Alert.alert('Success', 'Conversation deleted successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete conversation');
              console.error('Error deleting conversation:', error);
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  if (!conversation || !contact) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Conversation not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {contact.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.date}>{formatDate(conversation.createdAt)}</Text>
        </View>

        {conversation.audioFilePath && (
          <View style={styles.audioSection}>
            <TouchableOpacity
              style={[styles.playButton, isPlaying && styles.playButtonActive]}
              onPress={handlePlayAudio}
              disabled={isPlaying}
            >
              <Text style={styles.playButtonText}>
                {isPlaying ? 'Playing...' : '▶️ Play Audio'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.duration}>
              Duration: {formatDuration(conversation.duration)}
            </Text>
          </View>
        )}

        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summaryText}>{conversation.summary}</Text>
        </View>

        {conversation.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {conversation.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.transcriptionSection}>
          <Text style={styles.sectionTitle}>Full Transcription</Text>
          <Text style={styles.transcriptionText}>{conversation.transcription}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteConversation}
          >
            <Text style={styles.deleteButtonText}>Delete Conversation</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ff3b30',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  contactName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  audioSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  playButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
  },
  playButtonActive: {
    backgroundColor: '#0056b3',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  tagsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  transcriptionSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    marginBottom: 20,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
