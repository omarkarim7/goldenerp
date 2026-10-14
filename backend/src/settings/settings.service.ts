import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export const DEFAULT_SYSTEM_SETTINGS = [
  // 1. الإعدادات العامة
  { key: 'system_name', value: 'منظومة التعاقدات والمناقصات الحكومية المركزية (GoldenERP)', type: 'string', label: 'اسم المنظومة الرسمي', group: 'general' },
  { key: 'default_currency', value: 'الجنيه المصري (EGP)', type: 'string', label: 'العملة الرسمية المعتمدة بالمنظومة', group: 'general' },
  { key: 'fiscal_year_start', value: '07-01', type: 'string', label: 'تاريخ بداية السنة المالية (شهر-يوم)', group: 'general' },

  // 2. الضرائب والرسوم المالية
  { key: 'vat_rate', value: '14', type: 'number', label: 'نسبة ضريبة القيمة المضافة (%)', group: 'tax' },
  { key: 'tax_deduction_rate', value: '1', type: 'number', label: 'نسبة الخصم والتحصيل من المنبع (أ.ت.ص %)', group: 'tax' },
  { key: 'performance_bond_rate', value: '5', type: 'number', label: 'نسبة ضمان الأعمال المحتجزة من المستخلصات (%)', group: 'tax' },

  // 3. خطابات الضمان والتأمينات البنكية
  { key: 'initial_guarantee_rate', value: '2', type: 'number', label: 'نسبة التأمين الابتدائي لدخول المناقصات (%)', group: 'guarantees' },
  { key: 'initial_guarantee_duration', value: '90', type: 'number', label: 'المدة القياسية لسريان خطاب الضمان الابتدائي (يوم)', group: 'guarantees' },
  { key: 'final_guarantee_rate', value: '5', type: 'number', label: 'نسبة التأمين النهائي وحسن التنفيذ عند الترسية (%)', group: 'guarantees' },
  { key: 'insurance_recovery_days', value: '60', type: 'number', label: 'المدة النظامية لاسترداد التأمين بعد الاستلام الابتدائي (يوم)', group: 'guarantees' },

  // 4. التنبيهات والإشعارات الذكية
  { key: 'guarantee_reminder_days', value: '30,15,10,5', type: 'string', label: 'أيام التنبيه الاستباقي قبل انتهاء خطاب الضمان (مفصولة بفواصل)', group: 'notifications' },
  { key: 'deadline_reminder_hours', value: '48,24', type: 'string', label: 'ساعات التنبيه الاستباقي قبل موعد فتح المظاريف', group: 'notifications' },
  { key: 'system_notifications_enabled', value: 'true', type: 'boolean', label: 'تفعيل نظام التنبيهات والإشعارات الفورية بالمنظومة', group: 'notifications' },

  // 5. رادار المناقصات والربط الذكي
  { key: 'radar.daily_scan_enabled', value: 'true', type: 'boolean', label: 'تفعيل الفحص اليومي التلقائي لرادار المناقصات', group: 'radar' },
  { key: 'radar.daily_scan_time', value: '09:00 ص', type: 'string', label: 'التوقيت اليومي المجدول للفحص التلقائي', group: 'radar' },
  { key: 'radar.incremental_mode', value: 'true', type: 'boolean', label: 'نظام الفحص التراكمي الذكي (تجاهل المناقصات المسحوبة مسبقاً)', group: 'radar' },

  // 6. المدد القانونية والتظلمات الرسمية
  { key: 'grievance_authority_days', value: '7', type: 'number', label: 'مهلة التظلم للسلطة المختصة بالجهة الإدارية (أيام)', group: 'legal' },
  { key: 'grievance_tribunal_days', value: '15', type: 'number', label: 'مهلة التقدم للجنة ترجيح التظلمات بالهيئة (أيام)', group: 'legal' },

  // 7. الأمان والسرية وسجلات العمليات
  { key: 'account_lock_attempts', value: '3', type: 'number', label: 'الحد الأقصى لمحاولات تسجيل الدخول الخاطئة قبل القفل المؤقت', group: 'security' },
  { key: 'session_timeout_minutes', value: '120', type: 'number', label: 'مهلة انتهاء الجلسة التلقائية عند الخمول (بالدقائق)', group: 'security' },
  { key: 'records_retention_years', value: '5', type: 'number', label: 'الحد الأدنى لحفظ وأرشفة سجلات العمليات (سنوات)', group: 'security' },
  { key: 'after_hours_start', value: '20', type: 'number', label: 'بداية ساعات الحظر المسائي (بتوقيت 24 ساعة)', group: 'security' },
  { key: 'after_hours_end', value: '6', type: 'number', label: 'نهاية ساعات الحظر الصباحي (بتوقيت 24 ساعة)', group: 'security' },
];

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaults();
  }

  async ensureDefaults() {
    for (const def of DEFAULT_SYSTEM_SETTINGS) {
      const existing = await this.prisma.systemSetting.findUnique({ where: { key: def.key } });
      if (!existing) {
        await this.prisma.systemSetting.create({
          data: def,
        });
      } else if (!existing.label || !existing.group) {
        await this.prisma.systemSetting.update({
          where: { key: def.key },
          data: {
            label: existing.label || def.label,
            group: existing.group || def.group,
            type: existing.type || def.type,
          },
        });
      }
    }
  }

  async findAll(group?: string) {
    await this.ensureDefaults();
    const where = group ? { group } : {};
    return this.prisma.systemSetting.findMany({ where, orderBy: { key: 'asc' } });
  }

  async get(key: string): Promise<string> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`الإعداد "${key}" غير موجود`);
    return setting.value;
  }

  async getNumber(key: string): Promise<number> {
    const value = await this.get(key);
    return Number(value);
  }

  async set(key: string, value: string, meta?: { label?: string; group?: string; type?: string }) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: {
        value: String(value),
        ...(meta?.label ? { label: meta.label } : {}),
        ...(meta?.group ? { group: meta.group } : {}),
        ...(meta?.type ? { type: meta.type } : {}),
      },
      create: {
        key,
        value: String(value),
        label: meta?.label || null,
        group: meta?.group || 'general',
        type: meta?.type || 'string',
      },
    });
  }

  async updateMany(settings: { key: string; value: string; label?: string; group?: string; type?: string }[]) {
    const results = await Promise.all(
      settings.map((s) => this.set(s.key, s.value, { label: s.label, group: s.group, type: s.type })),
    );
    return results;
  }
}
