import { useState } from 'react';
import { Subscriber } from '@/types/subscriber';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Phone, User, Calendar, CreditCard, Dumbbell, PhoneCall } from 'lucide-react';
import { differenceInCalendarDays, parseISO, format, startOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client.runtime';

const statusConfig = {
  active: { label: 'نشط', className: 'status-active' },
  expiring: { label: 'قارب على الانتهاء', className: 'status-expiring' },
  expired: { label: 'منتهي', className: 'status-expired' },
  pending: { label: 'معلق (مبلغ متبقي)', className: 'status-pending' },
  paused: { label: 'موقوف', className: 'bg-muted text-muted-foreground' },
};

const subscriptionTypeLabels = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};

const captainContacts = [
  { name: 'الكابتن محمد', phone: '01002690364' },
  { name: 'الكابتن خالد', phone: '01127353006' },
];

export const CustomerLookup = () => {
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<Subscriber | null>(null);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .or(`phone.eq.${phone},phone.ilike.%${phone}%`)
        .eq('is_archived', false)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const row = data[0];
        const subscriber: Subscriber = {
          id: row.id,
          name: row.name,
          phone: row.phone,
          subscriptionType: row.subscription_type as any,
          startDate: row.start_date,
          endDate: row.end_date,
          paidAmount: row.paid_amount,
          remainingAmount: row.remaining_amount,
          captain: row.captain,
          status: row.status as any,
          isArchived: row.is_archived,
          isPaused: row.is_paused,
          pausedUntil: row.paused_until,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
        setResult(subscriber);
      } else {
        setResult(null);
      }
    } catch (e) {
      console.error('Search error:', e);
      setResult(null);
    }
    
    setIsSearching(false);
  };

  const daysDiff = result
    ? differenceInCalendarDays(startOfDay(parseISO(result.endDate)), startOfDay(new Date()))
    : 0;

  const daysRemaining = result ? daysDiff + 1 : 0;

  const statusKey: keyof typeof statusConfig = !result
    ? 'active'
    : result.isPaused
    ? 'paused'
    : daysDiff < 0
    ? 'expired'
    : daysRemaining <= 3
    ? 'expiring'
    : 'active';

  const isExpired = result ? statusKey === 'expired' : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-primary py-8 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground mb-2">
            استعلام عن الاشتراك
          </h1>
          <p className="text-primary-foreground/80">
            أدخل رقم هاتفك للاستعلام عن حالة اشتراكك
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-6">
        <Card className="p-6 card-shadow">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="أدخل رقم الهاتف..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pr-10"
                dir="ltr"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={!phone || isSearching}>
              <Search className="w-4 h-4" />
              بحث
            </Button>
          </div>
        </Card>

        {searched && (
          <div className="mt-6 animate-fade-in">
            {isSearching ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">جاري البحث...</p>
              </div>
            ) : result ? (
              <Card className="p-6 card-shadow animate-slide-up">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                      <User className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">{result.name}</h2>
                      <p className="text-sm text-muted-foreground">{result.phone}</p>
                    </div>
                  </div>
                  <Badge className={cn('border', statusConfig[statusKey].className)}>
                    {statusConfig[statusKey].label}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">نوع الاشتراك</p>
                      <p className="font-bold">
                        {subscriptionTypeLabels[result.subscriptionType]}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">الكابتن</p>
                      <p className="font-bold">{result.captain}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">تاريخ الانتهاء</span>
                    </div>
                    <p className="font-bold text-lg">
                      {format(parseISO(result.endDate), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                    <p
                      className={cn(
                        'text-sm font-medium mt-1',
                        isExpired
                          ? 'text-destructive'
                          : daysRemaining <= 7
                          ? 'text-warning'
                          : 'text-success'
                      )}
                    >
                      {isExpired ? 'الاشتراك منتهي' : `متبقي ${daysRemaining} يوم`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="w-4 h-4 text-success" />
                        <span className="text-sm text-muted-foreground">المدفوع</span>
                      </div>
                      <p className="font-bold text-success">{result.paidAmount} جنيه</p>
                    </div>
                    <div
                      className={cn(
                        'p-3 rounded-lg border',
                        result.remainingAmount > 0
                          ? 'bg-destructive/10 border-destructive/20'
                          : 'bg-success/10 border-success/20'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard
                          className={cn(
                            'w-4 h-4',
                            result.remainingAmount > 0 ? 'text-destructive' : 'text-success'
                          )}
                        />
                        <span className="text-sm text-muted-foreground">المتبقي</span>
                      </div>
                      <p
                        className={cn(
                          'font-bold',
                          result.remainingAmount > 0 ? 'text-destructive' : 'text-success'
                        )}
                      >
                        {result.remainingAmount} جنيه
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center card-shadow">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-2">لم يتم العثور على اشتراك</h3>
                <p className="text-muted-foreground">
                  تأكد من رقم الهاتف أو تواصل مع الإدارة
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Contact Us Section */}
        <Card className="mt-6 p-6 card-shadow">
          <h3 className="font-bold text-lg mb-4 text-center">اتصل بنا</h3>
          <div className="space-y-3">
            {captainContacts.map((contact, index) => (
              <a
                key={index}
                href={`tel:${contact.phone}`}
                className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                    <PhoneCall className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-bold">{contact.name}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">{contact.phone}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  اتصال
                </Button>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CustomerLookup;
