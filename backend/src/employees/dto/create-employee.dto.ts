import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateEmployeeDto {
  @IsString() @IsNotEmpty({ message: 'اسم الموظف مطلوب' }) name: string;
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() department?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() telegram?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}
