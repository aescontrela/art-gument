import { Mood } from '../domain';
import { Message } from './message';

export type Thread = {
  id: number;
  summary: string | null;
  mood: Mood | null;
  intensity: number | null;
  messages: Message[];
};

export type UpdateThreadSummaryInput = {
  id: number;
  summary: string;
  summarizedUntil: Date;
};

export type UpdateThreadMoodInput = {
  id: number;
  mood: Mood;
  intensity: number;
};

export type GetThreadByIdInput = {
  threadId: number;
  limit?: number;
};

export type GetThreadOverflowInput = {
  threadId: number;
  windowSize: number;
};
