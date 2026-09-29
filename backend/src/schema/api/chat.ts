import { z } from 'zod';

export const GetThreadSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid thread ID'),
  }),
});

export const PostThreadMessageSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid thread ID'),
  }),
  body: z.object({
    message: z.string().min(1, 'Message is required').max(1000),
  }),
});

export const PostThreadRoundSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid thread ID'),
  }),
});

export type GetThread = z.infer<typeof GetThreadSchema>;
export type PostThreadMessage = z.infer<typeof PostThreadMessageSchema>;
export type PostThreadRound = z.infer<typeof PostThreadRoundSchema>;
