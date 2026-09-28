import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import { z } from 'zod';
import { Character } from '../schema';
import { PostThreadMessageSchema } from '../schema/api/chat';

export default swaggerJsdoc({
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Art-gument API',
      version: '1.0.0',
      description:
        'AI-powered conversations with 1980s NYC art scene figures: Jean-Michel ' +
        'Basquiat, Keith Haring, Lou Reed, and Richard Hell. Posting a `user` ' +
        'message only stores it, send a `moderator` or `character` message to ' +
        'generate a reply.',
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
          },
          required: ['id', 'author', 'message'],
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
