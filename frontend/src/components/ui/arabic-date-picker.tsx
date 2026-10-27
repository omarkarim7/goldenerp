"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ArabicDateTimePickerProps {
  value: string; // ISO string e.g. "2026-10-15T10:00:00" or empty
  onChange: (value: string) => void;
  showTime?: boolean;
  className?: string;
}

const ARABIC_MONTHS = [
  { value: 1, name: "يناير (شهر 1)" },
  { value: 2, name: "فبراير (شهر 2)" },
  { value: 3, name: "مارس (شهر 3)" },
  { value: 4, name: "أبريل (شهر 4)" },
  { value: 5, name: "مايو (شهر 5)" },
  { value: 6, name: "يونيو (شهر 6)" },
  { value: 7, name: "يوليو (شهر 7)" },
  { value: 8, name: "أغسطس (شهر 8)" },
  { value: 9, name: "سبتمبر (شهر 9)" },
  { value: 10, name: "أكتوبر (شهر 10)" },
  { value: 11, name: "نوفمبر (شهر 11)" },
  { value: 12, name: "ديسمبر (شهر 12)" },
];

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = ["00", "15", "30", "45"];

export function ArabicDateTimePicker({
  value,
  onChange,
  showTime = true,
  className = "",
}: ArabicDateTimePickerProps) {
  // Parse initial or fallback to today
  const parsed = useMemo(() => {
    let d = new Date();
    if (value) {
      const parsedD = new Date(value);
      if (!isNaN(parsedD.getTime())) {
        d = parsedD;
      }
    }
    const h24 = d.getHours();
    const period = h24 >= 12 ? "PM" : "AM";
    const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const m = d.getMinutes();
    const minStr = m < 8 ? "00" : m < 23 ? "15" : m < 38 ? "30" : m < 53 ? "45" : "00";

    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      hour: hour12,
      minute: minStr,
      period,
    };
  }, [value]);

  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState(parsed.period);

  // Sync internal state if prop value changes externally
  useEffect(() => {
    setDay(parsed.day);
    setMonth(parsed.month);
    setYear(parsed.year);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setPeriod(parsed.period);
  }, [parsed]);

  // Emit change when user changes any field
  const emitChange = (
    newDay: number,
    newMonth: number,
    newYear: number,
    newHour: number,
    newMinute: string,
    newPeriod: string
  ) => {
    let h24 = newHour;
    if (newPeriod === "PM" && newHour < 12) h24 = newHour + 12;
    if (newPeriod === "AM" && newHour === 12) h24 = 0;

    const pad = (n: number) => n.toString().padStart(2, "0");
    const iso = `${newYear}-${pad(newMonth)}-${pad(newDay)}T${pad(h24)}:${newMinute}:00`;
    onChange(iso);
  };

  const handleDayChange = (d: number) => {
    setDay(d);
    emitChange(d, month, year, hour, minute, period);
  };

  const handleMonthChange = (m: number) => {
    setMonth(m);
    emitChange(day, m, year, hour, minute, period);
  };

  const handleYearChange = (y: number) => {
    setYear(y);
    emitChange(day, month, y, hour, minute, period);
  };

  const handleHourChange = (h: number) => {
    setHour(h);
    emitChange(day, month, year, h, minute, period);
  };

  const handleMinuteChange = (min: string) => {
    setMinute(min);
    emitChange(day, month, year, hour, min, period);
  };

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    emitChange(day, month, year, hour, minute, p);
  };

  // Quick Presets
  const applyPreset = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const newDay = d.getDate();
    const newMonth = d.getMonth() + 1;
    const newYear = d.getFullYear();

    setDay(newDay);
    setMonth(newMonth);
    setYear(newYear);
    emitChange(newDay, newMonth, newYear, hour, minute, period);
  };

  // Live formatted Arabic string
  const formattedArabicDate = useMemo(() => {
    let h24 = hour;
    if (period === "PM" && hour < 12) h24 = hour + 12;
    if (period === "AM" && hour === 12) h24 = 0;

    try {
      const d = new Date(year, month - 1, day, h24, parseInt(minute, 10));
      return d.toLocaleDateString("ar-EG-u-nu-latn", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return `${day}/${month}/${year}`;
    }
  }, [day, month, year, hour, minute, period]);

  return (
    <div className={`space-y-2.5 p-3.5 rounded-2xl bg-muted/30 border border-border ${className}`}>
      {/* Live Arabic Preview Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-blue-500/10 border border-blue-500/25 p-2.5 rounded-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
          <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>الموعد المحدد بالعربي:</span>
          <span className="font-extrabold text-foreground">{formattedArabicDate}</span>
        </div>
      </div>

      {/* Quick Shortcuts */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        <span className="text-muted-foreground text-[11px] font-semibold flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          اختيار سريع:
        </span>
        <button
          type="button"
          onClick={() => applyPreset(0)}
          className="px-2.5 py-1 rounded-lg bg-background hover:bg-blue-600 hover:text-white border border-border text-[11px] font-bold transition-colors cursor-pointer"
        >
          اليوم
        </button>
        <button
          type="button"
          onClick={() => applyPreset(1)}
          className="px-2.5 py-1 rounded-lg bg-background hover:bg-blue-600 hover:text-white border border-border text-[11px] font-bold transition-colors cursor-pointer"
        >
          غداً
        </button>
        <button
          type="button"
          onClick={() => applyPreset(3)}
          className="px-2.5 py-1 rounded-lg bg-background hover:bg-blue-600 hover:text-white border border-border text-[11px] font-bold transition-colors cursor-pointer"
        >
          بعد 3 أيام
        </button>
        <button
          type="button"
          onClick={() => applyPreset(7)}
          className="px-2.5 py-1 rounded-lg bg-background hover:bg-blue-600 hover:text-white border border-border text-[11px] font-bold transition-colors cursor-pointer"
        >
          بعد أسبوع
        </button>
        <button
          type="button"
          onClick={() => applyPreset(14)}
          className="px-2.5 py-1 rounded-lg bg-background hover:bg-blue-600 hover:text-white border border-border text-[11px] font-bold transition-colors cursor-pointer"
        >
          بعد أسبوعين
        </button>
        <button
          type="button"
          onClick={() => applyPreset(30)}
          className="px-2.5 py-1 rounded-lg bg-background hover:bg-blue-600 hover:text-white border border-border text-[11px] font-bold transition-colors cursor-pointer"
        >
          بعد شهر
        </button>
      </div>

      {/* Selectors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {/* اليوم */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-muted-foreground">اليوم</label>
          <select
            value={day}
            onChange={(e) => handleDayChange(parseInt(e.target.value, 10))}
            className="w-full h-10 bg-background border border-border text-foreground rounded-xl px-2 text-xs font-bold focus:border-blue-500 cursor-pointer"
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* الشهر باللغة العربية */}
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-[11px] font-semibold text-muted-foreground">الشهر (بالاسم العربي)</label>
          <select
            value={month}
            onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
            className="w-full h-10 bg-background border border-border text-foreground rounded-xl px-2 text-xs font-bold focus:border-blue-500 cursor-pointer"
          >
            {ARABIC_MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* السنة */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-muted-foreground">السنة</label>
          <select
            value={year}
            onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
            className="w-full h-10 bg-background border border-border text-foreground rounded-xl px-2 text-xs font-bold focus:border-blue-500 cursor-pointer font-mono"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* الوقت (الساعة والدقيقة والفترة) */}
        {showTime && (
          <>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-muted-foreground">الساعة</label>
              <div className="flex items-center gap-1">
                <select
                  value={hour}
                  onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
                  className="w-full h-10 bg-background border border-border text-foreground rounded-xl px-1.5 text-xs font-bold focus:border-blue-500 cursor-pointer font-mono"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground font-bold">:</span>
                <select
                  value={minute}
                  onChange={(e) => handleMinuteChange(e.target.value)}
                  className="w-full h-10 bg-background border border-border text-foreground rounded-xl px-1.5 text-xs font-bold focus:border-blue-500 cursor-pointer font-mono"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-muted-foreground">الفترة</label>
              <select
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-full h-10 bg-background border border-border text-foreground rounded-xl px-2 text-xs font-bold focus:border-blue-500 cursor-pointer"
              >
                <option value="AM">صباحاً (ص)</option>
                <option value="PM">مساءً (م)</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export interface SmartArabicDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  showHelperPreview?: boolean;
  outputFormat?: "display" | "iso";
}

/**
 * حقل التاريخ الذكي المعتمد لكافة مراحل العمليات والخطابات:
 * - يتيح الكتابة اليدوية المباشرة للأرقام (مثال: 26/10/2026 أو 2026-10-26)
 * - يحتوي على زر تقويم منبثق (Calendar Picker) لاختيار التاريخ بنقرة واحدة
 * - يعرض التحقق الفوري لليوم والشهر باللغة العربية (مثال: "الإثنين، 26 أكتوبر 2026")
 *   لمنع أي خطأ مطبعي في إدخال التواريخ
 */
export function SmartArabicDatePicker({
  value,
  onChange,
  placeholder,
  className = "",
  label,
  disabled = false,
  required = false,
  showHelperPreview = true,
  outputFormat = "display",
}: SmartArabicDatePickerProps) {
  const hiddenDateInputRef = React.useRef<HTMLInputElement>(null);
  const defaultPlaceholder = placeholder || (outputFormat === "iso" ? "YYYY-MM-DD" : "DD/MM/YYYY");

  // تحويل التاريخ من صيغة DD/MM/YYYY إلى YYYY-MM-DD لمتحكم التاريخ الأصلي
  const toIsoDate = (val: string): string => {
    if (!val) return "";
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }
    const parts = trimmed.split(/[\/\-.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else if (parts[2].length === 4) {
        // DD/MM/YYYY
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
    return "";
  };

  // تحويل من YYYY-MM-DD إلى DD/MM/YYYY
  const toDisplayDate = (iso: string): string => {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return iso;
  };

  const isoValue = toIsoDate(value);

  // المعاينة والتحقق اللفظي بالعربي لليوم والشهر
  const arabicVerification = React.useMemo(() => {
    if (!isoValue) return null;
    try {
      const parts = isoValue.split("-").map((n) => parseInt(n, 10));
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("ar-EG-u-nu-latn", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        }
      }
    } catch {}
    return null;
  }, [isoValue]);

  const handleCalendarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.value;
    if (picked) {
      if (outputFormat === "iso") {
        onChange(picked);
      } else {
        onChange(toDisplayDate(picked));
      }
    }
  };

  const openCalendar = () => {
    if (disabled) return;
    const el = hiddenDateInputRef.current;
    if (!el) return;
    try {
      if (typeof (el as any).showPicker === "function") {
        (el as any).showPicker();
      } else {
        el.focus();
        el.click();
      }
    } catch {
      el.click();
    }
  };

  // الاختصارات السريعة
  const handleQuickAddDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    if (outputFormat === "iso") {
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange(`${day}/${month}/${year}`);
    }
  };

  return (
    <div className={`space-y-1 relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        </div>
      )}

      <div className="relative flex items-center">
        {/* حقل الإدخال اليدوي المباشر للأرقام */}
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultPlaceholder}
          disabled={disabled}
          required={required}
          dir="ltr"
          className="w-full h-9.5 pl-3 pr-10 text-xs font-mono font-bold text-foreground bg-background border border-border rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-center transition-all disabled:opacity-50"
        />

        {/* زر التقويم المنبثق */}
        <button
          type="button"
          onClick={openCalendar}
          disabled={disabled}
          className="absolute right-1 w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
          title="فتح التقويم لاختيار التاريخ"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>

        {/* حقل التاريخ المدمج المخفي لتفعيل منتقي المتصفح الأصلي */}
        <input
          ref={hiddenDateInputRef}
          type="date"
          value={isoValue}
          onChange={handleCalendarPick}
          tabIndex={-1}
          className="sr-only"
        />
      </div>

      {/* التحقق الفوري اللفظي بالعربي لمنع الأخطاء المطبعية */}
      {showHelperPreview && (
        <div className="flex items-center justify-between gap-1.5 text-[10.5px] px-1 pt-0.5">
          {arabicVerification ? (
            <span className="text-emerald-700 dark:text-emerald-300 font-bold truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {arabicVerification}
            </span>
          ) : value && value.trim().length > 3 ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              تنسيق التاريخ غير مكتمل (DD/MM/YYYY)
            </span>
          ) : (
            <span className="text-muted-foreground text-[10px]">
              اكتب يدوياً بالأرقام أو اختر من التقويم
            </span>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleQuickAddDays(0)}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted/60 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
              title="تاريخ اليوم"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => handleQuickAddDays(1)}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted/60 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
              title="تاريخ الغد"
            >
              غداً
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
