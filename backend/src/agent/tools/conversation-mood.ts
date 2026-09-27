import { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Mood } from '../../schema';

const conversationMoodTool: Tool = {
  name: 'detect_conversation_mood',
  description:
    'Assess the emotional temperature of the recent party conversation and return its current mood.',
  input_schema: {
    type: 'object',
    properties: {
      reasoning: {
        type: 'string',
        maxLength: 150,
        description:
          'Brief evidence for this reading — who said what in the recent messages',
      },
      mood: {
        type: 'string',
        enum: Object.values(Mood),
        description:
          'The single mood that best describes the conversation right now',
      },
      intensity: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        description:
          'How strongly the mood grips the room, 1 (faint) to 5 (overwhelming)',
      },
    },
    required: ['reasoning', 'mood', 'intensity'],
    additionalProperties: false,
  },
};

export default conversationMoodTool;
