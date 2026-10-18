"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "cn"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

// Comprehensive Arabic labels for all system enums, types, and statuses
const ARABIC_LABELS: Record<string, string> = {
  // All Prisma Operation Statuses
  all: "كل الحالات المسجلة",
  ALL: "كل الحالات المسجلة",
  DRAFT: "مسودة أولية",
  BOOKLET_WITHDRAWN: "تم سحب الكراسة",
  SUBMITTED: "تم تقديم العطاء",
  TECHNICAL_OPENED: "جلسة فتح فني",
  TECHNICAL_ACCEPTED: "مقبول فنياً",
  TECHNICAL_REJECTED: "مرفوض فنياً",
  GRIEVANCE_FILED: "تقديم تظلم",
  FINANCIAL_OPENED: "جلسة فتح مالي",
  AWARDED: "ترسية وفوز",
  SUPPLY_IN_PROGRESS: "جاري التوريد والتنفيذ",
  COMPLETED: "مكتملة وناجحة",
  CLOSED: "مغلقة نهائياً",
  CANCELLED: "ملغاة من الجهة",
  ARCHIVED: "مؤرشفة",

  // Tender / Operation Types
  AUCTION: "مزاد علني",
  TENDER: "مناقصة عامة",
  DIRECT_ORDER: "إسناد / أمر مباشر",
  PRACTICE: "ممارسة محدودة",
  LIMITED_TENDER: "مناقصة محدودة",

  // Legacy / Alternate Statuses
  PREPARATION: "تجهيز وشراء الكراسة",
  STUDY_AND_PRICING: "دراسة فنية وتسعير",
  CONTRACTED: "توقيع العقد وإصدار النهائي",
  DELIVERY_AND_EXECUTION: "توريد وتنفيذ واستلام",
  WARRANTY_AND_CLOSING: "فترة الضمان واسترداد التأمين",
  REJECTED: "مرفوضة / لم يتم الترسية",

  // Guarantee Types
  INITIAL: "تأمين ابتدائي",
  PRIMARY: "تأمين ابتدائي",
  FINAL: "تأمين نهائي",
  ADVANCE_PAYMENT: "دفعة مقدمة",
  PERFORMANCE: "صيانة / ضمان أعمال",

  // Guarantee Payment Methods
  BANK_GUARANTEE: "خطاب ضمان بنكي",
  CASH: "سداد نقدي / خزينة",
  DEDUCTION_FROM_DUES: "خصم من مستحقات",
  DEDUCTION: "خصم من مستحقات",
  TRANSFER: "تحويل التأمين وسداد الفارق",

  // Duration Units
  DAYS: "أيام",
  MONTHS: "شهور",
  YEARS: "سنوات",

  // Guarantee & Generic Statuses
  ACTIVE: "ساري ونشط",
  EXPIRING_SOON: "قارب على الانتهاء",
  EXPIRED: "منتهي الصلاحية",
  EXTENDED: "تم التمديد",
  RELEASED: "مسترد بالكامل",
  CONFISCATED: "تمت المصادرة",
  RECOVERED: "مسترد ومغلق",
  PENDING: "قيد الانتظار",

  // Company Documents
  COMMERCIAL_REGISTER: "سجل تجاري",
  TAX_CARD: "بطاقة ضريبية",
  LICENSE: "رخصة مزاولة",
  STAMP: "ختم الشركة",
  SIGNATURE: "نموذج توقيع مفوض",

  // Roles
  GENERAL_MANAGER: "مدير عام النظام",
  DEPUTY_MANAGER: "نائب المدير",
  EMPLOYEE: "موظف مسؤول",

  // Companies Scope
  COMP_A: "شركة أ (المجموعة الذهبية)",
  COMP_B: "شركة ب (العالمية للتوريدات)",
  COMP_C: "شركة ج (المتحدة للمقاولات)",
  COMP_D: "شركة د (الحديثة للتجارة)",
}

function SelectValue({
  className,
  children,
  placeholder,
  ...props
}: SelectPrimitive.Value.Props & { placeholder?: string }) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      placeholder={placeholder}
      className={cn("flex flex-1 text-right justify-start font-medium text-foreground", className)}
      {...props}
    >
      {(val: any) => {
        if (typeof children === "function") {
          return (children as any)(val)
        }
        if (children) {
          return children
        }
        if (val === null || val === undefined || val === "") {
          return placeholder || ""
        }
        if (typeof val === "string" && ARABIC_LABELS[val]) {
          return ARABIC_LABELS[val]
        }
        return val
      }}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-xl border border-input bg-background py-2 px-3 text-sm text-foreground text-right whitespace-nowrap transition-colors outline-none select-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground data-[size=default]:h-11 data-[size=sm]:h-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground mr-auto" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-[100005]"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "relative isolate z-[100005] max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-border p-1.5 duration-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100",
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-lg py-2 pr-8 pl-2.5 text-sm outline-hidden select-none text-popover-foreground transition-colors duration-150 data-highlighted:bg-amber-500/15 data-highlighted:text-amber-800 dark:data-highlighted:bg-amber-500/20 dark:data-highlighted:text-amber-300 focus:bg-amber-500/15 dark:focus:bg-amber-500/20 focus:text-amber-800 dark:focus:text-amber-300 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
