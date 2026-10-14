import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateVisitDto {
  @IsString() @IsNotEmpty() employeeId: string;
  @IsString() @IsOptional() operationId?: string;
  @IsString() @IsNotEmpty() visitDate: string;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() purpose?: string;
  @IsNumber() @IsOptional() expenses?: number;
  @IsString() @IsOptional() notes?: string;
}
