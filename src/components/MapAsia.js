"use client"

import React, { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import "./WorldMap.css";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

// Países de Asia por nombre oficial del topojson
const asiaCountries = [
  "Afghanistan","Armenia","Azerbaijan","Bangladesh","Bhutan",
  "Brunei","Cambodia","China","Georgia","India","Indonesia","Japan",
  "Kazakhstan","Kyrgyzstan","Laos","Malaysia","Maldives","Mongolia",
  "Myanmar","Nepal","North Korea","Pakistan","Philippines","Singapore",
  "South Korea","Sri Lanka","Taiwan","Tajikistan","Thailand",
  "Turkmenistan","Uzbekistan","Vietnam","Papua New Guinea"
];

// Países de Asia en conflicto
const ASIA_CONFLICTS = new Set([
  "myanmar",
  "china",
  "india",
 
]);

export default function MapAsia() {
  const [hovered, setHovered] = useState(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 860;

  return (
    <div className="map-wrapper" style={{ position: "relative" }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: isMobile ? 380 : 400,
          center: [100, 30],
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies
              .filter((geo) => asiaCountries.includes(geo.properties.name))
              .map((geo) => {
                const name = geo.properties.name;
                const id = name.toLowerCase().replace(/\s+/g, "-");
                const lifted = hovered === id;
                const isConflict = ASIA_CONFLICTS.has(id);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setHovered(id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => (window.location.href = `/country/${id}`)}
                    className={`${lifted ? "country-lifted" : ""} ${
                      isConflict ? "conflict-country" : ""
                    }`}
                    fill={lifted ? "#939c9fff" : "#0C1E28"}
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
      </ComposableMap>

      {hovered && (
        <div className="country-name-float">
          {hovered.replace(/-/g, " ")}
        </div>
      )}
    </div>
  );
}
