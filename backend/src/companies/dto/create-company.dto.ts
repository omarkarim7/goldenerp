import { IsString, IsNotEmpty, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty({ message: 'اسم الشركة مطلوب' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'كود الشركة مطلوب' })
  @MaxLength(5, { message: 'الكود يجب ألا يتجاوز 5 أحرف' })
  code: string;

  @IsString() @IsOptional()
  commercialRegister?: string;

  @IsString() @IsOptional()
  taxCard?: string;

  @IsString() @IsOptional()
  license?: string;

  @IsString() @IsOptional()
  address?: string;

  @IsEmail({}, { message: 'الإيميل غير صحيح' })
  @IsOptional()
  email?: string;

  @IsString() @IsOptional()
  fax?: string;

  @IsString() @IsOptional()
  logoPath?: string;

  @IsString() @IsOptional()
  bankName?: string;

  @IsString() @IsOptional()
  bankBranch?: string;

  @IsString() @IsOptional()
  bankAccountNumber?: string;
}
