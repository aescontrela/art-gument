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
 * Create a new conversation thread
 * @route POST /api/chat/thread
 * @returns {number} Thread ID
 */
router.post(
  '/thread',
  validateRequest(PostThreadRequestSchema),
  controller.postThread.bind(controller)
);

/**
 * Get a conversation thread
 * @route GET /api/chat/thread/:id
 * @param {number} id - Thread ID
 * @returns {Object} Thread with ID and messages array
 */
router.get(
  '/thread/:id',
  validateRequest(GetThreadRequestSchema),
  controller.getThread.bind(controller)
);

/**
 * Send message to thread - supports user input, character responses, or AI moderation
 * @route POST /api/chat/thread/:id/messages
 * @param {number} id - Thread ID
 * @body {Object} Message data with type: 'user'|'character'|'moderator'
 * @example User: { "type": "user", "message": "Hello" }
 * @example Character: { "type": "character", "character": "LOU_REED" }
 * @example Moderator: { "type": "moderator" }
 * @returns {Array} Updated message history
 */
router.post(
  '/thread/:id/messages',
  validateRequest(PostThreadMessageSchema),
  controller.postThreadMessage.bind(controller)
);

export default router;
