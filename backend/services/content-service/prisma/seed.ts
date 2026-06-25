import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.course.findFirst({ where: { title: 'English for Beginners' } });
  if (existing) {
    console.log('seed: data already present, skipping');
    return;
  }

  const course = await prisma.course.create({
    data: { title: 'English for Beginners', language: 'en', level: 'beginner' },
  });
  const lesson = await prisma.lesson.create({
    data: { courseId: course.id, title: 'Greetings', order: 1 },
  });

  const hello = await prisma.vocabulary.create({
    data: { lessonId: lesson.id, term: 'Hello', meaning: 'Xin chào', exampleText: 'Hello, how are you?' },
  });
  const thanks = await prisma.vocabulary.create({
    data: { lessonId: lesson.id, term: 'Thank you', meaning: 'Cảm ơn', exampleText: 'Thank you very much.' },
  });
  const goodbye = await prisma.vocabulary.create({
    data: { lessonId: lesson.id, term: 'Goodbye', meaning: 'Tạm biệt', exampleText: 'Goodbye, see you tomorrow.' },
  });

  const quiz = await prisma.quiz.create({ data: { lessonId: lesson.id, title: 'Greetings Quiz' } });

  const mcq = (prompt: string, vocabId: string, correct: string, wrong: string[]) =>
    prisma.question.create({
      data: {
        quizId: quiz.id,
        type: 'MULTIPLE_CHOICE',
        prompt,
        vocabId,
        options: {
          create: [{ text: correct, isCorrect: true }, ...wrong.map((t) => ({ text: t }))],
        },
      },
    });

  await mcq('What does "Hello" mean?', hello.id, 'Xin chào', ['Tạm biệt', 'Cảm ơn']);
  await mcq('What does "Thank you" mean?', thanks.id, 'Cảm ơn', ['Xin chào', 'Tạm biệt']);
  await mcq('What does "Goodbye" mean?', goodbye.id, 'Tạm biệt', ['Xin chào', 'Cảm ơn']);

  console.log(`seed: created course=${course.id} lesson=${lesson.id} quiz=${quiz.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
