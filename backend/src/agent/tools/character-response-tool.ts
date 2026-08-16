import { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Character } from '../../schema';

const characterTool: Tool = {
  name: 'get_character_response',
  description:
    'Return the next line of dialogue in the 1982 NYC art scene conversation.',
  input_schema: {
    type: 'object',
    properties: {
      character: {
        type: 'string',
        enum: Object.values(Character),
        description: 'The character speaking this line',
      },
      response: {
        type: 'string',
        description:
          "The character's line — under 25 words of natural party conversation",
        minLength: 5,
        maxLength: 200,
      },
      reasoning: {
        type: 'string',
        description:
          'Why this character speaks next and what this line adds to the conversation',
        maxLength: 100,
      },
    },
    required: ['character', 'response', 'reasoning'],
    additionalProperties: false,
  },
};

export default characterTool;
