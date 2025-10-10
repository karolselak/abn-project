import { Injectable } from '@nestjs/common';

const neo4j = require('neo4j-driver');

const uri = 'bolt://neo4j:7687'
const user = '';
const password = '';
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
const session = driver.session();

@Injectable()
export class AppService {
  async getAll(): Promise<string | void> {
    try {
      const result = await session.run(`
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
      `);

      const rawRecords = result.records.map(record => record.toObject());
      const transformedRows = (new TreeListTransformer()).transform(rawRecords);

      return JSON.stringify(transformedRows);
    } catch (error) {
      console.error('Error during Neo4j connection:', error);
    } finally {
      await session.close();
      await driver.close();
    }
  }
}

interface TreeNode {
  id: string;
  name: string;
  description: string;
}

interface TreeListItem {
  name: string;
  description: string;
  parent: string;
}

class TreeListTransformer {
  private nodesById = new Map<string, TreeNode>();
  private parentByChildId = new Map<string, string>();

  public transform(rows: any[]): { data: TreeListItem[] } {
    this.collectNodesAndRelations(rows);
    const result = this.buildOutput();
    this.sortOutput(result);

    return { data: result };
  }

  private collectNodesAndRelations(rows): void {
    for (const row of rows ?? []) {
      const n = row?.n;
      const m = row?.m;
      const r = row?.r;

      this.insertToNodesMap(n);
      this.insertToNodesMap(m);

      if (r && n && m && (r.type === 'HAS_CHILD' || !r.type)) {
        const parentId = n.elementId;
        const childId = m.elementId;

        if (childId && parentId && !this.parentByChildId.has(childId)) {
          this.parentByChildId.set(childId, parentId);
        }
      }
    }
  }

  private insertToNodesMap(node: any): void {
    const id = node?.elementId;

    if (!id) {
      return;
    }

    const name = node.properties?.name ?? '';
    const description = node.properties?.description ?? '';

    this.nodesById.set(id, { id, name, description });
  }

  private buildOutput(): TreeListItem[] {
    const output: TreeListItem[] = [];

    for (const node of this.nodesById.values()) {
      const parentId = this.parentByChildId.get(node.id);
      const parentName = parentId ? (this.nodesById.get(parentId)?.name ?? '') : '';

      output.push({
        name: node.name,
        description: node.description,
        parent: parentName || ''
      });
    }

    return output;
  }

  private sortOutput(output: TreeListItem[]): void {
    output.sort((a, b) => (a.parent).localeCompare(b.parent) || a.name.localeCompare(b.name));
  }
}
