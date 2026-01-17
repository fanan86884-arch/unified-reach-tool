import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share, ArrowUp, Smartphone, Apple, Chrome, CheckCircle } from 'lucide-react';
import logo from '@/assets/logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-sm">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">تم التثبيت!</h1>
          <p className="text-muted-foreground">
            التطبيق مثبت بالفعل على جهازك
          </p>
          <Button className="mt-6 w-full" onClick={() => window.location.href = '/'}>
            فتح التطبيق
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/20 to-background py-12 px-4 text-center">
        <img src={logo} alt="2B GYM" className="w-24 h-24 mx-auto mb-4 rounded-2xl shadow-lg" />
        <h1 className="text-2xl font-bold mb-2">2B GYM</h1>
        <p className="text-muted-foreground">ثبّت التطبيق على جهازك</p>
      </div>

      <div className="container px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Benefits */}
        <Card className="p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            مميزات التطبيق
          </h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <span>الوصول السريع من الشاشة الرئيسية</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <span>إشعارات فورية للاشتراكات والطلبات</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <span>يعمل بدون انترنت (وضع Offline)</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <span>تجربة استخدام سلسة كالتطبيقات الأصلية</span>
            </li>
          </ul>
        </Card>

        {/* Android / Chrome install */}
        {(isAndroid || deferredPrompt) && (
          <Card className="p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Chrome className="w-5 h-5 text-primary" />
              تثبيت على Android
            </h2>
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="w-5 h-5 ml-2" />
              تثبيت التطبيق
            </Button>
          </Card>
        )}

        {/* iOS instructions */}
        {isIOS && (
          <Card className="p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Apple className="w-5 h-5 text-primary" />
              تثبيت على iPhone
            </h2>
            <ol className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">1</span>
                <span>اضغط على زر <strong>المشاركة</strong> <Share className="w-4 h-4 inline text-primary" /> في الأسفل</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">2</span>
                <span>اسحب للأسفل واختر <strong>"إضافة إلى الشاشة الرئيسية"</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">3</span>
                <span>اضغط <strong>"إضافة"</strong> في الأعلى</span>
              </li>
            </ol>
            
            <div className="mt-6 p-4 bg-primary/10 rounded-lg flex items-center gap-3">
              <ArrowUp className="w-8 h-8 text-primary animate-bounce" />
              <p className="text-sm">
                ابحث عن أيقونة <Share className="w-4 h-4 inline" /> في شريط Safari
              </p>
            </div>
          </Card>
        )}

        {/* Desktop instructions */}
        {!isIOS && !isAndroid && !deferredPrompt && (
          <Card className="p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Chrome className="w-5 h-5 text-primary" />
              تثبيت على الكمبيوتر
            </h2>
            <ol className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">1</span>
                <span>افتح التطبيق في متصفح Chrome</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">2</span>
                <span>اضغط على أيقونة التثبيت في شريط العناوين</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">3</span>
                <span>أو اختر "Install 2B GYM" من قائمة المتصفح</span>
              </li>
            </ol>
          </Card>
        )}

        {/* Back to app */}
        <Button variant="outline" className="w-full" onClick={() => window.location.href = '/'}>
          العودة للتطبيق
        </Button>
      </div>
    </div>
  );
};

export default Install;
