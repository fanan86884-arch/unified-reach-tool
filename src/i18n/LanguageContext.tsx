import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ar } from './translations/ar';
import { en } from './translations/en';

export type Language = 'ar' | 'en';
export type Translations = typeof ar;

interface LanguageContextType {
  lang: Language;
  t: Translations;
  setLang: (lang: Language) => void;
  isRTL: boolean;
}

const translations: Record<Language, Translations> = { ar, en };

const detectLanguage = (): Language => {
  // Check localStorage first
  const saved = localStorage.getItem('app_language') as Language;
  if (saved && translations[saved]) return saved;
  
  // Detect from browser
  const browserLang = navigator.language?.split('-')[0];
  if (browserLang === 'ar') return 'ar';
  return 'en';
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ar',
  t: ar,
  setLang: () => {},
  isRTL: true,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>(detectLanguage);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('app_language', newLang);
  }, []);

  // Update document dir and lang attributes
  useEffect(() => {
    const dir = translations[lang].dir;
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang]);

  const value: LanguageContextType = {
    lang,
    t: translations[lang],
    setLang,
    isRTL: lang === 'ar',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
