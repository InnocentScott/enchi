import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { UserId } from '../common/user-id.decorator';

@Controller()
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Get('quizzes/:lessonId')
  getQuizzes(@Param('lessonId') lessonId: string) {
    return this.quiz.getQuizzesForLesson(lessonId);
  }

  @Post('quizzes/:id/submit')
  submit(@Param('id') id: string, @UserId() userId: string, @Body() dto: SubmitQuizDto) {
    return this.quiz.submit(id, userId, dto);
  }
}
