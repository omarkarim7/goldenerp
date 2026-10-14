import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { MovementType } from '@prisma/client';

export class StockMovementDto {
  @IsString() @IsNotEmpty() productId: string;
  @IsEnum(MovementType) type: MovementType;
  @IsNumber() quantity: number;
  @IsNumber() @IsOptional() unitPrice?: number;
  @IsString() @IsOptional() reference?: string;
  @IsString() @IsOptional() operationId?: string;
  @IsString() @IsOptional() notes?: string;
}
