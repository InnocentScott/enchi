import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQPublisher } from '../events/rabbitmq.publisher';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { scoreQuiz, QuestionForScoring } from './scoring';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: RabbitMQPublisher,
  ) {}

  // Trả quiz cho client — KHÔNG lộ option nào đúng (isCorrect bị loại khỏi select).
  getQuizzesForLesson(lessonId: string) {
    return this.prisma.quiz.findMany({
      where: { lessonId },
      select: {
        id: true,
        title: true,
        questions: {
          select: {
            id: true,
            type: true,
            prompt: true,
            options: { select: { id: true, text: true } },
          },
        },
      },
    });
  }

  async submit(quizId: string, userId: string, dto: SubmitQuizDto) {
    const quiz = await this.prisma.quiz.findUniqueOrThrow({
      where: { id: quizId },
      include: { questions: { include: { options: true } } },
    });

    const questions: QuestionForScoring[] = quiz.questions.map((q) => ({
      id: q.id,
      vocabId: q.vocabId,
      correctOptionId: q.options.find((o) => o.isCorrect)?.id ?? null,
    }));

    const result = scoreQuiz(questions, dto.answers);

    // Lưu submission TRƯỚC, publish event SAU khi đã commit DB (tránh event "ma").
    const submission = await this.prisma.quizSubmission.create({
      data: {
        userId,
        quizId,
        lessonId: quiz.lessonId,
        score: result.score,
        total: result.total,
      },
    });

    await this.publisher.publish('quiz.completed', {
      eventId: randomUUID(),
      submissionId: submission.id,
      userId,
      quizId,
      lessonId: quiz.lessonId,
      score: result.score,
      total: result.total,
      results: result.results,
      occurredAt: new Date().toISOString(),
    });
    this.logger.log(`quiz_completed published submission=${submission.id} user=${userId}`);

    return {
      submissionId: submission.id,
      score: result.score,
      total: result.total,
      results: result.results,
    };
  }
}
