import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import { z } from 'zod';
import { Character, Mood } from '../schema';
import { PostThreadMessageSchema } from '../schema/api/chat';

export default swaggerJsdoc({
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Art-gument API',
      version: '1.0.0',
      description:
        'AI-powered conversations with 1980s NYC art scene figures: Jean-Michel ' +
        'Basquiat, Keith Haring, Lou Reed, and Richard Hell. The game has two ' +
        'moves: post the user message (stored, no reply), then play a round — ' +
        'the AI moderator casts characters line by line until the floor turns ' +
        'back to the user. Each round also refreshes the conversation mood.',
    },
    components: {
      parameters: {
        ThreadId: {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Thread ID',
          schema: { type: 'string', pattern: '^\\d+$' },
        },
      },
      schemas: {
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            author: {
              type: 'string',
              enum: ['user', ...Object.values(Character)],
            },
            message: { type: 'string' },
            threadId: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'author', 'message', 'threadId', 'createdAt'],
        },
        Mood: {
          type: 'string',
          enum: Object.values(Mood),
          nullable: true,
          description: 'The conversation mood; null before the first reading',
        },
        MoodReading: {
          type: 'object',
          nullable: true,
          description:
            'Refreshed mood after a round; null when the reading failed or was not taken',
          properties: {
            mood: { $ref: '#/components/schemas/Mood' },
            intensity: { type: 'integer', minimum: 1, maximum: 5 },
          },
          required: ['mood', 'intensity'],
        },
        TurnResult: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              items: { $ref: '#/components/schemas/Message' },
            },
            mood: { $ref: '#/components/schemas/MoodReading' },
          },
          required: ['messages', 'mood'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                statusCode: { type: 'integer' },
                message: {
                  type: 'string',
                  description: 'Omitted for 5xx responses',
                },
              },
              required: ['name', 'statusCode'],
            },
          },
          required: ['error'],
        },
        PostThreadMessageBody: z.toJSONSchema(
          PostThreadMessageSchema.shape.body
        ),
      },
    },
  },
  apis: [path.join(__dirname, '../routes/*.{ts,js}')],
});
