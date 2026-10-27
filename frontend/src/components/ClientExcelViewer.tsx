"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Table as TableIcon,
  Download,
  Search,
  Printer,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import JSZip from "jszip";

export interface ClientExcelViewerProps {
  fileBlob?: Blob | null;
  documentTitle: string;
  onDownload?: () => void;
}

interface ParsedSheet {
  name: string;
  rows: string[][];
}

export const ClientExcelViewer: React.FC<ClientExcelViewerProps> = ({
  fileBlob,
  documentTitle,
  onDownload,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    if (!fileBlob) {
      setLoading(false);
      setError("لم يتم تمرير ملف الجدول للعرض");
      return;
    }

    setLoading(true);
    setError(null);
    setSheets([]);
    setActiveSheetIndex(0);

    const parseExcelOrCsv = async () => {
      try {
        const titleLower = documentTitle.toLowerCase();
        const isCsv = titleLower.endsWith(".csv") || titleLower.endsWith(".tsv") || titleLower.endsWith(".txt");

        // 1. إذا كان الملف CSV أو نصي مجدول
        if (isCsv) {
          const text = await fileBlob.text();
          const delimiter = titleLower.endsWith(".tsv") ? "\t" : ",";
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          const rows = lines.map((line) => {
            // بسيطة لتقسيم الأعمدة مع مراعاة الفواصل
            return line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, "").trim());
          });
          if (active) {
            setSheets([{ name: "البيانات المجدولة", rows }]);
            setLoading(false);
          }
          return;
        }

        // 2. إذا كان ملف Excel (.xlsx) نقوم بفكه عبر JSZip وقراءة الخلايا
        const zip = await JSZip.loadAsync(fileBlob);

        // أ) قراءة السلاسل المشتركة (Shared Strings)
        const sharedStrings: string[] = [];
        const sstFile = zip.file("xl/sharedStrings.xml");
        if (sstFile) {
          const sstXml = await sstFile.async("text");
          const parser = new DOMParser();
          const doc = parser.parseFromString(sstXml, "application/xml");
          const siElements = doc.getElementsByTagName("si");
          for (let i = 0; i < siElements.length; i++) {
            const tElements = siElements[i].getElementsByTagName("t");
            let text = "";
            for (let j = 0; j < tElements.length; j++) {
              text += tElements[j].textContent || "";
            }
            sharedStrings.push(text);
          }
        }

        // ب) استخراج أسماء أوراق العمل
        const sheetDefs: { name: string; path: string }[] = [];
        const wbFile = zip.file("xl/workbook.xml");
        if (wbFile) {
          const wbXml = await wbFile.async("text");
          const parser = new DOMParser();
          const doc = parser.parseFromString(wbXml, "application/xml");
          const sheetEls = doc.getElementsByTagName("sheet");
          for (let i = 0; i < sheetEls.length; i++) {
            const name = sheetEls[i].getAttribute("name") || `ورقة ${i + 1}`;
            const sheetId = sheetEls[i].getAttribute("sheetId") || `${i + 1}`;
            sheetDefs.push({ name, path: `xl/worksheets/sheet${sheetId}.xml` });
          }
        }

        if (sheetDefs.length === 0) {
          const sheetFiles = Object.keys(zip.files).filter(
            (k) => k.startsWith("xl/worksheets/sheet") && k.endsWith(".xml")
          );
          sheetFiles.forEach((p, idx) => sheetDefs.push({ name: `ورقة ${idx + 1}`, path: p }));
        }

        // ج) قراءة كل ورقة عمل
        const parsedSheets: ParsedSheet[] = [];
        for (const sDef of sheetDefs) {
          let sFile = zip.file(sDef.path);
          if (!sFile) {
            // fallback: try finding case-insensitive or by index
            const altPath = Object.keys(zip.files).find((k) => k.toLowerCase() === sDef.path.toLowerCase());
            if (altPath) sFile = zip.file(altPath);
          }
          if (!sFile) continue;

          const sXml = await sFile.async("text");
          const parser = new DOMParser();
          const doc = parser.parseFromString(sXml, "application/xml");
          const rowEls = doc.getElementsByTagName("row");
          const sheetRows: string[][] = [];

          for (let r = 0; r < rowEls.length; r++) {
            const cEls = rowEls[r].getElementsByTagName("c");
            const rowData: string[] = [];
            let lastColIdx = -1;

            for (let c = 0; c < cEls.length; c++) {
              const cell = cEls[c];
              const cellRef = cell.getAttribute("r") || "";
              const colLetters = cellRef.replace(/[0-9]/g, "");
              let colIdx = 0;
              for (let l = 0; l < colLetters.length; l++) {
                colIdx = colIdx * 26 + (colLetters.charCodeAt(l) - 64);
              }
              colIdx -= 1;

              while (lastColIdx + 1 < colIdx) {
                rowData.push("");
                lastColIdx++;
              }

              const type = cell.getAttribute("t");
              const valEl = cell.getElementsByTagName("v")[0];
              let val = valEl ? valEl.textContent || "" : "";
              if (type === "s" && val) {
                const idx = parseInt(val, 10);
                val = sharedStrings[idx] ?? val;
              } else if (type === "b") {
                val = val === "1" ? "صحيح" : "خطأ";
              }
              rowData.push(val);
              lastColIdx = colIdx;
            }
            if (rowData.some((cell) => cell.trim().length > 0)) {
              sheetRows.push(rowData);
            }
          }

          if (sheetRows.length > 0) {
            parsedSheets.push({ name: sDef.name, rows: sheetRows });
          }
        }

        if (active) {
          if (parsedSheets.length === 0) {
            setError("ملف الـ Excel فارغ أو لا يحتوي على صفوف بيانات مقروءة.");
          } else {
            setSheets(parsedSheets);
          }
          setLoading(false);
        }
      } catch (err: any) {
        console.warn("Excel parsing error:", err);
        if (active) {
          setError("تعذر فتح ملف الـ Excel مباشرة. يمكنك تنزيل الملف وفتحه على جهازك.");
          setLoading(false);
        }
      }
    };

    parseExcelOrCsv();

    return () => {
      active = false;
    };
  }, [fileBlob, documentTitle]);

  const activeSheet = sheets[activeSheetIndex] || sheets[0];

  const filteredRows = useMemo(() => {
    if (!activeSheet || !activeSheet.rows) return [];
    if (!searchQuery.trim()) return activeSheet.rows;
    const q = searchQuery.toLowerCase();
    return activeSheet.rows.filter((row) =>
      row.some((cell) => (cell || "").toLowerCase().includes(q))
    );
  }, [activeSheet, searchQuery]);

  // إيجاد أقصى عدد للأعمدة
  const maxCols = useMemo(() => {
    if (!filteredRows.length) return 0;
    return Math.max(...filteredRows.map((r) => r.length), 0);
  }, [filteredRows]);

  const getColLetter = (index: number) => {
    let result = "";
    let i = index;
    while (i >= 0) {
      result = String.fromCharCode(65 + (i % 26)) + result;
      i = Math.floor(i / 26) - 1;
    }
    return result;
  };

  const handleCopyTable = () => {
    if (!activeSheet) return;
    const tsv = activeSheet.rows.map((r) => r.join("\t")).join("\n");
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    toast.success("تم نسخ جدول البيانات كاملاً بنجاح 📋");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !activeSheet) return;

    let tableHtml = "<table border='1' style='width:100%; border-collapse:collapse; font-family:Cairo, Tahoma; font-size:12px; text-align:right;'>";
    activeSheet.rows.forEach((row, rIdx) => {
      const Tag = rIdx === 0 ? "th" : "td";
      const bg = rIdx === 0 ? "background:#f1f5f9; font-weight:bold;" : "";
      tableHtml += `<tr>${row.map((c) => `<${Tag} style='padding:6px; ${bg}'>${c || ""}</${Tag}>`).join("")}</tr>`;
    });
    tableHtml += "</table>";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>${documentTitle} - ${activeSheet.name}</title>
        </head>
        <body style="margin:20px; direction:rtl;">
          <h3 style="font-family:Cairo, Tahoma;">${documentTitle} (${activeSheet.name})</h3>
          ${tableHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-text overflow-hidden">
      {/* ━━━ شريط الأدوات العلوي لمعاينة Excel ━━━ */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-200 truncate max-w-xs sm:max-w-md" title={documentTitle}>
            {documentTitle}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            معاينة Excel أصلية 100%
          </span>
          {activeSheet && (
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              ({filteredRows.length.toLocaleString("ar-EG")} صف • {maxCols} عمود)
            </span>
          )}
        </div>

        {/* البحث والطباعة والتنزيل */}
        <div className="flex items-center gap-2">
          <div className="relative w-40 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الجدول..."
              className="h-8 text-xs pr-8 bg-slate-800 border-slate-700 rounded-xl"
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyTable}
            className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
            title="نسخ محتوى الجدول"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? "تم النسخ" : "نسخ"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 px-3 rounded-xl bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30 text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            title="طباعة الجدول"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </Button>

          {onDownload && (
            <Button
              type="button"
              size="sm"
              onClick={onDownload}
              className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
              title="تحميل الملف الأصلي"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل Excel</span>
            </Button>
          )}
        </div>
      </div>

      {/* تبويبات أوراق العمل إذا كان الملف يحتوي على أكثر من ورقة */}
      {sheets.length > 1 && (
        <div className="flex items-center gap-1 px-4 py-1.5 bg-slate-900/60 border-b border-slate-800 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-[11px] text-slate-400 font-bold ml-2">أوراق العمل:</span>
          {sheets.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSheetIndex(idx)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeSheetIndex === idx
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <TableIcon className="w-3 h-3" />
              <span>{s.name}</span>
              <span className="text-[10px] opacity-70">({s.rows.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* ━━━ مساحة عرض الجدول ━━━ */}
      <div className="flex-1 w-full overflow-auto bg-slate-950 p-3 sm:p-5 custom-scrollbar">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 h-64 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <span className="text-xs font-bold">جاري قراءة وتجهيز جدول Excel فورياً...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center gap-3 my-12 max-w-md mx-auto text-center p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <h4 className="text-sm font-bold text-white">تعذر العرض المباشر</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            {onDownload && (
              <Button onClick={onDownload} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold mt-2">
                <Download className="w-3.5 h-3.5 ml-1.5" />
                <span>تحميل الملف وفتحه على جهازك</span>
              </Button>
            )}
          </div>
        )}

        {!loading && !error && filteredRows.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs font-semibold">
            لا توجد صفوف تطابق بحثك ({searchQuery})
          </div>
        )}

        {!loading && !error && filteredRows.length > 0 && (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-xl max-w-full">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right text-xs" dir="rtl">
                <thead>
                  <tr className="bg-slate-800/90 text-slate-300 font-mono text-[11px] border-b border-slate-700 sticky top-0 z-10">
                    <th className="w-12 px-2 py-2 text-center text-slate-400 border-l border-slate-700/60 bg-slate-850">
                      #
                    </th>
                    {Array.from({ length: maxCols }).map((_, cIdx) => (
                      <th
                        key={cIdx}
                        className="px-3 py-2 font-bold text-slate-200 border-l border-slate-700/60 min-w-[120px]"
                      >
                        {getColLetter(cIdx)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredRows.map((row, rIdx) => {
                    const isHeaderRow = rIdx === 0 && !searchQuery;
                    return (
                      <tr
                        key={rIdx}
                        className={`transition-colors ${
                          isHeaderRow
                            ? "bg-slate-850 font-bold text-white"
                            : rIdx % 2 === 0
                            ? "bg-slate-900 hover:bg-slate-800/60 text-slate-200"
                            : "bg-slate-900/60 hover:bg-slate-800/60 text-slate-200"
                        }`}
                      >
                        <td className="px-2 py-2 text-center font-mono text-[10px] text-slate-400 border-l border-slate-800 bg-slate-950/40 select-none">
                          {rIdx + 1}
                        </td>
                        {Array.from({ length: maxCols }).map((_, cIdx) => {
                          const val = row[cIdx] || "";
                          return (
                            <td
                              key={cIdx}
                              className="px-3 py-2 border-l border-slate-800/60 truncate max-w-xs hover:whitespace-normal"
                              title={val}
                            >
                              {val || <span className="text-slate-600">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
