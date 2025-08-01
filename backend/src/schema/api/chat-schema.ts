import { z } from 'zod';
import { Character } from '..';

export const GetThreadRequestSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid thread ID'),
  }),
});

export const PostThreadMessageSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid thread ID'),
  }),
  body: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('user'),
      message: z.string().min(1, 'Message is required'),
    }),
    z.object({
      type: z.literal('character'),
      character: z.enum(Character),
    }),
    z.object({
      type: z.literal('moderator'),
    }),
  ]),
});

export const PostThreadRequestSchema = z.object({
  body: z.object({}).optional(),
});

export const PostConversationRoundSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid thread ID'),
  }),
});

export type GetThreadParams = z.infer<typeof GetThreadRequestSchema>['params'];

export type PostThreadMessage = {
  params: z.infer<typeof PostThreadMessageSchema>['params'];
  body: z.infer<typeof PostThreadMessageSchema>['body'];
};

export type PostThreadBody = z.infer<typeof PostThreadRequestSchema>['body'];

export type PostConversationRound = {
  params: z.infer<typeof PostConversationRoundSchema>['params'];
};
