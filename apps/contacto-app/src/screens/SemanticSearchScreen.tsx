import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { EmbeddingSearchResult, Contact } from '@contacto/shared';
import { getConversationService } from '../services/conversationService';

type RootStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  AddContact: undefined;
  EditContact: { contactId: string };
  RecordConversation: { contactId: string };
  ConversationDetail: { conversationId: string };
  SemanticSearch: undefined;
};

type SemanticSearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SemanticSearch'>;
type SemanticSearchScreenRouteProp = RouteProp<RootStackParamList, 'SemanticSearch'>;

interface Props {
  navigation: SemanticSearchScreenNavigationProp;
  route: SemanticSearchScreenRouteProp;
}

export default function SemanticSearchScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmbeddingSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const conversationService = getConversationService();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      const results = await conversationService.semanticSearch(searchQuery);
      setSearchResults(results);
    } catch (error) {
      Alert.alert('Error', 'Failed to perform semantic search');
      console.error('Error in semantic search:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleContactPress = (contactId: string) => {
    navigation.navigate('ContactDetail', { contactId });
  };

  const handleConversationPress = (conversationId: string) => {
    navigation.navigate('ConversationDetail', { conversationId });
  };

  const renderSearchResult = ({ item }: { item: EmbeddingSearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleConversationPress(item.conversationId)}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.similarityScore}>
          {(item.similarity * 100).toFixed(1)}% match
        </Text>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => handleContactPress(item.contactId)}
        >
          <Text style={styles.contactButtonText}>View Contact</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.matchedText}>{item.matchedText}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Semantic Search</Text>
        <Text style={styles.subtitle}>
          Search conversations using natural language
        </Text>
      </View>

      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations... (e.g., 'discussed AI projects', 'mentioned React')"
          value={searchQuery}
          onChangeText={setSearchQuery}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <TouchableOpacity
          style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {searchResults.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>
            Found {searchResults.length} relevant conversation{searchResults.length !== 1 ? 's' : ''}
          </Text>
          
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.conversationId}
            renderItem={renderSearchResult}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {searchResults.length === 0 && !isSearching && searchQuery && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>No relevant conversations found</Text>
          <Text style={styles.noResultsSubtext}>
            Try different keywords or phrases
          </Text>
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How Semantic Search Works</Text>
        <Text style={styles.infoText}>
          • Uses AI embeddings to understand meaning, not just keywords
        </Text>
        <Text style={styles.infoText}>
          • Finds conversations based on context and topics
        </Text>
        <Text style={styles.infoText}>
          • Searches both transcriptions and summaries
        </Text>
        <Text style={styles.infoText}>
          • Results ranked by relevance score
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#f2f2f7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#ccc',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  resultItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  similarityScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  contactButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  contactButtonText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  matchedText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  infoSection: {
    backgroundColor: '#fff',
    margin: 20,
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
