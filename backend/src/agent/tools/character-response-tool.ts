import { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Character } from '../../schema';

const characterTool: Tool = {
  name: 'get_character_response',
  description:
    'Generate a character response in 1982 NYC art scene conversation. MUST follow character rotation rules and avoid repetition.',
  input_schema: {
    type: 'object',
    properties: {
      character: {
        type: 'string',
        enum: Object.values(Character),
        description:
          'Character name - MUST be different from the last speaker (mandatory rotation)',
      },
      response: {
        type: 'string',
        description:
          'Character response (MAXIMUM 25 words for natural party conversation)',
        minLength: 5,
        maxLength: 200,
      },
      reasoning: {
        type: 'string',
        description:
          'Brief explanation: why this character (not last speaker) and why this response is unique',
        maxLength: 100,
      },
    },
    required: ['character', 'response', 'reasoning'],
    additionalProperties: false,
  },
};

export default characterTool;
