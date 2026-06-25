import { Controller, Get, Param } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller()
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get('courses')
  listCourses() {
    return this.courses.listCourses();
  }

  @Get('courses/:id')
  getCourse(@Param('id') id: string) {
    return this.courses.getCourse(id);
  }

  @Get('lessons/:id')
  getLesson(@Param('id') id: string) {
    return this.courses.getLesson(id);
  }
}
