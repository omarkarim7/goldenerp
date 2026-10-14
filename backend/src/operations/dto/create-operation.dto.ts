import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsNumber,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TenderType, OperationDateType } from '@prisma/client';

export class OperationDateInput {
  @IsEnum(OperationDateType)
  dateType: OperationDateType;

  @IsString()
  @IsNotEmpty()
  dateValue: string; // ISO date string

  @IsString()
  @IsOptional()
  label?: string;
}

export class CreateOperationDto {
  // ━━━ الحقول الأساسية لجدول العمليات ━━━
  @IsString()
  @IsNotEmpty({ message: 'اسم العملية مطلوب' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'اسم الجهة مطلوب' })
  authority: string;

  @IsString()
  @IsOptional()
  externalNumber?: string;

  @IsString()
  @IsOptional()
  governorate?: string;

  @IsEnum(TenderType, { message: 'نوع الطرح غير صحيح' })
  tenderType: TenderType;

  @IsArray()
  @ArrayMinSize(1, { message: 'لازم تختار شركة واحدة على الأقل' })
  @IsString({ each: true })
  companyIds: string[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OperationDateInput)
  dates?: OperationDateInput[];

  @IsString()
  @IsOptional()
  notes?: string;

  // ━━━ تفاصيل بوابة التعاقدات والبيانات الموسعة ━━━
  @IsString()
  @IsOptional()
  titleEn?: string;

  @IsString()
  @IsOptional()
  tenderMethod?: string;

  @IsString()
  @IsOptional()
  tenderKind?: string;

  @IsString()
  @IsOptional()
  biddingType?: string;

  @IsString()
  @IsOptional()
  tenderNature?: string;

  @IsString()
  @IsOptional()
  evaluationType?: string;

  @IsString()
  @IsOptional()
  activities?: string;

  @IsBoolean()
  @IsOptional()
  allowAlternativeOffers?: boolean;

  @IsBoolean()
  @IsOptional()
  allowInquiries?: boolean;

  @IsNumber()
  @IsOptional()
  temporaryInsurance?: number;

  @IsNumber()
  @IsOptional()
  bookletPrice?: number;

  @IsNumber()
  @IsOptional()
  finalInsuranceRate?: number;

  @IsString()
  @IsOptional()
  warrantyStatement?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  divisible?: string;

  @IsBoolean()
  @IsOptional()
  allowMultipleTempInsurance?: boolean;

  @IsBoolean()
  @IsOptional()
  allowDownPayment?: boolean;

  @IsString()
  @IsOptional()
  downPayment?: string;

  @IsString()
  @IsOptional()
  fiscalYear?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsOptional()
  publishingDays?: any;

  @IsString()
  @IsOptional()
  deliveryDuration?: string;

  @IsString()
  @IsOptional()
  conditions?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  portalDetails?: Record<string, any>;
}
