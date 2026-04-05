import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale, Translations } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

interface LangStore {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

export const useLangStore = create<LangStore>()(
  persist(
    (set) => ({
      locale: "en",
      t: translations.en,
      setLocale: (locale) => set({ locale, t: translations[locale] }),
    }),
    { name: "movie-builder-lang" }
  )
);
