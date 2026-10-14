import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreatePurchaseDto {
  @IsString() @IsOptional() operationId?: string;
  @IsString() @IsNotEmpty({ message: 'المورد مطلوب' }) supplierId: string;
  @IsNumber() totalAmount: number;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() notes?: string;
}
