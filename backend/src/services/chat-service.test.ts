import MessageRepository from '../repositories/message-repository';
import ThreadRepository from '../repositories/thread-repository';
import { Character } from '../schema';
import AnthropicService from './anthropic-service';
import ChatService from './chat-service';

const message = (i: number, author = Character.BASQUIAT as string) => ({
  id: `id-${i}`,
  author,
  message: `line ${i}`,
  threadId: 1,
  createdAt: new Date(2026, 0, 1, 0, i),
});

const messages = (n: number) =>
  Array.from({ length: n }, (_, i) => message(i + 1));

function build({
  overflow = [] as ReturnType<typeof message>[],
  storedSummary = null as string | null,
} = {}) {
  const threadRepository = {
    getById: jest.fn().mockResolvedValue({
      id: 1,
      summary: storedSummary,
      messages: messages(3),
    }),
    getThreadOverflow: jest
      .fn()
      .mockResolvedValue({ id: 1, summary: storedSummary, messages: overflow }),
    update: jest.fn().mockResolvedValue(undefined),
    create: jest.fn(),
  };
  const messageRepository = { create: jest.fn().mockResolvedValue('msg-id') };
  const anthropicService = {
    summarizeConversation: jest.fn().mockResolvedValue('the new summary'),
    getCharacterResponse: jest
      .fn()
      .mockResolvedValue([{ character: Character.BASQUIAT, response: 'yo' }]),
    getNextCharacterResponse: jest
      .fn()
      .mockResolvedValue([{ character: Character.LOU_REED, response: 'nah' }]),
  };

  const service = new ChatService(
    messageRepository as unknown as MessageRepository,
    threadRepository as unknown as ThreadRepository,
    anthropicService as unknown as AnthropicService
  );

  return { service, threadRepository, messageRepository, anthropicService };
}

describe('summarization trigger', () => {
  test('folds the overflow into the summary when it reaches the chunk size', async () => {
    const overflow = messages(10);
    const { service, threadRepository, anthropicService } = build({
      overflow,
      storedSummary: 'old summary',
    });

    await service.generateNextCharacterMessage({ threadId: 1 });

    expect(anthropicService.summarizeConversation).toHaveBeenCalledWith({
      existingSummary: 'old summary',
      messages: overflow,
    });
    expect(threadRepository.update).toHaveBeenCalledWith({
      id: 1,
      summary: 'the new summary',
      summarizedUntil: overflow[overflow.length - 1].createdAt,
    });
  });

  test('persists the fold before generating the reply', async () => {
    const { service, threadRepository, anthropicService } = build({
      overflow: messages(10),
    });

    await service.generateNextCharacterMessage({ threadId: 1 });

    const updateOrder = threadRepository.update.mock.invocationCallOrder[0];
    const generateOrder =
      anthropicService.getNextCharacterResponse.mock.invocationCallOrder[0];
    expect(updateOrder).toBeLessThan(generateOrder);
  });

  test('does not summarize when the overflow is below the chunk size', async () => {
    const { service, threadRepository, anthropicService } = build({
      overflow: messages(9),
    });

    await service.generateNextCharacterMessage({ threadId: 1 });

    expect(anthropicService.summarizeConversation).not.toHaveBeenCalled();
    expect(threadRepository.update).not.toHaveBeenCalled();
  });

  test('a failed summarization is swallowed and generation still succeeds', async () => {
    const { service, threadRepository, anthropicService } = build({
      overflow: messages(10),
    });
    anthropicService.summarizeConversation.mockRejectedValue(
      new Error('api down')
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await service.generateNextCharacterMessage({ threadId: 1 });

    expect(result).toBeDefined();
    expect(threadRepository.update).not.toHaveBeenCalled();
    expect(anthropicService.getNextCharacterResponse).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('context assembly', () => {
  test('generation fetches the windowed thread and passes the stored summary', async () => {
    const { service, threadRepository, anthropicService } = build({
      storedSummary: 'what happened so far',
    });

    await service.generateNextCharacterMessage({ threadId: 1 });

    expect(threadRepository.getById).toHaveBeenCalledWith(1, 10);
    expect(anthropicService.getNextCharacterResponse).toHaveBeenCalledWith(
      expect.any(Array),
      'what happened so far'
    );
  });

  test('single-character generation also receives the summary', async () => {
    const { service, anthropicService } = build({ storedSummary: 'so far' });

    await service.generateCharacterMessage({
      threadId: 1,
      character: Character.BASQUIAT,
    });

    expect(anthropicService.getCharacterResponse).toHaveBeenCalledWith(
      expect.any(Array),
      Character.BASQUIAT,
      'so far'
    );
  });

  test('getThread returns the full history, not the window', async () => {
    const { service, threadRepository } = build();

    await service.getThreadById(1);

    expect(threadRepository.getById).toHaveBeenCalledWith(1, undefined);
  });
});
