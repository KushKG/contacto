import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { getDatabase } from '@contacto/database';
import { getHybridSearchService } from './src/services/hybridSearchService';
import ContactsListScreen from './src/screens/ContactsListScreen';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import EditContactScreen from './src/screens/EditContactScreen';
import RecordConversationScreen from './src/screens/RecordConversationScreen';
import ConversationDetailScreen from './src/screens/ConversationDetailScreen';
import SemanticSearchScreen from './src/screens/SemanticSearchScreen';
import DebugDBScreen from './src/screens/DebugDBScreen';
import CalendarSuggestionsScreen from './src/screens/CalendarSuggestionsScreen';
import TeamModeScreen from './src/screens/TeamModeScreen';
import ConnectionSuggestionsScreen from './src/screens/ConnectionSuggestionsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e5ea',
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
            <Tab.Screen 
              name="Contacts" 
              component={ContactsListScreen}
              options={{
                tabBarLabel: 'Contacts',
                tabBarIcon: ({ color, size }) => (
                  <MaterialIcons name="contacts" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen 
              name="Calendar" 
              component={CalendarSuggestionsScreen}
              options={{
                tabBarLabel: 'Calendar',
                tabBarIcon: ({ color, size }) => (
                  <MaterialIcons name="event" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen 
              name="Connections" 
              component={ConnectionSuggestionsScreen}
              options={{
                tabBarLabel: 'Connections',
                tabBarIcon: ({ color, size }) => (
                  <MaterialIcons name="link" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen 
              name="Account" 
              component={TeamModeScreen}
              options={{
                tabBarLabel: 'Account',
                tabBarIcon: ({ color, size }) => (
                  <MaterialIcons name="account-circle" size={size} color={color} />
                ),
              }}
            />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const initializeApp = async () => {
      try {
        const db = getDatabase();
        await db.initialize();
        
        // Initialize hybrid search service
        const hybridSearchService = getHybridSearchService();
        await hybridSearchService.initialize();
        
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
          initialRouteName="MainTabs"
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
            name="MainTabs" 
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="ContactDetail" 
            component={ContactDetailScreen}
            options={{ title: 'Contact Details' }}
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
            name="DebugDB" 
            component={DebugDBScreen}
            options={{ title: 'Debug DB' }}
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