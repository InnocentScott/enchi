import { Type } from 'class-transformer';
import { IsArray, IsUUID, ValidateNested, ArrayNotEmpty } from 'class-validator';

class AnswerDto {
  @IsUUID()
  questionId!: string;

  @IsUUID()
  optionId!: string;
}

export class SubmitQuizDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
