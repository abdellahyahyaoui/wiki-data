"use client"

import "./Home.css"
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"

import WorldMap from "../components/WorldMap"
import MapLatinAmerica from "../components/MapLatinAmerica"
import MapEurope from "../components/MapEurope"
import MapAsia from "../components/MapAsia"
import MapAfrica from "../components/MapAfrica"

// ========================== REGIONES ==========================

const regions = [
  {
    name: "Oriente Medio",
    countries: [
      { id: "palestine", name: "Palestina", hasConflict: true },
      { id: "lebanon", name: "Líbano", hasConflict: true },
      { id: "yemen", name: "Yemen", hasConflict: true },
      { id: "syria", name: "Siria", hasConflict: true },
      { id: "iran", name: "Irán", hasConflict: true },
      { id: "egypt", name: "Egipto", hasConflict: true },
      { id: "sudan", name: "Sudán", hasConflict: true },
      { id: "libya", name: "Libia", hasConflict: true },
      { id: "morocco", name: "Marruecos", hasConflict: false },
      { id: "iraq", name: "Irak", hasConflict: false },
      { id: "turkey", name: "Turquía", hasConflict: false },
      { id: "uae", name: "Emiratos Árabes Unidos", hasConflict: false },
      { id: "qatar", name: "Qatar", hasConflict: false },
      { id: "oman", name: "Omán", hasConflict: false },
      { id: "jordan", name: "Jordania", hasConflict: false },
      { id: "kuwait", name: "Kuwait", hasConflict: false },
      { id: "mauritania", name: "Mauritania", hasConflict: false },
      { id: "algeria", name: "Argelia", hasConflict: false },
      { id: "tunisia", name: "Túnez", hasConflict: false },
      { id: "comoros", name: "Comoras", hasConflict: false },
      { id: "saudi", name: "Arabia Saudita", hasConflict: false },
    ]
  },

  {
    name: "Europa",
    countries: [
      { id: "albania", name: "Albania", hasConflict: false },
      { id: "andorra", name: "Andorra", hasConflict: false },
      { id: "austria", name: "Austria", hasConflict: false },
      { id: "belarus", name: "Belarús", hasConflict: false },
      { id: "belgium", name: "Bélgica", hasConflict: false },
      { id: "bosnia", name: "Bosnia y Herzegovina", hasConflict: false },
      { id: "bulgaria", name: "Bulgaria", hasConflict: false },
      { id: "croatia", name: "Croacia", hasConflict: false },
      { id: "czech", name: "República Checa", hasConflict: false },
      { id: "denmark", name: "Dinamarca", hasConflict: false },
      { id: "estonia", name: "Estonia", hasConflict: false },
      { id: "france", name: "Francia", hasConflict: false },
      { id: "germany", name: "Alemania", hasConflict: false },
      { id: "greece", name: "Grecia", hasConflict: false },
      { id: "hungary", name: "Hungría", hasConflict: false },
      { id: "iceland", name: "Islandia", hasConflict: false },
      { id: "ireland", name: "Irlanda", hasConflict: false },
      { id: "italy", name: "Italia", hasConflict: false },
      { id: "kosovo", name: "Kosovo", hasConflict: false },
      { id: "latvia", name: "Letonia", hasConflict: false },
      { id: "liechtenstein", name: "Liechtenstein", hasConflict: false },
      { id: "lithuania", name: "Lituania", hasConflict: false },
      { id: "luxembourg", name: "Luxemburgo", hasConflict: false },
      { id: "malta", name: "Malta", hasConflict: false },
      { id: "moldova", name: "Moldova", hasConflict: false },
      { id: "monaco", name: "Mónaco", hasConflict: false },
      { id: "montenegro", name: "Montenegro", hasConflict: false },
      { id: "netherlands", name: "Países Bajos", hasConflict: false },
      { id: "northmacedonia", name: "Macedonia del Norte", hasConflict: false },
      { id: "poland", name: "Polonia", hasConflict: false },
      { id: "portugal", name: "Portugal", hasConflict: false },
      { id: "romania", name: "Rumanía", hasConflict: false },
      { id: "sanmarino", name: "San Marino", hasConflict: false },
      { id: "serbia", name: "Serbia", hasConflict: false },
      { id: "slovakia", name: "Eslovaquia", hasConflict: false },
      { id: "slovenia", name: "Eslovenia", hasConflict: false },
      { id: "spain", name: "España", hasConflict: false },
      { id: "switzerland", name: "Suiza", hasConflict: false },
      { id: "ukraine", name: "Ucrania", hasConflict: true },
      { id: "uk", name: "Reino Unido", hasConflict: false },
      { id: "vatican", name: "Vaticano", hasConflict: false },
    ]
  },

  {
    name: "América Latina",
    countries: [
      { id: "brazil", name: "Brasil", hasConflict: false },
      { id: "argentina", name: "Argentina", hasConflict: false },
      { id: "colombia", name: "Colombia", hasConflict: false },
      { id: "chile", name: "Chile", hasConflict: false },
      { id: "peru", name: "Perú", hasConflict: false },
      { id: "venezuela", name: "Venezuela", hasConflict: true },
      { id: "mexico", name: "México", hasConflict: false },
      { id: "bolivia", name: "Bolivia", hasConflict: false },
      { id: "paraguay", name: "Paraguay", hasConflict: false },
      { id: "uruguay", name: "Uruguay", hasConflict: false },
      { id: "ecuador", name: "Ecuador", hasConflict: false },
      { id: "cuba", name: "Cuba", hasConflict: false },
      { id: "haiti", name: "Haití", hasConflict: true },
    ]
  },
  {
  name: "Asia",
  countries: [
    { id: "china", name: "China", hasConflict: true },
    { id: "india", name: "India", hasConflict: true },
    { id: "japan", name: "Japón", hasConflict: false },
    { id: "philippines", name: "Filipinas", hasConflict: false },
    { id: "vietnam", name: "Vietnam", hasConflict: false },
    { id: "northkorea", name: "Corea del Norte", hasConflict: false },
    { id: "southkorea", name: "Corea del Sur", hasConflict: false },
    { id: "taiwan", name: "Taiwán", hasConflict: false },
    { id: "pakistan", name: "Pakistán", hasConflict: false },
    { id: "afghanistan", name: "Afganistán", hasConflict: false },
    { id: "myanmar", name: "Myanmar", hasConflict: true },
    

  ]
},
{
  name: "África",
  countries: [
    { id: "southafrica", name: "Sudáfrica", hasConflict: false },
    { id: "ethiopia", name: "Etiopía", hasConflict: true },
    { id: "somalia", name: "Somalia", hasConflict: true },
    { id: "drcongo", name: "Rep. Dem. del Congo", hasConflict: true },
    { id: "nigeria", name: "Nigeria", hasConflict: true },
    { id: "kenya", name: "Kenia", hasConflict: false },
    { id: "uganda", name: "Uganda", hasConflict: false },
    { id: "angola", name: "Angola", hasConflict: false },
    { id: "tanzania", name: "Tanzania", hasConflict: false },
    { id: "mozambique", name: "Mozambique", hasConflict: false }
  ]
}


]

// ========================== COMPONENTE ==========================

function Home() {
  const [isMobile, setIsMobile] = useState(false)
  const [mapIndex, setMapIndex] = useState(0)
  const [showCountries, setShowCountries] = useState(false)
  const navigate = useNavigate()

  const maps = [
    <WorldMap key="arab" />,
    <MapEurope key="europe" />,
    <MapLatinAmerica key="latam" />,
    <MapAsia key="asia" />,
    <MapAfrica key="africa" />
  ]

  const nextMap = () => {
    setMapIndex(prev => (prev + 1) % maps.length)
    setShowCountries(false)
  }

  const prevMap = () => {
    setMapIndex(prev => (prev - 1 + maps.length) % maps.length)
    setShowCountries(false)
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 860)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return (
    <div className="home-container">

      <Link to="/admin/login" className="admin-button">Admin</Link>

      <div className="title-block">
        <h1 className="title-main">
          <span className="title-wiki">Wiki</span>
          <span className="title-conflicts">Conflicts</span>
        </h1>

        <h2 className="title-sub epic-quote">
          <span className="underline-effect">
            ❝ Y mientras el verdugo insista en escribir la <span className="pulse-word">historia</span>,
            mi deber será arrancarle la pluma. ❞
          </span>
        </h2>
      </div>

      {/* =================== MÓVIL =================== */}
      {isMobile && (
        <div className="mobile-scroll-zone">

          <div className="mobile-region-title-container" onClick={() => setShowCountries(!showCountries)}>
            <button className="mobile-arrow-left" onClick={prevMap}>◀</button>
            <span className="mobile-region-title-animated">{regions[mapIndex].name}</span>
            <button className="mobile-arrow-right" onClick={nextMap}>▶</button>
          </div>

          {showCountries && (
            <div className="mobile-country-list-animated">
              {regions[mapIndex].countries
                .filter(c => c.hasConflict)
                .map((c, index) => (
                  <div
                    key={c.id}
                    className="mobile-country-item"
                    style={{ animationDelay: `${0.06 * index}s` }}
                    onClick={() => navigate(`/country/${c.id}`)}
                  >
                    <div className="mobile-country-left-line"></div>
                    <span style={{ color: "#0c3344" }}>{c.name}</span>
                  </div>
                ))}
            </div>
          )}

          <div style={{ marginTop: "20px" }}>
            {maps[mapIndex]}
          </div>
        </div>
      )}

      {/* =================== DESKTOP =================== */}
      {!isMobile && (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {maps[mapIndex]}
          <button className="desktop-arrow" onClick={prevMap}>◀</button>
          <button className="desktop-arrow" onClick={nextMap}>▶</button>
        </div>
      )}

    </div>
  )
}

export default Home
