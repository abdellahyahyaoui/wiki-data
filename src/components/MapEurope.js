// src/components/MapEurope.js
"use client"

import React, { useState } from "react"
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"
import { geoCentroid } from "d3-geo"
import "./WorldMap.css"

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

// Países europeos principales
const europeCountries = [
  "Albania","Andorra","Austria","Belarus","Belgium","Bosnia and Herzegovina",
  "Bulgaria","Croatia","Czech Republic","Denmark","Estonia",
  "France","Germany","Greece","Hungary","Ireland","Italy",
  "Kosovo","Latvia","Liechtenstein","Lithuania","Luxembourg","Malta",
  "Moldova","Monaco","Montenegro","Netherlands","North Macedonia",
  "Poland","Portugal","Romania","San Marino","Serbia","Slovakia",
  "Slovenia","Spain","Switzerland","Ukraine","United Kingdom","Vatican"
]

// Países en conflicto
const CONFLICTS_NORMALIZED = new Set(["ukraine"])

// Normalizar nombres → archivo .png
function normalizeForFilename(name) {
  if (!name) return ""
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^0-9a-zA-Z]/g, "")
    .toLowerCase()
}

// Normalizar ID para rutas
function getCountryId(geo) {
  return geo.properties.name.toLowerCase().replace(/\s+/g, "-")
}

export default function MapEurope() {
  const [hoveredCountry, setHoveredCountry] = useState(null)
  const [hoveredPlainName, setHoveredPlainName] = useState(null)
const isMobile = typeof window !== "undefined" && window.innerWidth < 860;
  const clickCountry = (id) => {
    window.location.href = `/country/${id}`
  }

  return (
    <div className="map-wrapper" style={{ position: "relative" }}>
      <ComposableMap
        projection="geoMercator"
         projectionConfig={{
          scale: isMobile ? 830 : 800,   // ← ESCALA MÓVIL AQUÍ
          center: [15, 50]
        }}
        
        className="composable-map-container"
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies
              .filter((geo) => europeCountries.includes(geo.properties.name))
              .map((geo) => {
                const plainName = geo.properties.name
                const id = getCountryId(geo)
                const isLifted = hoveredCountry === id
                const normalized = normalizeForFilename(plainName)

                return (
                  <React.Fragment key={geo.rsmKey}>
                    <Geography
                      geography={geo}
                      onClick={() => clickCountry(id)}
                      onMouseEnter={() => {
                        setHoveredCountry(id)
                        setHoveredPlainName(plainName)
                      }}
                      onMouseLeave={() => {
                        setHoveredCountry(null)
                        setHoveredPlainName(null)
                      }}
                      className={`${isLifted ? "country-lifted" : ""} ${
                        CONFLICTS_NORMALIZED.has(normalized) ? "conflict-country" : ""
                      }`}
                       fill={isLifted ? "#939c9fff" : "#0C1E28"}
                      stroke="#F2F5F7"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none", cursor: "pointer" },
                        hover: { outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />

                    {/* MARCADOR DE CONFLICTO */}
                    {CONFLICTS_NORMALIZED.has(normalized) && (() => {
                      const centroid = geoCentroid(geo)
                      if (!centroid || isNaN(centroid[0])) return null

                      // return (
                      //   <Marker key={"c-" + id} coordinates={centroid}>
                      //     <g
                      //       onMouseEnter={() => {
                      //         setHoveredCountry(id)
                      //         setHoveredPlainName(plainName)
                      //       }}
                      //       onMouseLeave={() => {
                      //         setHoveredCountry(null)
                      //         setHoveredPlainName(null)
                      //       }}
                      //       style={{ cursor: "pointer" }}
                      //     >
                      //       <circle r="20" className="conflict-marker-pulse" />
                      //       <circle r="20" className="conflict-marker-pulse" style={{ animationDelay: ".5s" }} />
                      //       <circle r="20" className="conflict-marker-pulse" style={{ animationDelay: "1s" }} />
                      //       <circle r="20" className="conflict-marker-pulse" style={{ animationDelay: "1.5s" }} />
                       
                      //     </g>
                      //   </Marker>
                      // )
                    })()}
                  </React.Fragment>
                )
              })
          }
        </Geographies>
      </ComposableMap>

      {/* === NOMBRE + BANDERA (EFECTO SLIDE PREMIUM) === */}
      {hoveredPlainName && (
        <div className="country-name-float">
         
          <span>{hoveredPlainName}</span>
        </div>
      )}
    </div>
  )
}
