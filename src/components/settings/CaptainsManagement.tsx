import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, UserCircle2, Loader2, Cloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCaptains } from '@/hooks/useCaptains';

export const CaptainsManagement = () => {
  const { toast } = useToast();
  const { captains, loading, addCaptain, removeCaptain } = useCaptains();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: 'يرجى إدخال اسم الكابتن', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const ok = await addCaptain(trimmed);
    setSubmitting(false);
    if (!ok) {
      toast({ title: 'هذا الكابتن موجود بالفعل أو حدث خطأ', variant: 'destructive' });
      return;
    }
    setName('');
    toast({ title: 'تم إضافة الكابتن' });
  };

  const handleRemove = async (captain: string) => {
    const ok = await removeCaptain(captain);
    if (!ok) {
      toast({ title: 'تعذر حذف الكابتن', variant: 'destructive' });
      return;
    }
    toast({ title: 'تم حذف الكابتن' });
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2">
          <UserCircle2 className="w-4 h-4 text-primary" />
          إدارة الكباتن
        </p>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Cloud className="w-3 h-3" />
          مزامنة سحابية
        </span>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم الكابتن"
          disabled={submitting}
        />
        <Button type="submit" disabled={submitting} className="shrink-0">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          إضافة
        </Button>
      </form>

      {loading && captains.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : captains.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">لا يوجد كباتن</p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {captains.map((captain) => (
            <div
              key={captain}
              className="flex items-center justify-between gap-2 px-3 py-2.5 bg-card hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <UserCircle2 className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-medium truncate">{captain}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleRemove(captain)}
                title="حذف الكابتن"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
