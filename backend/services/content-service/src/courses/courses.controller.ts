import { Controller, Get, Post, Param, NotImplementedException } from '@nestjs/common';

// Stub — implement ở Phase 2 (Prisma + RabbitMQ publish quiz_completed).
@Controller()
export class CoursesController {
  @Get('courses')
  listCourses() {
    throw new NotImplementedException('GET /courses chưa được implement');
  }

  @Get('courses/:id')
  getCourse(@Param('id') _id: string) {
    throw new NotImplementedException('GET /courses/:id chưa được implement');
  }

  @Get('lessons/:id')
  getLesson(@Param('id') _id: string) {
    throw new NotImplementedException('GET /lessons/:id chưa được implement');
  }

  @Get('quizzes/:lessonId')
  getQuiz(@Param('lessonId') _lessonId: string) {
    throw new NotImplementedException('GET /quizzes/:lessonId chưa được implement');
  }

  // Sau khi chấm điểm -> publish event quiz_completed (libs/contracts).
  @Post('quizzes/:id/submit')
  submitQuiz(@Param('id') _id: string) {
    throw new NotImplementedException('POST /quizzes/:id/submit chưa được implement');
  }
}
