import { AppService } from '../src/AppService';

describe('AppService', () => {
  let appService: AppService;

  beforeEach(() => {
    appService = new AppService();

    // Zamockuj sesję
    (appService as any).session = {
      run: jest.fn().mockResolvedValue({
        records: [
          {
            toObject: () => ({
              n: {
                elementId: '1',
                properties: { name: 'Parent', description: 'Parent node' }
              },
              m: {
                elementId: '2',
                properties: { name: 'Child', description: 'Child node' }
              },
              r: { type: 'HAS_CHILD' }
            })
          }
        ]
      })
    };
  });

  it('should return transformed data as JSON string', async () => {
    const result = await appService.getAll();
    expect(typeof result).toBe('string');
    expect(result).toContain('Parent');
    expect(result).toContain('Child');
  });

  it('should handle errors gracefully', async () => {
    (appService as any).session.run = jest.fn().mockRejectedValue(new Error('Neo4j error'));

    const result = await appService.getAll();
    expect(result).toBeUndefined();
  });
});
