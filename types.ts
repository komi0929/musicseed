
export interface SongDetails {
  title: string;
  artist: string;
  genre?: string;
  year?: string;
  description?: string;
}

export interface GeneratedResult {
  lyrics: string;
  sunoPrompt: string; // English, <1000 chars
  sunoPromptTranslation: string; // Japanese
  generatedTitle?: string; // Optional: Generated in step 2
  generatedArtist?: string; // Optional: Generated in step 2
  reasoning?: string; // Optional: Explain why this prompt was chosen
  sources?: { title: string; uri: string }[];
}

export enum AppState {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  SELECTING = 'SELECTING',
  CONFIRMING = 'CONFIRMING',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}