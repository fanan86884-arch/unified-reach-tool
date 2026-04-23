import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, UserCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCaptains } from '@/hooks/useCaptains';

export const CaptainsManagement = () => {
  const { toast } = useToast();
  const { captains, addCaptain, removeCaptain } = useCaptains();
  const [name, setName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: 'يرجى إدخال اسم الكابتن', variant: 'destructive' });
      return;
    }
    const ok = addCaptain(trimmed);
    if (!ok) {
      toast({ title: 'هذا الكابتن موجود بالفعل', variant: 'destructive' });
      return;
    }
    setName('');
    toast({ title: 'تم إضافة الكابتن' });
  };

  return (
    <div className="space-y-4 mt-4">
      <form onSubmit={handleAdd} className="space-y-3 p-3 rounded-lg bg-muted/40">
        <p className="text-sm font-semibold flex items-center gap-2">
          <UserCircle2 className="w-4 h-4 text-primary" />
          إضافة كابتن جديد
        </p>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: كابتن أحمد"
          />
          <Button type="submit">
            <Plus className="w-4 h-4" />
            إضافة
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <p className="text-sm font-semibold">قائمة الكباتن الحاليين</p>
        {captains.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا يوجد كباتن</p>
        ) : (
          <div className="space-y-2">
            {captains.map((captain) => (
              <Card key={captain} className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-medium truncate">{captain}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeCaptain(captain)}
                  title="حذف الكابتن"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
