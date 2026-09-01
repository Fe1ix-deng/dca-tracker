import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { englishTranslations } from './translations'

export const LANGUAGE_STORAGE_KEY = 'dca-tracker-language'

export function normalizeLanguage(value) {
  return value === 'en-US' ? 'en-US' : 'zh-CN'
}

export function translate(language, source, params = {}) {
  const normalized = normalizeLanguage(language)
  const template = normalized === 'en-US' ? englishTranslations[source] ?? source : source
  return String(template).replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`))
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === 'undefined') return 'zh-CN'
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))
  })

  const setLanguage = (nextLanguage) => setLanguageState(normalizeLanguage(nextLanguage))

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (source, params) => translate(language, source, params),
  }), [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    return { language: 'zh-CN', setLanguage: () => {}, t: (source, params) => translate('zh-CN', source, params) }
  }
  return context
}
