"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useLanguage } from "../context/LanguageContext"

import CountryHeader from "./CountryHeader"
import CountrySidebar from "./CountrySidebar"
import CountryContent from "./CountryContent"
import MobileMenu from "../components/MobileMenu"

import "./country-layout.css"

export default function CountryLayout() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { lang } = useLanguage()
  const [meta, setMeta] = useState(null)
  const [currentSection, setCurrentSection] = useState(null)
  const [currentCategory, setCurrentCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 860)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    async function loadMeta() {
      try {
        const url = `/data/${lang}/${code}/meta.json`
        const res = await fetch(url)
        if (!res.ok) {
          const minimalMeta = {
            name: code.charAt(0).toUpperCase() + code.slice(1),
            sections: [
              { id: "description", title: "Descripción del conflicto", label: "Descripción del conflicto" },
              { id: "testimonies", title: "Testimonios", label: "Testimonios" },
              { id: "analysts", title: "Análisis", label: "Análisis" },
              { id: "media-gallery", title: "Fototeca", label: "Fototeca" },
            ],
          }
          setMeta(minimalMeta)
          setCurrentSection("description")
          setLoading(false)
          return
        }

        const json = await res.json()
        setMeta(json)

        if (isMobile) {
          setCurrentSection("description")
        } else {
          let firstSection = json.sections?.find((s) => s.id === "description") || json.sections?.[0]
          if (firstSection?.id === "media-gallery") {
            firstSection = { ...firstSection, id: "media-gallery-images" }
          }
          setCurrentSection(firstSection?.id || "description")
        }
      } catch (err) {
        console.error("[v0] Error loading meta.json:", err)
        const minimalMeta = {
          name: code.charAt(0).toUpperCase() + code.slice(1),
          sections: [
            { id: "description", title: "Descripción del conflicto", label: "Descripción del conflicto" },
            { id: "testimonies", title: "Testimonios", label: "Testimonios" },
            { id: "analysts", title: "Análisis", label: "Análisis" },
            { id: "media-gallery", title: "Fototeca", label: "Fototeca" },
          ],
        }
        setMeta(minimalMeta)
        setCurrentSection("description")
      }
      setLoading(false)
    }

    loadMeta()
  }, [code, lang, isMobile])

  function handleSelect(sectionId) {
    setCurrentSection(sectionId)
    setCurrentCategory(null)
    setSearchTerm("")
  }

  function handleSelectCategory(categoryId) {
    setCurrentCategory(categoryId)
  }

  function handleSearch(term) {
    setSearchTerm(term)
  }

  function handleBackMobile() {
    if (currentCategory) {
      setCurrentCategory(null)
    } else if (currentSection !== "description") {
      setCurrentSection("description")
    } else {
      navigate("/")
    }
  }

  if (loading) return <div className="country-loading">Cargando país {code}...</div>
  if (!meta) return <div className="country-loading">No se encontraron datos para {code}</div>

 if (isMobile && meta) {
  return (
    <div className="country-layout mobile-wiki-mode">

      {/* Mobile Header */}
      <div className="mobile-wiki-header">
        <div className="mobile-header-top-row">
          <div className="mobile-logo-large" onClick={() => navigate("/")}>
            <span className="logo-wiki">Wiki</span>
            <span className="logo-conflicts">Conflicts</span>
          </div>
<button
  className={`menu-button-fixed ${isMenuOpen ? "close-mode" : ""}`}
  onClick={() => setIsMenuOpen(prev => !prev)}
>
  {isMenuOpen ? "Cerrar" : "Menú"}
</button>


          <div className="mobile-header-spacer" aria-hidden="true" />
        </div>

        <h1 className="mobile-country-title-centered">{meta.name}</h1>

        
      </div>

      {/* Menu Overlay */}
      {isMenuOpen && (
        <MobileMenu
          countryName={meta.name}
          sections={meta.sections}
          onClose={() => setIsMenuOpen(false)}
          onSelectSection={(sectionId) => {
            handleSelect(sectionId)
            setIsMenuOpen(false)
          }}
          onHome={() => navigate("/")}
        />
      )}

      {/* Content */}
      <div className="country-content-wrapper mobile-content-padding">
         {/* <div className="mobile-search-wrapper">
    <input
      type="search"
      className="mobile-search-canva"
      placeholder="Buscar..."
      value={searchTerm}
      onChange={(e) => handleSearch(e.target.value)}
    />
  </div> */}
        {currentSection ? (
          <CountryContent
            countryCode={code}
            section={currentSection}
            searchTerm={searchTerm}
            openMenu={setIsMenuOpen}
          />
        ) : (
          <div className="select-prompt">Seleccione una sección del menú para comenzar.</div>
        )}
      </div>
    </div>
  )
}


  return (
    <div className="country-layout">
      <CountryHeader onHomeClick={() => navigate("/")} onSearch={handleSearch} />

      <div className="country-body">
        {!isMobile && (
          <CountrySidebar
            countryName={meta.name}
            sections={meta.sections}
            currentSection={currentSection}
            onSelectSection={handleSelect}
          />
        )}

        <div className="country-content-wrapper">
          {currentSection ? (
            <CountryContent countryCode={code} section={currentSection} searchTerm={searchTerm} />
          ) : (
            <div>Seleccione una sección</div>
          )}
        </div>
      </div>

      <footer className="country-footer">
        <div className="footer-social">
          <a href="https://twitter.com/wikiconflicts" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Twitter">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="https://instagram.com/wikiconflicts" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <a href="https://t.me/wikiconflicts" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Telegram">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </a>
          <a href="https://youtube.com/@wikiconflicts" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="YouTube">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
        </div>
        <p>© {new Date().getFullYear()} WikiConflicts — Todos los derechos reservados</p>
      </footer>
    </div>
  )
}
