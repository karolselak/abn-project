import { NestFactory } from '@nestjs/core';
import { AppModule } from './AppModule';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:4000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.enableCors({
    origin: 'http://20.215.225.194:4000/', // TODO move prod IP to .env
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
