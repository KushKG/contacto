import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getDatabase } from '@contacto/database';
import ContactsListScreen from './src/screens/ContactsListScreen';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import AddContactScreen from './src/screens/AddContactScreen';
import EditContactScreen from './src/screens/EditContactScreen';
import RecordConversationScreen from './src/screens/RecordConversationScreen';
import ConversationDetailScreen from './src/screens/ConversationDetailScreen';
import SemanticSearchScreen from './src/screens/SemanticSearchScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const db = getDatabase();
        await db.initialize();
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize app');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Initializing Contact Intelligence...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (error) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
          initialRouteName="ContactsList"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="ContactsList" 
            component={ContactsListScreen}
            options={{ title: 'Contacts' }}
          />
          <Stack.Screen 
            name="ContactDetail" 
            component={ContactDetailScreen}
            options={{ title: 'Contact Details' }}
          />
          <Stack.Screen 
            name="AddContact" 
            component={AddContactScreen}
            options={{ title: 'Add Contact' }}
          />
          <Stack.Screen 
            name="EditContact" 
            component={EditContactScreen}
            options={{ title: 'Edit Contact' }}
          />
          <Stack.Screen 
            name="RecordConversation" 
            component={RecordConversationScreen}
            options={{ title: 'Record Conversation' }}
          />
          <Stack.Screen 
            name="ConversationDetail" 
            component={ConversationDetailScreen}
            options={{ title: 'Conversation Details' }}
          />
          <Stack.Screen 
            name="SemanticSearch" 
            component={SemanticSearchScreen}
            options={{ title: 'Semantic Search' }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
  },
});