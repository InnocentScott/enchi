import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { CoursesController } from './courses/courses.controller';

@Module({
  imports: [
    // TODO (Phase 2): PrismaModule, CoursesModule, LessonsModule, QuizModule, RabbitMQ publisher
  ],
  controllers: [HealthController, CoursesController],
})
export class AppModule {}
