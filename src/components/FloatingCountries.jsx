"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useLanguage } from "../context/LanguageContext"
import "./floating-countries.css"

const FALLBACK_COUNTRIES = [
  { code: "palestine", name: "Palestina", hasConflict: true },
  { code: "sahara", name: "Sáhara Occidental", hasConflict: true },
  { code: "yemen", name: "Yemen", hasConflict: true },
  { code: "syria", name: "Siria", hasConflict: true },
]

export default function FloatingCountries({ isDropdown = false }) {
  const navigate = useNavigate()
  const { lang } = useLanguage()
  const [countries, setCountries] = useState(FALLBACK_COUNTRIES) // Initialize with fallback data

  useEffect(() => {
    async function loadCountries() {
      try {
        const res = await fetch(`/data/${lang}/countries.json`)
        if (res.ok) {
          const data = await res.json()
          setCountries(data)
        }
      } catch (err) {
        console.error("[v0] Error loading countries, using fallback:", err)
      }
    }
    loadCountries()
  }, [lang])

  const handleCountryClick = (code) => {
    navigate(`/country/${code}`)
  }

  if (isDropdown) {
    const filteredCountries = countries.filter((c) => !["sahara", "israel"].includes(c.code.toLowerCase()))

    return (
      <div className="country-dropdown-container">
        <p className="select-instruction">Seleccione un conflicto para analizar:</p>
        <div className="mobile-country-grid">
          {filteredCountries.map((c) => (
            <div
              key={c.code}
              className={`mobile-country-circle ${c.hasConflict ? "has-conflict" : ""}`}
              onClick={() => handleCountryClick(c.code)}
            >
              <span className="country-name-mobile-circle">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="floating-container">
      {countries.map((country, index) => (
        <div
          key={country.code}
          className={`floating-circle ${country.hasConflict ? "has-conflict" : ""}`}
          style={{
            "--index": index,
            "--delay": `${index * 0.1}s`,
          }}
          onClick={() => handleCountryClick(country.code)}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleCountryClick(country.code)
            }
          }}
        >
          <span className="country-name">{country.name}</span>
        </div>
      ))}
    </div>
  )
}
