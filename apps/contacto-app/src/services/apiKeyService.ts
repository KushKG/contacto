import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY_STORAGE_KEY = 'openai_api_key';

export class APIKeyService {
  static async getAPIKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }

  static async setAPIKey(apiKey: string): Promise<void> {
    try {
      await AsyncStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } catch (error) {
      console.error('Error setting API key:', error);
      throw error;
    }
  }

  static async deleteAPIKey(): Promise<void> {
    try {
      await AsyncStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      console.error('Error deleting API key:', error);
      throw error;
    }
  }

  static async hasAPIKey(): Promise<boolean> {
    const apiKey = await this.getAPIKey();
    return apiKey !== null && apiKey.trim().length > 0;
  }
}
