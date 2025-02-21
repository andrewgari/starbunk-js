/// <reference types="jest" />
import { CommandInteraction } from 'discord.js';
import { BaseCommand } from '../../discord/baseCommand';
import { CommandData } from '../../discord/command';

class TestCommand extends BaseCommand {
  readonly data: CommandData = {
    name: 'test',
    description: 'Test command'
  };

  readonly permissions = [];

  async execute(interaction: CommandInteraction): Promise<void> {
    await this.reply(interaction, 'Test response');
  }
}

describe('BaseCommand', () => {
  let command: TestCommand;
  let mockInteraction: jest.Mocked<CommandInteraction>;

  beforeEach(() => {
    command = new TestCommand();
    mockInteraction = {
      reply: jest.fn(),
      memberPermissions: {
        has: jest.fn().mockReturnValue(true)
      }
    } as unknown as jest.Mocked<CommandInteraction>;
  });

  it('should execute command and reply', async () => {
    await command.execute(mockInteraction);
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Test response',
      ephemeral: true
    });
  });

  it('should check permissions correctly', () => {
    expect(command.hasPermissions(mockInteraction)).toBe(true);
  });
}); 