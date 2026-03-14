// This file is deprecated.
export class DatabaseService {
  static getInstance() {
    throw new Error('DatabaseService is deprecated. Use PostgresService.');
  }
}
