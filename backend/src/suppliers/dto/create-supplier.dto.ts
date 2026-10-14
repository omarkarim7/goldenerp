import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSupplierDto {
  @IsString() @IsNotEmpty({ message: 'اسم المورد مطلوب' }) name: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() telegram?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() notes?: string;
}
