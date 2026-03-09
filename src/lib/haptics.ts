/**
 * Trigger haptic feedback using the Vibration API.
 * Falls back silently on unsupported devices.
 */
export const hapticFeedback = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (!navigator.vibrate) return;
  
  const patterns: Record<string, number> = {
    light: 10,
    medium: 20,
    heavy: 40,
  };
  
  try {
    navigator.vibrate(patterns[style]);
  } catch {
    // Silently fail on unsupported devices
  }
};
