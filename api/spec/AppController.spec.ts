import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../src/AppController';
import { AppService } from '../src/AppService';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getAll: jest.fn()
          }
        }
      ]
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
    appService = moduleRef.get<AppService>(AppService);
  });

  describe('getAll', () => {
    it('should return data from AppService', async () => {
      const mockData = JSON.stringify({
        data: [
          { name: 'Node1', description: 'Desc1', parent: '' },
          { name: 'Node2', description: 'Desc2', parent: 'Node1' }
        ]
      });

      (appService.getAll as jest.Mock).mockResolvedValue(mockData);

      const result = await appController.getAll();
      expect(result).toBe(mockData);
      expect(appService.getAll).toHaveBeenCalledTimes(1);
    });
  });
});
