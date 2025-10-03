import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getAll(): string {
    return 'Hello World!';
  }
}
