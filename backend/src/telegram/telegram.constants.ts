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
 * مع دعم مسميات الشركات المخصصة والديناميكية من قاعدة البيانات/الإعدادات
 */
export function getCompanyBadge(
  operationCode?: string,
  explicitName?: string,
  customNames?: Record<string, string>
): CompanyBadgeInfo {
  const code = (operationCode || '').trim().toUpperCase();
  const name = (explicitName || '').trim();

  const nameA = customNames?.['A'] || 'جولدن';
  const nameB = customNames?.['B'] || 'إكسلنت';
  const nameC = customNames?.['C'] || 'العهد';
  const nameD = customNames?.['D'] || 'الشركة الرابعة';

  if (code.startsWith('A') || name.includes('الذهبية') || name.includes('جولدن')) {
    return {
      code: 'A',
      letterArabic: 'أ',
      name: nameA,
      shortName: nameA,
      fullTitle: `${nameA} (A)`,
      emoji: '🥇',
    };
  }

  if (
    code.startsWith('B') ||
    name.includes('العالمية') ||
    name.includes('إكسلنت') ||
    name.includes('اكستلنت') ||
    name.includes('اكسلانت') ||
    name.includes('Exellent') ||
    name.includes('exellent')
  ) {
    return {
      code: 'B',
      letterArabic: 'ب',
      name: nameB,
      shortName: nameB,
      fullTitle: `${nameB} (B)`,
      emoji: '🥈',
    };
  }

  if (code.startsWith('C') || name.includes('المتحدة') || name.includes('العهد')) {
    return {
      code: 'C',
      letterArabic: 'ج',
      name: nameC,
      shortName: nameC,
      fullTitle: `${nameC} (C)`,
      emoji: '🥉',
    };
  }

  if (code.startsWith('D') || name.includes('الحديثة') || name.includes('الرابعة')) {
    return {
      code: 'D',
      letterArabic: 'د',
      name: nameD,
      shortName: nameD,
      fullTitle: `${nameD} (D)`,
      emoji: '🔷',
    };
  }

  // الافتراضي في حال عدم وجود كود واضح
  return {
    code: 'A',
    letterArabic: 'أ',
    name: nameA,
    shortName: nameA,
    fullTitle: `${nameA} (A)`,
    emoji: '🥇',
  };
}

export const TELEGRAM_MESSAGES = {
  // ترويسة الرسائل الرسمية
  HEADER_LINE: '━━━━━━━━━━━━━━━━━━━━━━',
  
  // رسالة الترحيب والربط الرسمي بتنسيق عصري وأنيق
  WELCOME_BOSS: (bossName: string, chatId: number | string) => `
🏛️ <b>المكتب الرقمي للمدير العام — GoldenERP VIP</b>
⚡ <i>منظومة التنبيهات الفورية واعتماد الخطابات والمستندات</i>
━━━━━━━━━━━━━━━━━━━━━━
🌟 أهلاً بحضرتك يا فندم <b>${bossName}</b>
🔐 <b>المعرف المقترن:</b> <code>${chatId}</code>
🟢 <b>حالة الاتصال:</b> متصل ومؤمن بنظام التشفير الحكومي

🏢 <b>الشركات التابعة المعتمدة:</b>
• 🥇 <b>جولدن (A)</b>
• 🥈 <b>إكسلنت (B)</b>
• 🥉 <b>العهد (C)</b>
• 🔷 <b>الشركة الرابعة (D)</b>

💡 <i>يستقبل البوت تنبيهات المواعيد الفورية وطلبات اعتماد الطباعة والتنزيل الصادرة من الموظفين مع إمكانية المعاينة والموافقة الفورية بنقرة زر.</i>
━━━━━━━━━━━━━━━━━━━━━━
👇 <b>اختر الإجراء أو الشركة من الأزرار أدناه:</b>
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
──────────────────────
🏛️ <b>الجهة الحكومية:</b> ${params.authority}
🏷️ <b>العملية:</b> [${params.operationCode}] ${params.operationName}
⚖️ <b>نوع الجلسة:</b> <b>${params.sessionType}</b>
⏰ <b>موعد الجلسة:</b> <b>${params.sessionDate}</b>
${params.location ? `📍 <b>المقر:</b> ${params.location}\n` : ''}━━━━━━━━━━━━━━━━━━━━━━
📋 <i>يرجى التأكد من تسليم المندوب المظاريف والتفويضات الرسمية المعتمدة.</i>
`.trim(),

  // تنبيه اقتراب انتهاء سريان خطاب ضمان
  GUARANTEE_EXPIRY_ALERT: (params: {
    companyBadge: CompanyBadgeInfo;
    operationCode: string;
    operationName: string;
    authority: string;
    letterNumber: string;
    bankName: string;
    amount: string;
    expiryDate: string;
    daysRemaining: number;
  }) => `
🔔 <b>تنبيه استباقي: اقتراب انتهاء سريان خطاب ضمان بنكي</b>
━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>الشركة التابعة:</b>
${params.companyBadge.emoji} <b>${params.companyBadge.fullTitle}</b>
──────────────────────
🏛️ <b>الجهة المستفيدة:</b> ${params.authority}
🏷️ <b>العملية:</b> [${params.operationCode}] ${params.operationName}
📄 <b>رقم خطاب الضمان:</b> <code>[${params.letterNumber}]</code>
🏦 <b>البنك المصدر:</b> ${params.bankName}
💵 <b>قيمة الضمان:</b> <b>${params.amount}</b>
⏳ <b>تاريخ الانتهاء:</b> <b>${params.expiryDate}</b> (متبقي ${params.daysRemaining} يوم)
━━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>يرجى التوجيه باتخاذ الإجراء اللازم: تجديد الخطاب أو مخاطبة الجهة للاسترداد.</i>
`.trim(),

  // رسالة اختيار الشركة من الواجهة الخارجية
  COMPANY_SELECTION_MENU: (currentCompanyTitle?: string) => `
🏛️ <b>المكتب الرقمي للمدير العام — GoldenERP VIP</b>
━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>يرجى اختيار إحدى الشركات الـ 4 للدخول ومتابعة أعمالها:</b>
${currentCompanyTitle ? `\n📍 <i>الشركة المحددة حالياً: ${currentCompanyTitle}</i>\n` : ''}
👇 <i>اضغط على اسم الشركة المطلوب للدخول إلى مقرها واستعراض تنبيهاتها:</i>
`.trim(),

  // رسالة نجاح تبديل الشركة
  COMPANY_SWITCHED: (badge: CompanyBadgeInfo | null) => `
✅ <b>تم تفعيل سياق العمل بنجاح!</b>
━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>الشركة النشطة:</b>
${badge ? `${badge.emoji} <b>${badge.fullTitle}</b>` : '<b>الشركة المحددة</b>'}
──────────────────────
🎯 أصبحت الآن التنبيهات، وطلبات اعتماد الطباعة، والجلسات، والضمانات مخصصة لهذه الشركة.
`.trim(),

  // ملخص الضمانات
  GUARANTEES_REPORT: (params: {
    companyTitle: string;
    totalCount: number;
    totalAmountStr: string;
    expiringCount: number;
    items: Array<{ number: string; bank: string; amount: string; expiry: string; status: string; opCode: string }>;
  }) => `
🛡️ <b>تقرير خطابات الضمان والتأمينات البنكية</b>
━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>النطاق:</b> ${params.companyTitle}
📁 <b>إجمالي خطابات الضمان السارية:</b> ${params.totalCount} خطاب
💰 <b>إجمالي القيمة المغطاة:</b> <b>${params.totalAmountStr}</b>
⚠️ <b>ضمانات تقترب من موعد الانتهاء:</b> ${params.expiringCount} خطاب
━━━━━━━━━━━━━━━━━━━━━━
${params.items.length === 0 ? '✅ <i>لا توجد ضمانات مسجلة أو قاربت على الانتهاء في هذا النطاق.</i>' : params.items.map((it, idx) => `
${idx + 1}. <b>خطاب رقم [${it.number}]</b> — [${it.opCode}]
   🏦 <b>البنك:</b> ${it.bank}
   💵 <b>المبلغ:</b> ${it.amount}
   ⏳ <b>تاريخ الانتهاء:</b> ${it.expiry}
   📌 <b>الحالة:</b> ${it.status}
`).join('')}
━━━━━━━━━━━━━━━━━━━━━━
`.trim(),

  // ملخص العمليات الجارية
  OPERATIONS_REPORT: (params: {
    companyTitle: string;
    totalActive: number;
    items: Array<{ code: string; name: string; authority: string; budget: string; status: string }>;
  }) => `
💼 <b>تقرير المناقصات والعمليات الجارية</b>
━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>النطاق:</b> ${params.companyTitle}
⚡ <b>العمليات النشطة قيد التنفيذ والمتابعة:</b> ${params.totalActive} عملية
━━━━━━━━━━━━━━━━━━━━━━
${params.items.length === 0 ? '✅ <i>لا توجد عمليات جارية حالياً في هذا النطاق.</i>' : params.items.map((it, idx) => `
${idx + 1}. <b>[${it.code}]</b> ${it.name}
   🏛️ <b>الجهة:</b> ${it.authority}
   💵 <b>القيمة:</b> ${it.budget}
   📊 <b>المرحلة:</b> <code>${it.status}</code>
`).join('')}
━━━━━━━━━━━━━━━━━━━━━━
`.trim(),

  // لوحة القيادة التنفيذية الذكية الموحدة للمدير العام
  DASHBOARD_EXECUTIVE: (params: {
    bossName: string;
    activeCompanyName: string;
    totalActiveOps: number;
    pendingApprovalsCount: number;
    todayEventsCount: number;
    upcomingDatesCount: number;
    expiringGuaranteesCount: number;
  }) => `
🏛️ <b>لوحة القيادة التنفيذية الذكية — GoldenERP VIP</b>
━━━━━━━━━━━━━━━━━━━━━━
🌟 مرحباً بك يا فندم <b>${params.bossName}</b>
📍 <b>النطاق النشط:</b> <b>${params.activeCompanyName}</b>
──────────────────────
📊 <b>الموقف اللحظي الموحد للمنظومة:</b>
• 🖨️ طلبات اعتماد الطباعة المعلقة: <b>${params.pendingApprovalsCount}</b> طلب
• 📅 جلسات ومواعيد اليوم: <b>${params.todayEventsCount}</b> جلسة
• ⏰ المواعيد والجلسات القادمة (خلال 30 يوماً): <b>${params.upcomingDatesCount}</b> موعد
• 🛡️ خطابات ضمان توشك على الانتهاء: <b>${params.expiringGuaranteesCount}</b> خطاب
• 💼 العمليات الجارية قيد المتابعة: <b>${params.totalActiveOps}</b> عملية
━━━━━━━━━━━━━━━━━━━━━━
👇 <b>اختر إحدى الشركات الـ 4 لمتابعتها، أو استخدم الأدوات التنفيذية أدناه:</b>
`.trim(),

  // المقر التنفيذي المخصص لكل شركة من الشركات الأربعة
  COMPANY_HUB_DASHBOARD: (params: {
    companyBadge: CompanyBadgeInfo;
    pendingApprovals: number;
    todayEvents: number;
    upcomingEvents: number;
    activeGuarantees: number;
    expiringGuarantees: number;
  }) => `
🏢 <b>المقر التنفيذي لـ ${params.companyBadge.fullTitle}</b>
━━━━━━━━━━━━━━━━━━━━━━
⚡ <b>الموقف اللحظي للشركة:</b>
• 🖨️ طلبات اعتماد الطباعة: <b>${params.pendingApprovals}</b> طلب معلق
• 📅 جلسات ومواعيد اليوم: <b>${params.todayEvents}</b> جلسة
• ⏰ المواعيد والجلسات القادمة: <b>${params.upcomingEvents}</b> موعد
• 🛡️ خطابات الضمان السارية: <b>${params.activeGuarantees}</b> (${params.expiringGuarantees > 0 ? `⚠️ منها ${params.expiringGuarantees} توشك على الانتهاء` : 'جميعها سارية ✓'})
━━━━━━━━━━━━━━━━━━━━━━
👇 <i>اختر الخدمة أو التنبيه المطلوب من الأزرار أدناه:</i>
`.trim(),

  // جدول المواعيد والجلسات القادمة
  UPCOMING_DATES_REPORT: (params: {
    companyTitle: string;
    totalCount: number;
    items: Array<{
      opCode: string;
      opName: string;
      authority: string;
      eventType: string;
      eventDate: string;
      daysRemaining: number;
      badge: CompanyBadgeInfo;
    }>;
  }) => `
⏰ <b>جدول المواعيد والجلسات القادمة</b>
━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>النطاق:</b> ${params.companyTitle}
📌 <b>إجمالي المواعيد المرتقبة:</b> ${params.totalCount} حدث
━━━━━━━━━━━━━━━━━━━━━━
${params.items.length === 0 ? '✅ <i>لا توجد جلسات أو مواعيد مرتقبة خلال الفترة القادمة في هذا النطاق.</i>' : params.items.map((it, idx) => {
  let urgency = `⏳ باقي ${it.daysRemaining} يوم`;
  if (it.daysRemaining === 0) urgency = '🚨 اليوم!';
  else if (it.daysRemaining === 1) urgency = '⚠️ غداً!';
  return `
${idx + 1}. ${it.badge.emoji} <b>[${it.opCode}]</b> ${it.opName}
   ⚖️ <b>الحدث:</b> <b>${it.eventType}</b> (${urgency})
   📅 <b>الميعاد:</b> ${it.eventDate}
   🏛️ <b>الجهة:</b> ${it.authority}`;
}).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━
`.trim(),

  // تنبيه استباقي لمنظومة المراحل الحساسة مرتبط بالإعدادات
  STAGE_ALERT_PROACTIVE: (params: {
    companyBadge: CompanyBadgeInfo;
    operationCode: string;
    operationName: string;
    authority: string;
    stageTitle: string;
    stageDescription: string;
    deadlineDate: string;
    leadDays: number;
  }) => `
🔔 <b>تنبيه استباقي للعمليات (تذكير قبل ${params.leadDays} أيام)</b>
━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>الشركة التابعة:</b>
${params.companyBadge.emoji} <b>${params.companyBadge.fullTitle}</b>
──────────────────────
🏷️ <b>العملية:</b> [${params.operationCode}] ${params.operationName}
🏛️ <b>الجهة:</b> ${params.authority}
⚖️ <b>المرحلة / الاستحقاق:</b> <b>${params.stageTitle}</b>
📅 <b>الموعد المحدد:</b> <b>${params.deadlineDate}</b>
📝 <i>${params.stageDescription}</i>
━━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>تم إرسال هذا التنبيه تلقائياً وفقاً لإعدادات المنظومة (تنبيه مسبق قبل ${params.leadDays} أيام).</i>
`.trim(),

  // التقرير الصباحي اليومي
  DAILY_MORNING_BRIEFING: (params: {
    dateStr: string;
    todaySessionsCount: number;
    pendingApprovalsCount: number;
    expiringGuaranteesCount: number;
    summaryLines: string[];
  }) => `
☀️ <b>صباح الخير يا فندم — التقرير الصباحي التنفيذي</b>
📅 <b>التاريخ:</b> ${params.dateStr}
━━━━━━━━━━━━━━━━━━━━━━
📊 <b>موجز مهام وأحداث اليوم (الشركات الأربعة):</b>
• 📅 جلسات ومواعيد اليوم: <b>${params.todaySessionsCount}</b> جلسة
• 🖨️ طلبات اعتماد معلقة: <b>${params.pendingApprovalsCount}</b> طلب
• 🛡️ ضمانات تقترب من الانتهاء: <b>${params.expiringGuaranteesCount}</b> خطاب
──────────────────────
${params.summaryLines.length === 0 ? '✨ <i>لا توجد جلسات حاسمة أو طوارئ مجدولة لهذا اليوم.</i>' : params.summaryLines.join('\n')}
━━━━━━━━━━━━━━━━━━━━━━
💼 <i>نتمنى لحضرتك يوماً عملياً موفقاً ومثمراً! 🌟</i>
`.trim(),

    // حالة المنظومة والربط
  SYSTEM_STATUS_REPORT: (params: {
    botUsername: string;
    adminChatId: string;
    activeCompany: string;
    serverTime: string;
    securityLockAttempts: number;
    sessionTimeout: number;
  }) => `
⚙️ <b>حالة منظومة GoldenERP والبوت التنفيذي</b>
━━━━━━━━━━━━━━━━━━━━━━
🤖 <b>اسم البوت:</b> @${params.botUsername}
📱 <b>معرف المدير العام المقترن:</b> <code>${params.adminChatId}</code>
🏢 <b>الشركة النشطة حالياً:</b> <b>${params.activeCompany}</b>
🕒 <b>توقيت الخادم:</b> ${params.serverTime}
──────────────────────
🛡️ <b>قواعد الأمان النشطة في الخادم:</b>
• قفل الحساب بعد: <b>${params.securityLockAttempts}</b> محاولات خاطئة
• مهلة الخمول التلقائية: <b>${params.sessionTimeout}</b> دقيقة
• الحفظ القانوني للسجلات: <b>5 سنوات</b> (مادة 78 قانون 182)
━━━━━━━━━━━━━━━━━━━━━━
🟢 <i>حالة الاتصال: متصل ومؤمن بالكامل بنظام التشفير الحكومي.</i>
`.trim(),
};
