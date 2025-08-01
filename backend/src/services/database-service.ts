import DbPool from '../db';

export default class DatabaseService {
  constructor(private readonly db = new DbPool()) {}

  async setup() {
    await this.db.migrate();
    await this.db.seed();
  }
}
