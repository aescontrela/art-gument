export enum Character {
  BASQUIAT = 'BASQUIAT',
  KEITH_HARING = 'KEITH_HARING',
  LOU_REED = 'LOU_REED',
  RICHARD_HELL = 'RICHARD_HELL',
}

export enum Mood {
  WEARY = 'WEARY',
  MELANCHOLY = 'MELANCHOLY',
  PLAYFUL = 'PLAYFUL',
  COCKY = 'COCKY',
  ELECTRIC = 'ELECTRIC',
  CHAOTIC = 'CHAOTIC',
  PRICKLY = 'PRICKLY',
  HEATED = 'HEATED',
}

export type Author = 'user' | Character;

export type ChatMessage = {
  author: Author;
  message: string;
};

export type ConversationContext = {
  messages: ChatMessage[];
  summary: string | null;
};

export type CharacterResponse = {
  character: Character;
  response: string;
  reasoning: string;
  floorToUser: boolean;
};

export type Round = CharacterResponse[];

export type ConversationMood = {
  reasoning: string;
  mood: Mood;
  intensity: number;
};
