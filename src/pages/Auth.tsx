import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Mail, Lock, Loader2, Phone, User, Calendar, CreditCard, 
  Briefcase, Users, ArrowRight, KeyRound, ChevronDown, 
  MessageCircle, ShoppingBag, ExternalLink, FileText 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Subscriber } from '@/types/subscriber';
import { differenceInCalendarDays, parseISO, format, startOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import { ContactUsSection } from '@/components/auth/ContactUsSection';
import { MemberSubscriptionRequest } from '@/components/auth/MemberSubscriptionRequest';
import { StoreLink } from '@/components/auth/StoreLink';
import { MemberRequestsHistory } from '@/components/auth/MemberRequestsHistory';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const EMPLOYEE_PIN = '4807';

const statusConfig = {
  active: { label: 'نشط', className: 'status-active' },
  expiring: { label: 'قارب على الانتهاء', className: 'status-expiring' },
  expired: { label: 'منتهي', className: 'status-expired' },
  pending: { label: 'معلق (مبلغ متبقي)', className: 'status-pending' },
  paused: { label: 'موقوف', className: 'bg-muted text-muted-foreground' },
};

const subscriptionTypeLabels: Record<string, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};

type UserType = 'selection' | 'employee' | 'member';
type EmployeeStep = 'pin' | 'login';

// Collapsible Section Component
const CollapsibleSection = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false 
}: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="card-shadow overflow-hidden">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold">{title}</span>
          </div>
          <ChevronDown className={cn(
            'w-5 h-5 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0 border-t">
            {children}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const Auth = () => {
  const [userType, setUserType] = useState<UserType>('selection');
  const [employeeStep, setEmployeeStep] = useState<EmployeeStep>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [memberPhone, setMemberPhone] = useState('');
  const [memberResult, setMemberResult] = useState<Subscriber | null>(null);
  const [memberSearched, setMemberSearched] = useState(false);
  const [isMemberSearching, setIsMemberSearching] = useState(false);
  const [memberMode, setMemberMode] = useState<'new' | 'existing'>('existing');
  const [showSubscriptionRequest, setShowSubscriptionRequest] = useState(false);
  
  const { toast } = useToast();
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handlePinSubmit = () => {
    if (pin === EMPLOYEE_PIN) {
      setPinError('');
      setEmployeeStep('login');
    } else {
      setPinError('رمز PIN غير صحيح');
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'خطأ في تسجيل الدخول',
              description: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'خطأ',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({ title: 'تم تسجيل الدخول بنجاح' });
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast({
              title: 'خطأ',
              description: 'هذا البريد الإلكتروني مسجل بالفعل',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'خطأ',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({ title: 'تم إنشاء الحساب بنجاح' });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMemberSearch = async () => {
    if (!memberPhone.trim()) return;
    
    setIsMemberSearching(true);
    setMemberSearched(true);

    try {
      // Use the secure edge function for member lookup
      const { data, error } = await supabase.functions.invoke('member-lookup', {
        body: { phone: memberPhone.trim() }
      });

      if (error) {
        console.error('Member lookup error:', error);
        throw error;
      }

      if (data?.found && data.subscriber) {
        const sub = data.subscriber;
        const subscriber: Subscriber = {
          id: sub.id,
          name: sub.name,
          phone: sub.phone,
          subscriptionType: sub.subscriptionType,
          startDate: sub.startDate,
          endDate: sub.endDate,
          paidAmount: sub.paidAmount,
          remainingAmount: sub.remainingAmount,
          captain: '',
          status: sub.status,
          isArchived: false,
          isPaused: sub.isPaused,
          pausedUntil: sub.pausedUntil,
          createdAt: '',
          updatedAt: '',
        };
        setMemberResult(subscriber);
      } else {
        setMemberResult(null);
      }
    } catch (e) {
      console.error('Search error:', e);
      setMemberResult(null);
    }
    
    setIsMemberSearching(false);
  };

  const goBack = () => {
    if (showSubscriptionRequest) {
      setShowSubscriptionRequest(false);
    } else if (userType === 'employee' && employeeStep === 'login') {
      setEmployeeStep('pin');
      setPin('');
      setPinError('');
    } else if (userType === 'member' && memberSearched) {
      setMemberSearched(false);
      setMemberResult(null);
      setMemberPhone('');
    } else {
      setUserType('selection');
      setEmployeeStep('pin');
      setPin('');
      setPinError('');
      setMemberSearched(false);
      setMemberResult(null);
      setMemberPhone('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const daysDiff = memberResult
    ? differenceInCalendarDays(startOfDay(parseISO(memberResult.endDate)), startOfDay(new Date()))
    : 0;
  const daysRemaining = memberResult ? daysDiff + 1 : 0;
  const statusKey: keyof typeof statusConfig = !memberResult
    ? 'active'
    : memberResult.isPaused
    ? 'paused'
    : daysDiff < 0
    ? 'expired'
    : daysRemaining <= 3
    ? 'expiring'
    : 'active';
  const isExpired = memberResult ? statusKey === 'expired' : false;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="py-10 px-4 text-center">
        <p className="text-lg text-muted-foreground mb-4">أهلا بك في</p>
        <img src={logo} alt="2B GYM" className="w-28 h-28 mx-auto rounded-2xl object-contain mb-4" />
        {userType === 'selection' && (
          <p className="text-muted-foreground mt-2">اختر نوع الحساب للمتابعة</p>
        )}
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="w-full max-w-md">
          {/* Back Button */}
          {(userType !== 'selection' || showSubscriptionRequest) && (
            <Button
              variant="ghost"
              onClick={goBack}
              className="mb-4 text-muted-foreground hover:text-foreground"
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              رجوع
            </Button>
          )}

          {/* User Type Selection */}
          {userType === 'selection' && (
            <div className="grid gap-4">
              <Card
                className="p-6 cursor-pointer hover:border-primary transition-colors card-shadow"
                onClick={() => setUserType('employee')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Briefcase className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">موظف</h3>
                    <p className="text-sm text-muted-foreground">دخول لوحة الإدارة</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground rotate-180" />
                </div>
              </Card>

              <Card
                className="p-6 cursor-pointer hover:border-primary transition-colors card-shadow"
                onClick={() => setUserType('member')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">عضو</h3>
                    <p className="text-sm text-muted-foreground">استعلام عن الاشتراك</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground rotate-180" />
                </div>
              </Card>
            </div>
          )}

          {/* Employee - PIN Entry */}
          {userType === 'employee' && employeeStep === 'pin' && (
            <Card className="p-8 card-shadow">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">رمز الدخول</h2>
                <p className="text-sm text-muted-foreground mt-1">أدخل رمز PIN للمتابعة</p>
              </div>

              <div className="space-y-4">
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setPinError('');
                  }}
                  placeholder="••••"
                  className="text-center text-2xl tracking-widest"
                  maxLength={4}
                  dir="ltr"
                  onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                />
                {pinError && (
                  <p className="text-destructive text-sm text-center">{pinError}</p>
                )}
                <Button onClick={handlePinSubmit} className="w-full" disabled={pin.length < 4}>
                  تأكيد
                </Button>
              </div>
            </Card>
          )}

          {/* Employee - Login Form */}
          {userType === 'employee' && employeeStep === 'login' && (
            <Card className="p-8 card-shadow">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">
                  {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
                </h2>
              </div>

              <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="pr-10"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                      dir="ltr"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isLogin ? (
                    'تسجيل الدخول'
                  ) : (
                    'إنشاء حساب'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline text-sm"
                >
                  {isLogin ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب؟ تسجيل الدخول'}
                </button>
              </div>
            </Card>
          )}

          {/* Member - New/Existing Selection (before search) */}
          {userType === 'member' && !memberSearched && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={memberMode === 'new' ? 'default' : 'outline'}
                  onClick={() => {
                    setMemberMode('new');
                    setMemberSearched(false);
                    setMemberResult(null);
                    setMemberPhone('');
                  }}
                >
                  عضو جديد
                </Button>
                <Button
                  type="button"
                  variant={memberMode === 'existing' ? 'default' : 'outline'}
                  onClick={() => {
                    setMemberMode('existing');
                    setMemberSearched(false);
                    setMemberResult(null);
                    setMemberPhone('');
                  }}
                >
                  عضو موجود بالفعل
                </Button>
              </div>

              {memberMode === 'existing' ? (
                <>
                  <Card className="p-8 card-shadow">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold">استعلام عن الاشتراك</h2>
                      <p className="text-sm text-muted-foreground mt-1">أدخل رقم هاتفك للاستعلام</p>
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={memberPhone}
                          onChange={(e) => setMemberPhone(e.target.value)}
                          placeholder="أدخل رقم الهاتف..."
                          className="pr-10"
                          dir="ltr"
                          onKeyDown={(e) => e.key === 'Enter' && handleMemberSearch()}
                        />
                      </div>
                      <Button
                        onClick={handleMemberSearch}
                        className="w-full"
                        disabled={!memberPhone.trim() || isMemberSearching}
                      >
                        {isMemberSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'بحث'
                        )}
                      </Button>
                    </div>
                  </Card>

                  <CollapsibleSection title="تواصل معنا" icon={MessageCircle}>
                    <ContactUsSection isEmbedded />
                  </CollapsibleSection>

                  <StoreLink />
                </>
              ) : (
                <>
                  <CollapsibleSection title="تسجيل اشتراك جديد" icon={CreditCard} defaultOpen>
                    <MemberSubscriptionRequest existingSubscriber={null} onClose={() => {}} />
                  </CollapsibleSection>

                  <CollapsibleSection title="تواصل معنا" icon={MessageCircle}>
                    <ContactUsSection isEmbedded />
                  </CollapsibleSection>

                  <StoreLink />
                </>
              )}
            </div>
          )}

          {/* Member - Subscription Result (existing members only) */}
          {userType === 'member' && memberMode === 'existing' && memberSearched && (
            <div className="animate-fade-in space-y-4">
              {isMemberSearching ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">جاري البحث...</p>
                </div>
              ) : memberResult ? (
                <>
                  <Card className="p-6 card-shadow animate-slide-up">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                          <User className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg">{memberResult.name}</h2>
                          <p className="text-sm text-muted-foreground">{memberResult.phone}</p>
                        </div>
                      </div>
                      <Badge className={cn('border', statusConfig[statusKey].className)}>
                        {statusConfig[statusKey].label}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">تاريخ الاشتراك</p>
                          <p className="font-bold">
                            {format(parseISO(memberResult.startDate), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">نوع الاشتراك</p>
                          <p className="font-bold">
                            {subscriptionTypeLabels[memberResult.subscriptionType] || memberResult.subscriptionType}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="text-sm text-muted-foreground">تاريخ الانتهاء</span>
                        </div>
                        <p className="font-bold text-lg">
                          {format(parseISO(memberResult.endDate), 'dd MMMM yyyy', { locale: ar })}
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
                          <p className="font-bold text-success">{memberResult.paidAmount} جنيه</p>
                        </div>
                        <div
                          className={cn(
                            'p-3 rounded-lg border',
                            memberResult.remainingAmount > 0
                              ? 'bg-destructive/10 border-destructive/20'
                              : 'bg-success/10 border-success/20'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <CreditCard
                              className={cn(
                                'w-4 h-4',
                                memberResult.remainingAmount > 0 ? 'text-destructive' : 'text-success'
                              )}
                            />
                            <span className="text-sm text-muted-foreground">المتبقي</span>
                          </div>
                          <p
                            className={cn(
                              'font-bold',
                              memberResult.remainingAmount > 0 ? 'text-destructive' : 'text-success'
                            )}
                          >
                            {memberResult.remainingAmount} جنيه
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Collapsible sections for existing members */}
                  <CollapsibleSection title="طلباتي السابقة" icon={FileText}>
                    <MemberRequestsHistory phone={memberResult.phone} />
                  </CollapsibleSection>

                  <CollapsibleSection title="تواصل معنا" icon={MessageCircle}>
                    <ContactUsSection isEmbedded />
                  </CollapsibleSection>

                  <CollapsibleSection title="تجديد الاشتراك" icon={CreditCard}>
                    <MemberSubscriptionRequest 
                      existingSubscriber={memberResult} 
                      onClose={() => setShowSubscriptionRequest(false)} 
                    />
                  </CollapsibleSection>

                  {/* 2B Store Link */}
                  <StoreLink />
                </>
              ) : (
                <>
                  <Card className="p-8 text-center card-shadow">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">لم يتم العثور على اشتراك</h3>
                    <p className="text-muted-foreground">
                      تأكد من رقم الهاتف أو سجل اشتراك جديد
                    </p>
                  </Card>

                  {/* Collapsible sections for not found */}
                  <CollapsibleSection title="طلباتي السابقة" icon={FileText}>
                    <MemberRequestsHistory phone={memberPhone} />
                  </CollapsibleSection>

                  <CollapsibleSection title="تواصل معنا" icon={MessageCircle}>
                    <ContactUsSection isEmbedded />
                  </CollapsibleSection>

                  <CollapsibleSection title="طلب اشتراك جديد" icon={CreditCard} defaultOpen>
                    <MemberSubscriptionRequest 
                      existingSubscriber={null} 
                      onClose={() => {}} 
                    />
                  </CollapsibleSection>

                  {/* 2B Store Link */}
                  <StoreLink />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;