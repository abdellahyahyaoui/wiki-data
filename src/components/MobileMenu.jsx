"use client"

import { useEffect, useRef, useState } from "react"
import "./mobile-menu-teal.css"

export default function MobileMenu({ countryName, sections = [], onClose, onSelectSection }) {
  const panelRef = useRef(null)

  const [openVelum, setOpenVelum] = useState(false)
  const [openTerminologia, setOpenTerminologia] = useState(false)
  const [openFototeca, setOpenFototeca] = useState(false)

  useEffect(() => {
    const firstBtn = panelRef.current?.querySelector(".menu-item")
    if (firstBtn) firstBtn.focus()

    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => (document.body.style.overflow = prev)
  }, [])

  function handleSelect(id) {
    onSelectSection(id)
    onClose()
  }

  return (
    <div className="teal-overlay" role="dialog" aria-modal="true">
      <div className="teal-panel" ref={panelRef}>

        {/* HEADER */}
        <div className="teal-top">
          <div style={{ width: 24 }} />
          <div className="mobile-country-title-centered-menu">
            {countryName}
          </div>
          <button className="teal-close" onClick={onClose}>✕</button>
        </div>

        <nav className="teal-nav">

          {/* INICIO */}
          <button className="menu-item menu-home" onClick={() => handleSelect("description")}>
            Inicio
          </button>

          {/* ========== VELUM ========== */}
          <div className="menu-group">
            <button className="menu-item-group" onClick={() => setOpenVelum(v => !v)}>
              Velum
              <span className={`editorial-arrow ${openVelum ? "open" : ""}`}></span>
            </button>

            <div className={`submenu ${openVelum ? "submenu-open" : ""}`}>
              <button className="submenu-item" onClick={() => handleSelect("velum")}>
                Artículos Velum
              </button>
            </div>
          </div>

          {/* ========== TERMINOLOGÍA ========== */}
          <div className="menu-group">
            <button className="menu-item-group" onClick={() => setOpenTerminologia(v => !v)}>
              Terminología
              <span className={`editorial-arrow ${openTerminologia ? "open" : ""}`}></span>
            </button>

            <div className={`submenu ${openTerminologia ? "submenu-open" : ""}`}>
              <button className="submenu-item" onClick={() => handleSelect("terminology-personajes")}>
                Personajes
              </button>
              <button className="submenu-item" onClick={() => handleSelect("terminology-organizaciones")}>
                Organizaciones
              </button>
              <button className="submenu-item" onClick={() => handleSelect("terminology-conceptos")}>
                Conceptos
              </button>
            </div>
          </div>

          {/* ========== FOTOTECA ========== */}
          <div className="menu-group">
            <button className="menu-item-group" onClick={() => setOpenFototeca(v => !v)}>
              Fototeca
              <span className={`editorial-arrow ${openFototeca ? "open" : ""}`}></span>
            </button>

            <div className={`submenu ${openFototeca ? "submenu-open" : ""}`}>
              <button className="submenu-item" onClick={() => handleSelect("media-gallery-images")}>
                Fotos
              </button>
              <button className="submenu-item" onClick={() => handleSelect("media-gallery-videos")}>
                Vídeos
              </button>
            </div>
          </div>

          {/* ========== RESTO DE SECCIONES ========== */}
          {sections.map((s) => {
            if (
              s.id === "velum" ||
              s.id === "media-gallery" ||
              s.id === "fototeca" ||
              s.id.startsWith("terminology")
            ) return null

            return (
              <button key={s.id} className="menu-item" onClick={() => handleSelect(s.id)}>
                {s.label || s.title}
              </button>
            )
          })}

        </nav>

        {/* FOOTER SOCIAL */}
        <div className="social-footer">
          <a href="https://instagram.com" target="_blank" className="social-icon">
            <svg width="26" height="26" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17" cy="7" r="1.2" />
            </svg>
          </a>

          <a href="https://t.me" target="_blank" className="social-icon">
            <svg width="26" height="26" fill="white" viewBox="0 0 24 24">
              <path d="M9.5 12.3l-1 4.7c.4 0 .6-.2.8-.4l2-1.9 4.2 3c.8.4 1.4.2 1.6-.8l2.9-13c.3-1.1-.4-1.6-1.2-1.3L2 9.4c-1.1.4-1.1 1-.2 1.3l4.8 1.5L17.7 6l-8.1 6.3z"/>
            </svg>
          </a>

          <a href="mailto:contact@wikiconflicts.com" className="social-icon">
            <svg width="26" height="26" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="14" rx="2"/>
              <path d="M3 7l9 6 9-6"/>
            </svg>
          </a>
        </div>

      </div>
    </div>
  )
}
