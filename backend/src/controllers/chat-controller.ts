import { NextFunction, Request, Response } from 'express';
import { APIError } from '../errors/api-error';
import {
  GetThreadParams,
  PostThreadBody,
  PostThreadMessage,
} from '../schema/api/chat-schema';
import ChatService from '../services/chat-service';

export default class ChatController {
  constructor(private readonly chatService = new ChatService()) {}

  async getThread(
    req: Request<GetThreadParams, Record<string, never>, Record<string, never>>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const threadId = Number(req.params.id);
      const result = await this.chatService.getThread(threadId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async postThread(
    _req: Request<Record<string, never>, Record<string, never>, PostThreadBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.chatService.createThread();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async postThreadMessage(
    req: Request<PostThreadMessage['params'], never, PostThreadMessage['body']>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      let response;
      if (req.body.type === 'user') {
        response = await this.chatService.processUserMessage({
          threadId: Number(req.params.id),
          message: req.body.message,
        });
        res.status(201).json(response);
      } else if (req.body.type === 'character') {
        response = await this.chatService.generateCharacterMessage({
          threadId: Number(req.params.id),
          character: req.body.character,
        });
        res.status(201).json(response);
      } else if (req.body.type === 'moderator') {
        response = await this.chatService.generateNextCharacterMessage({
          threadId: Number(req.params.id),
        });
        res.status(201).json(response);
      } else {
        throw new APIError(`Unknown message type: ${req.body['type']}`, 400);
      }
    } catch (error) {
      next(error);
    }
  }
}
