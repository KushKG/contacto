# Contact Intelligence App

A React Native mobile application that evolves through 3 stages to provide intelligent contact management with AI-powered features.

## Project Structure

```
contacto/
├── packages/
│   ├── shared/          # Shared types and utilities
│   └── database/        # Database layer (SQLite)
├── apps/
│   └── contacto-app/    # Main React Native application
└── README.md
```

## Stage 1 - Core Contact App (MVP) ✅

**Status: Complete**

### Features Implemented

- ✅ **Contact Import**: Import contacts from device's contact list
- ✅ **Contact Management**: Add, edit, delete contacts
- ✅ **Contact Display**: Clean list and detail views
- ✅ **Search Functionality**: Search contacts by name, phone, email, or notes
- ✅ **Local Storage**: SQLite database for persistent storage
- ✅ **Clean UI**: Modern, intuitive interface with proper navigation

### Contact Fields

- Name (required)
- Phone number
- Email address
- Notes
- Created/Updated timestamps

### Technical Stack

- **Frontend**: React Native with Expo
- **Navigation**: React Navigation (Stack Navigator)
- **Database**: SQLite with expo-sqlite
- **Contact Access**: expo-contacts
- **Architecture**: Modular monorepo structure

### Getting Started

1. **Install Dependencies**
   ```bash
   cd apps/contacto-app
   npm install
   ```

2. **Configure OpenAI API (Required for Stage 2)**
   - Get an OpenAI API key from https://platform.openai.com/
   - The app will prompt you to enter the API key when using AI features
   - Required for: transcription, summarization, tagging, and semantic search

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Run on Device/Simulator**
   - Scan QR code with Expo Go app (iOS/Android)
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator

### Stage 2 Setup Requirements

- **OpenAI API Key**: Required for AI features
- **Audio Permissions**: Automatically requested when recording
- **Device Storage**: For storing audio files and conversation data

### Key Components

- **App.tsx**: Main app with navigation setup
- **ContactsListScreen**: Contact list with search and import
- **ContactDetailScreen**: Individual contact details
- **AddContactScreen**: Create new contacts
- **EditContactScreen**: Edit existing contacts
- **ContactService**: Business logic layer
- **ContactRepository**: Database operations

### Testing

The app includes:
- Mock data for development/testing
- Unit tests for core functionality
- Error handling and validation

## Stage 2 - AI Conversation Intelligence ✅

**Status: Complete**

### Features Implemented

- ✅ **Audio Recording**: High-quality conversation recording with expo-av
- ✅ **Whisper Integration**: Automatic transcription using OpenAI Whisper API
- ✅ **AI Summaries**: Intelligent conversation summaries with key points and sentiment
- ✅ **Automatic Tagging**: AI-powered contact tagging based on conversation content
- ✅ **Semantic Search**: Advanced search using OpenAI embeddings and cosine similarity
- ✅ **Voice Memo History**: Complete conversation history per contact with playback
- ✅ **Conversation Management**: Full CRUD operations for conversations

### New Screens & Features

- **Record Conversation Screen**: Professional recording interface with real-time duration
- **Conversation Detail Screen**: View transcriptions, summaries, tags, and audio playback
- **Semantic Search Screen**: Natural language search across all conversations
- **Enhanced Contact Detail**: Shows conversation history with summaries and tags

### AI Capabilities

- **Transcription**: Whisper-powered audio-to-text conversion
- **Summarization**: GPT-3.5-turbo for intelligent conversation summaries
- **Tagging**: Automatic extraction of relevant contact tags and topics
- **Semantic Search**: Vector-based search using OpenAI embeddings
- **Sentiment Analysis**: Positive/neutral/negative sentiment detection

### Technical Implementation

- **Audio Service**: Handles recording, playback, and file management
- **AI Service**: OpenAI integration for transcription, summarization, and embeddings
- **Conversation Service**: Business logic for conversation processing and management
- **Database Layer**: Extended SQLite schema for conversation storage
- **Vector Search**: Cosine similarity for semantic search results

## Stage 3 - Smart Integrations & Team Features (Planned)

**Goal**: Make the app collaborative and intelligent across multiple users.

### Planned Features

- 🎯 **Google Calendar Integration**: Suggest contacts for events
- 🎯 **Mass Send Contacts**: Bulk sharing of filtered contact lists
- 🎯 **Connection Suggestions**: AI-powered introduction suggestions
- 🎯 **Team Mode**: Multi-user shared database with real-time sync

### Technical Requirements

- Google Calendar API
- Real-time synchronization
- Team management system
- Advanced AI for connection suggestions

## Development Guidelines

### Code Organization

- **Modular Architecture**: Clear separation between UI, business logic, and data layers
- **TypeScript**: Full type safety throughout the application
- **Error Handling**: Comprehensive error handling and user feedback
- **Testing**: Unit tests for critical functionality

### Adding New Features

1. Update shared types in `packages/shared/src/types.ts`
2. Implement database layer in `packages/database/src/`
3. Create service layer in `apps/contacto-app/src/services/`
4. Build UI components in `apps/contacto-app/src/screens/`
5. Add tests and mock data

## Contributing

1. Follow the existing code structure and patterns
2. Add tests for new functionality
3. Update documentation for new features
4. Ensure TypeScript compliance

## License

This project is part of a startup development initiative.
