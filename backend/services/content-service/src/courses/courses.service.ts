import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  listCourses() {
    return this.prisma.course.findMany({
      select: { id: true, title: true, language: true, level: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // findUniqueOrThrow -> P2025 nếu không tồn tại -> filter map sang 404.
  getCourse(id: string) {
    return this.prisma.course.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        title: true,
        language: true,
        level: true,
        lessons: {
          orderBy: { order: 'asc' },
          select: { id: true, title: true, order: true },
        },
      },
    });
  }

  getLesson(id: string) {
    return this.prisma.lesson.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        title: true,
        order: true,
        vocabulary: {
          select: { id: true, term: true, reading: true, meaning: true, exampleText: true },
        },
        quizzes: { select: { id: true, title: true } },
      },
    });
  }
}
