import { readdirSync } from 'fs';
import { Result, Success, Failure } from '@/utils/result';

export class FileLoader {
  constructor(private readonly basePath: string) {}

  async loadFiles<T>(
    directory: string,
    transform: (module: unknown) => T | null
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

      return new Success(modules.filter((m): m is T => m !== null));
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to load files')
      );
    }
  }
}
