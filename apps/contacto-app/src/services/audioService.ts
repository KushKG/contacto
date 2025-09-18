import { Audio } from 'expo-av';
import { FileSystem } from 'expo-file-system';
import { AudioRecording } from '@contacto/shared';

export class AudioService {
  private recording: Audio.Recording | null = null;
  private isRecording = false;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  async startRecording(): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Audio recording permission denied');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await recording.startAsync();
      this.recording = recording;
      this.isRecording = true;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<AudioRecording> {
    if (!this.recording || !this.isRecording) {
      throw new Error('No active recording to stop');
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      // Get duration and basic file info
      const duration = await this.getAudioDuration(uri);

      const audioRecording: AudioRecording = {
        uri,
        duration: duration || 0,
        size: 0, // We'll skip file size for now to avoid deprecation warnings
      };

      this.recording = null;
      this.isRecording = false;

      return audioRecording;
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.recording = null;
      this.isRecording = false;
      throw error;
    }
  }

  async pauseRecording(): Promise<void> {
    if (!this.recording || !this.isRecording) {
      throw new Error('No active recording to pause');
    }

    try {
      await this.recording.pauseAsync();
    } catch (error) {
      console.error('Error pausing recording:', error);
      throw error;
    }
  }

  async resumeRecording(): Promise<void> {
    if (!this.recording || this.isRecording) {
      throw new Error('No paused recording to resume');
    }

    try {
      await this.recording.startAsync();
      this.isRecording = true;
    } catch (error) {
      console.error('Error resuming recording:', error);
      throw error;
    }
  }

  async cancelRecording(): Promise<void> {
    if (!this.recording) {
      return;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
      this.isRecording = false;
    } catch (error) {
      console.error('Error canceling recording:', error);
      this.recording = null;
      this.isRecording = false;
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  private async getAudioDuration(uri: string): Promise<number | null> {
    try {
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri });
      const status = await sound.getStatusAsync();
      await sound.unloadAsync();
      
      if (status.isLoaded) {
        return status.durationMillis ? status.durationMillis / 1000 : null;
      }
      return null;
    } catch (error) {
      console.error('Error getting audio duration:', error);
      return null;
    }
  }

  async playAudio(uri: string): Promise<void> {
    try {
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri });
      await sound.playAsync();
      
      // Unload after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  async deleteAudioFile(uri: string): Promise<void> {
    try {
      // Try to delete the file directly - if it doesn't exist, the operation will fail gracefully
      await FileSystem.deleteAsync(uri);
    } catch (error) {
      // File might not exist or already be deleted - this is okay
      console.log('Audio file deletion:', error.message || 'File not found or already deleted');
    }
  }
}

// Singleton instance
let audioServiceInstance: AudioService | null = null;

export const getAudioService = (): AudioService => {
  if (!audioServiceInstance) {
    audioServiceInstance = new AudioService();
  }
  return audioServiceInstance;
};
