/**
 * ثوابت ونصوص ورسائل وقوالب بوت تليجرام التنفيذي للمدير العام
 * GoldenERP Executive VIP Telegram Assistant
 */

export interface CompanyBadgeInfo {
  code: 'A' | 'B' | 'C' | 'D';
  letterArabic: 'أ' | 'ب' | 'ج' | 'د';
  name: string;
  shortName: string;
  fullTitle: string;
  emoji: string;
}

/**
 * دالة استخراج وتحديد الشركة بدقة من بين الشركات الأربعة (أ، ب، ج، د)
 */
export function getCompanyBadge(operationCode?: string, explicitName?: string): CompanyBadgeInfo {
  const code = (operationCode || '').trim().toUpperCase();
  const name = (explicitName || '').trim();

  if (code.startsWith('A') || name.includes('الذهبية') || name.includes('جولدن')) {
    return {
      code: 'A',
      letterArabic: 'أ',
      name: 'المجموعة الذهبية للتوريدات والمقاولات',
      shortName: 'جولدن',
      fullTitle: 'الشركة (أ) — المجموعة الذهبية للتوريدات والمقاولات (جولدن)',
      emoji: '🥇',
    };
  }

  if (code.startsWith('B') || name.includes('العالمية') || name.includes('إكسلنت') || name.includes('اكستلنت')) {
    return {
      code: 'B',
      letterArabic: 'ب',
      name: 'العالمية للتوريدات والتجارة العمومية',
      shortName: 'إكسلنت',
      fullTitle: 'الشركة (ب) — العالمية للتوريدات والتجارة العمومية (إكسلنت)',
      emoji: '🥈',
    };
  }

  if (code.startsWith('C') || name.includes('المتحدة') || name.includes('العهد')) {
    return {
      code: 'C',
      letterArabic: 'ج',
      name: 'المتحدة للمقاولات العامة والتجارة',
      shortName: 'العهد',
      fullTitle: 'الشركة (ج) — المتحدة للمقاولات العامة والتجارة (العهد)',
      emoji: '🥉',
    };
  }

  if (code.startsWith('D') || name.includes('الحديثة')) {
    return {
      code: 'D',
      letterArabic: 'د',
      name: 'الحديثة للتجارة العامة والتوريدات',
      shortName: 'الحديثة',
      fullTitle: 'الشركة (د) — الحديثة للتجارة العامة والتوريدات (الحديثة)',
      emoji: '🎖️',
    };
  }

  // الافتراضي في حال عدم وجود كود واضح
  return {
    code: 'A',
    letterArabic: 'أ',
    name: 'المجموعة الذهبية للتوريدات والمقاولات',
    shortName: 'جولدن',
    fullTitle: 'الشركة (أ) — المجموعة الذهبية للتوريدات والمقاولات (جولدن)',
    emoji: '🥇',
  };
}

export const TELEGRAM_MESSAGES = {
  // ترويسة الرسائل الرسمية
  HEADER_LINE: '━━━━━━━━━━━━━━━━━━━━━━',
  
  // رسالة الترحيب والربط الرسمي
  WELCOME_BOSS: (bossName: string, chatId: number | string) => `
🏛️ <b>منظومة GoldenERP — المكتب الرقمي للسيد المدير العام</b>
━━━━━━━━━━━━━━━━━━━━━━
أهلاً بحضرتك يا فندم <b>${bossName}</b> 🌟

تم تفعيل وربط حسابك بنجاح كـ <b>المدير العام الوحيد والمعتمد</b> لاستقبال الإشعارات وإصدار قرارات الاعتماد والطباعة.

🔐 <b>معرف الحساب المشفر (Chat ID):</b>
<code>${chatId}</code>

📌 <b>الخدمات المتاحة لحضرتك عبر البوت:</b>
• 📄 <b>اعتماد ورفض طلبات الطباعة</b> الحساسة بلحظتها وتوليد الهاش الأمني (SHA-256) مع توضيح الشركة التابعة (أ، ب، ج، د).
• 👁️ <b>معاينة ملفات الـ PDF الأصلية</b> للمظاريف الفنية والمالية والعقود قبل التوقيع.
• 📅 <b>متابعة جدول جلسات ومواعيد اليوم</b> لكافة العمليات الحكومية.
• 📊 <b>تقارير استعلامية سريعة</b> عن أداء الشركات ونسب الترسية.

الأوامر السريعة المتاحة لحضرتك:
/pending — عرض طلبات الاعتماد العالقة (موضحاً بها الشركة)
/today — جدول جلسات ومواعيد اليوم
/stats — ملخص الأداء المالي ونسب الترسية
/help — دليل استخدام المساعد التنفيذي
━━━━━━━━━━━━━━━━━━━━━━
<i>المنظومة في خدمتك على مدار الساعة بنظام أمني مشفر.</i>
`.trim(),

  // رسالة الرفض لأي شخص غير مصرح له
  UNAUTHORIZED_ACCESS: `
⛔ <b>عذراً، الوصول محظور تماماً!</b>
━━━━━━━━━━━━━━━━━━━━━━
هذا البوت مشفر ومخصص <b>حصرياً للسيد المدير العام</b> لمنظومة GoldenERP لإدارة المناقصات والعقود الحكومية.

⚠️ تم تسجيل هذه المحاولة وعنوان الحساب في سجل الرقابة والأمان (Audit Log).
`.trim(),

  // قالب رسالة طلب اعتماد الطباعة موضحاً فيه الشركة بدقة متناهية
  PRINT_APPROVAL_REQUEST: (params: {
    id: string;
    documentTitle: string;
    companyBadge: CompanyBadgeInfo;
    authority: string;
    operationCode: string;
    operationName: string;
    requestedBy: string;
    requestedAt: string;
    notes?: string;
  }) => `
🚨 <b>طلب اعتماد طباعة وتوليد هاش رسمي</b> 🚨
━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>الشركة التابعة:</b>
${params.companyBadge.emoji} <b>${params.companyBadge.fullTitle}</b>
──────────────────────
🏛️ <b>الجهة الطارحة:</b> ${params.authority}
🏷️ <b>كود العملية:</b> <code>[${params.operationCode}]</code> — ${params.operationName}
📄 <b>المستند المطلوب:</b> <b>${params.documentTitle}</b>
👤 <b>مقدم الطلب:</b> ${params.requestedBy}
⏰ <b>تاريخ ووقت الطلب:</b> ${params.requestedAt}
${params.notes ? `📝 <b>ملاحظات الموظف:</b> ${params.notes}\n` : ''}━━━━━━━━━━━━━━━━━━━━━━
💡 <i>يرجى اتخاذ القرار: اعتماد وتوليد الهاش الأمني أو رفض الطلب ⬇️</i>
`.trim(),

  // رسالة تأكيد الاعتماد
  APPROVAL_CONFIRMED: (params: {
    documentTitle: string;
    operationCode: string;
    companyTitle: string;
    securityHash: string;
    approvedAt: string;
  }) => `
✅ <b>تم الاعتماد الرسمي بنجاح من المدير العام</b>
━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>الشركة:</b> ${params.companyTitle}
📄 <b>المستند:</b> ${params.documentTitle}
🏷️ <b>العملية:</b> [${params.operationCode}]
🔐 <b>كود الهاش الأمني المعتمد (SHA-256):</b>
<code>${params.securityHash}</code>
⏰ <b>توقيت الاعتماد:</b> ${params.approvedAt}
━━━━━━━━━━━━━━━━━━━━━━
🚀 <i>تم فتح صلاحية الطباعة فوراً على شاشة الموظف في GoldenERP مع الختم الرقمي.</i>
`.trim(),

  // رسالة رفض الطلب
  REJECTION_CONFIRMED: (params: {
    documentTitle: string;
    operationCode: string;
    companyTitle: string;
    reason: string;
    rejectedAt: string;
  }) => `
❌ <b>تم رفض طلب الطباعة بواسطة المدير العام</b>
━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>الشركة:</b> ${params.companyTitle}
📄 <b>المستند:</b> ${params.documentTitle}
🏷️ <b>العملية:</b> [${params.operationCode}]
⚠️ <b>سبب الرفض:</b> ${params.reason}
⏰ <b>توقيت الرفض:</b> ${params.rejectedAt}
━━━━━━━━━━━━━━━━━━━━━━
🔒 <i>تم حظر الطباعة في المنظومة وإبلاغ الموظف بسبب الرفض للتعديل.</i>
`.trim(),

  // تنبيه جلسة مناقصة
  SESSION_ALERT: (params: {
    companyBadge: CompanyBadgeInfo;
    operationCode: string;
    operationName: string;
    authority: string;
    sessionType: string;
    sessionDate: string;
    location?: string;
  }) => `
📅 <b>تذكير بموعد جلسة مناقصة رسمية</b>
━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>الشركة المتقدمة:</b>
${params.companyBadge.emoji} <b>${params.companyBadge.fullTitle}</b>
🏛️ <b>الجهة الحكومية:</b> ${params.authority}
🏷️ <b>العملية:</b> [${params.operationCode}] ${params.operationName}
⚖️ <b>نوع الجلسة:</b> <b>${params.sessionType}</b>
⏰ <b>موعد الجلسة:</b> <b>${params.sessionDate}</b>
${params.location ? `📍 <b>المقر:</b> ${params.location}\n` : ''}━━━━━━━━━━━━━━━━━━━━━━
📋 <i>يرجى التأكد من تسليم المندوب المظاريف والتفويضات الرسمية المعتمدة.</i>
`.trim(),
};
