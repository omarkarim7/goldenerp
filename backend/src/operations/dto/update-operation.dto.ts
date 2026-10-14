import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsObject } from 'class-validator';
import { TenderType, OperationStatus } from '@prisma/client';

export class UpdateOperationDto {
  // ━━━ الحقول الأساسية لجدول العمليات ━━━
  @IsString() @IsOptional()
  name?: string;

  @IsString() @IsOptional()
  authority?: string;

  @IsString() @IsOptional()
  externalNumber?: string;

  @IsString() @IsOptional()
  governorate?: string;

  @IsEnum(TenderType) @IsOptional()
  tenderType?: TenderType;

  @IsEnum(OperationStatus) @IsOptional()
  status?: OperationStatus;

  @IsString() @IsOptional()
  notes?: string;

  // ━━━ تفاصيل بوابة التعاقدات والبيانات القانونية والفنية والمالية ━━━
  @IsString() @IsOptional()
  titleEn?: string;

  @IsString() @IsOptional()
  tenderMethod?: string;

  @IsString() @IsOptional()
  tenderKind?: string;

  @IsString() @IsOptional()
  biddingType?: string;

  @IsString() @IsOptional()
  tenderNature?: string;

  @IsString() @IsOptional()
  evaluationType?: string;

  @IsString() @IsOptional()
  activities?: string;

  @IsBoolean() @IsOptional()
  allowAlternativeOffers?: boolean;

  @IsBoolean() @IsOptional()
  allowInquiries?: boolean;

  @IsNumber() @IsOptional()
  temporaryInsurance?: number;

  @IsNumber() @IsOptional()
  bookletPrice?: number;

  @IsNumber() @IsOptional()
  finalInsuranceRate?: number;

  @IsString() @IsOptional()
  warrantyStatement?: string;

  @IsString() @IsOptional()
  currency?: string;

  @IsString() @IsOptional()
  divisible?: string;

  @IsBoolean() @IsOptional()
  allowMultipleTempInsurance?: boolean;

  @IsBoolean() @IsOptional()
  allowDownPayment?: boolean;

  @IsString() @IsOptional()
  downPayment?: string;

  @IsString() @IsOptional()
  fiscalYear?: string;

  @IsString() @IsOptional()
  email?: string;

  @IsOptional()
  publishingDays?: any;

  @IsString() @IsOptional()
  deliveryDuration?: string;

  @IsString() @IsOptional()
  conditions?: string;

  @IsString() @IsOptional()
  description?: string;

  @IsObject() @IsOptional()
  portalDetails?: Record<string, any>;
}
