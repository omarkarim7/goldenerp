"use client";

import { useEffect, useState } from "react";
import {
  Package, Plus, Search, AlertTriangle, CheckCircle2,
  Boxes, ArrowUpDown, ChevronLeft, X, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  category: string | null;
  currentStock: number;
  minStock: number;
  buyPrice: number;
  sellPrice: number;
}

export default function InventoryArchivePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("قطعة");
  const [category, setCategory] = useState("عام");
  const [currentStock, setCurrentStock] = useState("10");
  const [minStock, setMinStock] = useState("2");
  const [buyPrice, setBuyPrice] = useState("100");
  const [sellPrice, setSellPrice] = useState("130");
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await api.get(`/inventory/products?search=${encodeURIComponent(search)}`);
      setProducts(res.data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("يرجى إدخال اسم الصنف");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/inventory/products", {
        name,
        sku: sku || undefined,
        unit,
        category: category || undefined,
        currentStock: Number(currentStock),
        minStock: Number(minStock),
        buyPrice: Number(buyPrice),
        sellPrice: Number(sellPrice),
      });
      toast.success("تمت إضافة الصنف للمخزن بنجاح");
      setModalOpen(false);
      setName("");
      setSku("");
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء إضافة الصنف");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(n);

  const lowStockCount = products.filter((p) => p.currentStock <= p.minStock).length;
  const totalStockItems = products.reduce((acc, p) => acc + (p.currentStock || 0), 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">أرشيف إدارة المخازن والأصناف</h1>
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 text-xs">
              واجهة محفوظة برمجياً
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            كود إدارة المخزون وتوريدات المشاريع محفوظ بشكل مستقل ولا يؤثر على دورة العمليات
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 royal-glow flex items-center gap-2 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة صنف جديد</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-border">
          <span className="text-xs text-muted-foreground font-bold">إجمالي الأصناف المسجلة</span>
          <p className="text-2xl font-black text-foreground mt-1 font-mono">{products.length} صنف</p>
          <span className="text-[11px] text-muted-foreground mt-1 block">{totalStockItems} قطعة متوفرة بالمستودع</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-border">
          <span className="text-xs text-muted-foreground font-bold">أصناف قاربت على النفاد</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">{lowStockCount} صنف</p>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block">تتطلب أمر شراء من الموردين</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-border">
          <span className="text-xs text-muted-foreground font-bold">جاهزية التوريد</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {products.length > 0 ? Math.round(((products.length - lowStockCount) / products.length) * 100) : 100}%
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">متوافق مع خطط تسليم المناقصات</span>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="glass-card rounded-2xl p-4 border border-border">
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم، كود الصنف (SKU)، أو التصنيف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm h-10"
          />
        </div>
      </div>

      {/* Products Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 border border-border animate-pulse h-36" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-border space-y-3">
          <Package className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">لا توجد أصناف في المخزن</h3>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mx-auto">
            أضف الأصناف والخامات لمتابعة حركات الوارد والمنصرف ومطابقتها مع كراسات الشروط
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const isLowStock = p.currentStock <= p.minStock;

            return (
              <div
                key={p.id}
                className="glass-card-interactive rounded-2xl p-5 border border-border hover:border-blue-500/50 flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="outline" className="border-border text-muted-foreground text-[11px] font-mono">
                      {p.sku || "بدون كود"}
                    </Badge>
                    {isLowStock ? (
                      <Badge className="badge-rose text-xs">
                        منخفض
                      </Badge>
                    ) : (
                      <Badge className="badge-emerald text-xs">
                        متوفر
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-foreground text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {p.name}
                  </h3>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>التصنيف: {p.category || "عام"}</span>
                    <span>الوحدة: {p.unit}</span>
                  </div>

                  {/* Stock Bar */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">الرصيد بالمخزن:</span>
                      <span className="font-bold font-mono text-foreground">
                        {p.currentStock} {p.unit}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${isLowStock ? "bg-rose-500" : "bg-emerald-500"}`}
                        style={{
                          width: `${Math.min(100, (p.currentStock / (p.minStock * 3 || 10)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs border-t border-border text-muted-foreground">
                  <span>سعر الشراء: <strong className="text-foreground font-mono">{formatCurrency(p.buyPrice)}</strong></span>
                  <span>سعر البيع: <strong className="text-blue-700 dark:text-blue-300 font-mono">{formatCurrency(p.sellPrice)}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 border border-border max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                إضافة صنف جديد للمخزن
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">اسم الصنف *</label>
                <Input
                  required
                  placeholder="مثال: كابل ألياف ضوئية 24 طرف"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">كود الصنف (SKU)</label>
                  <Input
                    placeholder="CBL-024"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">الوحدة</label>
                  <Input
                    placeholder="متر / قطعة / طن"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">الرصيد الحالي</label>
                  <Input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">الحد الأدنى</label>
                  <Input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">سعر الشراء (ج.م)</label>
                  <Input
                    type="number"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">سعر البيع (ج.م)</label>
                  <Input
                    type="number"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="border-border text-foreground hover:bg-muted rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ الصنف"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
