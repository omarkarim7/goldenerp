import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApprovalType, ApprovalStatus } from '@prisma/client';

export class CreateApprovalDto {
  @IsEnum(ApprovalType)
  type: ApprovalType;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  requestedBy?: string;

  @IsString()
  @IsNotEmpty()
  documentTitle: string;

  @IsString()
  @IsOptional()
  operationCode?: string;

  @IsString()
  @IsOptional()
  operationName?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(ApprovalStatus)
  @IsOptional()
  status?: ApprovalStatus;
}

export class UpdateApprovalDto {
  @IsEnum(ApprovalType)
  @IsOptional()
  type?: ApprovalType;

  @IsString()
  @IsOptional()
  documentTitle?: string;

  @IsString()
  @IsOptional()
  operationCode?: string;

  @IsString()
  @IsOptional()
  operationName?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ApprovalActionDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
