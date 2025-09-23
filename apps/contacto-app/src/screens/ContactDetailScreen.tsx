import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Contact, Conversation } from '@contacto/shared';
import { getContactService } from '../services/contactService';
import { getConversationService } from '../services/conversationService';
import { getHybridSearchService } from '../services/hybridSearchService';

type RootStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  AddContact: undefined;
  EditContact: { contactId: string };
  RecordConversation: { contactId: string };
  ConversationDetail: { conversationId: string };
  SemanticSearch: undefined;
};

type ContactDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ContactDetail'>;
type ContactDetailScreenRouteProp = RouteProp<RootStackParamList, 'ContactDetail'>;

interface Props {
  navigation: ContactDetailScreenNavigationProp;
  route: ContactDetailScreenRouteProp;
}

export default function ContactDetailScreen({ navigation, route }: Props) {
  const { contactId } = route.params;
  const [contact, setContact] = useState<Contact | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [allConversationTags, setAllConversationTags] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [playingConversationId, setPlayingConversationId] = useState<string | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingAnimation] = useState(new Animated.Value(1));
  const [visualizerAnimation] = useState(new Animated.Value(0));

  const contactService = getContactService();
  const conversationService = getConversationService();

  const loadContact = useCallback(async () => {
    try {
      const contactData = await contactService.getContact(contactId);
      setContact(contactData);
      
      // Load conversations for this contact
      const conversationsData = await conversationService.getConversationsByContact(contactId);
      setConversations(conversationsData);
      
      // Extract all unique tags from conversations and contact
      const allTags = new Set<string>();
      
      // Add contact tags
      if (contactData?.tags) {
        contactData.tags.forEach(tag => allTags.add(tag));
      }
      
      // Add conversation tags
      conversationsData.forEach(conversation => {
        conversation.tags.forEach(tag => allTags.add(tag));
      });
      
      setAllConversationTags(Array.from(allTags));
    } catch (error) {
      Alert.alert('Error', 'Failed to load contact details');
      console.error('Error loading contact:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contactService, conversationService, contactId]);

  // Delete contact functionality removed

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
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
              
              // Remove from local state
              setConversations(prev => prev.filter(conv => conv.id !== conversationId));
              
              // Reload contact to update conversation count
              await loadContact();
              
              Alert.alert('Success', 'Conversation deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete conversation');
              console.error('Error deleting conversation:', error);
            }
          },
        },
      ]
    );
  }, [conversationService, loadContact]);

  const handlePlayConversation = async (conversation: Conversation) => {
    try {
      // Stop current playback if any
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      if (playingConversationId === conversation.id) {
        // If already playing this conversation, stop it
        setPlayingConversationId(null);
        setPlaybackPosition(0);
        setPlaybackDuration(0);
        return;
      }

      // Load and play new audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: conversation.audioFilePath! },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis || 0);
            setPlaybackDuration(status.durationMillis || 0);
            
            if (status.didJustFinish) {
              setPlayingConversationId(null);
              setPlaybackPosition(0);
            }
          }
        }
      );

      setSound(newSound);
      setPlayingConversationId(conversation.id);
    } catch (error) {
      console.error('Error playing conversation:', error);
      Alert.alert('Error', 'Failed to play conversation audio');
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const startRecordingAnimation = () => {
    // Button pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(recordingAnimation, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(recordingAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Visualizer animation - smooth fade in
    Animated.timing(visualizerAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const stopRecordingAnimation = () => {
    recordingAnimation.stopAnimation();
    visualizerAnimation.stopAnimation();
    
    // Smooth fade out
    Animated.parallel([
      Animated.timing(recordingAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(visualizerAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handleRecordConversation = async () => {
    try {
      if (isRecording) {
        // Stop recording
        setIsRecording(false);
        stopRecordingAnimation();
        
        const audioRecording = await conversationService.stopRecording();
        setRecordingDuration(0);
        
        // Process the conversation
        setIsLoading(true);
        const newConversation = await conversationService.processConversation(contactId, audioRecording);
        
        // Reload conversations and tags
        await loadContact();
        
        Alert.alert('Success', 'Conversation recorded and processed successfully!');
      } else {
        // Start recording
        setIsRecording(true);
        startRecordingAnimation();
        await conversationService.startRecording();
        
        // Start duration timer
        const startTime = Date.now();
        const timer = setInterval(() => {
          setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        
        // Store timer for cleanup
        (window as any).recordingTimer = timer;
      }
    } catch (error) {
      console.error('Error with recording:', error);
      setIsRecording(false);
      stopRecordingAnimation();
      setRecordingDuration(0);
      Alert.alert('Error', 'Failed to record conversation');
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    
    try {
      // Add the tag to the contact itself
      const updatedTags = [...(contact?.tags || []), newTag.trim()];
      const updatedContact = await contactService.updateContact(contactId, {
        tags: updatedTags,
      });
      
      if (updatedContact) {
        setContact(updatedContact);
        // Also update the conversation tags list to include this new tag
        setAllConversationTags(prev => [...prev, newTag.trim()]);
        
        // Update hybrid search service separately (with error handling)
        try {
          const hybridSearchService = getHybridSearchService();
          await hybridSearchService.updateContact(contactId, { tags: updatedTags });
        } catch (searchError) {
          console.warn('Failed to update search index, but tag was added:', searchError);
          // Don't show error to user - tag was successfully added
        }
      }
      
      setNewTag('');
      setShowAddTagModal(false);
    } catch (error) {
      console.error('Error adding tag:', error);
      Alert.alert('Error', 'Failed to add tag');
    }
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    try {
      // Remove the tag from the contact itself
      const updatedContactTags = (contact?.tags || []).filter(tag => tag !== tagToDelete);
      const updatedContact = await contactService.updateContact(contactId, {
        tags: updatedContactTags,
      });
      
      if (updatedContact) {
        setContact(updatedContact);
        
        // Update hybrid search service separately (with error handling)
        try {
          const hybridSearchService = getHybridSearchService();
          await hybridSearchService.updateContact(contactId, { tags: updatedContactTags });
        } catch (searchError) {
          console.warn('Failed to update search index, but tag was deleted:', searchError);
          // Don't show error to user - tag was successfully deleted
        }
      }
      
      // Also remove from conversation tags list
      setAllConversationTags(prev => prev.filter(tag => tag !== tagToDelete));
      
      // Remove the tag from all conversations for this contact
      const updatedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          if (conversation.tags.includes(tagToDelete)) {
            const updatedTags = conversation.tags.filter(tag => tag !== tagToDelete);
            return await conversationService.updateConversation(conversation.id, {
              tags: updatedTags,
            });
          }
          return conversation;
        })
      );
      
      setConversations(updatedConversations.filter((conv): conv is Conversation => conv !== null));
    } catch (error) {
      console.error('Error deleting tag:', error);
      Alert.alert('Error', 'Failed to delete tag');
    }
  };

  useEffect(() => {
    loadContact();
  }, [loadContact]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadContact();
    });
    return unsubscribe;
  }, [navigation, loadContact]);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      // Cleanup recording timer
      if ((window as any).recordingTimer) {
        clearInterval((window as any).recordingTimer);
      }
    };
  }, [sound]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading contact...</Text>
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Contact not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      {/* Header with Contact Picture and Name */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerSpacer} />
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditContact', { contactId: contact.id })}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.avatarContainer}>
          {contact.imageUri ? (
            <Image source={{ uri: contact.imageUri }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {contact.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={styles.name}>{contact.name}</Text>
      </View>

      {/* Contact Details - iOS Style */}
      <View style={styles.details}>
        {/* Phone */}
        {contact.phone && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>phone</Text>
            <Text style={styles.detailValue}>{contact.phone}</Text>
          </View>
        )}

        {/* Email */}
        {contact.email && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>email</Text>
            <Text style={styles.detailValue}>{contact.email}</Text>
          </View>
        )}

        {/* Tags - Preview with option to see all */}
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>tags</Text>
          <View style={styles.tagsContainer}>
            {(showAllTags ? allConversationTags : allConversationTags.slice(0, 4)).map((tag, index) => (
              <View key={`contact-tag-${tag}-${index}`} style={styles.tagSmall}>
                <Text style={styles.tagTextSmall}>{tag}</Text>
                <TouchableOpacity
                  style={styles.tagDeleteButton}
                  onPress={() => handleDeleteTag(tag)}
                >
                  <Text style={styles.tagDeleteTextSmall}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {allConversationTags.length > 4 && !showAllTags && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowAllTags(true)}
              >
                <Text style={styles.showMoreText}>+{allConversationTags.length - 4} more</Text>
              </TouchableOpacity>
            )}
            {showAllTags && allConversationTags.length > 4 && (
              <TouchableOpacity
                style={styles.showLessButton}
                onPress={() => setShowAllTags(false)}
              >
                <Text style={styles.showLessText}>Show less</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.addTagButtonSmall}
              onPress={() => setShowAddTagModal(true)}
            >
              <Text style={styles.addTagTextSmall}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        {contact.notes && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>notes</Text>
            <Text style={styles.detailValue}>{contact.notes}</Text>
          </View>
        )}
      </View>

        {/* Voice Memo Recorder */}
        <View style={styles.voiceMemoContainer}>
          <View style={styles.voiceMemoHeader}>
            <Text style={styles.voiceMemoTitle}>Record Conversation</Text>
            <Animated.View style={{ opacity: isRecording ? 1 : 0 }}>
              <View style={styles.recordingIndicator}>
                <Animated.View style={[styles.recordingDot, { opacity: recordingAnimation }]} />
                <Text style={styles.recordingText}>Recording...</Text>
              </View>
            </Animated.View>
          </View>
          
          <View style={styles.recorderContainer}>
            {/* Audio Visualizer */}
            <Animated.View 
              style={[
                styles.visualizerContainer,
                { 
                  opacity: isRecording ? 1 : 0,
                  transform: [{ scaleY: isRecording ? 1 : 0 }]
                }
              ]}
            >
              {[...Array(5)].map((_, index) => (
                <Animated.View
                  key={`visualizer-bar-${index}`}
                  style={[
                    styles.visualizerBar,
                    {
                      transform: [
                        { scaleY: visualizerAnimation },
                        { 
                          translateY: visualizerAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.sin(Date.now() / 200 + index * 0.5) * 8]
                          })
                        }
                      ],
                    }
                  ]}
                />
              ))}
            </Animated.View>
            
            {/* Record Button */}
            <Animated.View style={{ transform: [{ scale: recordingAnimation }] }}>
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                onPress={handleRecordConversation}
              >
                <View style={styles.recordButtonInner}>
                  {isRecording ? (
                    <View style={styles.stopIcon} />
                  ) : (
                    <View style={styles.recordIcon} />
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
            
            {/* Duration Display */}
            <Animated.View 
              style={[
                styles.durationContainer,
                { 
                  opacity: isRecording ? 1 : 0,
                  transform: [{ scale: isRecording ? 1 : 0.8 }]
                }
              ]}
            >
              <Text style={styles.durationText}>
                {formatTime(recordingDuration * 1000)}
              </Text>
            </Animated.View>
          </View>
          
          {/* Instructions */}
          <Animated.View style={{ opacity: isRecording ? 0 : 1 }}>
            <Text style={styles.recordInstructions}>
              Tap to start recording a conversation
            </Text>
          </Animated.View>
        </View>

      {/* Conversation History Header */}
        <View style={styles.conversationsSection}>
          <Text style={styles.sectionTitle}>
            Conversation History
          </Text>
        </View>
    </View>
  );

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const isPlaying = playingConversationId === item.id;
    const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => navigation.navigate('ConversationDetail', { 
          conversationId: item.id 
        })}
      >
        <View style={styles.conversationHeader}>
          <View style={styles.conversationHeaderLeft}>
            <Text style={styles.conversationTimestamp}>
              {formatTimestamp(item.createdAt)}
            </Text>
            {item.duration && (
              <Text style={styles.conversationDuration}>
                {formatTime(item.duration * 1000)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.deleteConversationButton}
            onPress={() => handleDeleteConversation(item.id)}
          >
            <Text style={styles.deleteConversationText}>×</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.conversationSummary} numberOfLines={2}>
          {item.summary}
        </Text>
        
        {/* Playback Controls */}
        {item.audioFilePath && (
          <View style={styles.playbackContainer}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => handlePlayConversation(item)}
              >
                <Text style={styles.playButtonText}>
                  {isPlaying ? '⏸' : '▶'}
                </Text>
              </TouchableOpacity>
            
            {isPlaying && (
              <View style={styles.playbackBar}>
                <View style={styles.playbackProgress}>
                  <View 
                    style={[
                      styles.playbackFill, 
                      { width: `${progress * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.playbackTime}>
                  {formatTime(playbackPosition)} / {formatTime(playbackDuration)}
                </Text>
              </View>
            )}
          </View>
        )}
        
        {item.tags.length > 0 && (
          <View style={styles.conversationTags}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={`conversation-tag-${item.id}-${tag}-${index}`} style={styles.conversationTag}>
                <Text style={styles.conversationTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyConversations = () => (
    <View style={styles.noConversationsContainer}>
      <Text style={styles.noConversationsText}>
        No previous conversations
      </Text>
      <Text style={styles.noConversationsSubtext}>
        Tap the record button above to start a conversation
      </Text>
    </View>
  );

  return (
    <>
      <FlatList
        style={styles.container}
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyConversations}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Add Tag Modal */}
      <Modal
        visible={showAddTagModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddTagModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Tag</Text>
            <TextInput
              style={styles.tagInput}
              placeholder="Enter tag name"
              value={newTag}
              onChangeText={setNewTag}
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={handleAddTag}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddTagModal(false);
                  setNewTag('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddTag}
              >
                <Text style={styles.addButtonText}>Add Tag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
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
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 20,
    paddingBottom: 30,
    backgroundColor: '#fff',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerSpacer: {
    flex: 1,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarText: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '600',
  },
  name: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  details: {
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  detailLabel: {
    fontSize: 14,
    color: '#8e8e93',
    fontWeight: '400',
    width: 80,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 17,
    color: '#000',
    flex: 1,
    marginLeft: 20,
  },
  // Tags styles
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
    marginLeft: 20,
  },
  tag: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginRight: 4,
  },
  tagDeleteText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  addTagButton: {
    backgroundColor: '#f2f2f7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  addTagText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  
  // Small tag styles for preview
  tagSmall: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 6,
  },
  tagTextSmall: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    marginRight: 4,
  },
  tagDeleteButton: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tagDeleteTextSmall: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 12,
  },
  addTagButtonSmall: {
    backgroundColor: '#f2f2f7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagTextSmall: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  showMoreButton: {
    backgroundColor: '#e5e5ea',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  showMoreText: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
  },
  showLessButton: {
    backgroundColor: '#e5e5ea',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  showLessText: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
  },
  
  // Voice Memo Recorder
  voiceMemoContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceMemoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  voiceMemoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: '#ff3b30',
    fontWeight: '500',
  },
  recorderContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  visualizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    height: 40,
  },
  visualizerBar: {
    width: 4,
    height: 20,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginHorizontal: 2,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f2f2f7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  recordButtonActive: {
    backgroundColor: '#ff3b30',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff3b30',
  },
  stopIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#ff3b30',
    borderRadius: 4,
  },
  durationContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f2f2f7',
    borderRadius: 20,
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  recordInstructions: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 12,
  },
  conversationsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  noConversationsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  noConversationsText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginBottom: 8,
  },
  noConversationsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  conversationItem: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conversationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deleteConversationButton: {
    padding: 8,
    marginLeft: 12,
  },
  deleteConversationText: {
    fontSize: 16,
    color: '#ff3b30',
  },
  conversationTimestamp: {
    fontSize: 15,
    color: '#8e8e93',
    fontWeight: '400',
  },
  conversationDuration: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '400',
  },
  
  // Playback controls
  playbackContainer: {
    marginVertical: 8,
  },
  playButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  playButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  playbackBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playbackProgress: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e5ea',
    borderRadius: 2,
    marginRight: 8,
  },
  playbackFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  playbackTime: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '400',
    minWidth: 80,
  },
  conversationSummary: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
    marginBottom: 8,
  },
  conversationTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conversationTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conversationTagText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  tagInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f2f2f7',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f2f2f7',
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8e8e93',
    textAlign: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
  },
});
