// src/components/MapAfrica.js
"use client"

import React, { useState } from "react"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"
import "./WorldMap.css"

const geoUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"

// Lista de países africanos según el GeoJSON
const africaCountries = [

  "Angola",
  "Benin",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Cameroon",
  "Cape Verde",
  "Central African Republic",
  "Chad",
  "Comoros",
  "Republic of the Congo",
  "Dem. Rep. Congo",
  "Djibouti",
  "Equatorial Guinea",
  "Eritrea",
  "Ethiopia",
  "Gabon",
  "Gambia",
  "Ghana",
  "Guinea",
  "Guinea-Bissau",
  "Côte d'Ivoire",
  "Kenya",
  "Lesotho",
  "Liberia",

  "Madagascar",
  "Malawi",
  "Mali",

  "Mauritius",

  "Mozambique",
  "Namibia",
  "Niger",
  "Nigeria",
  "Rwanda",
  "São Tomé and Principe",
  "Senegal",
  "Seychelles",
  "Sierra Leone",
  "Somalia",
  "South Africa",
  "S. Sudan",

  "eSwatini",
  "Tanzania",
  "Togo",

  "Uganda",
  "Zambia",
  "Zimbabwe",
  "Western Sahara",
  "Reunion",
  "Mayotte"
];



// Países en conflicto (normalizados)
const CONFLICTS_NORMALIZED = new Set([
  "ethiopia",
  "somalia",
  "nigeria",
  "democraticrepublicofthecongo"
]);

// Normalizar nombre para filename o comparación
function normalizeForFilename(name) {
  if (!name) return ""
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^0-9a-zA-Z]/g, "")
    .toLowerCase()
}

// Normalizar ID para ruta
function getCountryId(name) {
  return name.toLowerCase().replace(/\s+/g, "-")
}

export default function MapAfrica() {
  const [hoveredCountry, setHoveredCountry] = useState(null)
  const [hoveredPlainName, setHoveredPlainName] = useState(null)

  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 860

  const handleCountryClick = (id) => {
    window.location.href = `/country/${id}`
  }

  return (
    <div className="map-wrapper" style={{ position: "relative" }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: isMobile ? 520 : 450,
          center: [20, -5] // Centrado en África
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies
              .filter((geo) => africaCountries.includes(geo.properties.name))
              .map((geo) => {
                const plain = geo.properties.name
                const id = getCountryId(plain)
                const normalized = normalizeForFilename(plain)
                const isLifted = hoveredCountry === id
                const isConflict = CONFLICTS_NORMALIZED.has(normalized)

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleCountryClick(id)}
                    onMouseEnter={() => {
                      setHoveredCountry(id)
                      setHoveredPlainName(plain)
                    }}
                    onMouseLeave={() => {
                      setHoveredCountry(null)
                      setHoveredPlainName(null)
                    }}
                    className={`${isLifted ? "country-lifted" : ""} 
                      ${isConflict ? "conflict-country" : ""}`}
                    fill={isLifted ? "#939c9fff" : "#0C1E28"}
                    stroke="#F2F5F7"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none", cursor: "pointer" },
                      hover: { outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                )
              })
          }
        </Geographies>
      </ComposableMap>

      {/* Nombre flotante */}
      {hoveredPlainName && (
        <div className="country-name-float">
          <span>{hoveredPlainName}</span>
        </div>
      )}
    </div>
  )
}
