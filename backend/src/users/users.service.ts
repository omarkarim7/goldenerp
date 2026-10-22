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

  // =========================================================================
  // نظام الصلاحيات الموسع والتخصيص
  // =========================================================================

  private static readonly SYSTEM_PERMISSIONS = [
    // Radar
    { code: 'radar.scan', name: 'سحب وفحص الرادار', module: 'radar', description: 'البحث وسحب المناقصات من بوابة المشتريات' },
    { code: 'radar.analyze', name: 'التحليل الذكي لكراسات الشروط', module: 'radar', description: 'تحليل المتطلبات الفنية والبنود باستخدام الذكاء الاصطناعي' },
    { code: 'radar.export', name: 'تصدير فرص الرادار', module: 'radar', description: 'تصدير المناقصات والفرص' },

    // Operations
    { code: 'operation.create', name: 'إنشاء عملية ومناقصة جديدة', module: 'operations', description: 'إضافة عمليات ومناقصات جديدة للنظام' },
    { code: 'operation.data_entry', name: 'إدخال وحفظ بيانات المراحل', module: 'operations', description: 'إدخال بيانات مراحل مسار العملية وحفظ المسودات' },
    { code: 'operation.stage_approve', name: 'اعتماد وقفل المراحل', module: 'operations', description: 'مراجعة واعتماد المراحل للموظفين وقفلها' },
    { code: 'operation.edit', name: 'تعديل العمليات', module: 'operations', description: 'تعديل البيانات الأساسية للعملية' },
    { code: 'operation.view', name: 'عرض العمليات', module: 'operations', description: 'استعراض العمليات وتفاصيلها' },
    { code: 'operation.delete', name: 'حذف العمليات', module: 'operations', description: 'حذف أو أرشفة العمليات' },

    // Approvals & Print
    { code: 'approval.request', name: 'تقديم طلبات اعتماد الطباعة', module: 'approvals', description: 'إرسال طلبات اعتماد طباعة الخطابات للإدارة' },
    { code: 'approval.approve', name: 'اعتماد الطباعة وتوليد الهاش', module: 'approvals', description: 'الموافقة على طباعة المستندات وتوليد رمز الحوكمة 32 خانة' },
    { code: 'approval.instant', name: 'إصدار أمر طباعة معتمد فوري', module: 'approvals', description: 'إصدار أوامر طباعة فورية للمدير العام' },
    { code: 'document.print', name: 'طباعة المستندات المعتمدة', module: 'documents', description: 'طباعة الخطابات والقوالب التي تم اعتمادها' },
    { code: 'document.view', name: 'معاينة المستندات', module: 'documents', description: 'معاينة القوالب والمستندات الرسمية' },

    // Finance & Guarantees
    { code: 'finance.entry', name: 'إدخال الدفعات والمصروفات', module: 'finance', description: 'تسجيل الدفعات والمستخلصات والمصروفات' },
    { code: 'finance.approve', name: 'اعتماد الميزانيات وتدقيق النفقات', module: 'finance', description: 'اعتماد الموازنات وتدقيق النفقات' },
    { code: 'finance.view', name: 'عرض البيانات المالية', module: 'finance', description: 'استعراض التدفقات النقدية والمصروفات' },
    { code: 'finance.export', name: 'تصدير التقارير المالية', module: 'reports', description: 'تصدير كشوف الحسابات بصيغة CSV' },
    { code: 'guarantee.manage', name: 'إدارة خطابات الضمان', module: 'guarantees', description: 'إصدار ومتابعة وتجديد واسترداد الضمانات الابتدائية والنهائية' },

    // Visits
    { code: 'visit.create', name: 'تسجيل زيارات المعاينات', module: 'visits', description: 'إدخال تقارير معاينات المواقع الميدانية' },
    { code: 'visit.view', name: 'عرض تقارير المعاينات', module: 'visits', description: 'الاطلاع على تقارير المعاينات الميدانية' },

    // Users & System Administration
    { code: 'user.manage', name: 'إدارة وتعديل المستخدمين', module: 'users', description: 'إنشاء وتعديل وإلغاء قفل حسابات الموظفين' },
    { code: 'permission.assign', name: 'تخصيص وتعديل الصلاحيات', module: 'users', description: 'تحديد صلاحيات دقيقة لكل مستخدم' },
    { code: 'audit.view', name: 'عرض سجل التدقيق والرقابة', module: 'audit', description: 'متابعة سجل حركات النظام والأمان والحوكمة' },
    { code: 'settings.manage', name: 'إدارة إعدادات المنظومة', module: 'settings', description: 'تعديل بيانات الشركات والإعدادات العامة' },
  ];

  async getAllPermissions() {
    // Ensure all defined permissions exist in DB
    for (const p of UsersService.SYSTEM_PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { code: p.code },
        update: { name: p.name, module: p.module, description: p.description },
        create: p,
      });
    }

    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!user) throw new NotFoundException('المستخدم غير موجود');

    // General Manager has ALL permissions implicitly
    if (user.role === 'GENERAL_MANAGER' || user.username === 'admin') {
      const all = await this.getAllPermissions();
      return all.map((p) => p.code);
    }

    // Default permissions for DEPUTY_MANAGER if none explicitly set yet
    if (user.role === 'DEPUTY_MANAGER' && user.permissions.length === 0) {
      return [
        'radar.scan', 'radar.analyze', 'radar.export',
        'operation.create', 'operation.data_entry', 'operation.stage_approve', 'operation.edit', 'operation.view',
        'approval.request', 'approval.approve', 'document.print', 'document.view',
        'finance.entry', 'finance.approve', 'finance.view', 'finance.export', 'guarantee.manage',
        'visit.create', 'visit.view',
        'audit.view',
      ];
    }

    // Default permissions for EMPLOYEE if none explicitly set yet
    if (user.role === 'EMPLOYEE' && user.permissions.length === 0) {
      return [
        'operation.data_entry', 'operation.view',
        'approval.request', 'document.view',
        'finance.entry', 'finance.view',
        'visit.create', 'visit.view',
      ];
    }

    return user.permissions.map((up) => up.permission.code);
  }

  async updateUserPermissions(userId: string, permissionCodes: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    if (user.role === 'GENERAL_MANAGER' || user.username === 'admin') {
      throw new BadRequestException('المدير العام يمتلك كافة صلاحيات المنظومة تلقائياً وبشكل كامل');
    }

    // Find all valid permission records in DB
    await this.getAllPermissions(); // Ensure all exist
    const validPerms = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    // Delete existing user permissions
    await this.prisma.userPermission.deleteMany({
      where: { userId },
    });

    // Insert updated permissions
    if (validPerms.length > 0) {
      await this.prisma.userPermission.createMany({
        data: validPerms.map((p) => ({
          userId,
          permissionId: p.id,
        })),
      });
    }

    return {
      success: true,
      userId,
      count: validPerms.length,
      assignedPermissions: validPerms.map((p) => p.code),
    };
  }
}
