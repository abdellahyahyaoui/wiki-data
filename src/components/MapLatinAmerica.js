"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import "./WorldMap.css";

// === UTIL PARA NORMALIZAR NOMBRE DE BANDERA ===
function normalizeForFilename(name) {
  if (!name) return "";
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/[^0-9a-zA-Z]/g, "")                    // quitar símbolos
    .toLowerCase();                                  // minúsculas
}

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// === LISTA COMPLETA DE AMÉRICA LATINA ===
const latinCountries = [
  "Brazil","Argentina","Colombia","Chile","Peru","Venezuela",
  "Bolivia","Paraguay","Uruguay","Ecuador","Trinidad and Tobago"
  ,"Costa Rica","Panama",
  "Cuba","Guyana","Suriname"
];

// === COUNTRY DATA (solo nombre + coordenadas + conflicto) ===
const countryData = {
  brazil: { name: "Brasil", coordinates: [-47.8825, -15.7942], hasConflict: false },
  argentina: { name: "Argentina", coordinates: [-58.3816, -34.6037], hasConflict: false },
  colombia: { name: "Colombia", coordinates: [-74.0721, 4.711], hasConflict: false },
  chile: { name: "Chile", coordinates: [-70.6693, -33.4489], hasConflict: false },
  peru: { name: "Perú", coordinates: [-77.0428, -12.0464], hasConflict: false },
  venezuela: { name: "Venezuela", coordinates: [-66.9036, 10.4806], hasConflict: true },
  mexico: { name: "México", coordinates: [-99.1332, 19.4326], hasConflict: false },
  bolivia: { name: "Bolivia", coordinates: [-68.1193, -16.4897], hasConflict: false },
  paraguay: { name: "Paraguay", coordinates: [-57.5759, -25.2637], hasConflict: false },
  uruguay: { name: "Uruguay", coordinates: [-56.1882, -34.9011], hasConflict: false },
  ecuador: { name: "Ecuador", coordinates: [-78.4678, -0.1807], hasConflict: false },
  cuba: { name: "Cuba", coordinates: [-82.3666, 23.1136], hasConflict: false },
  haiti: { name: "Haití", coordinates: [-72.2852, 18.5944], hasConflict: true },
};

export default function LatinAmericaMap() {
  const [hoveredCountry, setHoveredCountry] = useState(null);
const isMobile = typeof window !== "undefined" && window.innerWidth < 860;
  const getCountryId = (geo) =>
    geo.properties.name.toLowerCase().replace(/\s+/g, "-");

  const handleCountryClick = (countryId) => {
    window.location.href = `/country/${countryId}`;
  };

  return (
    <div className="map-wrapper" style={{ position: "relative" }}>
      <ComposableMap
        projection="geoMercator"
         projectionConfig={{
          scale: isMobile ? 430 : 410,   // ← ESCALA MÓVIL AQUÍ
          center: [-65, -25]
        }}
       
        className="composable-map-container"
        style={{ width: "100%", height: "100%" }}
      >
        {/* === PINTAR PAÍSES === */}
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies
              .filter((geo) =>
                latinCountries.includes(geo.properties.name)
              )
              .map((geo) => {
                const countryId = getCountryId(geo);
                const isLifted = hoveredCountry === countryId;
                const isConflict = countryData[countryId]?.hasConflict;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleCountryClick(countryId)}
                    onMouseEnter={() => setHoveredCountry(countryId)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    className={`${isLifted ? "country-lifted" : ""} ${
                      isConflict ? "conflict-country" : ""
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
                );
              })
          }
        </Geographies>

        {/* === MARCADORES DE CONFLICTO === */}
        {Object.entries(countryData).map(([id, data]) => {
          if (!data.hasConflict) return null;

          // return (
          //   <Marker key={id} coordinates={data.coordinates}>
          //     <g
          //       onMouseEnter={() => setHoveredCountry(id)}
          //       onMouseLeave={() => setHoveredCountry(null)}
          //       style={{ cursor: "pointer" }}
          //     >
          //       <circle r="20" className="conflict-marker-pulse" />
          //       <circle r="20" className="conflict-marker-pulse" style={{ animationDelay: "0.5s" }} />
          //       <circle r="20" className="conflict-marker-pulse" style={{ animationDelay: "1s" }} />
          //       <circle r="20" className="conflict-marker-pulse" style={{ animationDelay: "1.5s" }} />
               
          //     </g>
          //   </Marker>
          // );
        })}
      </ComposableMap>

      {/* === NOMBRE + BANDERA CON MISMO EFECTO PREMIUM === */}
      {hoveredCountry && countryData[hoveredCountry] && (
        <div className="country-name-float">
          
          <span>{countryData[hoveredCountry].name}</span>
        </div>
      )}
    </div>
  );
}
