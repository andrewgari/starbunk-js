import { readdirSync } from 'fs';
import { Result, Success, Failure } from '@/utils/result';

export class FileLoader {
  constructor(private readonly basePath: string) {}

  async loadFiles<T>(
    directory: string,
    transform: (module: unknown) => T | undefined
  ): Promise<Result<T[], Error>> {
    try {
      const files = readdirSync(`${this.basePath}/${directory}`);
      const modules = await Promise.all(
        files.map(async (file) => {
          const fileName = file.replace('.ts', '');
          const module = await import(
            `${this.basePath}/${directory}/${fileName}`
          );
          return transform(module.default);
        })
      );

      const validModules = modules.filter(
        (m): m is Awaited<T> => m !== undefined
      );
      return new Success(validModules);
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to load files')
      );
    }
  }
}
