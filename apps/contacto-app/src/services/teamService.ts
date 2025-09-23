import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Share } from 'react-native';
import { getContactService } from './contactService';
import { getConversationService } from './conversationService';
import { Contact, Conversation } from '@contacto/shared';

export interface TeamExportData {
  contacts: Contact[];
  conversations: Conversation[];
  exportDate: string;
  version: string;
}

export class TeamService {
  private contactService = getContactService();
  private conversationService = getConversationService();

  async exportDatabase(): Promise<string> {
    try {
      // Get all contacts and conversations
      const contacts = await this.contactService.getAllContacts();
      const allConversations = await this.conversationService.getAllConversations();

      const exportData: TeamExportData = {
        contacts,
        conversations: allConversations,
        exportDate: new Date().toISOString(),
        version: '1.0.0',
      };

      // Create JSON file
      const fileName = `contacto-export-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));

      return fileUri;
    } catch (error) {
      console.error('Error exporting database:', error);
      throw new Error('Failed to export database');
    }
  }

  async shareDatabase(): Promise<void> {
    try {
      const fileUri = await this.exportDatabase();
      const fileName = fileUri.split('/').pop() || 'contacto-export.json';

      await Share.share({
        url: fileUri,
        title: 'Contacto Database Export',
        message: `Sharing Contacto database export (${fileName})`,
      });
    } catch (error) {
      console.error('Error sharing database:', error);
      throw new Error('Failed to share database');
    }
  }

  async importDatabase(): Promise<{ contactsAdded: number; conversationsAdded: number }> {
    try {
      // Pick file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        throw new Error('No file selected');
      }

      const fileUri = result.assets[0].uri;
      
      // Read and parse file
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importData: TeamExportData = JSON.parse(fileContent);

      // Validate data structure
      if (!importData.contacts || !importData.conversations) {
        throw new Error('Invalid database file format');
      }

      let contactsAdded = 0;
      let conversationsAdded = 0;

      // Import contacts
      for (const contact of importData.contacts) {
        try {
          // Check if contact already exists
          const existingContact = await this.contactService.getContact(contact.id);
          if (!existingContact) {
            await this.contactService.createContact({
              name: contact.name,
              phone: contact.phone,
              email: contact.email,
              notes: contact.notes,
              imageUri: contact.imageUri,
              tags: contact.tags,
            });
            contactsAdded++;
          }
        } catch (error) {
          console.warn(`Failed to import contact ${contact.name}:`, error);
        }
      }

      // Import conversations
      for (const conversation of importData.conversations) {
        try {
          // Check if conversation already exists
          const existingConversations = await this.conversationService.getConversationsByContact(conversation.contactId);
          const exists = existingConversations.some(c => 
            c.transcription === conversation.transcription && 
            c.createdAt.getTime() === new Date(conversation.createdAt).getTime()
          );

          if (!exists) {
            await this.conversationService.createConversation({
              contactId: conversation.contactId,
              transcription: conversation.transcription,
              summary: conversation.summary,
              tags: conversation.tags,
              audioFilePath: conversation.audioFilePath,
              duration: conversation.duration,
            });
            conversationsAdded++;
          }
        } catch (error) {
          console.warn(`Failed to import conversation:`, error);
        }
      }

      return { contactsAdded, conversationsAdded };
    } catch (error) {
      console.error('Error importing database:', error);
      throw new Error('Failed to import database');
    }
  }

  async getDatabaseStats(): Promise<{ contactCount: number; conversationCount: number }> {
    try {
      const contacts = await this.contactService.getAllContacts();
      const conversations = await this.conversationService.getAllConversations();
      
      return {
        contactCount: contacts.length,
        conversationCount: conversations.length,
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw new Error('Failed to get database statistics');
    }
  }
}

let teamServiceInstance: TeamService | null = null;
export const getTeamService = (): TeamService => {
  if (!teamServiceInstance) {
    teamServiceInstance = new TeamService();
  }
  return teamServiceInstance;
};
