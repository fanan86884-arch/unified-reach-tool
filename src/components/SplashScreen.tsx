import { useEffect, useState } from 'react';
import logo from '@/assets/logo.png';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('hold'), 100);
    const exitTimer = setTimeout(() => setPhase('exit'), 1600);
    const completeTimer = setTimeout(() => onComplete(), 2100);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      style={{
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 500ms ease-in-out',
      }}
    >
      {/* Logo with smooth scale-in */}
      <div
        style={{
          transform: phase === 'enter' ? 'scale(0.8)' : 'scale(1)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease-out',
        }}
      >
        <img
          src={logo}
          alt="2B GYM"
          className="w-28 h-28 object-contain drop-shadow-[0_0_40px_hsl(var(--primary)/0.4)]"
        />
      </div>

      {/* Brand name with staggered fade */}
      <h1
        className="mt-3 text-2xl font-bold text-primary tracking-tight"
        style={{
          transform: phase === 'enter' ? 'translateY(10px)' : 'translateY(0)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'transform 500ms ease-out 200ms, opacity 400ms ease-out 200ms',
        }}
      >
        2B GYM
      </h1>

      {/* Subtle loading bar */}
      <div className="mt-8 w-16 h-0.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{
            width: phase === 'enter' ? '0%' : '100%',
            transition: 'width 1500ms ease-in-out',
          }}
        />
      </div>
    </div>
  );
};
