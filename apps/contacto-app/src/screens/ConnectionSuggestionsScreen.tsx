import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Linking, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { getConnectionService, ConnectionSuggestion } from '../services/connectionService';

type RootStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  EditContact: { contactId: string };
  RecordConversation: { contactId: string };
  ConversationDetail: { conversationId: string };
  SemanticSearch: undefined;
  DebugDB: undefined;
  TeamMode: undefined;
  ConnectionSuggestions: undefined;
};

type ConnectionSuggestionsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ConnectionSuggestions'>;
type ConnectionSuggestionsScreenRouteProp = RouteProp<RootStackParamList, 'ConnectionSuggestions'>;

interface Props {
  navigation: ConnectionSuggestionsScreenNavigationProp;
  route: ConnectionSuggestionsScreenRouteProp;
}

export default function ConnectionSuggestionsScreen({ navigation }: Props) {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const connectionService = getConnectionService();

  const loadSuggestions = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const connectionSuggestions = await connectionService.getTopSuggestions(20);
      setSuggestions(connectionSuggestions);
    } catch (error) {
      console.error('Error loading connection suggestions:', error);
      Alert.alert('Error', 'Failed to load connection suggestions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [connectionService]);

  const handleRefresh = useCallback(() => {
    loadSuggestions(true);
  }, [loadSuggestions]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  useFocusEffect(
    useCallback(() => {
      loadSuggestions();
    }, [loadSuggestions])
  );

  const handleIntroduceContacts = useCallback((suggestion: ConnectionSuggestion) => {
    const { contact1, contact2, commonTags } = suggestion;

    const sanitizePhone = (value?: string) => {
      const s = (value || '').replace(/[^\d+]/g, '');
      return s.length > 0 ? s : undefined;
    };

    const phone1 = sanitizePhone(contact1.phone);
    const phone2 = sanitizePhone(contact2.phone);
    const recipients = [phone1, phone2].filter(Boolean) as string[];

    if (recipients.length === 0) {
      Alert.alert('No phone numbers', 'Neither contact has a phone number to message.');
      return;
    }

    const message = `Hey ${contact1.name} and ${contact2.name}, I'd love to introduce you two to each other!`;
    const body = encodeURIComponent(message);

    // iOS supports multiple recipients via comma-separated list
    const iosRecipients = recipients.join(',');
    const first = recipients[0];

    const url = Platform.select({
      ios: `sms:${iosRecipients}&body=${body}`,
      android: `smsto:${first}?body=${body}`,
      default: `sms:${first}?body=${body}`,
    });

    Linking.openURL(url as string).catch(() => {
      Alert.alert('Unable to open Messages', 'Please try again or use Share instead.');
    });
  }, []);

  const renderSuggestionItem = ({ item }: { item: ConnectionSuggestion }) => (
    <View style={styles.suggestionCard}>
      <View style={styles.contactRow}>
        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => navigation.navigate('ContactDetail', { contactId: item.contact1.id })}
        >
          <View style={styles.contactAvatar}>
            <Text style={styles.contactAvatarText}>
              {item.contact1.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{item.contact1.name}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.connectionIndicator}>
          <Text style={styles.connectionText}>↔</Text>
          <Text style={styles.strengthText}>
            {(item.connectionStrength * 100).toFixed(0)}% match
          </Text>
        </View>

        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => navigation.navigate('ContactDetail', { contactId: item.contact2.id })}
        >
          <View style={styles.contactAvatar}>
            <Text style={styles.contactAvatarText}>
              {item.contact2.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{item.contact2.name}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.commonTagsContainer}>
        <Text style={styles.commonTagsTitle}>Common interests:</Text>
        <View style={styles.commonTags}>
          {item.commonTags.map((tag, index) => (
            <View key={`${item.contact1.id}-${item.contact2.id}-${tag}-${index}`} style={styles.commonTag}>
              <Text style={styles.commonTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.introduceButton}
        onPress={() => handleIntroduceContacts(item)}
      >
        <Text style={styles.introduceButtonText}>Introduce</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Finding connection opportunities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Connection Suggestions</Text>
        <Text style={styles.subtitle}>
          {suggestions.length} potential introductions based on shared interests
        </Text>
      </View>

      <FlatList
        data={suggestions}
        keyExtractor={(item) => `${item.contact1.id}-${item.contact2.id}`}
        renderItem={renderSuggestionItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No connection suggestions found</Text>
            <Text style={styles.emptySubtext}>
              Add more tags to your contacts to discover potential introductions
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
  listContainer: {
    padding: 16,
  },
  suggestionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  contactAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  connectionIndicator: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  connectionText: {
    fontSize: 20,
    color: '#007AFF',
  },
  strengthText: {
    fontSize: 10,
    color: '#8e8e93',
    marginTop: 2,
  },
  commonTagsContainer: {
    marginBottom: 8,
  },
  commonTagsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  commonTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  commonTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  commonTagText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  introduceButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  introduceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  },
});
