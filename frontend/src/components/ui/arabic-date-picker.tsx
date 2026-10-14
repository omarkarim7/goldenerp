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
      return d.toLocaleDateString("ar-EG", {
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
