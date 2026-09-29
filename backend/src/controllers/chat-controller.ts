import { NextFunction, Request, Response } from 'express';
import { GetThread, PostThreadMessage, PostThreadRound } from '../schema';
import ChatService from '../services/chat-service';

export default class ChatController {
  constructor(private readonly chatService = new ChatService()) {}

  async getThread(
    req: Request<
      GetThread['params'],
      Record<string, never>,
      Record<string, never>
    >,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const threadId = Number(req.params.id);
      const result = await this.chatService.getThreadById(threadId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async postThread(
    _req: Request,
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
      response = await this.chatService.runUserTurn({
        threadId: Number(req.params.id),
        message: req.body.message,
      });
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async postThreadRound(
    req: Request<PostThreadRound['params'], never, never>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const abort = new AbortController();
    req.on('close', () => abort.abort());

    try {
      const round = this.chatService.runModeratorRound({
        threadId: Number(req.params.id),
        signal: abort.signal,
      });

      for await (const event of round) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      res.end();
    } catch (error) {
      if (!res.headersSent) {
        next(error);
        return;
      }

      if (!abort.signal.aborted) {
        res.write(`data: ${JSON.stringify({ type: 'error' })}\n\n`);
      }
      res.end();
    }
  }
}
