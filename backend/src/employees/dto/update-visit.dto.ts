import { PartialType } from '@nestjs/mapped-types';
import { CreateVisitDto } from './create-visit.dto.js';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateVisitDto extends PartialType(CreateVisitDto) {
  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;
}
