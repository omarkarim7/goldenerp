import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { GuaranteeType, GuaranteePaymentMethod } from '@prisma/client';

export class CreateGuaranteeDto {
  @IsString() @IsNotEmpty() operationId: string;
  @IsString() @IsNotEmpty() companyId: string;
  @IsEnum(GuaranteeType) type: GuaranteeType;
  @IsEnum(GuaranteePaymentMethod) paymentMethod: GuaranteePaymentMethod;
  @IsNumber() amount: number;
  @IsNumber() @IsOptional() percentage?: number;
  @IsString() @IsOptional() startDate?: string;
  @IsString() @IsOptional() endDate?: string;
  @IsNumber() @IsOptional() duration?: number;
  @IsString() @IsOptional() bankName?: string;
  @IsString() @IsOptional() bankBranch?: string;
  @IsString() @IsOptional() guaranteeNumber?: string;
  @IsString() @IsOptional() receiptNumber?: string;
  @IsString() @IsOptional() treasury?: string;
  @IsString() @IsOptional() paymentDate?: string;
  @IsString() @IsOptional() notes?: string;
}
