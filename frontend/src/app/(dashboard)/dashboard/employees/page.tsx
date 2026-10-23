"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users, Plus, Search, Phone, Briefcase, MapPin,
  CheckCircle2, ChevronLeft, X, Wallet, ClipboardCheck,
  ShieldCheck, ShieldAlert, KeyRound, Lock, Unlock, Mail,
  Shield, Crown, Building2, Check, AlertCircle, Edit3,
  UserCheck, UserX, Clock, Sparkles, Filter, RefreshCw,
  Eye, EyeOff, Trash2, Key, Copy, CheckCheck, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";

// -------------------------------------------------------------
// Data Types
// -------------------------------------------------------------

interface SystemUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: "GENERAL_MANAGER" | "DEPUTY_MANAGER" | "EMPLOYEE";
  allowedCompanies: string | null;
  displayPassword?: string | null;
  isActive: boolean;
  isLocked: boolean;
  lastLogin: string | null;
  createdAt: string;
}

interface FieldEmployee {
  id: string;
  name: string;
  title: string | null;
  department: string | null;
  phone: string | null;
  isActive: boolean;
  _count: { advances: number; visits: number };
}

const ALL_COMPANIES = [
  {
    code: "A",
    name: "شركة جولدن للحلول المتكاملة",
    shortName: "جولدن (A)",
    badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    activeColor: "bg-blue-600 text-white border-blue-600",
    gradient: "from-blue-600 to-indigo-700",
  },
  {
    code: "B",
    name: "شركة إكسلنت للحلول التكنولوجية",
    shortName: "إكسلنت (B)",
    badgeColor: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    activeColor: "bg-cyan-600 text-white border-cyan-600",
    gradient: "from-cyan-600 to-teal-700",
  },
  {
    code: "C",
    name: "شركة العهد لتوريدات وتكنولوجيا المعلومات",
    shortName: "العهد (C)",
    badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    activeColor: "bg-purple-600 text-white border-purple-600",
    gradient: "from-purple-600 to-indigo-700",
  },
  {
    code: "D",
    name: "شركة الحديثة للأنظمة المتطورة",
    shortName: "الحديثة (D)",
    badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    activeColor: "bg-emerald-600 text-white border-emerald-600",
    gradient: "from-emerald-600 to-teal-700",
  },
];

function parseAllowedCompanies(allowed: string | null | undefined, role: string): string[] {
  if (role === "GENERAL_MANAGER" || allowed === "ALL") {
    return ["A", "B", "C", "D"];
  }
  if (!allowed || allowed === "NONE") return [];
  return allowed
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => ["A", "B", "C", "D"].includes(c));
}

export default function EmployeesPage() {
  // Navigation Tabs: 'users' (System Users & Permissions) | 'field' (Field Staff & HR)
  const [activeTab, setActiveTab] = useState<"users" | "field">("users");

  // Current logged in user info
  const [currentUser, setCurrentUser] = useState<{ role: string; fullName: string } | null>(null);

  // System Users State
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersSearch, setUsersSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  // Create System User Modal
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<"GENERAL_MANAGER" | "DEPUTY_MANAGER" | "EMPLOYEE">("EMPLOYEE");
  const [newCompanies, setNewCompanies] = useState<string[]>(["A"]);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Edit System User Modal
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<"GENERAL_MANAGER" | "DEPUTY_MANAGER" | "EMPLOYEE">("EMPLOYEE");
  const [editCompanies, setEditCompanies] = useState<string[]>([]);
  const [editPassword, setEditPassword] = useState("");
  const [updatingUser, setUpdatingUser] = useState(false);

  // Password Visibility Toggle per user
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Reset Password Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<SystemUser | null>(null);
  const [newResetPassword, setNewResetPassword] = useState("");
  const [showNewResetPassword, setShowNewResetPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Delete User Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Permissions Customization Modal State
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [userForPermissions, setUserForPermissions] = useState<SystemUser | null>(null);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Field Employees State
  const [fieldEmployees, setFieldEmployees] = useState<FieldEmployee[]>([]);
  const [loadingField, setLoadingField] = useState(true);
  const [fieldSearch, setFieldSearch] = useState("");
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDept, setFormDept] = useState("المناقصات والتسعير");
  const [formPhone, setFormPhone] = useState("");
  const [submittingField, setSubmittingField] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch {}
    }
  }, []);

  // Fetch System Users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get("/users");
      setSystemUsers(res.data);
    } catch {
      // GM required; if unauthorized, fallback smoothly
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Field Staff
  const fetchFieldEmployees = async () => {
    setLoadingField(true);
    try {
      const res = await api.get(`/employees?search=${encodeURIComponent(fieldSearch)}`);
      setFieldEmployees(res.data);
    } catch {
      // Fallback
    } finally {
      setLoadingField(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchFieldEmployees();
  }, [fieldSearch]);

  // Filtered System Users
  const filteredUsers = useMemo(() => {
    return systemUsers.filter((u) => {
      const allowed = parseAllowedCompanies(u.allowedCompanies, u.role);
      const matchesSearch =
        !usersSearch ||
        u.fullName?.toLowerCase().includes(usersSearch.toLowerCase()) ||
        u.username?.toLowerCase().includes(usersSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(usersSearch.toLowerCase()) ||
        (u.phone && u.phone.includes(usersSearch));

      const matchesRole = roleFilter === "all" || u.role === roleFilter;

      const matchesCompany =
        companyFilter === "all" ||
        u.role === "GENERAL_MANAGER" ||
        allowed.includes(companyFilter);

      return matchesSearch && matchesRole && matchesCompany;
    });
  }, [systemUsers, usersSearch, roleFilter, companyFilter]);

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newUsername.trim() || !newEmail.trim() || !newPassword) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setSubmittingUser(true);
    try {
      const allowedStr =
        newRole === "GENERAL_MANAGER" || newCompanies.length === 4
          ? "ALL"
          : newCompanies.length > 0
          ? newCompanies.join(",")
          : "NONE";

      await api.post("/users", {
        fullName: newFullName.trim(),
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
        phone: newPhone.trim() || undefined,
        role: newRole,
        allowedCompanies: allowedStr,
      });

      toast.success("تم إنشاء الحساب وتعيين الصلاحيات بنجاح!");
      setCreateUserModalOpen(false);
      setNewFullName("");
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      setNewPhone("");
      setNewRole("EMPLOYEE");
      setNewCompanies(["A"]);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء إنشاء الحساب");
    } finally {
      setSubmittingUser(false);
    }
  };

  // Open Edit User Modal
  const openEditModal = (u: SystemUser) => {
    setEditingUserId(u.id);
    setEditFullName(u.fullName);
    setEditEmail(u.email);
    setEditPhone(u.phone || "");
    setEditRole(u.role);
    setEditCompanies(parseAllowedCompanies(u.allowedCompanies, u.role));
    setEditPassword("");
    setEditUserModalOpen(true);
  };

  // Save Edited User
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    setUpdatingUser(true);
    try {
      const allowedStr =
        editRole === "GENERAL_MANAGER" || editCompanies.length === 4
          ? "ALL"
          : editCompanies.length > 0
          ? editCompanies.join(",")
          : "NONE";

      const payload: Record<string, any> = {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || undefined,
        role: editRole,
        allowedCompanies: allowedStr,
      };

      if (editPassword && editPassword.trim().length >= 6) {
        payload.password = editPassword.trim();
      }

      await api.patch(`/users/${editingUserId}`, payload);

      toast.success("تم تحديث بيانات المستخدم وصلاحيات الشركات بنجاح!");
      setEditUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء تعديل بيانات المستخدم");
    } finally {
      setUpdatingUser(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Copy to clipboard helper
  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label} إلى الحافظة بنجاح!`);
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (user: SystemUser) => {
    if (user.role === "GENERAL_MANAGER" || user.username === "admin") {
      toast.error("كلمة مرور حساب المدير العام ثابتة ومحصنة من التغيير لمنع نسيانها وفقدان صلاحيات الإدارة");
      return;
    }
    setUserToReset(user);
    setNewResetPassword("");
    setShowNewResetPassword(false);
    setResetModalOpen(true);
  };

  // Confirm Reset Password
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToReset) return;
    if (!newResetPassword || newResetPassword.trim().length < 6) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setResettingPassword(true);
    try {
      await api.patch(`/users/${userToReset.id}`, {
        password: newResetPassword.trim(),
      });
      toast.success(`تم تحديث كلمة مرور حساب ${userToReset.fullName} بنجاح!`);
      setResetModalOpen(false);
      setUserToReset(null);
      setNewResetPassword("");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل تغيير كلمة المرور");
    } finally {
      setResettingPassword(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (user: SystemUser) => {
    if (user.role === "GENERAL_MANAGER" || user.username === "admin") {
      toast.error("حساب المدير العام محصّن ضد الحذف نهائياً لضمان استقرار المنظومة");
      return;
    }
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  // Confirm Delete User
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    setDeletingUser(true);
    try {
      await api.delete(`/users/${userToDelete.id}`);
      toast.success(`تم حذف حساب ${userToDelete.fullName} بنجاح`);
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل حذف الحساب");
    } finally {
      setDeletingUser(false);
    }
  };

  // Open Permissions Modal
  const openPermissionsModal = (u: SystemUser) => {
    setUserForPermissions(u);
    setPermissionsModalOpen(true);

    const fallbackList = [
      // Radar
      { code: "radar.scan", name: "سحب وفحص الرادار", module: "radar", description: "البحث وسحب المناقصات والعمليات من بوابة المشتريات" },
      { code: "radar.analyze", name: "التحليل الذكي لكراسات الشروط", module: "radar", description: "تحليل المتطلبات الفنية والبنود باستخدام الذكاء الاصطناعي" },
      { code: "radar.export", name: "تصدير فرص الرادار", module: "radar", description: "تصدير نتائج وفحص المناقصات بصيغ خارجية" },
      // Operations
      { code: "operation.create", name: "إنشاء عملية ومناقصة جديدة", module: "operations", description: "إضافة وتأسيس عمليات ومناقصات جديدة بالنظام" },
      { code: "operation.data_entry", name: "إدخال وحفظ بيانات المراحل", module: "operations", description: "إدخال بيانات مراحل مسار العملية وحفظ المسودات" },
      { code: "operation.stage_approve", name: "اعتماد وقفل المراحل", module: "operations", description: "مراجعة واعتماد المراحل للموظفين وقفلها رسمياً" },
      { code: "operation.edit", name: "تعديل العمليات", module: "operations", description: "تعديل البيانات الأساسية للعمليات والمشاريع" },
      { code: "operation.view", name: "عرض العمليات", module: "operations", description: "استعراض تفاصيل مسار العمليات" },
      { code: "operation.delete", name: "حذف وأرشفة العمليات", module: "operations", description: "حذف أو أرشفة ملفات العمليات" },
      // Approvals & Print
      { code: "approval.request", name: "تقديم طلبات اعتماد الطباعة", module: "approvals", description: "إرسال طلبات اعتماد طباعة الخطابات للإدارة" },
      { code: "approval.approve", name: "اعتماد الطباعة وتوليد الهاش", module: "approvals", description: "الموافقة على طباعة المستندات وتوليد رمز الحوكمة 32 خانة" },
      { code: "approval.instant", name: "إصدار أمر طباعة معتمد فوري", module: "approvals", description: "إصدار أوامر طباعة فورية للمدير العام" },
      { code: "document.print", name: "طباعة المستندات المعتمدة", module: "documents", description: "طباعة الخطابات والقوالب التي تم اعتمادها رسمياً" },
      { code: "document.view", name: "معاينة المستندات", module: "documents", description: "معاينة القوالب والمستندات الرسمية المعتمدة" },
      // Finance & Guarantees
      { code: "finance.entry", name: "إدخال الدفعات والمصروفات", module: "finance", description: "تسجيل الدفعات والمستخلصات والمصروفات" },
      { code: "finance.approve", name: "اعتماد الميزانيات وتدقيق النفقات", module: "finance", description: "اعتماد الموازنات وتدقيق النفقات ونسب الاستهلاك" },
      { code: "finance.view", name: "عرض البيانات المالية", module: "finance", description: "استعراض التدفقات النقدية وميزانيات المشاريع" },
      { code: "finance.export", name: "تصدير التقارير المالية CSV", module: "finance", description: "تصدير كشوف الحسابات بصيغة CSV" },
      { code: "guarantee.manage", name: "إدارة خطابات الضمان البنكية", module: "guarantees", description: "إصدار ومتابعة وتجديد واسترداد الضمانات الابتدائية والنهائية" },
      // Visits
      { code: "visit.create", name: "تسجيل زيارات المعاينات الميدانية", module: "visits", description: "إدخال تقارير معاينات المواقع" },
      { code: "visit.view", name: "عرض تقارير المعاينات", module: "visits", description: "الاطلاع على تقارير المعاينات الميدانية" },
      // Users & Administration
      { code: "user.manage", name: "إدارة وتعديل المستخدمين", module: "users", description: "إنشاء وتعديل وإلغاء قفل حسابات الموظفين" },
      { code: "permission.assign", name: "تخصيص وتعديل الصلاحيات", module: "users", description: "تحديد صلاحيات دقيقة لكل مستخدم" },
      { code: "audit.view", name: "عرض سجل التدقيق والرقابة", module: "audit", description: "متابعة سجل حركات النظام والأمان والحوكمة" },
      { code: "settings.manage", name: "إدارة إعدادات المنظومة", module: "settings", description: "تعديل بيانات الشركات والإعدادات العامة" },
    ];

    // Populated immediately for instant 0ms rendering
    setAllPermissions(fallbackList);

    if (u.role === "GENERAL_MANAGER") {
      setSelectedPermissions(fallbackList.map((x) => x.code));
    } else if (u.role === "DEPUTY_MANAGER") {
      setSelectedPermissions(
        fallbackList
          .filter((x) => !["user.manage", "permission.assign", "approval.instant"].includes(x.code))
          .map((x) => x.code)
      );
    } else {
      setSelectedPermissions([
        "operation.data_entry",
        "operation.view",
        "approval.request",
        "document.view",
        "finance.entry",
        "finance.view",
        "visit.create",
        "visit.view",
      ]);
    }

    setLoadingPermissions(false);

    // Sync in background without blocking
    api.get(`/users/${u.id}/permissions`)
      .then((userRes) => {
        if (Array.isArray(userRes.data) && userRes.data.length > 0) {
          setSelectedPermissions(userRes.data);
        }
      })
      .catch(() => {});
  };

  // Save Permissions
  const handleSavePermissions = async () => {
    if (!userForPermissions) return;
    setSavingPermissions(true);
    try {
      await api.post(`/users/${userForPermissions.id}/permissions`, {
        permissions: selectedPermissions,
      });
      toast.success(`تم حفظ وتطبيق مصفوفة الصلاحيات لحساب "${userForPermissions.fullName}" بنجاح! 🛡️`);
      setPermissionsModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل حفظ وتطبيق الصلاحيات");
    } finally {
      setSavingPermissions(false);
    }
  };

  // Toggle Active State
  const handleToggleActive = async (user: SystemUser) => {
    if (user.role === "GENERAL_MANAGER" || user.username === "admin") {
      toast.error("لا يمكن تعطيل حساب المدير العام الرئيسي");
      return;
    }

    try {
      await api.patch(`/users/${user.id}/toggle-active`);
      toast.success(
        user.isActive ? `تم إيقاف حساب ${user.fullName}` : `تم تفعيل حساب ${user.fullName} بنجاح`
      );
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل تغيير حالة الحساب");
    }
  };

  // Unlock User Account
  const handleUnlockUser = async (user: SystemUser) => {
    try {
      await api.patch(`/users/${user.id}/unlock`);
      toast.success(`تم فك حظر وقفل حساب ${user.fullName} بنجاح`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل فك قفل الحساب");
    }
  };

  // Create Field Employee Handler
  const handleCreateFieldEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("يرجى إدخال اسم الموظف");
      return;
    }

    setSubmittingField(true);
    try {
      await api.post("/employees", {
        name: formName,
        title: formTitle || undefined,
        department: formDept || undefined,
        phone: formPhone || undefined,
      });
      toast.success("تمت إضافة الموظف بنجاح");
      setFieldModalOpen(false);
      setFormName("");
      setFormTitle("");
      setFormPhone("");
      fetchFieldEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء إضافة الموظف");
    } finally {
      setSubmittingField(false);
    }
  };

  // Stats calculation
  const totalUsers = systemUsers.length;
  const managersCount = systemUsers.filter((u) => u.role === "GENERAL_MANAGER" || u.role === "DEPUTY_MANAGER").length;
  const employeesCount = systemUsers.filter((u) => u.role === "EMPLOYEE").length;
  const activeCount = systemUsers.filter((u) => u.isActive && !u.isLocked).length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              فريق العمل وإدارة المستخدمين والصلاحيات
            </h1>
            <Badge className="bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-bold">
              {totalUsers} حساب مسجل
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            التحكم في بيانات دخول الموظفين، تحديد الشركات المفتوحة والمصرح بها (A, B, C, D)، وإدارة الصلاحيات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateUserModalOpen(true)}
            className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 royal-glow flex items-center gap-2 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
          >
            <KeyRound className="h-4 w-4" />
            <span>إضافة مستخدم جديد للنظام</span>
          </Button>
        </div>
      </div>

      {/* Primary Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "users"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>حسابات النظام وبيانات الدخول والصلاحيات</span>
          <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-white text-[11px] font-mono">
            {systemUsers.length}
          </span>
        </button>

        {/* سجلات الكادر الميداني والعهد تم إخفاؤها من الواجهة بناء على طلب الإدارة مع الاحتفاظ بالكود البرمجي بالكامل */}
        {false && (
          <button
            onClick={() => setActiveTab("field")}
            className="hidden items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold"
          >
            <Users className="h-4 w-4" />
            <span>سجلات الكادر الميداني والعهد</span>
            <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-white text-[11px] font-mono">
              {fieldEmployees.length}
            </span>
          </button>
        )}
      </div>

      {/* ============================================================= */}
      {/* TAB 1: SYSTEM USERS & COMPANY PERMISSIONS                     */}
      {/* ============================================================= */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
              <span className="text-xs text-muted-foreground font-bold">إجمالي الحسابات</span>
              <p className="text-2xl font-black text-foreground mt-1 font-mono">{totalUsers}</p>
              <span className="text-[11px] text-muted-foreground mt-1 block">مسجلين في المنظومة</span>
            </div>

            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">الإدارة العليا</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                {managersCount}
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block">مدير عام ونائب مدير</span>
            </div>

            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">الموظفين ومدخلو البيانات</span>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
                {employeesCount}
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block">صلاحيات محددة بالشركات</span>
            </div>

            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">الحسابات النشطة</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                {activeCount}
              </p>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">جاهزة لتسجيل الدخول</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="glass-card rounded-2xl p-3 sm:p-4 border border-border space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث باسم الموظف، اسم الدخول، الإيميل، أو الهاتف..."
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  className="pr-10 pl-9 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm h-10"
                />
                {usersSearch && (
                  <button
                    onClick={() => setUsersSearch("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Role Filter */}
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
                <SelectTrigger className="w-full sm:w-[180px] bg-muted/40 border-border text-foreground rounded-xl h-10 text-xs sm:text-sm">
                  <Shield className="h-4 w-4 ml-2 text-blue-600 dark:text-blue-400" />
                  <SelectValue placeholder="الدور الإداري">
                    {roleFilter === "all"
                      ? "كافة الأدوار"
                      : roleFilter === "GENERAL_MANAGER"
                      ? "مدير عام"
                      : roleFilter === "DEPUTY_MANAGER"
                      ? "نائب مدير"
                      : "موظف"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground solid-dropdown">
                  <SelectItem value="all">كافة الأدوار</SelectItem>
                  <SelectItem value="GENERAL_MANAGER">مدير عام</SelectItem>
                  <SelectItem value="DEPUTY_MANAGER">نائب مدير</SelectItem>
                  <SelectItem value="EMPLOYEE">موظف / إدخال</SelectItem>
                </SelectContent>
              </Select>

              {/* Company Access Filter */}
              <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v ?? "all")}>
                <SelectTrigger className="w-full sm:w-[200px] bg-muted/40 border-border text-foreground rounded-xl h-10 text-xs sm:text-sm">
                  <Building2 className="h-4 w-4 ml-2 text-blue-600 dark:text-blue-400" />
                  <SelectValue placeholder="صلاحية الشركة">
                    {companyFilter === "all" ? "كافة الشركات المصرح بها" : `مصرح بشركة (${companyFilter})`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground solid-dropdown">
                  <SelectItem value="all">كافة الشركات المصرح بها</SelectItem>
                  {ALL_COMPANIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.shortName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* System Users Cards */}
          {loadingUsers ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card rounded-2xl p-5 border border-border animate-pulse h-48" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-border space-y-3">
              <KeyRound className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-base font-bold text-foreground">لا يوجد مستخدمين مسجلين يطابقون البحث</h3>
              <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mx-auto">
                يمكنك إضافة حساب جديد وتحديد صلاحيات الشركات المسموح له بإنشاء العمليات عليها
              </p>
              <Button
                onClick={() => setCreateUserModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs mt-2"
              >
                <KeyRound className="h-4 w-4 ml-1.5" />
                <span>إضافة مستخدم جديد الآن</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((u) => {
                const allowedList = parseAllowedCompanies(u.allowedCompanies, u.role);
                const isGM = u.role === "GENERAL_MANAGER";
                const isDeputy = u.role === "DEPUTY_MANAGER";

                return (
                  <div
                    key={u.id}
                    className="glass-card-interactive rounded-2xl p-5 border border-border hover:border-blue-500/50 flex flex-col justify-between space-y-4 group relative"
                  >
                    <div>
                      {/* Top Info & Avatar */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 ring-2 ring-blue-500/20 shadow-md">
                            <AvatarFallback
                              className={`text-white font-black text-base ${
                                isGM
                                  ? "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700"
                                  : isDeputy
                                  ? "bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-800"
                                  : "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800"
                              }`}
                            >
                              {u.fullName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-foreground text-base group-hover:text-blue-600 transition-colors">
                                {u.fullName}
                              </h3>
                              {isGM && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                              <span className="text-blue-600 dark:text-blue-400 font-bold">@</span>
                              <span>{u.username}</span>
                            </div>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={
                              isGM
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-bold"
                                : isDeputy
                                ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[11px] font-bold"
                                : "bg-muted text-muted-foreground border-border text-[11px] font-bold"
                            }
                          >
                            {isGM ? "مدير عام" : isDeputy ? "نائب مدير" : "موظف"}
                          </Badge>

                          <div className="flex items-center gap-1">
                            {u.isLocked ? (
                              <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px]">
                                مقفل
                              </Badge>
                            ) : u.isActive ? (
                              <Badge className="badge-emerald text-[10px]">نشط</Badge>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground text-[10px]">معطل</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contact Details */}
                      <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl p-2.5 border border-border/60">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate font-mono">{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <a href={`tel:${u.phone}`} className="hover:text-blue-600 font-mono">
                              {u.phone}
                            </a>
                          </div>
                        )}
                        {u.lastLogin && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>آخر دخول: {new Date(u.lastLogin).toLocaleDateString("ar-EG")}</span>
                          </div>
                        )}
                      </div>

                      {/* Credentials & Password Box (طلب العميل: تحسين الوضع الفاتح Light Mode ومظهر بيانات الدخول) */}
                      <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/70 via-slate-50 to-amber-50/30 dark:from-slate-900/90 dark:to-slate-950 border border-blue-200/70 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                            <span>بيانات الدخول الحالية:</span>
                          </span>
                          {isGM ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                              👑 حساب محمي
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                              صلاحيات قابلة للإدارة
                            </span>
                          )}
                        </div>

                        {/* Username row */}
                        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900/90 p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs text-xs font-mono">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] shrink-0 font-sans font-bold">المستخدم:</span>
                            <span className="font-extrabold text-blue-700 dark:text-blue-400 truncate select-all">@{u.username}</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyText(u.username, "اسم المستخدم")}
                            className="h-6 w-6 p-0 text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700/60"
                            title="نسخ اسم المستخدم"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Password row */}
                        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900/90 p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs text-xs font-mono">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] shrink-0 font-sans font-bold">كلمة المرور:</span>
                            {visiblePasswords[u.id] ? (
                              <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800/60 select-all tracking-wider font-mono">
                                {u.displayPassword || "••••••••"}
                              </span>
                            ) : (
                              <span className="text-slate-700 dark:text-slate-300 tracking-widest text-sm font-black select-none">••••••••</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="h-6 w-6 p-0 text-slate-600 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                              title={visiblePasswords[u.id] ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                            >
                              {visiblePasswords[u.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                            </Button>

                            {u.displayPassword && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyText(u.displayPassword!, "كلمة المرور")}
                                className="h-6 w-6 p-0 text-slate-600 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                                title="نسخ كلمة المرور"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {isGM && (
                          <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/40 rounded-xl p-2 font-sans flex items-center gap-1.5 pt-1">
                            <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
                            <span>كلمة مرور المدير العام ثابتة ومحصنة لمنع نسيانها وفقدان الوصول.</span>
                          </div>
                        )}
                      </div>

                      {/* Companies Allowed Badges (Key Requirement!) */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-foreground flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span>الشركات المصرح بها لإنشاء وإدارة العمليات:</span>
                          </span>
                        </div>

                        {isGM ? (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                            <Crown className="h-4 w-4 shrink-0 text-amber-500" />
                            <span>وصول شامل لكافة الشركات الأربعة (A, B, C, D) تلقائياً 🌟</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5">
                            {ALL_COMPANIES.map((c) => {
                              const isAllowed = allowedList.includes(c.code);
                              return (
                                <div
                                  key={c.code}
                                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-between transition-all ${
                                    isAllowed
                                      ? c.badgeColor
                                      : "bg-slate-100/90 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium"
                                  }`}
                                >
                                  <span className="truncate">{c.shortName}</span>
                                  {isAllowed ? (
                                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Lock className="h-3 w-3 shrink-0 text-slate-400" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Row (تعديل، تغيير باسورد، تعطيل/تفعيل، فك قفل، حذف) */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(u)}
                        className="flex-1 min-w-[70px] bg-muted/40 hover:bg-blue-600 hover:text-white border-border text-foreground rounded-xl text-xs font-bold h-8 transition-colors cursor-pointer flex items-center justify-center gap-1"
                        title="تعديل الصلاحيات وبيانات الحساب"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>تعديل</span>
                      </Button>

                      {/* Password Reset Action */}
                      {isGM ? (
                        <div
                          className="h-8 px-2 rounded-xl text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 flex items-center gap-1 select-none"
                          title="كلمة مرور المدير العام ثابتة ومحمية من التغيير"
                        >
                          <Lock className="h-3 w-3 text-amber-500" />
                          <span>باسورد ثابت</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openResetPasswordModal(u)}
                          className="h-8 px-2.5 rounded-xl text-xs border border-blue-500/30 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 font-bold cursor-pointer transition-colors flex items-center gap-1"
                          title="تغيير كلمة المرور لهذا المستخدم"
                        >
                          <Key className="h-3.5 w-3.5" />
                          <span>تغيير الباسورد</span>
                        </Button>
                      )}

                      {/* Active/Inactive Toggle */}
                      {!isGM && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(u)}
                          title={u.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                          className={`h-8 px-2.5 rounded-xl text-xs border cursor-pointer ${
                            u.isActive
                              ? "hover:bg-rose-500/15 hover:text-rose-600 border-border text-muted-foreground"
                              : "hover:bg-emerald-500/15 hover:text-emerald-600 border-border text-emerald-600 font-bold"
                          }`}
                        >
                          {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </Button>
                      )}

                      {/* Unlock button */}
                      {u.isLocked && (
                        <Button
                          size="sm"
                          onClick={() => handleUnlockUser(u)}
                          title="فك قفل الحساب"
                          className="h-8 px-2.5 rounded-xl text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-white cursor-pointer"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Delete Account Button */}
                      {isGM ? (
                        <span
                          className="h-8 px-2 rounded-xl text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 flex items-center gap-1 select-none"
                          title="حساب المدير العام محصّن ضد الحذف نهائياً"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                          <span>محصّن</span>
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDeleteModal(u)}
                          title="حذف هذا الحساب نهائياً من المنظومة"
                          className="h-8 px-2 rounded-xl text-xs border border-rose-500/30 text-rose-600 hover:bg-rose-600 hover:text-white cursor-pointer transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* زر إدارة وتخصيص الصلاحيات المتقدمة */}
                    <Button
                      size="sm"
                      onClick={() => openPermissionsModal(u)}
                      className="w-full mt-2.5 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 hover:from-blue-800 hover:to-indigo-700 text-white font-black rounded-xl text-xs h-9 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                      title="تخصيص وتحديد صلاحيات الحساب التفصيلية"
                    >
                      <Shield className="h-4 w-4" />
                      <span>تخصيص الصلاحيات المتقدمة 🛡️</span>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: FIELD STAFF & HR RECORDS                               */}
      {/* ============================================================= */}
      {activeTab === "field" && (
        <div className="space-y-6">
          {/* Field Staff Search */}
          <div className="glass-card rounded-2xl p-4 border border-border">
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم الموظف الميداني، المسمى، أو الهاتف..."
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm h-10"
              />
            </div>
          </div>

          {/* Field Employees Grid */}
          {loadingField ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card rounded-2xl p-5 border border-border animate-pulse h-36" />
              ))}
            </div>
          ) : fieldEmployees.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-border space-y-3">
              <Users className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-base font-bold text-foreground">لا يوجد موظفين ميدانيين مسجلين</h3>
              <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mx-auto">
                قم بإضافة مسؤولي التسعير والمشتريات والمهندسين لربطهم بعمليات المناقصات والزيارات
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fieldEmployees.map((e) => (
                <div
                  key={e.id}
                  className="glass-card-interactive rounded-2xl p-5 border border-border hover:border-blue-500/50 flex flex-col justify-between space-y-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 ring-1 ring-blue-500/30">
                          <AvatarFallback className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white font-black text-sm">
                            {e.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-foreground text-base group-hover:text-blue-600 transition-colors">
                            {e.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">{e.title || "موظف"}</p>
                        </div>
                      </div>

                      <Badge
                        className={
                          e.isActive
                            ? "badge-emerald text-[11px]"
                            : "bg-muted text-muted-foreground border border-border text-[11px]"
                        }
                      >
                        {e.isActive ? "نشط" : "معطل"}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>القسم: {e.department || "عام"}</span>
                      </div>
                      {e.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <a href={`tel:${e.phone}`} className="hover:text-blue-600 font-mono">
                            {e.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ClipboardCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      {e._count.visits} زيارة ميدانية
                    </span>
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5 text-blue-500" />
                      {e._count.advances} عهدة
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 1: ADD NEW SYSTEM USER & ASSIGN COMPANIES              */}
      {/* ============================================================= */}
      {createUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="glass-panel rounded-3xl p-6 border border-border max-w-lg w-full shadow-2xl space-y-4 animate-scale-up my-8">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>إضافة مستخدم جديد للنظام وتحديد الصلاحيات</span>
              </h3>
              <button
                onClick={() => setCreateUserModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">الاسم الكامل *</label>
                  <Input
                    required
                    placeholder="مثال: م. أحمد عبد العزيز"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="bg-muted/40 border-border text-foreground rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">اسم المستخدم للدخول *</label>
                  <Input
                    required
                    placeholder="مثال: ahmed_tenders"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="bg-muted/40 border-border text-foreground rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">البريد الإلكتروني *</label>
                  <Input
                    required
                    type="email"
                    placeholder="ahmed@goldenerp.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="bg-muted/40 border-border text-foreground rounded-xl text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">رقم الهاتف</label>
                  <Input
                    placeholder="01XXXXXXXXX"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="bg-muted/40 border-border text-foreground rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">كلمة المرور الابتدائية *</label>
                <Input
                  required
                  type="password"
                  placeholder="لا تقل عن 6 أحرف أو أرقام"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-muted/40 border-border text-foreground rounded-xl text-sm font-mono"
                />
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">الدور الوظيفي في النظام *</label>
                <select
                  value={newRole}
                  onChange={(e) => {
                    const r = e.target.value as any;
                    setNewRole(r);
                    if (r === "GENERAL_MANAGER") {
                      setNewCompanies(["A", "B", "C", "D"]);
                    }
                  }}
                  className="w-full h-10 bg-muted/40 border border-border text-foreground rounded-xl px-3 text-sm focus:border-blue-500"
                >
                  <option value="EMPLOYEE">موظف / مدخل بيانات (صلاحية مقيدة بالشركات المحددة فقط)</option>
                  <option value="DEPUTY_MANAGER">نائب مدير (اعتماد طباعة + شركات محددة)</option>
                  <option value="GENERAL_MANAGER">مدير عام (كافة الصلاحيات والشركات تلقائياً)</option>
                </select>
              </div>

              {/* Company Permissions Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    الشركات المسموح للمستخدم العمل عليها:
                  </label>
                  {newRole !== "GENERAL_MANAGER" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewCompanies(["A", "B", "C", "D"])}
                        className="text-[11px] text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-muted-foreground text-xs">•</span>
                      <button
                        type="button"
                        onClick={() => setNewCompanies([])}
                        className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                  )}
                </div>

                {newRole === "GENERAL_MANAGER" ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                    <Crown className="h-4 w-4 shrink-0" />
                    <span>المدير العام يمتلك حق الوصول وإدارة كافة الشركات الأربعة (A, B, C, D) تلقائياً.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_COMPANIES.map((comp) => {
                      const isChecked = newCompanies.includes(comp.code);
                      return (
                        <label
                          key={comp.code}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? `${comp.badgeColor} border-current font-bold shadow-xs`
                              : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewCompanies([...newCompanies, comp.code]);
                              } else {
                                setNewCompanies(newCompanies.filter((c) => c !== comp.code));
                              }
                            }}
                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <div className="text-xs">
                            <span className="block font-bold">{comp.shortName}</span>
                            <span className="text-[10px] opacity-75">{comp.name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateUserModalOpen(false)}
                  className="border-border text-foreground hover:bg-muted rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={submittingUser}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  {submittingUser ? "جاري الإنشاء..." : "حفظ الحساب والصلاحيات"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: EDIT SYSTEM USER & UPDATE PERMISSIONS                */}
      {/* ============================================================= */}
      {editUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="glass-panel rounded-3xl p-6 border border-border max-w-lg w-full shadow-2xl space-y-4 animate-scale-up my-8">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>تعديل صلاحيات المستخدم والشركات المصرحة</span>
              </h3>
              <button
                onClick={() => setEditUserModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">الاسم الكامل *</label>
                  <Input
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="bg-muted/40 border-border text-foreground rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">البريد الإلكتروني *</label>
                  <Input
                    required
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="bg-muted/40 border-border text-foreground rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">رقم الهاتف</label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="bg-muted/40 border-border text-foreground rounded-xl text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">الدور الوظيفي *</label>
                  {editRole === "GENERAL_MANAGER" ? (
                    <div className="w-full h-10 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl px-3 text-xs font-bold flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>المدير العام (لا يمكن تغيير رتبة الإدارة العليا)</span>
                    </div>
                  ) : (
                    <select
                      value={editRole}
                      onChange={(e) => {
                        const r = e.target.value as any;
                        setEditRole(r);
                        if (r === "GENERAL_MANAGER") {
                          setEditCompanies(["A", "B", "C", "D"]);
                        }
                      }}
                      className="w-full h-10 bg-muted/40 border border-border text-foreground rounded-xl px-3 text-sm focus:border-blue-500"
                    >
                      <option value="EMPLOYEE">موظف / إدخال بيانات (مقيد بشركات محددة)</option>
                      <option value="DEPUTY_MANAGER">نائب مدير (اعتماد طباعة + شركات محددة)</option>
                      <option value="GENERAL_MANAGER">مدير عام (كافة الصلاحيات والشركات)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Password update (optional) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  تعيين كلمة مرور جديدة
                </label>
                {editRole === "GENERAL_MANAGER" ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                    <Lock className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>كلمة مرور المدير العام ثابتة ومحصنة من التغيير لضمان عدم فقدان الصلاحيات أو النسيان.</span>
                  </div>
                ) : (
                  <Input
                    type="password"
                    placeholder="اترك فارغاً للاحتفاظ بكلمة المرور الحالية"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="bg-muted/40 border-border text-foreground rounded-xl text-sm font-mono"
                  />
                )}
              </div>

              {/* Company Permissions Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    الشركات المصرح لهذا المستخدم بإدارتها وعرضها:
                  </label>
                  {editRole !== "GENERAL_MANAGER" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditCompanies(["A", "B", "C", "D"])}
                        className="text-[11px] text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-muted-foreground text-xs">•</span>
                      <button
                        type="button"
                        onClick={() => setEditCompanies([])}
                        className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                  )}
                </div>

                {editRole === "GENERAL_MANAGER" ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                    <Crown className="h-4 w-4 shrink-0" />
                    <span>المدير العام يمتلك حق الوصول لجميع الشركات الأربعة تلقائياً وبشكل كامل.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_COMPANIES.map((comp) => {
                      const isChecked = editCompanies.includes(comp.code);
                      return (
                        <label
                          key={comp.code}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? `${comp.badgeColor} border-current font-bold shadow-xs`
                              : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditCompanies([...editCompanies, comp.code]);
                              } else {
                                setEditCompanies(editCompanies.filter((c) => c !== comp.code));
                              }
                            }}
                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <div className="text-xs">
                            <span className="block font-bold">{comp.shortName}</span>
                            <span className="text-[10px] opacity-75">{comp.name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditUserModalOpen(false)}
                  className="border-border text-foreground hover:bg-muted rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={updatingUser}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  {updatingUser ? "جاري الحفظ..." : "تطبيق الصلاحيات والتعديلات"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: RESET PASSWORD (تغيير كلمة المرور للمستخدم)           */}
      {/* ============================================================= */}
      {resetModalOpen && userToReset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 border border-border max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>تغيير كلمة المرور وتعيين باسورد جديد</span>
              </h3>
              <button
                onClick={() => setResetModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">المستخدم المستهدف:</span>
                  <span className="font-bold text-foreground">{userToReset.fullName}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-mono">(@{userToReset.username})</span>
                </div>

                {userToReset.displayPassword && (
                  <div className="flex items-center justify-between text-xs bg-background/80 p-2 rounded-xl border border-border/60">
                    <span className="text-muted-foreground text-[11px]">الباسورد الحالي المسجل:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                      {userToReset.displayPassword}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  كلمة المرور الجديدة (6 أحرف أو أرقام على الأقل) *
                </label>
                <div className="relative">
                  <Input
                    required
                    type={showNewResetPassword ? "text" : "password"}
                    placeholder="اكتب كلمة المرور الجديدة هنا..."
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    className="pl-10 bg-muted/40 border-border text-foreground rounded-xl text-sm font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewResetPassword(!showNewResetPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-blue-600 cursor-pointer"
                    title={showNewResetPassword ? "إخفاء" : "إظهار"}
                  >
                    {showNewResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  سيتم حفظ كلمة المرور الجديدة وتحديثها في المنظومة لتتمكن من رؤيتها في أي وقت.
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetModalOpen(false)}
                  className="border-border text-foreground hover:bg-muted rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={resettingPassword || !newResetPassword || newResetPassword.length < 6}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>{resettingPassword ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: DELETE USER CONFIRMATION (حذف حساب مستخدم)            */}
      {/* ============================================================= */}
      {deleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 border border-rose-500/30 max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">تأكيد حذف الحساب نهائياً</h3>
                <p className="text-xs text-muted-foreground">إجراء إداري لا يمكن التراجع عنه</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs">
              <p className="text-foreground leading-relaxed">
                هل أنت متأكد من رغبتك في حذف حساب المستخدم{" "}
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {userToDelete.fullName} (@{userToDelete.username})
                </span>
                ؟
              </p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                سيتم إلغاء وصول هذا المستخدم فوراً وحذف تسجيل دخوله وصلاحياته في النظام بشكل نهائي.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                className="border-border text-foreground hover:bg-muted rounded-xl text-xs cursor-pointer"
              >
                إلغاء التراجع
              </Button>
              <Button
                type="button"
                disabled={deletingUser}
                onClick={handleConfirmDeleteUser}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deletingUser ? "جاري الحذف..." : "تأكيد الحذف نهائياً"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 3: ADD FIELD EMPLOYEE                                   */}
      {/* ============================================================= */}
      {fieldModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 border border-border max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>إضافة كادر ميداني جديد</span>
              </h3>
              <button
                onClick={() => setFieldModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFieldEmployee} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">الاسم بالكامل *</label>
                <Input
                  required
                  placeholder="مثال: أحمد محمود إبراهيم"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-muted/40 border-border text-foreground rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">المسمى الوظيفي</label>
                <Input
                  placeholder="مهندس تسعير / مسؤول مشتريات / فني شبكات"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="bg-muted/40 border-border text-foreground rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">الإدارة / القسم</label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="w-full h-10 bg-muted/40 border border-border text-foreground rounded-xl px-3 text-sm focus:border-blue-500"
                >
                  <option value="المناقصات والتسعير">المناقصات والتسعير</option>
                  <option value="المشتريات والموردين">المشتريات والموردين</option>
                  <option value="المخازن والتوريد">المخازن والتوريد</option>
                  <option value="المالية والحسابات">المالية والحسابات</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">رقم الهاتف للتواصل</label>
                <Input
                  placeholder="01XXXXXXXXX"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="bg-muted/40 border-border text-foreground rounded-xl text-sm font-mono"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFieldModalOpen(false)}
                  className="border-border text-foreground hover:bg-muted rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={submittingField}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  {submittingField ? "جاري الحفظ..." : "حفظ الموظف"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 4: ADVANCED PERMISSIONS MANAGEMENT (مصفوفة الصلاحيات)   */}
      {/* ============================================================= */}
      {permissionsModalOpen && userForPermissions && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl space-y-5 animate-scale-up my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-foreground">
                      إدارة وتخصيص الصلاحيات المتقدمة
                    </h3>
                    <Badge
                      className={
                        userForPermissions.role === "GENERAL_MANAGER"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold"
                          : userForPermissions.role === "DEPUTY_MANAGER"
                          ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-xs font-bold"
                          : "bg-muted text-muted-foreground border-border text-xs font-bold"
                      }
                    >
                      {userForPermissions.role === "GENERAL_MANAGER"
                        ? "👑 مدير عام"
                        : userForPermissions.role === "DEPUTY_MANAGER"
                        ? "نائب مدير"
                        : "موظف مسؤول"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    تحديد الصلاحيات الدقيقة لحساب: <strong className="text-foreground">{userForPermissions.fullName}</strong> (@{userForPermissions.username})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPermissionsModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* General Manager Full Permission Banner */}
            {userForPermissions.role === "GENERAL_MANAGER" && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
                <Crown className="h-5 w-5 text-amber-500 shrink-0" />
                <span>
                  <strong>حساب المدير العام:</strong> يمتلك بطبيعته الإدارية كافة صلاحيات المنظومة الكاملة وغير المقيدة (إدخال، تعديل، ضبط، سحب من الرادار، اعتماد المراحل، إصدار وتوليد الهاش، والتحكم الشامل).
                </span>
              </div>
            )}

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-muted/40 border border-border">
              <span className="text-xs font-bold text-muted-foreground">قوالب وتعيينات جاهزة:</span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPermissions([
                      "operation.data_entry",
                      "operation.view",
                      "approval.request",
                      "document.view",
                      "finance.entry",
                      "finance.view",
                      "visit.create",
                      "visit.view",
                    ])
                  }
                  className="px-2.5 py-1 rounded-lg bg-card hover:bg-blue-600 hover:text-white border border-border text-foreground font-bold transition-colors cursor-pointer"
                >
                  صلاحيات الموظف (إدخال وطلب فقط) 📋
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPermissions(
                      allPermissions
                        .filter((p) => !["user.manage", "permission.assign", "approval.instant"].includes(p.code))
                        .map((p) => p.code)
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-card hover:bg-indigo-600 hover:text-white border border-border text-foreground font-bold transition-colors cursor-pointer"
                >
                  صلاحيات نائب المدير (اعتماد وإشراف) ⚖️
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPermissions(allPermissions.map((p) => p.code))}
                  className="px-2.5 py-1 rounded-lg bg-card hover:bg-emerald-600 hover:text-white border border-border text-foreground font-bold transition-colors cursor-pointer"
                >
                  تحديد الكل (كامل الصلاحيات) 🌟
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPermissions([])}
                  className="px-2.5 py-1 rounded-lg bg-card hover:bg-rose-600 hover:text-white border border-border text-foreground font-bold transition-colors cursor-pointer"
                >
                  إلغاء التحديد ✕
                </button>
              </div>
            </div>

            {/* Permissions List Grouped by Modules */}
            <div className="space-y-4 overflow-y-auto pr-1 max-h-[50vh] scrollbar-thin">
              {loadingPermissions ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                  <p className="text-xs">جاري تحميل مصفوفة الصلاحيات المحدثة...</p>
                </div>
              ) : (
                [
                  {
                    id: "radar",
                    title: "رادار المناقصات والفرص الحكومية",
                    icon: "📡",
                    codes: ["radar.scan", "radar.analyze", "radar.export"],
                  },
                  {
                    id: "operations",
                    title: "العمليات ومسار المراحل",
                    icon: "📂",
                    codes: [
                      "operation.create",
                      "operation.data_entry",
                      "operation.stage_approve",
                      "operation.edit",
                      "operation.view",
                      "operation.delete",
                      "operation.archive",
                    ],
                  },
                  {
                    id: "approvals",
                    title: "القوالب والطباعة والاعتمادات الرسمية (الحوكمة)",
                    icon: "🖨️",
                    codes: [
                      "approval.request",
                      "approval.approve",
                      "approval.instant",
                      "document.print",
                      "document.view",
                      "document.upload",
                      "approval.manage",
                      "approval.print",
                    ],
                  },
                  {
                    id: "finance",
                    title: "المالية والمستخلصات وخطابات الضمان",
                    icon: "💰",
                    codes: [
                      "finance.entry",
                      "finance.approve",
                      "finance.view",
                      "finance.export",
                      "guarantee.manage",
                      "guarantee.create",
                      "guarantee.edit",
                      "guarantee.view",
                      "report.view",
                      "report.export",
                    ],
                  },
                  {
                    id: "visits",
                    title: "المعاينات الميدانية والمواقع",
                    icon: "📍",
                    codes: ["visit.create", "visit.view"],
                  },
                  {
                    id: "admin",
                    title: "إدارة النظام والرقابة والحسابات",
                    icon: "⚙️",
                    codes: [
                      "user.manage",
                      "permission.assign",
                      "user.create",
                      "user.edit",
                      "user.view",
                      "company.create",
                      "company.edit",
                      "company.view",
                      "audit.view",
                      "settings.manage",
                    ],
                  },
                ].map((group) => {
                  const groupPerms = allPermissions.filter((p) => group.codes.includes(p.code));
                  if (groupPerms.length === 0) return null;

                  const allGroupSelected = groupPerms.every((p) => selectedPermissions.includes(p.code));

                  const toggleGroup = () => {
                    if (allGroupSelected) {
                      setSelectedPermissions((prev) => prev.filter((c) => !group.codes.includes(c)));
                    } else {
                      const newCodes = groupPerms.map((p) => p.code);
                      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...newCodes])));
                    }
                  };

                  return (
                    <div
                      key={group.id}
                      className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{group.icon}</span>
                          <h4 className="text-xs sm:text-sm font-black text-foreground">
                            {group.title}
                          </h4>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ({groupPerms.filter((p) => selectedPermissions.includes(p.code)).length} من {groupPerms.length})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={toggleGroup}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {allGroupSelected ? "إلغاء تحديد القسم" : "تحديد كامل القسم"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {groupPerms.map((perm) => {
                          const isChecked = selectedPermissions.includes(perm.code);
                          return (
                            <label
                              key={perm.code}
                              className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all cursor-pointer select-none ${
                                isChecked
                                  ? "bg-blue-500/10 border-blue-500/40 text-foreground"
                                  : "bg-card hover:bg-muted/40 border-border text-muted-foreground"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPermissions((prev) => [...prev, perm.code]);
                                  } else {
                                    setSelectedPermissions((prev) => prev.filter((c) => c !== perm.code));
                                  }
                                }}
                                className="mt-1 h-4 w-4 rounded text-blue-600 cursor-pointer"
                              />
                              <div className="space-y-0.5 text-right flex-1">
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                  <span className="text-xs font-bold text-foreground">
                                    {perm.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-muted-foreground/80 bg-muted px-1.5 py-0.2 rounded">
                                    {perm.code}
                                  </span>
                                </div>
                                {perm.description && (
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {perm.description}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-muted-foreground">الملخص:</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">
                  تم تحديد {selectedPermissions.length} من أصل {allPermissions.length} صلاحية
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPermissionsModalOpen(false)}
                  className="border-border text-foreground hover:bg-muted rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={savingPermissions}
                  className="bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-black rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{savingPermissions ? "جاري الحفظ والتطبيق..." : "حفظ وتطبيق الصلاحيات في النظام 💾"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
