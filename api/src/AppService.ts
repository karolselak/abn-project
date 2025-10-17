import { Injectable } from '@nestjs/common';
import { TreeListTransformer } from './TreeListTransformer';

@Injectable()
export class AppService {
  private driver: any;
  private session: any;

  async getAll(): Promise<string | void> {
    try {
      this.ensureSession();

      const result = await this.session.run(`
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
      `);

      const rawRecords = result.records.map((record: any) => record.toObject());
      const transformedRows = (new TreeListTransformer()).transform(rawRecords);

      return JSON.stringify(transformedRows);
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error during Neo4j connection:', error);
      }
    }
  }

  private ensureSession() {
    if (this.session) {
      return;
    }

    // create driver/session lazily so tests can replace `this.session` with a mock
    const neo4j = require('neo4j-driver');

    const uri = 'bolt://neo4j:7687';
    const user = '';
    const password = '';
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    this.session = this.driver.session();
  }
}