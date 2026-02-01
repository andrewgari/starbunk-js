import { Command } from '@starbunk/shared/discord/command-registry';
import playCommand from '@/commands/play';
import stopCommand from '@/commands/stop';
import setVolumeCommand from '@/commands/set-volume';

/**
 * All commands available in DJCova
 */
export const commands: Command[] = [playCommand, stopCommand, setVolumeCommand];
