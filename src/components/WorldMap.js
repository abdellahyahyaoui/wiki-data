"use client"

import { useState } from "react"
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"
import "./WorldMap.css"

function normalizeForFilename(name) {
  if (!name) return ""
  const noDiacritics = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const alnum = noDiacritics.replace(/[^0-9a-zA-Z]/g, "")
  return alnum.toLowerCase()
}

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

// ---------------------------
// LISTA DE PAISES ÁRABES + Turquía e Irán
// ---------------------------
const arabCountries = [
  "Algeria","Bahrain","Comoros","Egypt","Iraq","Israel","Jordan",
  "Kuwait","Lebanon","Libya","Mauritania","Morocco","Oman","Qatar",
  "Saudi Arabia","Sudan","South Sudan","Syria","Tunisia",
  "United Arab Emirates","Yemen","Western Sahara",
  "Palestinian Territory, Occupied"
]

const extraArab = ["Turkey", "Iran"]
const regionFilters = arabCountries.concat(extraArab)

// ---------------------------
// DATOS DE PAISES
// ---------------------------
const countryData = {
  morocco: { name: "Marruecos", coordinates: [-6.8498, 34.0209], hasConflict: false },
  palestine: { name: "Palestina", coordinates: [35.2, 31.9], hasConflict: true },
  lebanon: { name: "Líbano", coordinates: [35.5018, 33.8886], hasConflict: true },
  yemen: { name: "Yemen", coordinates: [44.2075, 15.3694], hasConflict: true },
  turkey: { name: "Turquía", coordinates: [32.8597, 39.9334], hasConflict: false },
  iran: { name: "Irán", coordinates: [51.3890, 35.6892], hasConflict: true },
  algeria: { name: "Argelia", coordinates: [3.0588, 36.7538], hasConflict: false },
  egypt: { name: "Egipto", coordinates: [31.2357, 30.0444], hasConflict: true },
  sudan: { name: "Sudán", coordinates: [32.5599, 15.5007], hasConflict: true },
  saudi: { name: "Arabia Saudita", coordinates: [46.6753, 24.7136], hasConflict: false },
  uae: { name: "Emiratos Árabes Unidos", coordinates: [54.3705, 24.4539], hasConflict: false },
  qatar: { name: "Qatar", coordinates: [51.531, 25.2854], hasConflict: false },
  bahrain: { name: "Baréin", coordinates: [50.5577, 26.0667], hasConflict: false },
  jordan: { name: "Jordania", coordinates: [35.9456, 31.9454], hasConflict: false },
  iraq: { name: "Irak", coordinates: [44.3661, 33.3152], hasConflict: false },
  kuwait: { name: "Kuwait", coordinates: [47.9774, 29.3759], hasConflict: false },
  libya: { name: "Libia", coordinates: [13.1913, 32.8872], hasConflict: true },
  tunisia: { name: "Túnez", coordinates: [10.1815, 36.8065], hasConflict: false },
  oman: { name: "Omán", coordinates: [58.4059, 23.588], hasConflict: false },
  mauritania: { name: "Mauritania", coordinates: [-15.9785, 18.0735], hasConflict: false },
  comoros: { name: "Comoras", coordinates: [43.2418, -11.7172], hasConflict: false },
  syria: { name: "Siria", coordinates: [38.9968, 34.8021], hasConflict: true }
}

// ---------------------------
// COMPONENTE
// ---------------------------
export default function WorldMap() {
  const [hoveredCountry, setHoveredCountry] = useState(null)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 860;
  const getCountryId = (geo) => {
    const name = geo.properties.name.toLowerCase()
    if (geo.id === "732" || name === "morocco" || name === "western sahara") return "morocco"

    const israelIds = ["376", "275"]
    const israelNames = ["israel", "palestine", "west bank", "gaza"]

    if (israelIds.includes(geo.id) || israelNames.includes(name)) return "palestine"
    if (name === "saudi arabia") return "saudi"
    if (name === "united arab emirates") return "uae"

    return name.replace(/\s+/g, "-")
  }

  const handleCountryClick = (countryId) => {
    const routeId = countryId === "israel" ? "palestine" : countryId
    window.location.href = `/country/${routeId}`
  }

  return (
    <div className="map-wrapper" style={{ position: "relative" }}>
      <ComposableMap
        projection="geoMercator"
         projectionConfig={{
          scale: isMobile ? 530 : 750,   // ← ESCALA MÓVIL AQUÍ
          center: [25, 28],
        }}
        className="composable-map-container"
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies
              .filter(
                (geo) =>
                  regionFilters.includes(geo.properties.name) ||
                  geo.id === "732" ||
                  geo.id === "275"
              )
              .map((geo) => {
                const countryId = getCountryId(geo)
                const isLifted = hoveredCountry === countryId

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleCountryClick(countryId)}
                    onMouseEnter={() => setHoveredCountry(countryId)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    className={`${isLifted ? "country-lifted" : ""} ${
                      countryData[countryId]?.hasConflict ? "conflict-country" : ""
                    }`}
                    fill={isLifted ? "#939c9fff" : "#0C1E28"}
                    stroke="#F2F5F7"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none", cursor: "pointer" },
                      hover: { outline: "none" },
                      pressed: { outline: "none" }
                    }}
                  />
                )
              })
          }
        </Geographies>

        {/* 🔥 MARCADORES DE ONDAS DE CONFLICTO (NO BLOQUEAN EL HOVER)  */}
        {Object.entries(countryData).map(([id, data]) => {
          if (!data.hasConflict || !data.coordinates) return null

          // return (
          //   <Marker key={id} coordinates={data.coordinates}>
          //     <g className="conflict-marker-group">
          //       <circle r="20" className="conflict-marker-pulse" />
          //       <circle r="20" className="conflict-marker-pulse" style={{ animationDelay: "0.5s" }} />
          //       <circle r="20" className="conflict-marker-pulse" style={{ animationDelay: "1s" }} />
          //       <circle r="20" className="conflict-marker-pulse" style={{ animationDelay: "1.5s" }} />
          //     </g>
          //   </Marker>
          // )
        })}
      </ComposableMap>

      {/* NOMBRE + BANDERA */}
      {hoveredCountry && countryData[hoveredCountry] && (
        <div className="country-name-float">
          
          <span>{countryData[hoveredCountry].name}</span>
        </div>
      )}
    </div>
  )
}
