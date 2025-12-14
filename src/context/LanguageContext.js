"use client"

import { createContext, useState, useContext, useEffect } from "react"

const LanguageContext = createContext()

const translations = {
  es: {
    "search-placeholder": "Buscar en WikiConflicts...",
    language: "Language",
    collaborate: "Colaborar",
    characters: "Personajes",
    organizations: "Organizaciones",
    concepts: "Conceptos",
    ukraine: "Ukraine",
    "conflict-description": "Descripcion del conflicto",
    "see-testimonies": "Ver testimonios",
    "see-analysis": "Ver analisis",
    photos: "Fotos",
    videos: "Videos",
    "no-content": "No hay contenido disponible para esta seccion.",
    footer: "© 2025 WikiConflicts — Todos los derechos reservados",
    timeline: "Cronologia",
    "timeline-subtitle": "Principales acontecimientos del conflicto",
    resistance: "Resistencia",
    guardians: "Guardianes",
    victims: "Victimas",
    sources: "Fuentes",
    "back-button": "Volver",
    loading: "Cargando...",
    "available-testimonies": "Testimonios disponibles",
    "available-analyses": "Analisis disponibles",
    "velum-articles": "Ver investigaciones",
    "velum-title": "Micro-tesis e Investigaciones",
    "velum-abstract": "Resumen",
    "velum-keywords": "Palabras clave",
    "velum-sections": "Secciones",
    "velum-bibliography": "Bibliografia",
    "velum-no-articles": "No hay articulos disponibles",
    Terminologia: "Terminologia",
  },
  en: {
    "search-placeholder": "Search WikiConflicts...",
    language: "Language",
    collaborate: "Collaborate",
    characters: "Characters",
    organizations: "Organizations",
    concepts: "Concepts",
    ukraine: "Ukraine",
    "conflict-description": "Conflict Description",
    "see-testimonies": "See testimonies",
    "see-analysis": "See analysis",
    photos: "Photos",
    videos: "Videos",
    "no-content": "No content available for this section.",
    footer: "© 2025 WikiConflicts — All rights reserved",
    timeline: "Timeline",
    "timeline-subtitle": "Major events of the conflict",
    resistance: "Resistance",
    guardians: "Guardians",
    victims: "Victims",
    sources: "Sources",
    "back-button": "Back",
    loading: "Loading...",
    "available-testimonies": "Available testimonies",
    "available-analyses": "Available analyses",
    "velum-articles": "View research",
    "velum-title": "Micro-theses and Research",
    "velum-abstract": "Abstract",
    "velum-keywords": "Keywords",
    "velum-sections": "Sections",
    "velum-bibliography": "Bibliography",
    "velum-no-articles": "No articles available",
    Terminologia: "Terminology",
  },
  ar: {
    "search-placeholder": "ابحث في ويكي كونفليكتس...",
    language: "اللغة",
    collaborate: "تعاون",
    characters: "الشخصيات",
    organizations: "المنظمات",
    concepts: "المفاهيم",
    ukraine: "أوكرانيا",
    "conflict-description": "وصف النزاع",
    "see-testimonies": "عرض الشهادات",
    "see-analysis": "عرض التحليل",
    photos: "الصور",
    videos: "مقاطع فيديو",
    "no-content": "لا توجد محتويات متاحة لهذا القسم.",
    footer: "© 2025 WikiConflicts — جميع الحقوق محفوظة",
    timeline: "الجدول الزمني",
    "timeline-subtitle": "الأحداث الرئيسية للنزاع",
    resistance: "المقاومة",
    guardians: "الحراس",
    victims: "الضحايا",
    sources: "المصادر",
    "back-button": "رجوع",
    loading: "جار التحميل...",
    "available-testimonies": "الشهادات المتاحة",
    "available-analyses": "التحليلات المتاحة",
    "velum-articles": "عرض البحوث",
    "velum-title": "رسائل مصغرة وبحوث",
    "velum-abstract": "ملخص",
    "velum-keywords": "الكلمات المفتاحية",
    "velum-sections": "الأقسام",
    "velum-bibliography": "المراجع",
    "velum-no-articles": "لا توجد مقالات متاحة",
    Terminologia: "المصطلحات",
  },
  eu: {
    "search-placeholder": "Bilatu WikiConflicts-en...",
    language: "Hizkuntza",
    collaborate: "Lagundu",
    characters: "Pertsonaiak",
    organizations: "Erakundeak",
    concepts: "Kontzeptuak",
    ukraine: "Ukraina",
    "conflict-description": "Gatazkaren deskribapena",
    "see-testimonies": "Testigantzak ikusi",
    "see-analysis": "Azterketa ikusi",
    photos: "Argazkiak",
    videos: "Bideoak",
    "no-content": "Ez dago edukirik atal honetarako.",
    footer: "© 2025 WikiConflicts — Eskubide guztiak erreserbatuta",
    timeline: "Kronologia",
    "timeline-subtitle": "Gatazkaren gertaera nagusiak",
    resistance: "Erresistentzia",
    guardians: "Zaindari",
    victims: "Biktimak",
    sources: "Iturriak",
    "back-button": "Itzuli",
    loading: "Kargatzen...",
    "available-testimonies": "Testigantza eskuragarriak",
    "available-analyses": "Azterketa eskuragarriak",
    "velum-articles": "Ikusi ikerketak",
    "velum-title": "Mikro-tesiak eta Ikerketak",
    "velum-abstract": "Laburpena",
    "velum-keywords": "Hitz gakoak",
    "velum-sections": "Atalak",
    "velum-bibliography": "Bibliografia",
    "velum-no-articles": "Ez dago artikulurik eskuragarri",
    Terminologia: "Terminologia",
  },
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("wikilang") || "es"
  })

  useEffect(() => {
    localStorage.setItem("wikilang", lang)
    document.documentElement.lang = lang
  }, [lang])

  const t = (key) => {
    return translations[lang]?.[key] || translations.es[key] || key
  }

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
