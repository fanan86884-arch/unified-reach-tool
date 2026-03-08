import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom notification chime — a rich, multi-layered bell sound
 * inspired by premium app notifications (warm tone + sparkle overtone + sub bass hit).
 */
export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = getContext();
      const now = ctx.currentTime;

      // Master gain
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.45, now);
      master.connect(ctx.destination);

      // --- Layer 1: Warm bell chime (ascending C5 → E5 → G5) ---
      const bellFreqs = [523.25, 659.25, 783.99];
      bellFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(gain);
        gain.connect(master);

        const t = now + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

        osc.start(t);
        osc.stop(t + 0.85);
      });

      // --- Layer 2: Sparkle overtone (high C6, triangle wave) ---
      const sparkle = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkle.type = 'triangle';
      sparkle.frequency.setValueAtTime(1046.5, now); // C6
      sparkle.connect(sparkleGain);
      sparkleGain.connect(master);

      sparkleGain.gain.setValueAtTime(0, now + 0.05);
      sparkleGain.gain.linearRampToValueAtTime(0.15, now + 0.08);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      sparkle.start(now + 0.05);
      sparkle.stop(now + 0.65);

      // --- Layer 3: Soft sub bass hit for weight ---
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(130.81, now); // C3
      sub.connect(subGain);
      subGain.connect(master);

      subGain.gain.setValueAtTime(0, now);
      subGain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      sub.start(now);
      sub.stop(now + 0.45);

      // --- Layer 4: Final resolution note (high G5, delayed) ---
      const resolve = ctx.createOscillator();
      const resolveGain = ctx.createGain();
      resolve.type = 'sine';
      resolve.frequency.setValueAtTime(783.99, now); // G5
      resolve.connect(resolveGain);
      resolveGain.connect(master);

      const rt = now + 0.4;
      resolveGain.gain.setValueAtTime(0, rt);
      resolveGain.gain.linearRampToValueAtTime(0.25, rt + 0.03);
      resolveGain.gain.exponentialRampToValueAtTime(0.001, rt + 1.0);
      resolve.start(rt);
      resolve.stop(rt + 1.05);

    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [getContext]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
        playNotificationSound();
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [playNotificationSound]);

  return { playNotificationSound };
}
