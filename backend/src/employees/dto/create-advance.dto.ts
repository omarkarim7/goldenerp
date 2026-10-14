import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateAdvanceDto {
  @IsNumber() amount: number;
  @IsString() @IsNotEmpty() advanceDate: string;
  @IsString() @IsOptional() reason?: string;
  @IsString() @IsOptional() notes?: string;
}
