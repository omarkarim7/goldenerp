import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class AddPaymentDto {
  @IsNumber() amount: number;
  @IsString() @IsNotEmpty() paymentDate: string;
  @IsString() @IsOptional() paymentMethod?: string;
  @IsString() @IsOptional() receiptPath?: string;
  @IsString() @IsOptional() notes?: string;
}
