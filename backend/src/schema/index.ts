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
