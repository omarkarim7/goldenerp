import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt } from 'class-validator';

export class CreateProductDto {
  @IsString() @IsNotEmpty({ message: 'اسم المنتج مطلوب' }) name: string;
  @IsString() @IsOptional() sku?: string;
  @IsString() @IsNotEmpty({ message: 'الوحدة مطلوبة' }) unit: string;
  @IsString() @IsOptional() category?: string;
  @IsInt() @IsOptional() minStock?: number;
  @IsNumber() @IsOptional() buyPrice?: number;
  @IsNumber() @IsOptional() sellPrice?: number;
  @IsString() @IsOptional() notes?: string;
}
