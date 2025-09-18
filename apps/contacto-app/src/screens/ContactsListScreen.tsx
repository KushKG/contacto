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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Contact } from '@contacto/shared';
import { getContactService } from '../services/contactService';

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

type ContactsListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ContactsList'>;
type ContactsListScreenRouteProp = RouteProp<RootStackParamList, 'ContactsList'>;

interface Props {
  navigation: ContactsListScreenNavigationProp;
  route: ContactsListScreenRouteProp;
}

export default function ContactsListScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const contactService = getContactService();

  const loadContacts = useCallback(async () => {
    try {
      const allContacts = await contactService.getAllContacts();
      setContacts(allContacts);
      setFilteredContacts(allContacts);
    } catch (error) {
      Alert.alert('Error', 'Failed to load contacts');
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [contactService]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const searchResults = await contactService.searchContacts(query);
        setFilteredContacts(searchResults);
      } catch (error) {
        Alert.alert('Error', 'Failed to search contacts');
        console.error('Error searching contacts:', error);
      }
    } else {
      setFilteredContacts(contacts);
    }
  }, [contactService, contacts]);

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

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })}
    >
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        {item.phone && <Text style={styles.contactDetail}>{item.phone}</Text>}
        {item.email && <Text style={styles.contactDetail}>{item.email}</Text>}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.importButton, isImporting && styles.importButtonDisabled]}
          onPress={handleImportContacts}
          disabled={isImporting}
        >
          <Text style={styles.importButtonText}>
            {isImporting ? 'Importing...' : 'Import'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('SemanticSearch')}
        >
          <Text style={styles.searchButtonText}>AI Search</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContactItem}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddContact')}
              >
                <Text style={styles.addButtonText}>Add Your First Contact</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddContact')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
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
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    fontSize: 16,
  },
  importButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  importButtonDisabled: {
    backgroundColor: '#ccc',
  },
  importButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  settingsButton: {
    backgroundColor: '#8E8E93',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    marginLeft: 8,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  contactItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
