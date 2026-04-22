import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, UserPlus, Trash2, Mail, Lock, Shield, User as UserIcon, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client.runtime';

interface Employee {
  user_id: string;
  email: string;
  role: 'admin' | 'shift_employee';
  created_at: string;
}

export const EmployeesManagement = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pwdTarget, setPwdTarget] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-employees');
      if (error) throw error;
      setEmployees(data?.employees || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'فشل تحميل قائمة الموظفين', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'يرجى إدخال البريد الإلكتروني وكلمة المرور', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'كلمة المرور 6 أحرف على الأقل', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: { email: email.trim(), password, role: 'shift_employee' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'تم إنشاء حساب موظف الشيفت بنجاح' });
      setEmail('');
      setPassword('');
      await loadEmployees();
    } catch (err: any) {
      toast({
        title: err?.message || 'فشل إنشاء الحساب',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.user_id);
    try {
      const { data, error } = await supabase.functions.invoke('delete-employee', {
        body: { user_id: pendingDelete.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'تم حذف الموظف' });
      setPendingDelete(null);
      await loadEmployees();
    } catch (err: any) {
      toast({ title: err?.message || 'فشل الحذف', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleChangePassword = async () => {
    if (!pwdTarget) return;
    if (newPassword.length < 6) {
      toast({ title: 'كلمة المرور 6 أحرف على الأقل', variant: 'destructive' });
      return;
    }
    setSavingPwd(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-employee-password', {
        body: { user_id: pwdTarget.user_id, password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'تم تغيير كلمة المرور بنجاح' });
      setPwdTarget(null);
      setNewPassword('');
    } catch (err: any) {
      toast({ title: err?.message || 'فشل تغيير كلمة المرور', variant: 'destructive' });
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <form onSubmit={handleCreate} className="space-y-3 p-3 rounded-lg bg-muted/40">
        <p className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          إضافة موظف شيفت جديد
        </p>
        <div className="space-y-2">
          <Label>البريد الإلكتروني</Label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="employee@example.com"
              dir="ltr"
              className="pr-10"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>كلمة المرور</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              className="pr-10"
              minLength={6}
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          إنشاء حساب موظف
        </Button>
      </form>

      <div className="space-y-2">
        <p className="text-sm font-semibold">قائمة الموظفين الحاليين</p>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : employees.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا يوجد موظفين</p>
        ) : (
          <div className="space-y-2">
            {employees.map((emp) => (
              <Card key={emp.user_id} className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {emp.role === 'admin' ? (
                      <Shield className="w-4 h-4 text-primary" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" dir="ltr">{emp.email}</p>
                    <Badge variant={emp.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] mt-1">
                      {emp.role === 'admin' ? 'أدمن' : 'موظف شيفت'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {emp.role !== 'admin' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => { setPwdTarget(emp); setNewPassword(''); }}
                      title="تغيير كلمة المرور"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                  )}
                  {emp.role !== 'admin' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDelete(emp)}
                      disabled={deletingId === emp.user_id}
                    >
                      {deletingId === emp.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الموظف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف حساب <span dir="ltr" className="font-semibold">{pendingDelete?.email}</span> نهائياً ولن يستطيع تسجيل الدخول مرة أخرى. مشتركوه الحاليون سيظلون في النظام.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!pwdTarget} onOpenChange={(open) => { if (!open) { setPwdTarget(null); setNewPassword(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
            <DialogDescription>
              تعيين كلمة مرور جديدة لـ <span dir="ltr" className="font-semibold">{pwdTarget?.email}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>كلمة المرور الجديدة</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="pr-10"
                minLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPwdTarget(null); setNewPassword(''); }}>
              إلغاء
            </Button>
            <Button onClick={handleChangePassword} disabled={savingPwd || newPassword.length < 6}>
              {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
