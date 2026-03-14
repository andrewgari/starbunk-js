// This file is deprecated.
export abstract class BaseRepository {
  constructor() {
    throw new Error('BaseRepository is deprecated. Use PostgresBaseRepository.');
  }
}
