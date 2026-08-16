import { Router } from 'express';
import ChatController from '../controllers/chat-controller';
import validateRequest from '../middleware/validation-middleware';
import {
  GetThreadRequestSchema,
  PostThreadMessageSchema,
  PostThreadRequestSchema,
} from '../schema/api/chat-schema';

const router = Router();

const controller = new ChatController();

/**
 * @openapi
 * /api/chat/thread:
 *   post:
 *     summary: Create a new conversation thread
 *     responses:
 *       200:
 *         description: ID of the created thread
 *         content:
 *           application/json:
 *             schema:
 *               type: integer
 */
router.post(
  '/thread',
  validateRequest(PostThreadRequestSchema),
  controller.postThread.bind(controller)
);

/**
 * @openapi
 * /api/chat/thread/{id}:
 *   get:
 *     summary: Get a thread's messages and history
 *     parameters:
 *       - $ref: '#/components/parameters/ThreadId'
 *     responses:
 *       200:
 *         description: The thread with its full message history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       404:
 *         description: Thread not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/thread/:id',
  validateRequest(GetThreadRequestSchema),
  controller.getThread.bind(controller)
);

/**
 * @openapi
 * /api/chat/thread/{id}/messages:
 *   post:
 *     summary: Send a message to the thread
 *     description: >
 *       A `user` message is stored without generating a reply. Send
 *       `{"type": "moderator"}` to let the AI moderator pick who speaks next,
 *       or `{"type": "character", "character": "..."}` to make a specific
 *       character respond. Each call adds one line to the conversation.
 *     parameters:
 *       - $ref: '#/components/parameters/ThreadId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostThreadMessageBody'
 *     responses:
 *       200:
 *         description: The updated message history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       404:
 *         description: Thread not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/thread/:id/messages',
  validateRequest(PostThreadMessageSchema),
  controller.postThreadMessage.bind(controller)
);

export default router;
