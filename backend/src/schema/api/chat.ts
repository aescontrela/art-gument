import { z } from 'zod';

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
      message: z.string().min(1, 'Message is required').max(1000),
    }),
    z.object({
      type: z.literal('moderator'),
    }),
  ]),
});

export const PostThreadRequestSchema = z.object({
  body: z.object({}).optional(),
});

export type PostThreadMessage = {
  params: z.infer<typeof PostThreadMessageSchema>['params'];
  body: z.infer<typeof PostThreadMessageSchema>['body'];
};

export type GetThreadParams = z.infer<typeof GetThreadRequestSchema>['params'];
export type PostThreadBody = z.infer<typeof PostThreadRequestSchema>['body'];
