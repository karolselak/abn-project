export interface TreeNode {
  id: string;
  name: string;
  description: string;
}

export interface TreeListItem {
  name: string;
  description: string;
  parent: string;
}

export class TreeListTransformer {
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
