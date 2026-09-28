import { Author } from '../domain';

export type Message = {
  id: string;
  author: Author;
  message: string;
  threadId: number;
  createdAt: Date;
};

export type CreateMessageInput = Pick<
  Message,
  'author' | 'message' | 'threadId'
>;

export type GetMessageByIdInput = {
  id: string;
};
