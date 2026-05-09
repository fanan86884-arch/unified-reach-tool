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
  MessageCircle, ShoppingBag, ExternalLink, Salad, Dumbbell 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client.runtime';
import { signInClient } from '@/lib/portalAuth';
import { Subscriber } from '@/types/subscriber';
import { differenceInCalendarDays, parseISO, format, startOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import { ContactUsSection } from '@/components/auth/ContactUsSection';
import { StoreLink } from '@/components/auth/StoreLink';
import { DietRequestForm } from '@/components/auth/DietRequestForm';
import { DietRequestsHistory } from '@/components/auth/DietRequestsHistory';
import { WorkoutRequestForm } from '@/components/auth/WorkoutRequestForm';
import { WorkoutRequestsHistory } from '@/components/auth/WorkoutRequestsHistory';
import { PublicDietRequest } from '@/components/auth/PublicDietRequest';
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
  const [memberPassword, setMemberPassword] = useState('');
  const [memberPasswordConfirm, setMemberPasswordConfirm] = useState('');
  const [memberMode, setMemberMode] = useState<'login' | 'signup'>('login');
  const [isMemberLogging, setIsMemberLogging] = useState(false);
  
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

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberPhone.trim() || !memberPassword) return;

    setIsMemberLogging(true);

    if (memberMode === 'signup') {
      if (memberPassword.length < 6) {
        setIsMemberLogging(false);
        toast({ title: 'كلمة السر قصيرة', description: 'لازم تكون 6 أحرف على الأقل', variant: 'destructive' });
        return;
      }
      if (memberPassword !== memberPasswordConfirm) {
        setIsMemberLogging(false);
        toast({ title: 'كلمتا السر غير متطابقتين', variant: 'destructive' });
        return;
      }
      const { data, error } = await supabase.functions.invoke('client-signup', {
        body: { phone: memberPhone.trim(), password: memberPassword },
      });
      if (error || (data as any)?.error) {
        setIsMemberLogging(false);
        toast({
          title: 'تعذر إنشاء الحساب',
          description: (data as any)?.error ?? error?.message ?? 'حدث خطأ',
          variant: 'destructive',
        });
        return;
      }
      // Auto-login after signup
      const { error: loginErr } = await signInClient(memberPhone.trim(), memberPassword);
      setIsMemberLogging(false);
      if (loginErr) {
        toast({ title: 'تم إنشاء الحساب', description: 'سجل دخول دلوقتي' });
        setMemberMode('login');
        return;
      }
      toast({ title: 'تم إنشاء الحساب وتسجيل الدخول' });
      navigate('/portal');
      return;
    }

    const { error } = await signInClient(memberPhone.trim(), memberPassword);
    setIsMemberLogging(false);
    if (error) {
      toast({
        title: 'تعذر تسجيل الدخول',
        description: error.message === 'Invalid login credentials'
          ? 'رقم الموبايل أو كلمة السر غير صحيحة'
          : (error as any).message ?? 'حدث خطأ',
        variant: 'destructive',
      });
      return;
    }
    navigate('/portal');
  };

  const goBack = () => {
    if (userType === 'employee' && employeeStep === 'login') {
      setEmployeeStep('pin');
      setPin('');
      setPinError('');
    } else {
      setUserType('selection');
      setEmployeeStep('pin');
      setPin('');
      setPinError('');
      setMemberPhone('');
      setMemberPassword('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }


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
          {userType !== 'selection' && (
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

          {/* Member Section - Client Portal Login */}
          {userType === 'member' && (
            <div className="space-y-4">
              <Card className="p-8 card-shadow">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">دخول العميل</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    سجّل الدخول بحسابك لمتابعة اشتراكك
                  </p>
                </div>

                <form onSubmit={handleMemberLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>رقم الموبايل</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={memberPhone}
                        onChange={(e) => setMemberPhone(e.target.value)}
                        type="tel"
                        inputMode="numeric"
                        placeholder="01xxxxxxxxx"
                        className="pr-10"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>كلمة السر</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={memberPassword}
                        onChange={(e) => setMemberPassword(e.target.value)}
                        type="password"
                        placeholder="••••••••"
                        className="pr-10"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!memberPhone.trim() || !memberPassword || isMemberLogging}
                  >
                    {isMemberLogging ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'دخول'
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    لو معندكش حساب، تواصل مع إدارة الجيم لإنشاء حسابك
                  </p>
                </form>
              </Card>

              {/* Diet request open to anyone (with their own phone) */}
              <CollapsibleSection title="طلب نظام غذائي" icon={Salad}>
                <PublicDietRequest />
              </CollapsibleSection>

              <CollapsibleSection title="تواصل معنا" icon={MessageCircle}>
                <ContactUsSection isEmbedded />
              </CollapsibleSection>

              <StoreLink />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;