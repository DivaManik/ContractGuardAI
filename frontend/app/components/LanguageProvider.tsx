"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import T, { type Lang } from "../i18n/translations";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangCtx>({
  lang: "id",
  setLang: () => {},
  t: (key) => T[key]?.id ?? key,
});

export const useLanguage = () => useContext(LangContext);

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    const stored = localStorage.getItem("cg-lang") as Lang | null;
    if (stored === "en" || stored === "id") setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("cg-lang", l);
  }, []);

  const t = useCallback((key: string): string => {
    return T[key]?.[lang] ?? T[key]?.en ?? key;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}
