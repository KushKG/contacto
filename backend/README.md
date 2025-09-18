# Contact Intelligence Backend

This is a simple Express.js proxy server that handles audio transcription requests from the React Native app and forwards them to OpenAI's Whisper API.

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the backend directory:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3001
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3001`

## API Endpoints

### POST /transcribe

Uploads an audio file and returns the transcription.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: FormData with 'file' field containing the audio file

**Response:**
```json
{
  "text": "transcribed text here",
  "language": "en"
}
```

## Benefits

- ✅ Eliminates React Native networking quirks
- ✅ Keeps API key secure on the server
- ✅ Easier debugging with server logs
- ✅ Works with any audio format (WAV, MP3, M4A)
- ✅ No ATS (App Transport Security) issues

## Testing

You can test the endpoint with curl:

```bash
curl -X POST -F "file=@test.wav" http://localhost:3001/transcribe
```
