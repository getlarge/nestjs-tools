import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ExampleController } from './app.controller.mock';
import { ExampleService } from './app.service.mock';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
    }),
  ],
  providers: [ExampleService],
  controllers: [ExampleController],
})
export class AppModule {}
