import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Contact, AudioRecording } from '@contacto/shared';
import { getContactService } from '../services/contactService';
import { getConversationService } from '../services/conversationService';

type RootStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  AddContact: undefined;
  EditContact: { contactId: string };
  RecordConversation: { contactId: string };
  ConversationDetail: { conversationId: string };
};

type RecordConversationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RecordConversation'>;
type RecordConversationScreenRouteProp = RouteProp<RootStackParamList, 'RecordConversation'>;

interface Props {
  navigation: RecordConversationScreenNavigationProp;
  route: RecordConversationScreenRouteProp;
}

export default function RecordConversationScreen({ navigation, route }: Props) {
  const { contactId } = route.params;
  const [contact, setContact] = useState<Contact | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const contactService = getContactService();
  const conversationService = getConversationService();

  useEffect(() => {
    loadContact();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const loadContact = async () => {
    try {
      const contactData = await contactService.getContact(contactId);
      setContact(contactData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load contact');
      console.error('Error loading contact:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingDuration(0);
      await conversationService.startRecording();
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);
      
      const audioRecording: AudioRecording = await conversationService.stopRecording();
      
      // Process the conversation with AI
      const conversation = await conversationService.processConversation(
        contactId,
        audioRecording
      );

      Alert.alert(
        'Conversation Recorded!',
        'Your conversation has been transcribed and analyzed.',
        [
          {
            text: 'View Details',
            onPress: () => navigation.navigate('ConversationDetail', { 
              conversationId: conversation.id 
            }),
          },
          { text: 'OK', onPress: () => navigation.goBack() },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process conversation');
      console.error('Error processing conversation:', error);
    } finally {
      setIsProcessing(false);
      setRecordingDuration(0);
    }
  };

  const handleCancelRecording = async () => {
    Alert.alert(
      'Cancel Recording',
      'Are you sure you want to cancel this recording?',
      [
        { text: 'Continue Recording', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await conversationService.recordConversation(contactId); // This will cancel
              setIsRecording(false);
              setRecordingDuration(0);
              navigation.goBack();
            } catch (error) {
              console.error('Error canceling recording:', error);
            }
          },
        },
      ]
    );
  };

  if (!contact) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading contact...</Text>
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
          <Text style={styles.subtitle}>Recording Conversation</Text>
        </View>

        <View style={styles.recordingSection}>
          {isRecording ? (
            <View style={styles.recordingActive}>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>RECORDING</Text>
              </View>
              <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
            </View>
          ) : (
            <View style={styles.recordingInactive}>
              <Text style={styles.readyText}>Ready to Record</Text>
              <Text style={styles.instructionText}>
                Tap the record button to start recording your conversation
              </Text>
            </View>
          )}
        </View>

        <View style={styles.controls}>
          {isRecording ? (
            <View style={styles.recordingControls}>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopRecording}
                disabled={isProcessing}
              >
                <Text style={styles.stopButtonText}>Stop & Process</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelRecording}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.recordButton}
              onPress={handleStartRecording}
              disabled={isProcessing}
            >
              <Text style={styles.recordButtonText}>
                {isProcessing ? 'Processing...' : 'Start Recording'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isProcessing && (
          <View style={styles.processingSection}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingText}>
              Transcribing and analyzing conversation...
            </Text>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>AI Features</Text>
          <Text style={styles.infoText}>
            • Automatic transcription using Whisper
          </Text>
          <Text style={styles.infoText}>
            • Intelligent conversation summaries
          </Text>
          <Text style={styles.infoText}>
            • Automatic contact tagging
          </Text>
          <Text style={styles.infoText}>
            • Semantic search capabilities
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
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  recordingSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
  },
  recordingActive: {
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff3b30',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff3b30',
  },
  duration: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'monospace',
  },
  recordingInactive: {
    alignItems: 'center',
  },
  readyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  controls: {
    marginBottom: 30,
  },
  recordButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordingControls: {
    flexDirection: 'row',
    gap: 16,
  },
  stopButton: {
    flex: 1,
    backgroundColor: '#ff3b30',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  processingSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});
