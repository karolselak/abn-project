import { TreeListTransformer } from '../src/TreeListTransformer';

describe('TreeListTransformer', () => {
  let transformer: TreeListTransformer;

  beforeEach(() => {
    transformer = new TreeListTransformer();
  });

  describe('transform', () => {
    it('should transform nodes and relationships correctly', () => {
      const rows = [
        {
          n: {
            elementId: '1',
            properties: { name: 'Parent', description: 'Parent node' }
          },
          m: {
            elementId: '2',
            properties: { name: 'Child', description: 'Child node' }
          },
          r: { type: 'HAS_CHILD' }
        }
      ];

      const result = transformer.transform(rows);
      expect(result.data).toHaveLength(2);

      const parent = result.data.find(item => item.name === 'Parent');
      const child = result.data.find(item => item.name === 'Child');

      expect(parent?.parent).toBe('');
      expect(child?.parent).toBe('Parent');
    });

    it('should sort output by parent then name (expanded example)', () => {
      const rows = [
        // RootA -> Alpha, Beta
        {
          n: { elementId: '1', properties: { name: 'RootA', description: 'RA' } },
          m: { elementId: '2', properties: { name: 'Alpha', description: 'A' } },
          r: { type: 'HAS_CHILD' }
        },
        {
          n: { elementId: '1', properties: { name: 'RootA', description: 'RA' } },
          m: { elementId: '3', properties: { name: 'Beta', description: 'B' } },
          r: { type: 'HAS_CHILD' }
        },

        // RootB -> Apple, Gamma
        {
          n: { elementId: '4', properties: { name: 'RootB', description: 'RB' } },
          m: { elementId: '5', properties: { name: 'Apple', description: 'Ap' } },
          r: { type: 'HAS_CHILD' }
        },
        {
          n: { elementId: '4', properties: { name: 'RootB', description: 'RB' } },
          m: { elementId: '8', properties: { name: 'Gamma', description: 'G' } },
          r: { type: 'HAS_CHILD' }
        },
      ];

      const result = transformer.transform(rows);
      const names = result.data.map(item => item.name);

      expect(names).toEqual([
        'RootA',
        'RootB',
        'Alpha',   // RootA child
        'Beta',    // RootA child
        'Apple',   // RootB child
        'Gamma',   // RootB child
      ]);
    });
  });
});
