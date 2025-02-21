import { readdirSync } from 'fs';

import { Failure, Result, Success } from '@/utils/result';

import { VoiceBot } from '../bots/types';
import { Command } from '../command';

type LoadableModule = Command | VoiceBot;

export class FileLoader {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async loadFiles<T extends LoadableModule>(
    directory: string,
    typeGuard: (module: unknown) => module is T
  ): Promise<Result<T[], Error>> {
    try {
      const files = readdirSync(`${this.basePath}/${directory}`);
      const modules = await Promise.all(
        files.map(async (file) => {
          const fileName = file.replace('.ts', '');
          const module = await import(
            `${this.basePath}/${directory}/${fileName}`
          );

          return module.default;
        })
      );

      const validModules = modules.filter(typeGuard);

      return new Success(validModules);
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to load files')
      );
    }
  }
}
