"use client"

import { useState } from "react"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"
import "./WorldMap.css"

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

const arabCountries = [
  "Algeria",
  "Bahrain",
  "Comoros",
  
  "Egypt",
  
  "Iraq",
  "Israel",
  "Jordan",
  "Kuwait",
  "Lebanon",
  "Libya",
  "Mauritania",
  "Morocco",
  "Oman",
  "Qatar",
  "Saudi Arabia",
  // "Somalia",
  "Sudan",
  "South Sudan",
  "Syria",
  "Tunisia",
  "United Arab Emirates",
  "Yemen",
  "Western Sahara",
  "Palestinian Territory, Occupied",
]

const countryData = {
  morocco: {
    name: "Morocco",
    image: "/morocco-atlas-mountains-medina.jpg",
    description: "Ancient kingdom bridging Africa and Europe",
  },
  israel: {
    name: "Israel & Palestine",
    image: "/israel-palestine-landscape.jpg",
    description: "Contested territory with complex history",
  },
  algeria: {
    name: "Algeria",
    image: "/algeria-flag-desert-landscape.jpg",
    description: "Largest country in Africa with Berber and Arab heritage",
  },
  egypt: { name: "Egypt", image: "/egypt-pyramids-nile.jpg", description: "Cradle of ancient civilization" },
  libya: {
    name: "Libya",
    image: "/libya-sahara-desert.jpg",
    description: "Vast Saharan nation with Mediterranean coast",
  },
}

export default function WorldMap() {
  const [hoveredCountry, setHoveredCountry] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  // Removed isMobile state here as it is handled by parent or CSS

  const getCountryId = (geo) => {
    const name = geo.properties.name.toLowerCase()
    if (geo.id === "732" || name === "morocco") return "morocco"
    const israelIds = ["376", "275"]
    const israelNames = ["israel", "palestine", "west bank", "gaza"]
    if (israelIds.includes(geo.id) || israelNames.includes(name)) return "israel"
    return name.replace(/\s+/g, "-")
  }

  const handleMouseEnter = (geo, event) => {
    const countryId = getCountryId(geo)
    setHoveredCountry(countryId)
    const rect = event.currentTarget.getBoundingClientRect()
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 10 })
  }

  const handleMouseLeave = () => setHoveredCountry(null)

  const handleCountryClick = (countryId) => {
    const routeId = countryId === "israel" ? "palestine" : countryId
    window.location.href = `/country/${routeId}`
  }

  return (
    <div className="map-wrapper">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 1000, center: [20, 25] }} // Adjusted center/scale for Arab world
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies
              .filter((geo) => arabCountries.includes(geo.properties.name) || geo.id === "732" || geo.id === "275")
              .map((geo) => {
                const countryId = getCountryId(geo)
                const isHovered = hoveredCountry === countryId

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={(e) => handleMouseEnter(geo, e)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleCountryClick(countryId)}
                    fill={isHovered ? "#920c0cff" : "#c8c8c8"} // Wikipedia-like colors
                    stroke="#FFFFFF"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none", cursor: "pointer" },
                      hover: { outline: "none", fill: "#920c0cff" },
                      pressed: { outline: "none" },
                    }}
                  />
                )
              })
          }
        </Geographies>
      </ComposableMap>

      {hoveredCountry && (
        <div
          className="tooltip-card"
          style={{
            top: tooltipPos.y,
            left: tooltipPos.x,
          }}
        >
          <h3>{countryData[hoveredCountry]?.name || hoveredCountry}</h3>
          {/* Simplified tooltip for cleaner look */}
        </div>
      )}
    </div>
  )
}
