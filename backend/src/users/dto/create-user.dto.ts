import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'اسم المستخدم مطلوب' })
  username: string;

  @IsEmail({}, { message: 'الإيميل غير صحيح' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'الاسم الكامل مطلوب' })
  fullName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(UserRole, { message: 'الدور غير صحيح' })
  role: UserRole;

  @IsString()
  @IsOptional()
  allowedCompanies?: string; // "ALL" or comma separated e.g. "A,B"
}
