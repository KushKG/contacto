import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Contact } from '@contacto/shared';
import { getContactService } from '../services/contactService';
import { getConversationService } from '../services/conversationService';
import { getHybridSearchService } from '../services/hybridSearchService';

type RootStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  EditContact: { contactId: string };
  RecordConversation: { contactId: string };
  ConversationDetail: { conversationId: string };
  SemanticSearch: undefined;
  DebugDB: undefined; // Added DebugDB to the stack param list
};

type ContactsListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ContactsList'>;
type ContactsListScreenRouteProp = RouteProp<RootStackParamList, 'ContactsList'>;

interface Props {
  navigation: ContactsListScreenNavigationProp;
  route: ContactsListScreenRouteProp;
}

export default function ContactsListScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  // Replace single search with two search inputs
  const [aiQuery, setAiQuery] = useState('');
  const [simpleQuery, setSimpleQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiResults, setAiResults] = useState<Contact[]>([]);
  const [simpleResults, setSimpleResults] = useState<Contact[]>([]);
  const [contactsImported, setContactsImported] = useState(false);
  const [aiDebug, setAiDebug] = useState<Array<{ contactId: string; semantic: number; keyword: number; final: number; matchedField?: string; snippet?: string }>>([]);

  const contactService = getContactService();
  const conversationService = getConversationService();
  const hybridSearchService = getHybridSearchService();

  const FIRST_RUN_IMPORT_KEY = 'contacto:contactsImported';

  const loadContacts = useCallback(async () => {
    try {
      const allContacts = await contactService.getAllContacts();
      setContacts(allContacts);
      setFilteredContacts(allContacts);

      // If flag already set, keep it. If not set and there are already contacts,
      // we still leave the flag unset to allow a first manual import if desired.
      const flag = await AsyncStorage.getItem(FIRST_RUN_IMPORT_KEY);
      setContactsImported(flag === '1');
    } catch (error) {
      Alert.alert('Error', 'Failed to load contacts');
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [contactService]);

  // New: merge results with priority for simple (exact field) matches
  const mergeResults = useCallback((simple: Contact[], ai: Contact[]) => {
    const ordered: Contact[] = [];
    const seen = new Set<string>();

    // Add simple results first (prioritize exact/name matches)
    for (const c of simple) {
      if (!seen.has(c.id)) {
        ordered.push(c);
        seen.add(c.id);
      }
    }

    // Then add AI results if not already included
    for (const c of ai) {
      if (!seen.has(c.id)) {
        ordered.push(c);
        seen.add(c.id);
      }
    }

    // If neither query provided, fall back to all contacts
    if (ordered.length === 0 && !aiQuery.trim() && !simpleQuery.trim()) {
      return contacts;
    }

    return ordered;
  }, [aiQuery, simpleQuery, contacts]);

  // Handle AI search (embeddings + tag keywords)
  const handleAiSearchChange = useCallback(async (query: string) => {
    setAiQuery(query);

    if (!query.trim()) {
      setAiResults([]);
      setAiDebug([]);
      setFilteredContacts(mergeResults(simpleResults, []));
      return;
    }

    try {
      setIsAISearching(true);
      const searchResults = await hybridSearchService.search(query);
      const contactIds = searchResults.map(r => r.contactId);
      const items = await Promise.all(contactIds.map(id => contactService.getContact(id)));
      const valid = items.filter((c): c is Contact => c !== null);
      setAiResults(valid);
      // Pull debug rows (top 5)
      const dbg = hybridSearchService.getLastDebug().slice(0, 5);
      setAiDebug(dbg);
      setFilteredContacts(mergeResults(simpleResults, valid));
    } catch (error) {
      console.error('AI search failed:', error);
      Alert.alert('Error', 'AI search failed.');
    } finally {
      setIsAISearching(false);
    }
  }, [contactService, hybridSearchService, mergeResults, simpleResults]);

  // Handle simple search (name, email, phone, tag keyword)
  const handleSimpleSearchChange = useCallback(async (query: string) => {
    setSimpleQuery(query);

    if (!query.trim()) {
      setSimpleResults([]);
      setFilteredContacts(mergeResults([], aiResults));
      return;
    }

    try {
      const results = await contactService.searchContacts(query);
      setSimpleResults(results);
      setFilteredContacts(mergeResults(results, aiResults));
    } catch (error) {
      console.error('Simple search failed:', error);
      Alert.alert('Error', 'Search failed.');
    }
  }, [contactService, mergeResults, aiResults]);

  const handleImportContacts = useCallback(async () => {
    Alert.alert(
      'Import Contacts',
      'This will import contacts from your device. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            setIsImporting(true);
            try {
              const importedContacts = await contactService.importContactsFromDevice();
              Alert.alert(
                'Success',
                `Imported ${importedContacts.length} contacts successfully!`
              );
              // Mark first-run import as completed so we never show it again
              await AsyncStorage.setItem(FIRST_RUN_IMPORT_KEY, '1');
              setContactsImported(true);
              await loadContacts();
            } catch (error) {
              Alert.alert('Error', 'Failed to import contacts');
              console.error('Error importing contacts:', error);
            } finally {
              setIsImporting(false);
            }
          },
        },
      ]
    );
  }, [contactService, loadContacts]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadContacts();
    });
    return unsubscribe;
  }, [navigation, loadContacts]);

  const renderContactItem = ({ item }: { item: Contact }) => {
    
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })}
      >
        <View style={styles.contactAvatar}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.contactAvatarImage} />
          ) : (
            <Text style={styles.contactAvatarText}>
              {item.name && item.name.length > 0 ? item.name.charAt(0).toUpperCase() : '?'}
            </Text>
          )}
        </View>
        <View style={styles.contactInfo}>
          <View style={styles.contactNameRow}>
            <Text style={styles.contactName}>{item.name || 'Unknown Contact'}</Text>
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagIndicator}>
                <Text style={styles.tagIndicatorText}>
                  {item.tags.length} tag{item.tags.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
          {/* Phone and email hidden from main list */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsPreview}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <View key={`${item.id}-tag-${index}`} style={styles.tagPreview}>
                  <Text style={styles.tagPreviewText}>{tag}</Text>
                </View>
              ))}
              {item.tags.length > 3 && (
                <Text style={styles.moreTagsText}>+{item.tags.length - 3} more</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  const mergedData = mergeResults(simpleResults, aiResults);

  return (
    <View style={styles.container}>
      {/* iOS-style header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onLongPress={() => navigation.navigate('DebugDB')}>
            <Text style={styles.headerTitle}>Contacts</Text>
          </TouchableOpacity>
        </View>
        
        {/* AI Search bar (conversations + tags embeddings, tag keywords) */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="AI search: conversations, tags (semantic + keywords)"
              placeholderTextColor="#8e8e93"
              value={aiQuery}
              onChangeText={handleAiSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Simple Search bar (name, email, phone, tag keyword) */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Simple search: name, email, phone, tag keyword"
              placeholderTextColor="#8e8e93"
              value={simpleQuery}
              onChangeText={handleSimpleSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        
        {/* Action buttons */}
        <View style={styles.actionButtons}>
          {!contactsImported && (
            <TouchableOpacity
              style={[styles.actionButton, isImporting && styles.actionButtonDisabled]}
              onPress={handleImportContacts}
              disabled={isImporting}
            >
              <Text style={styles.actionButtonText}>
                {isImporting ? 'Importing...' : 'Import Contacts'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Contacts list */}
      <FlatList
        data={mergedData}
        keyExtractor={(item) => item.id}
        renderItem={renderContactItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        ListHeaderComponent={
          aiQuery.trim() || simpleQuery.trim() ? (
            <View>
              {aiQuery.trim() ? (
                <View style={styles.aiResultsHeader}>
                  <Text style={styles.aiResultsTitle}>AI Results</Text>
                  <Text style={styles.aiResultsSubtitle}>
                    {isAISearching ? 'Searching…' : `Found ${aiResults.length} related to "${aiQuery}"`}
                  </Text>
                  <Text style={styles.aiResultsDescription}>
                    Semantic over conversations + tags, plus tag keyword matching
                  </Text>
                  {aiDebug.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      {aiDebug.map((d, idx) => (
                        <Text key={`dbg-${idx}`} style={{ fontSize: 11, color: '#666' }}>
                          {idx + 1}. {d.contactId}  sem: {d.semantic.toFixed(3)}  key: {d.keyword.toFixed(3)}  final: {d.final.toFixed(3)} {d.matchedField ? `  field: ${d.matchedField}` : ''}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}
              {simpleQuery.trim() ? (
                <View style={styles.searchResultsHeader}>
                  <Text style={styles.searchResultsTitle}>Simple Results</Text>
                  <Text style={styles.searchResultsSubtitle}>
                    Found {simpleResults.length} matching "{simpleQuery}"
                  </Text>
                  <Text style={styles.searchResultsDescription}>
                    Name, email, phone, and tag keywords prioritized
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {aiQuery || simpleQuery ? 'No contacts found' : 'No contacts yet'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

    </View>
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
    paddingTop: 44, // Status bar height
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 17,
    color: '#000',
  },
  aiSearchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  aiSearchButtonActive: {
    backgroundColor: '#8e8e93',
  },
  aiSearchButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  actionButtonDisabled: {
    backgroundColor: '#8e8e93',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  contactItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  contactAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '400',
    color: '#000',
    flex: 1,
  },
  tagIndicator: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  tagIndicatorText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  contactDetail: {
    fontSize: 15,
    color: '#8e8e93',
    marginBottom: 1,
  },
  tagsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tagPreview: {
    backgroundColor: '#f2f2f7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
    marginBottom: 2,
  },
  tagPreviewText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#8e8e93',
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 17,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 17,
  },
  
  // AI Search Results
  aiResultsHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  aiResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  aiResultsSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 2,
  },
  aiResultsDescription: {
    fontSize: 12,
    color: '#8e8e93',
    fontStyle: 'italic',
  },
  
  // Regular Search Results
  searchResultsHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  searchResultsSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 2,
  },
  searchResultsDescription: {
    fontSize: 12,
    color: '#8e8e93',
    fontStyle: 'italic',
  },
});
