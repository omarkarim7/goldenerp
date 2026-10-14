import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        allowedCompanies: true,
        displayPassword: true,
        isActive: true,
        isLocked: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        allowedCompanies: true,
        displayPassword: true,
        isActive: true,
        isLocked: true,
        lastLogin: true,
        createdAt: true,
        permissions: {
          select: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    return {
      ...user,
      permissions: user.permissions.map((p) => p.permission),
    };
  }

  async create(dto: CreateUserDto) {
    // Check unique constraints
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }],
      },
    });

    if (existing) {
      throw new ConflictException('اسم المستخدم أو الإيميل مستخدم بالفعل');
    }

    const hashedPassword = await this.authService.hashPassword(dto.password);

    return this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        displayPassword: dto.password,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
        allowedCompanies: dto.allowedCompanies || (dto.role === 'GENERAL_MANAGER' ? 'ALL' : 'A'),
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        allowedCompanies: true,
        displayPassword: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id); // ensure exists

    const isGeneralManager = user.role === 'GENERAL_MANAGER' || user.username === 'admin';

    // حماية حساب المدير العام
    if (isGeneralManager) {
      if (dto.password && dto.password.trim().length > 0) {
        throw new BadRequestException('كلمة مرور حساب المدير العام ثابتة ومحمية من التغيير لضمان عدم فقدان الحساب أو نسيانه');
      }
      if (dto.role && dto.role !== 'GENERAL_MANAGER') {
        throw new BadRequestException('لا يمكن تغيير رتبة حساب المدير العام');
      }
    }

    const data: Record<string, unknown> = { ...dto };

    if (dto.password && dto.password.trim().length > 0) {
      const cleanPassword = dto.password.trim();
      data.password = await this.authService.hashPassword(cleanPassword);
      data.displayPassword = cleanPassword;
    } else {
      delete data.password;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        allowedCompanies: true,
        displayPassword: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string) {
    const user = await this.findOne(id);

    // حماية حساب المدير العام من الحذف
    if (user.role === 'GENERAL_MANAGER' || user.username === 'admin') {
      throw new BadRequestException('حساب المدير العام محمي ومحصّن ضد الحذف نهائياً لضمان استقرار النظام');
    }

    return this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        username: true,
        fullName: true,
      },
    });
  }

  async unlock(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isLocked: false, failedAttempts: 0 },
    });
  }

  async toggleActive(id: string) {
    const user = await this.findOne(id);

    if (user.role === 'GENERAL_MANAGER' || user.username === 'admin') {
      throw new BadRequestException('لا يمكن تعطيل حساب المدير العام الرئيسي');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
  }
}
