import { Router } from 'express';
import ChatController from '../controllers/chat-controller';
import validateRequest from '../middleware/validation-middleware';
import {
  GetThreadSchema,
  PostThreadMessageSchema,
  PostThreadRoundSchema,
} from '../schema/api/chat';

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
router.post('/thread', controller.postThread.bind(controller));

/**
 * @openapi
 * /api/chat/thread/{id}:
 *   get:
 *     summary: Get a thread's messages and history
 *     parameters:
 *       - $ref: '#/components/parameters/ThreadId'
 *     responses:
 *       200:
 *         description: The thread with its full message history and current mood
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 summary:
 *                   type: string
 *                   nullable: true
 *                   description: Compressed memory of messages no longer in the recent window
 *                 mood:
 *                   $ref: '#/components/schemas/Mood'
 *                 intensity:
 *                   type: integer
 *                   nullable: true
 *                   minimum: 1
 *                   maximum: 5
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
  validateRequest(GetThreadSchema),
  controller.getThread.bind(controller)
);

/**
 * @openapi
 * /api/chat/thread/{id}/message:
 *   post:
 *     summary: Post the user's message (the user's turn)
 *     description: >
 *       Stores the visitor's message in the thread without generating any
 *       reply. To have the party respond, follow up with a round via
 *       `POST /thread/{id}/round`.
 *     parameters:
 *       - $ref: '#/components/parameters/ThreadId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostThreadMessageBody'
 *     responses:
 *       201:
 *         description: The updated message history (mood is not re-read on a user turn)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TurnResult'
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
  '/thread/:id/message',
  validateRequest(PostThreadMessageSchema),
  controller.postThreadMessage.bind(controller)
);

/**
 * @openapi
 * /api/chat/thread/{id}/round:
 *   post:
 *     summary: Play a moderator round (the party's turn)
 *     description: >
 *       The AI moderator plays the conversation forward line by line,
 *       casting whichever characters the moment calls for, until a line
 *       naturally turns the floor back toward the user. Takes no request
 *       body. The response is a Server-Sent Events stream: one
 *       `data: <json>` frame per event, in order — a `line` event per
 *       generated line (`{"type":"line","line":{character, response,
 *       reasoning, floorToUser}}`, the final line carrying
 *       `floorToUser: true`), then one `mood` event with the refreshed
 *       reading (`{"type":"mood","mood":{mood, intensity} | null}`), after
 *       which the stream closes. A failure mid-stream emits
 *       `{"type":"error"}` and closes. Closing the connection aborts
 *       generation; lines already streamed remain persisted. Errors before
 *       the first frame (404, 409) are plain JSON responses.
 *     parameters:
 *       - $ref: '#/components/parameters/ThreadId'
 *     responses:
 *       200:
 *         description: Stream of round events
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: SSE frames as described above
 *       404:
 *         description: Thread not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: A round is already in progress for this thread
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/thread/:id/round',
  validateRequest(PostThreadRoundSchema),
  controller.postThreadRound.bind(controller)
);

export default router;
