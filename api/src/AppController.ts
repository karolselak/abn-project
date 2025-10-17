import { Controller, Get } from '@nestjs/common';
import { AppService } from './AppService';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getAll(): Promise<string | void> {
    return await this.appService.getAll();
  }
}
