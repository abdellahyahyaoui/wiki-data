"use client"

import { useState } from "react"
import { useLanguage } from "../context/LanguageContext"
import "./country-sidebar.css"

export default function CountrySidebar({ countryName, sections, currentSection, onSelectSection }) {
  const [openTermino, setOpenTermino] = useState(true)
  const [openVelum, setOpenVelum] = useState(true)
  const { t } = useLanguage()

  const toggleTerminologia = () => setOpenTermino((v) => !v)
  const toggleVelum = () => setOpenVelum((v) => !v)

  return (
    <aside className="country-sidebar">
      <div className="sidebar-inner">
        {/* VELUM */}
        <div className="sidebar-block velum-block">
          <div
            className="sidebar-title velum-title"
            onClick={toggleVelum}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                toggleVelum()
              }
            }}
            aria-expanded={openVelum}
            role="button"
            tabIndex={0}
          >
            <span>Velum</span>
            <span className={`arrow ${openVelum ? "open" : ""}`}>▼</span>
          </div>

          {openVelum && (
            <div className="velum-submenu">
              <div
                className={`velum-item ${currentSection === "velum" ? "active" : ""}`}
                onClick={() => onSelectSection("velum")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelectSection("velum")
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {t("velum-articles")}
              </div>
            </div>
          )}
        </div>

        {/* TERMINOLOGÍA */}
        <div className="sidebar-block">
          <div
            className="sidebar-title"
            onClick={toggleTerminologia}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                toggleTerminologia()
              }
            }}
            aria-expanded={openTermino}
            role="button"
            tabIndex={0}
          >
            <span>{t("Terminologia")}</span>
            <span className={`arrow ${openTermino ? "open" : ""}`}>▼</span>
          </div>

          {openTermino && (
            <div className="termino-submenu">
              <div
                className={`termino-item ${currentSection === "terminology-personajes" ? "active" : ""}`}
                onClick={() => onSelectSection("terminology-personajes")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelectSection("terminology-personajes")
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {t("characters")}
              </div>
              <div
                className={`termino-item ${currentSection === "terminology-organizaciones" ? "active" : ""}`}
                onClick={() => onSelectSection("terminology-organizaciones")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelectSection("terminology-organizaciones")
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {t("organizations")}
              </div>
              <div
                className={`termino-item ${currentSection === "terminology-conceptos" ? "active" : ""}`}
                onClick={() => onSelectSection("terminology-conceptos")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelectSection("terminology-conceptos")
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {t("concepts")}
              </div>
            </div>
          )}
        </div>

        {/* COUNTRY NAME */}
        <div className="sidebar-country-name">{countryName || "País"}</div>

        {/* DESCRIPCIÓN DEL CONFLICTO */}
        {sections.some((s) => s.id === "description") && (
          <div className="sidebar-block">
            <div
              className={`sidebar-section-item ${currentSection === "description" ? "active" : ""}`}
              onClick={() => onSelectSection("description")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelectSection("description")
                }
              }}
              role="button"
              tabIndex={0}
            >
              {t("conflict-description")}
            </div>
          </div>
        )}

        {/* OTRAS SECCIONES */}
        {sections
          .filter((s) => s.id !== "description")
          .map((sec) => (
            <div className="sidebar-block" key={sec.id}>
              <div className="sidebar-section-title">{sec.label}</div>
              <div className="sidebar-section-list">
                {sec.id === "media-gallery" || sec.id === "fototeca" ? (
                  <>
                    <div
                      className={`sidebar-section-item ${currentSection === "fototeca-photos" || currentSection === "media-gallery-images" ? "active" : ""}`}
                      onClick={() => onSelectSection(sec.id === "fototeca" ? "fototeca-photos" : "media-gallery-images")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onSelectSection(sec.id === "fototeca" ? "fototeca-photos" : "media-gallery-images")
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {t("photos")}
                    </div>
                    <div
                      className={`sidebar-section-item ${currentSection === "fototeca-videos" || currentSection === "media-gallery-videos" ? "active" : ""}`}
                      onClick={() => onSelectSection(sec.id === "fototeca" ? "fototeca-videos" : "media-gallery-videos")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onSelectSection(sec.id === "fototeca" ? "fototeca-videos" : "media-gallery-videos")
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {t("videos")}
                    </div>
                  </>
                ) : (
                  <div
                    className={`sidebar-section-item ${currentSection === sec.id ? "active" : ""}`}
                    onClick={() => onSelectSection(sec.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onSelectSection(sec.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    Ver {sec.label.toLowerCase()}
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </aside>
  )
}
