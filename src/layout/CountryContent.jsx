"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "../context/LanguageContext"
import "./country-content.css"
import "./timeline.css"
import MediaGallery from "./MediaGallery"
import ChaptersOverlay from "../components/ChaptersOverlay"

export default function CountryContent({ countryCode, section, searchTerm = "" }) {
  const { lang, t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState("index")
  const [items, setItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedLetter, setSelectedLetter] = useState(null)
  const [availableLetters, setAvailableLetters] = useState([])
  const [currentCategory, setCurrentCategory] = useState(null)
  const [analysesIndex, setAnalysesIndex] = useState(null)
  const [globalTerminologyResults, setGlobalTerminologyResults] = useState([])
  const [isGlobalSearching, setIsGlobalSearching] = useState(false)
  const [isChaptersMenuOpen, setIsChaptersMenuOpen] = useState(false)
  const [filterYear, setFilterYear] = useState("")
  const [filterMonth, setFilterMonth] = useState("")
  const [sectionHeader, setSectionHeader] = useState({ title: "", description: "" })
const [isChaptersPanelOpen, setChaptersPanelOpen] = useState(false)
  const months = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" }
  ]

  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      if (section.startsWith("terminology-")) {
        performGlobalTerminologySearch(searchTerm)
      }
      // Search is now applied via filteredItems for other sections
    } else {
      setGlobalTerminologyResults([])
      setIsGlobalSearching(false)
    }
  }, [searchTerm, section, lang])

  async function performGlobalTerminologySearch(term) {
    setIsGlobalSearching(true)
    const categories = ["personajes", "organizaciones", "conceptos"]
    const allLetters = "abcdefghijklmnopqrstuvwxyz".split("")
    let allResults = []

    try {
      for (const category of categories) {
        for (const letter of allLetters) {
          try {
            const res = await fetch(`/data/${lang}/terminology/${category}/${letter}.json`)
            if (res.ok) {
              const json = await res.json()
              const filtered = (json.items || []).filter((item) => {
                const searchLower = term.toLowerCase()
                return (
                  item.name?.toLowerCase().includes(searchLower) ||
                  item.title?.toLowerCase().includes(searchLower) ||
                  item.content?.toLowerCase().includes(searchLower)
                )
              })
              allResults = [...allResults, ...filtered.map((item) => ({ ...item, category, letter }))]
            }
          } catch {
            // Skip missing files
          }
        }
      }
      setGlobalTerminologyResults(allResults)
    } catch (err) {
      console.error("[v0] Error in global terminology search:", err)
    }
    setIsGlobalSearching(false)
  }

  useEffect(() => {
    loadSection()
  }, [section, countryCode, lang])

  async function loadSectionHeader(sectionName) {
    try {
      const res = await fetch(`/data/${lang}/${countryCode}/section-headers.json`)
      if (res.ok) {
        const data = await res.json()
        if (data[sectionName]) {
          setSectionHeader(data[sectionName])
          return
        }
      }
    } catch {
    }
    setSectionHeader({ title: "", description: "" })
  }

  async function loadSection() {
    setLoading(true)
    setView("index")
    setSelectedItem(null)
    setSelectedLetter(null)
    setItems([])
    setAnalysesIndex(null)
    setGlobalTerminologyResults([])
    setIsGlobalSearching(false)
    setFilterYear("")
    setFilterMonth("")
    setSectionHeader({ title: "", description: "" })

    try {
      if (section.startsWith("terminology-")) {
        const category = section.replace("terminology-", "")
        setCurrentCategory(category)
        const res = await fetch(`/data/${lang}/terminology.index.json`)
        const json = await res.json()
        const categoryData = json.categories.find((c) => c.id === category)
        if (categoryData) setAvailableLetters(categoryData.letters.map((l) => l.toUpperCase()))
        setView("letters")
      } else if (["testimonies", "analysts", "genocides"].includes(section)) {
        loadSectionHeader(section)
        const res = await fetch(`/data/${lang}/${countryCode}/${section}.index.json`)
        const json = res.ok ? await res.json() : { items: [] }
        setItems(json.items || [])
        setView(json.items?.length ? "grid" : "empty")
      } else if (section === "resistance") {
        loadSectionHeader("resistance")
        const res = await fetch(`/data/${lang}/${countryCode}/resistance/resistance.index.json`)
        const json = res.ok ? await res.json() : { items: [] }
        setItems(json.items || [])
        setView(json.items?.length ? "grid" : "empty")
      } else if (section === "timeline") {
        const res = await fetch(`/data/${lang}/${countryCode}/timeline/timeline.index.json`)
        const json = res.ok ? await res.json() : { items: [] }
        setItems(json.items || [])
        setView(json.items?.length ? "timeline" : "empty")
      } else if (section === "fototeca" || section === "fototeca-photos" || section === "fototeca-videos") {
        const res = await fetch(`/data/${lang}/${countryCode}/fototeca/fototeca.index.json`)
        const json = res.ok ? await res.json() : { items: [] }
        let mediaItems = json.items || []
        
        if (section === "fototeca-photos") {
          mediaItems = mediaItems.filter(item => item.type === 'image')
        } else if (section === "fototeca-videos") {
          mediaItems = mediaItems.filter(item => item.type === 'video')
        }
        
        setItems(mediaItems)
        setView(mediaItems.length ? "fototeca" : "empty")
      } else if (["media-gallery-images", "media-gallery-videos"].includes(section)) {
        let mediaItems = []

        if (section === "media-gallery-images") {
          const resImages = await fetch(`/data/${lang}/${countryCode}/media/images.json`)
          const imagesJson = resImages.ok ? await resImages.json() : { images: [] }
          mediaItems = (imagesJson.images || []).map((img) => ({
            ...img,
            url: img.url || img.image || "/placeholder.svg",
            type: "image",
          }))
        } else if (section === "media-gallery-videos") {
          const resVideos = await fetch(`/data/${lang}/${countryCode}/media/videos.json`)
          const videosJson = resVideos.ok ? await resVideos.json() : { videos: [] }
          mediaItems = (videosJson.videos || []).map((vid) => ({
            ...vid,
            url: vid.url || vid.video,
            type: "video",
          }))
        }

        if (mediaItems.length > 0) {
          setItems(mediaItems)
          setView("media-gallery")
        } else {
          setView("empty")
        }
      } else if (section === "description") {
        const res = await fetch(`/data/${lang}/${countryCode}/description.json`)
        if (!res.ok) {
          setView("empty")
        } else {
          const json = await res.json()
          if (json.chapters) {
            setItems(json.chapters)
            setSelectedItem(json.chapters[0] || null)
            setView("chapter-index")
          } else {
            setSelectedItem(json)
            setView("article")
          }
        }
      } else if (section === "velum") {
        const res = await fetch(`/data/${lang}/velum/velum.index.json`)
        const json = res.ok ? await res.json() : { items: [] }
        setItems(json.items || [])
        setView(json.items?.length ? "velum-grid" : "empty")
      }
    } catch (err) {
      console.error("[v0] Error loading section:", err)
      setView("empty")
    }

    setLoading(false)
  }

  async function showItemsForLetter(letter) {
    setSelectedLetter(letter)
    try {
      const res = await fetch(`/data/${lang}/terminology/${currentCategory}/${letter.toLowerCase()}.json`)
      const json = res.ok ? await res.json() : { items: [] }
      setItems(json.items || [])
      setView("grid")
    } catch {
      setItems([])
      setView("grid")
    }
  }

  async function loadItemDetail(item) {
    try {
      if (section.startsWith("terminology-")) {
        const category = item.category || section.split("-")[1]
        const letter = item.letter || item.name?.charAt(0).toLowerCase()

        try {
          const res = await fetch(`/data/${lang}/terminology/${category}/${letter}.json`)
          if (res.ok) {
            const json = await res.json()
            const fullItem = json.items?.find((i) => i.id === item.id || i.name === item.name)
            if (fullItem) {
              setSelectedItem({ ...fullItem, category })
            } else {
              setSelectedItem({ ...item, category })
            }
          } else {
            setSelectedItem({ ...item, category })
          }
        } catch {
          setSelectedItem({ ...item, category })
        }

        setView("article-with-letters")
        return
      }

      let path = ""
      if (section === "testimonies") path = `/data/${lang}/${countryCode}/testimonies/${item.id}.json`
      else if (section === "analysts") path = `/data/${lang}/${countryCode}/analysts/${item.id}.json`
      else if (section === "genocides") path = `/data/${lang}/${countryCode}/genocides/${item.id}.json`
      else if (section === "resistance") path = `/data/${lang}/${countryCode}/resistance/${item.id}.json`

      if (path) {
        const res = await fetch(path)

        if (res.ok) {
          const json = await res.json()

          if (json.analyses && Array.isArray(json.analyses)) {
  // Caso ANALYSTS (múltiples análisis)
  setAnalysesIndex({ ...json, type: "analysis" })
  setView("analyses-index")
} else if (json.testimonies && Array.isArray(json.testimonies)) {
  // Caso TESTIMONIES (múltiples testimonios por persona)
  setAnalysesIndex({ ...json, type: "testimony" })
  setView("analyses-index")
} else if (json.entries && Array.isArray(json.entries)) {
  // Caso RESISTANCE (múltiples entradas por autor)
  setAnalysesIndex({ ...json, type: "resistance" })
  setView("analyses-index")
} else {
  // Caso normal (artículo único)
  setSelectedItem(json)
  setView("article")
}

        }
      }
    } catch (err) {
      console.error("[v0] Error loading item:", err)
    }
  }

  async function loadSpecificAnalysis(analysisId) {
    try {
      const isTestimony = analysesIndex?.type === "testimony"
      const isResistance = analysesIndex?.type === "resistance" || section === "resistance"
      let baseFolder = "analysts"
      if (isTestimony) baseFolder = "testimonies"
      if (isResistance) baseFolder = "resistance"

      const path = `/data/${lang}/${countryCode}/${baseFolder}/${analysesIndex.id}/${analysisId}.json`

      const res = await fetch(path)
      if (res.ok) {
        const json = await res.json()
        setSelectedItem(json)
        setView("article")
      }
    } catch (err) {
      console.error("[v0] Error loading specific analysis:", err)
    }
  }

  async function loadTimelineDetail(item) {
    try {
      const path = `/data/${lang}/${countryCode}/timeline/${item.id}.json`
      const res = await fetch(path)
      if (res.ok) {
        const json = await res.json()
        setSelectedItem(json)
        setView("timeline-article")
      }
    } catch (err) {
      console.error("[v0] Error loading timeline item:", err)
    }
  }

  async function loadVelumArticle(article) {
    try {
      const path = `/data/${lang}/velum/${article.id}.json`
      const res = await fetch(path)
      if (res.ok) {
        const json = await res.json()
        setSelectedItem(json)
        setView("velum-article")
      }
    } catch (err) {
      console.error("[v0] Error loading VELUM article:", err)
    }
  }

  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.title?.toLowerCase().includes(searchLower) ||
      item.content?.toLowerCase().includes(searchLower) ||
      item.shortDescription?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      item.bio?.toLowerCase().includes(searchLower) ||
      item.summary?.toLowerCase().includes(searchLower) ||
      item.paragraphs?.some((p) => p.toLowerCase().includes(searchLower))
    )
  })

  if (loading) return <div className="content-loading">{t("loading")}</div>
  if (view === "empty") return <div className="content-inner">{t("no-content")}</div>

  const showAlphabetBar =
    section.startsWith("terminology-") && (view === "letters" || view === "article-with-letters" || view === "grid")

  if (showAlphabetBar) {
    const allLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

    return (
      <div className="content-inner">
        <h2 className="section-header">
          {t("terminology")} -{" "}
          {currentCategory === "personajes"
            ? t("characters")
            : currentCategory === "organizaciones"
              ? t("organizations")
              : t("concepts")}
        </h2>

        {/* Alphabet bar always visible in terminology */}
        <div className="alphabet-bar">
          {allLetters.map((letter) => {
            const hasContent = availableLetters.includes(letter)
            return (
              <span
                key={letter}
                className={`letter ${hasContent ? "has-content" : "no-content"} ${selectedLetter === letter ? "active" : ""}`}
                onClick={() => {
                  if (hasContent) {
                    showItemsForLetter(letter)
                    setSelectedItem(null)
                  }
                }}
                role={hasContent ? "button" : undefined}
                tabIndex={hasContent ? 0 : -1}
                style={{ cursor: hasContent ? "pointer" : "default" }}
                onKeyDown={(e) => {
                  if (hasContent && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    showItemsForLetter(letter)
                    setSelectedItem(null)
                  }
                }}
              >
                {letter}
              </span>
            )
          })}
        </div>

        {searchTerm && isGlobalSearching && (
          <div className="search-results-info">{t("searching-global-terminology")}</div>
        )}

        {searchTerm && !isGlobalSearching && globalTerminologyResults.length > 0 && (
          <div>
            <div className="search-results-info">
              {globalTerminologyResults.length} {t("results-found")} "{searchTerm}"
            </div>
            <div className="items-grid">
              {globalTerminologyResults.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="item-card"
                  onClick={() => loadItemDetail(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      loadItemDetail(item)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                >
                  <div className="item-icon">
                    <img src={item.image || "/placeholder.svg?height=80&width=80"} alt={item.name} />
                  </div>
                  <div className="item-name">{item.name}</div>
                  <div className="item-category">
                    {item.category === "personajes"
                      ? t("characters")
                      : item.category === "organizaciones"
                        ? t("organizations")
                        : t("concepts")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchTerm && !isGlobalSearching && globalTerminologyResults.length === 0 && (
          <div className="no-results">
            {t("no-results-found")} "{searchTerm}" {t("in-global-terminology")}.
          </div>
        )}

        {/* Show letter content grid when not searching and a letter is selected */}
        {!searchTerm && view === "grid" && selectedLetter && (
          <div className="items-grid">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="item-card"
                onClick={() => loadItemDetail(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    loadItemDetail(item)
                  }
                }}
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
              >
                <div className="item-icon">
                  <img src={item.image || "/placeholder.svg?height=80&width=80"} alt={item.name} />
                </div>
                <div className="item-name">{item.name}</div>
              </div>
            ))}
          </div>
        )}

        {/* Show article with letters visible */}
        {view === "article-with-letters" && selectedItem && (
          <article className="article-content">
            <button
              className="back-button"
              onClick={() => {
                setSelectedItem(null)
                setView("grid")
              }}
            >
              {t("back-button")}
            </button>
            <h1 className="article-title">{selectedItem.title || selectedItem.name}</h1>
            <div className="article-body">
              {selectedItem.image && (
                <div className="article-media">
                  <img
                    src={selectedItem.image || "/placeholder.svg"}
                    alt={selectedItem.title || selectedItem.name}
                    className="article-image"
                  />
                </div>
              )}
              {selectedItem.video && (
                <div className="article-media">
                  <video src={selectedItem.video} controls className="article-video" />
                </div>
              )}
              <div className="article-text">
                {selectedItem.content && <p>{selectedItem.content}</p>}
                {selectedItem.paragraphs && selectedItem.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </article>
        )}
      </div>
    )
  }

  if (view === "analyses-index" && analysesIndex) {
    let itemsList
    if (analysesIndex.type === "testimony") {
      itemsList = analysesIndex.testimonies
    } else if (analysesIndex.type === "resistance") {
      itemsList = analysesIndex.entries
    } else {
      itemsList = analysesIndex.analyses
    }
    const hasMultipleItems = itemsList && itemsList.length > 1

    return (
      <div className="content-inner">
        <button className="back-button" onClick={() => loadSection()}>
          {t("back-button")}
        </button>
        <div className="analyst-header">
          {analysesIndex.image && (
            <img src={analysesIndex.image || "/placeholder.svg"} alt={analysesIndex.name} className="analyst-photo" />
          )}
          <div className="analyst-info">
            <h1 className="analyst-name">{analysesIndex.name}</h1>
            {analysesIndex.bio && <p className="analyst-bio">{analysesIndex.bio}</p>}
          </div>
        </div>
        <h2 className="analyses-list-title">
          {analysesIndex.type === "testimony"
            ? t("available-testimonies")
            : analysesIndex.type === "resistance" 
              ? (t("resistance-entries") || "Entradas de resistencia")
              : t("available-analyses")}
        </h2>

        <div className={`analyses-list ${hasMultipleItems ? "timeline-style" : ""}`}>
          {itemsList?.map((analysis, index) => (
            <div
              key={analysis.id}
              className={`analysis-card ${hasMultipleItems ? "timeline-card" : ""}`}
              onClick={() => loadSpecificAnalysis(analysis.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  loadSpecificAnalysis(analysis.id)
                }
              }}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
            >
              {hasMultipleItems && <div className="timeline-dot"></div>}
              <div className="analysis-card-content">
                <h3 className="analysis-title">{analysis.title}</h3>
                {analysis.date && <p className="analysis-date">{analysis.date}</p>}
                {analysis.summary && <p className="analysis-summary">{analysis.summary}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (section === "description" && view === "chapter-index") {
    return (
      <div className="description-wrapper">
        <div className="chapters-menu-sticky">
          <h2 className="section-header-inline">{t("conflict-description")}</h2>
          <div className="chapters-nav-container">
            <button className="chapters-index-button"
  onClick={() => setIsChaptersMenuOpen(!isChaptersMenuOpen)}
>
  {/* <span className="index-line">──────</span> */}
  {/* <span className="index-arrow">&gt;</span> */}
  <span className="index-text">Índice</span>
</button>


            {isChaptersMenuOpen && (
  <ChaptersOverlay
    chapters={filteredItems}
    selectedId={selectedItem?.id}
    onSelect={(ch) => setSelectedItem(ch)}
    onClose={() => setIsChaptersMenuOpen(false)}
  />
)}

            <div className="chapters-horizontal-menu desktop-only">
              {filteredItems.map((ch) => (
                <div
                  key={ch.id}
                  className={`chapter-tab ${selectedItem?.id === ch.id ? "active" : ""}`}
                  onClick={() => setSelectedItem(ch)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setSelectedItem(ch)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                >
                  {ch.title}
                </div>
              ))}
            </div>
          </div>
        </div>
        {searchTerm && filteredItems.length < items.length && (
          <div className="search-results-info" style={{ padding: "1rem" }}>
            {t("showing-results")} {filteredItems.length} {t("of")} {items.length} {t("for-search-term")} "{searchTerm}"
          </div>
        )}
        {searchTerm && filteredItems.length === 0 && (
          <div className="no-results" style={{ padding: "1rem" }}>
            {t("no-results-found")} "{searchTerm}"
          </div>
        )}
        <div className="chapter-content-scrollable">
          {selectedItem && (
            <article className="article-content">
              <h1 className="article-title">{selectedItem.title}</h1>
              <div className="article-body">
                {selectedItem.image && (
                  <div className="article-media">
                    <img
                      src={selectedItem.image || "/placeholder.svg"}
                      alt={selectedItem.title || selectedItem.name}
                      className="article-image"
                    />
                  </div>
                )}
                {selectedItem.video && (
                  <div className="article-media">
                    <video src={selectedItem.video} controls className="article-video" />
                  </div>
                )}
                <div className="article-text">
                  {selectedItem.content && <p>{selectedItem.content}</p>}
                  {selectedItem.paragraphs && selectedItem.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    )
  }

  if (view === "media-gallery") {
    return (
      <div className="content-inner">
        <h2 className="section-header">{t("media-gallery")}</h2>
        {searchTerm && (
          <div className="search-results-info">
            {t("showing-results")} {filteredItems.length} {t("of")} {items.length} {t("for-search-term")} "{searchTerm}"
          </div>
        )}
        <MediaGallery items={filteredItems} />
        {filteredItems.length === 0 && searchTerm && (
          <div className="no-results">
            {t("no-results-found")} "{searchTerm}"
          </div>
        )}
      </div>
    )
  }

  if (view === "grid") {
    return (
      <div className="content-inner">
        {(sectionHeader.title || sectionHeader.description) && (
          <div className="section-header-block">
            {sectionHeader.title && <h2 className="section-title">{sectionHeader.title}</h2>}
            {sectionHeader.description && <p className="section-description">{sectionHeader.description}</p>}
          </div>
        )}
        {searchTerm && (
          <div className="search-results-info">
            {t("showing-results")} {filteredItems.length} {t("of")} {items.length} {t("for-search-term")} "{searchTerm}"
          </div>
        )}
        <div className="items-grid">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="item-card"
              onClick={() => loadItemDetail(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  loadItemDetail(item)
                }
              }}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
            >
              <div className="item-icon">
                <img src={item.image || "/placeholder.svg?height=80&width=80"} alt={item.name} />
              </div>
              <div className="item-name">{item.name}</div>
            </div>
          ))}
        </div>
        {filteredItems.length === 0 && searchTerm && (
          <div className="no-results">
            {t("no-results-found")} "{searchTerm}"
          </div>
        )}
      </div>
    )
  }

  if (view === "article" && selectedItem) {
    const isArabic = lang === "ar"
    const textClasses = `article-text ${isArabic ? 'article-text-arabic' : ''}`
    const titleClasses = `article-title ${isArabic ? 'amiri-font' : ''}`

    const renderMediaGallery = (media) => {
      if (!media || media.length === 0) return null
      return (
        <div className="entry-media-gallery">
          {media.map((item, idx) => {
            const mediaType = item.type || (item.url?.match(/\.(mp4|webm|ogg)/i) ? 'video' : item.url?.match(/\.(mp3|wav|ogg)/i) ? 'audio' : 'image')
            return (
              <div key={idx} className="entry-media-item">
                {mediaType === 'video' && (
                  <>
                    <video src={item.url} controls />
                    <span className="entry-media-type">📹</span>
                  </>
                )}
                {mediaType === 'audio' && (
                  <div className="audio-player-container">
                    <audio src={item.url} controls />
                    <span className="audio-player-label">{item.caption || 'Audio'}</span>
                  </div>
                )}
                {mediaType === 'image' && (
                  <>
                    <img src={item.url} alt={item.caption || 'Media'} />
                    <span className="entry-media-type">📷</span>
                  </>
                )}
                {item.caption && mediaType !== 'audio' && (
                  <div className="entry-media-caption">{item.caption}</div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    const renderContentBlocks = (blocks) => {
      if (!blocks || blocks.length === 0) return null
      
      // Improved algorithm: look ahead for media+text pairs, handle all orderings
      const groupedContent = []
      let i = 0
      let isFirstText = true
      
      while (i < blocks.length) {
        const block = blocks[i]
        
        if (block.type === 'image' || block.type === 'video') {
          const mediaBlock = block
          const position = block.position || 'right'
          let adjacentText = null
          let fullWidthText = []
          
          // Look for text immediately after media
          if (i + 1 < blocks.length && blocks[i + 1].type === 'text') {
            const textContent = blocks[i + 1].content || ''
            const paragraphs = textContent.split('\n').filter(p => p.trim())
            
            if (paragraphs.length > 0) {
              // First 2-3 paragraphs go beside media, rest goes full width
              const splitPoint = Math.min(3, Math.ceil(paragraphs.length / 2))
              adjacentText = paragraphs.slice(0, splitPoint).join('\n')
              fullWidthText = paragraphs.slice(splitPoint)
              i++ // Skip the text block since we processed it
            }
          }
          
          groupedContent.push({
            type: 'l-shape',
            media: mediaBlock,
            position: position,
            adjacentText: adjacentText,
            fullWidthText: fullWidthText,
            isFirst: isFirstText && adjacentText
          })
          
          if (adjacentText) isFirstText = false
          
        } else if (block.type === 'text') {
          const textContent = block.content || ''
          const paragraphs = textContent.split('\n').filter(p => p.trim())
          
          // Check if next block is media - if so, create L-shape with text first
          if (i + 1 < blocks.length && (blocks[i + 1].type === 'image' || blocks[i + 1].type === 'video')) {
            const mediaBlock = blocks[i + 1]
            const position = mediaBlock.position || 'left' // Text first = media on left
            
            const splitPoint = Math.min(3, Math.ceil(paragraphs.length / 2))
            const adjacentText = paragraphs.slice(0, splitPoint).join('\n')
            const fullWidthText = paragraphs.slice(splitPoint)
            
            groupedContent.push({
              type: 'l-shape',
              media: mediaBlock,
              position: position,
              adjacentText: adjacentText,
              fullWidthText: fullWidthText,
              isFirst: isFirstText
            })
            
            isFirstText = false
            i++ // Skip the media block since we processed it
          } else {
            // Standalone text block
            groupedContent.push({
              type: 'text-only',
              content: block.content,
              isFirst: isFirstText
            })
            isFirstText = false
          }
          
        } else if (block.type === 'audio') {
          groupedContent.push({
            type: 'audio',
            url: block.url,
            caption: block.caption
          })
        }
        i++
      }
      
      return (
        <div className="rich-content-display">
          {groupedContent.map((group, idx) => {
            if (group.type === 'l-shape') {
              return (
                <div key={idx} className={`content-l-shape content-l-shape-${group.position}`}>
                  <div className="l-shape-top">
                    <figure className={`l-shape-media l-shape-media-${group.position}`}>
                      {group.media.type === 'image' ? (
                        <img src={group.media.url} alt={group.media.caption || ''} />
                      ) : (
                        <video src={group.media.url} controls />
                      )}
                      {group.media.caption && <figcaption>{group.media.caption}</figcaption>}
                    </figure>
                    {group.adjacentText && (
                      <div className={`l-shape-adjacent-text ${group.isFirst ? 'drop-cap-paragraph' : ''}`}>
                        {group.adjacentText.split('\n').filter(p => p.trim()).map((para, pIdx) => (
                          <p key={pIdx}>{para}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  {group.fullWidthText && group.fullWidthText.length > 0 && (
                    <div className="l-shape-full-width">
                      {group.fullWidthText.map((para, pIdx) => (
                        <p key={pIdx}>{para}</p>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            if (group.type === 'text-only') {
              return (
                <div key={idx} className={`content-block content-block-text ${group.isFirst ? 'drop-cap-paragraph' : ''}`}>
                  {(group.content || '').split('\n').filter(p => p.trim()).map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))}
                </div>
              )
            }
            if (group.type === 'audio') {
              return (
                <div key={idx} className="content-block content-audio">
                  <audio src={group.url} controls />
                  {group.caption && <span className="audio-caption">{group.caption}</span>}
                </div>
              )
            }
            return null
          })}
        </div>
      )
    }

    const hasContentBlocks = selectedItem.contentBlocks && selectedItem.contentBlocks.length > 0

    return (
      <div className="content-inner" dir={isArabic ? 'rtl' : 'ltr'} lang={isArabic ? 'ar' : lang}>
        <button
          className="back-button"
          onClick={() => {
            if (analysesIndex) {
              setView("analyses-index")
            } else {
              loadSection()
            }
          }}
        >
          {t("back-button")}
        </button>
        <article className="article-content">
          <h1 className={titleClasses}>{selectedItem.title || selectedItem.name}</h1>
          <div className="article-body">
            {!hasContentBlocks && selectedItem.image && (
              <div className="article-media">
                <img
                  src={selectedItem.image || "/placeholder.svg"}
                  alt={selectedItem.title || selectedItem.name}
                  className="article-image"
                />
              </div>
            )}
            {!hasContentBlocks && selectedItem.video && (
              <div className="article-media">
                <video src={selectedItem.video} controls className="article-video" />
              </div>
            )}
            {!hasContentBlocks && selectedItem.media && renderMediaGallery(selectedItem.media)}
            {hasContentBlocks ? (
              renderContentBlocks(selectedItem.contentBlocks)
            ) : (
              <div className={textClasses}>
                {selectedItem.content && <p>{selectedItem.content}</p>}
                {selectedItem.paragraphs && selectedItem.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            )}
          </div>
        </article>
      </div>
    )
  }

  if (view === "timeline") {
    const years = [...new Set(items.map(i => i.year).filter(Boolean))].sort((a, b) => b - a)
    
    const timelineFiltered = items.filter(item => {
      if (filterYear && item.year !== parseInt(filterYear)) return false
      if (filterMonth && item.month !== parseInt(filterMonth)) return false
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          item.title?.toLowerCase().includes(searchLower) ||
          item.summary?.toLowerCase().includes(searchLower) ||
          item.date?.toLowerCase().includes(searchLower)
        )
      }
      return true
    })

    return (
      <div className="timeline-container">
        <div className="timeline-header">
          <h2>{t("timeline")}</h2>
          <p>{t("timeline-subtitle")}</p>
        </div>
        <div className="timeline-filters">
          <select 
            value={filterYear} 
            onChange={(e) => setFilterYear(e.target.value)}
            className="timeline-filter-select"
          >
            <option value="">{t("all-years") || "Todos los años"}</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)}
            className="timeline-filter-select"
          >
            <option value="">{t("all-months") || "Todos los meses"}</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {(filterYear || filterMonth) && (
            <button 
              className="timeline-filter-clear"
              onClick={() => { setFilterYear(""); setFilterMonth(""); }}
            >
              {t("clear-filters") || "Limpiar filtros"}
            </button>
          )}
        </div>
        {timelineFiltered.length === 0 ? (
          <div className="timeline-empty">
            {t("no-events-found") || "No se encontraron eventos con los filtros seleccionados"}
          </div>
        ) : (
          <div className="timeline-line">
            {timelineFiltered.map((item) => (
              <div
                key={item.id}
                className="timeline-event"
                onClick={() => loadTimelineDetail(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    loadTimelineDetail(item)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="timeline-date">{item.date}</div>
                <div className="timeline-title">{item.title}</div>
                <div className="timeline-summary">{item.summary}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (view === "timeline-article" && selectedItem) {
    const hasContentBlocks = selectedItem.contentBlocks && selectedItem.contentBlocks.length > 0
    
    const renderTimelineContentBlocks = (blocks) => {
      if (!blocks || blocks.length === 0) return null
      
      const groupedContent = []
      let i = 0
      let isFirstText = true
      
      while (i < blocks.length) {
        const block = blocks[i]
        
        if (block.type === 'image' || block.type === 'video') {
          const mediaBlock = block
          const position = block.position || 'right'
          let adjacentText = null
          let fullWidthText = []
          
          if (i + 1 < blocks.length && blocks[i + 1].type === 'text') {
            const textContent = blocks[i + 1].content || ''
            const paragraphs = textContent.split('\n').filter(p => p.trim())
            
            if (paragraphs.length > 0) {
              const splitPoint = Math.min(3, Math.ceil(paragraphs.length / 2))
              adjacentText = paragraphs.slice(0, splitPoint).join('\n')
              fullWidthText = paragraphs.slice(splitPoint)
              i++
            }
          }
          
          groupedContent.push({
            type: 'l-shape',
            media: mediaBlock,
            position: position,
            adjacentText: adjacentText,
            fullWidthText: fullWidthText,
            isFirst: isFirstText && adjacentText
          })
          
          if (adjacentText) isFirstText = false
          
        } else if (block.type === 'text') {
          const textContent = block.content || ''
          const paragraphs = textContent.split('\n').filter(p => p.trim())
          
          if (i + 1 < blocks.length && (blocks[i + 1].type === 'image' || blocks[i + 1].type === 'video')) {
            const mediaBlock = blocks[i + 1]
            const position = mediaBlock.position || 'left'
            
            const splitPoint = Math.min(3, Math.ceil(paragraphs.length / 2))
            const adjacentText = paragraphs.slice(0, splitPoint).join('\n')
            const fullWidthText = paragraphs.slice(splitPoint)
            
            groupedContent.push({
              type: 'l-shape',
              media: mediaBlock,
              position: position,
              adjacentText: adjacentText,
              fullWidthText: fullWidthText,
              isFirst: isFirstText
            })
            
            isFirstText = false
            i++
          } else {
            groupedContent.push({
              type: 'text-only',
              content: block.content,
              isFirst: isFirstText
            })
            isFirstText = false
          }
        } else if (block.type === 'audio') {
          groupedContent.push({
            type: 'audio',
            url: block.url,
            caption: block.caption
          })
        }
        i++
      }
      
      return (
        <div className="rich-content-display">
          {groupedContent.map((group, idx) => {
            if (group.type === 'l-shape') {
              return (
                <div key={idx} className={`content-l-shape content-l-shape-${group.position}`}>
                  <div className="l-shape-top">
                    <figure className={`l-shape-media l-shape-media-${group.position}`}>
                      {group.media.type === 'image' ? (
                        <img src={group.media.url} alt={group.media.caption || ''} />
                      ) : (
                        <video src={group.media.url} controls />
                      )}
                      {group.media.caption && <figcaption>{group.media.caption}</figcaption>}
                    </figure>
                    {group.adjacentText && (
                      <div className={`l-shape-adjacent-text ${group.isFirst ? 'drop-cap-paragraph' : ''}`}>
                        {group.adjacentText.split('\n').filter(p => p.trim()).map((para, pIdx) => (
                          <p key={pIdx}>{para}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  {group.fullWidthText && group.fullWidthText.length > 0 && (
                    <div className="l-shape-full-width">
                      {group.fullWidthText.map((para, pIdx) => (
                        <p key={pIdx}>{para}</p>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            if (group.type === 'text-only') {
              return (
                <div key={idx} className={`content-block content-block-text ${group.isFirst ? 'drop-cap-paragraph' : ''}`}>
                  {(group.content || '').split('\n').filter(p => p.trim()).map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))}
                </div>
              )
            }
            if (group.type === 'audio') {
              return (
                <div key={idx} className="content-block content-audio">
                  <audio src={group.url} controls />
                  {group.caption && <span className="audio-caption">{group.caption}</span>}
                </div>
              )
            }
            return null
          })}
        </div>
      )
    }
    
    return (
      <div className="content-inner">
        
        <button className="back-button" onClick={() => loadSection()}>
          {t("back-button")}
        </button>
        <div className="timeline-article">
          <div className="timeline-article-content">
            <div className="timeline-article-date">{selectedItem.date}</div>
            <h1 className="timeline-article-title">{selectedItem.title}</h1>
            
            {hasContentBlocks ? (
              renderTimelineContentBlocks(selectedItem.contentBlocks)
            ) : (
              <>
                <div className="timeline-article-media">
                  {selectedItem.image && (
                    <img src={selectedItem.image} alt={selectedItem.title} />
                  )}
                  {selectedItem.video && (
                    <video src={selectedItem.video} controls />
                  )}
                </div>
                <div className="timeline-article-text">
                  {selectedItem.paragraphs && selectedItem.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </>
            )}
            
            {selectedItem.sources && selectedItem.sources.length > 0 && (
              <div className="timeline-sources">
                <h4>{t("sources")}</h4>
                <ul>
                  {selectedItem.sources.map((source, i) => (
                    <li key={i}>{source}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (view === "fototeca") {
    const fototecaTitle = section === "fototeca-photos" ? (t("photos") || "Fotos") 
                        : section === "fototeca-videos" ? (t("videos") || "Videos") 
                        : (t("fototeca") || "Fototeca")
    const fototecaSubtitle = section === "fototeca-photos" ? (t("photos-subtitle") || "Galería fotográfica del conflicto") 
                           : section === "fototeca-videos" ? (t("videos-subtitle") || "Archivo audiovisual del conflicto") 
                           : (t("fototeca-subtitle") || "Archivo visual del conflicto")
    return (
      <div className="fototeca-container">
        <div className="fototeca-header">
          <h2>{fototecaTitle}</h2>
          <p>{fototecaSubtitle}</p>
        </div>
        <div className="fototeca-grid">
          {items.map((item) => (
            <div
              key={item.id}
              className={`fototeca-item ${item.type}`}
              onClick={() => {
                setSelectedItem(item)
                setView("fototeca-detail")
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setSelectedItem(item)
                  setView("fototeca-detail")
                }
              }}
            >
              <div className="fototeca-media">
                {item.type === "image" ? (
                  <img src={item.url} alt={item.title} />
                ) : (
                  <div className="fototeca-video-thumb">
                    <video src={item.url} />
                    <div className="play-overlay">▶</div>
                  </div>
                )}
              </div>
              <div className="fototeca-info">
                <span className="fototeca-date">{item.date}</span>
                <h3 className="fototeca-title">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (view === "fototeca-detail" && selectedItem) {
    return (
      <div className="content-inner">
        <button className="back-button" onClick={() => setView("fototeca")}>
          {t("back-button")}
        </button>
        <div className="fototeca-detail">
          <div className="fototeca-detail-media">
            {selectedItem.type === "image" ? (
              <img src={selectedItem.url} alt={selectedItem.title} />
            ) : (
              <video src={selectedItem.url} controls autoPlay />
            )}
          </div>
          <div className="fototeca-detail-info">
            <span className="fototeca-detail-date">{selectedItem.date}</span>
            <h1 className="fototeca-detail-title">{selectedItem.title}</h1>
            {selectedItem.description && (
              <p className="fototeca-detail-description">{selectedItem.description}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (view === "velum-grid") {
    return (
      <div className="content-inner velum-section velum-magazine">
        <div className="velum-header">
          <div className="velum-masthead">VELUM</div>
          <h2>{t("velum-title")}</h2>
          <p className="velum-subtitle">{t("velum-subtitle") || "Investigaciones y micro-tesis academicas"}</p>
        </div>
        {items.length === 0 ? (
          <div className="velum-empty">{t("velum-no-articles")}</div>
        ) : (
          <div className="velum-magazine-grid">
            {items.map((article, idx) => (
              <div
                key={article.id}
                className={`velum-magazine-card ${idx === 0 ? 'velum-featured' : ''}`}
                onClick={() => loadVelumArticle(article)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    loadVelumArticle(article)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {article.coverImage && (
                  <div className="velum-card-cover">
                    <img src={article.coverImage} alt={article.title} />
                  </div>
                )}
                <div className="velum-card-body">
                  <div className="velum-card-meta">
                    <span className="velum-card-date">{article.date}</span>
                    {article.author && <span className="velum-card-author">{article.author}</span>}
                  </div>
                  <h3 className="velum-card-title">{article.title}</h3>
                  {article.subtitle && (
                    <p className="velum-card-subtitle">{article.subtitle}</p>
                  )}
                  {article.abstract && (
                    <p className="velum-card-abstract">{article.abstract.substring(0, 150)}...</p>
                  )}
                  {article.keywords && article.keywords.length > 0 && (
                    <div className="velum-card-keywords">
                      {article.keywords.slice(0, 3).map((kw, i) => (
                        <span key={i} className="velum-keyword-tag">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (view === "velum-article" && selectedItem) {
    const isArabic = lang === "ar"

    const renderRichContentBlock = (block, isFirst = false) => {
      if (block.type === 'text') {
        const paragraphs = block.content.split('\n').filter(p => p.trim())
        return paragraphs.map((para, j) => (
          <p key={j} className={`velum-paragraph ${isFirst && j === 0 ? 'velum-drop-cap' : ''}`}>
            {para}
          </p>
        ))
      }
      if (block.type === 'image') {
        return (
          <figure className={`velum-figure velum-figure-${block.position || 'center'}`}>
            <img src={block.url} alt={block.caption || ''} />
            {block.caption && <figcaption>{block.caption}</figcaption>}
          </figure>
        )
      }
      if (block.type === 'video') {
        return (
          <figure className={`velum-figure velum-figure-${block.position || 'center'}`}>
            <video src={block.url} controls />
            {block.caption && <figcaption>{block.caption}</figcaption>}
          </figure>
        )
      }
      if (block.type === 'audio') {
        return (
          <div className="velum-audio-block">
            <audio src={block.url} controls />
            {block.caption && <span className="velum-audio-caption">{block.caption}</span>}
          </div>
        )
      }
      return null
    }

    return (
      <div className="content-inner velum-article-view velum-magazine-article" dir={isArabic ? 'rtl' : 'ltr'} lang={isArabic ? 'ar' : lang}>
        <button className="back-button" onClick={() => loadSection()}>
          {t("back-button")}
        </button>
        <article className="velum-full-article">
          {selectedItem.coverImage && (
            <div className="velum-cover-hero">
              <img src={selectedItem.coverImage} alt={selectedItem.title} />
              <div className="velum-cover-overlay" />
            </div>
          )}
          <header className="velum-article-header">
            <h1 className={`velum-article-title ${isArabic ? 'amiri-font' : ''}`}>{selectedItem.title}</h1>
            {selectedItem.subtitle && (
              <p className="velum-article-subtitle">{selectedItem.subtitle}</p>
            )}
            <div className="velum-article-meta">
              {selectedItem.authorImage && (
                <img src={selectedItem.authorImage} alt={selectedItem.author} className="velum-author-image" />
              )}
              <div className="velum-meta-text">
                {selectedItem.author && <span className="velum-author-name">{selectedItem.author}</span>}
                {selectedItem.date && <span className="velum-article-date">{selectedItem.date}</span>}
              </div>
            </div>
            {selectedItem.keywords && selectedItem.keywords.length > 0 && (
              <div className="velum-article-keywords">
                <span className="velum-keywords-label">{t("velum-keywords")}:</span>
                {selectedItem.keywords.map((kw, i) => (
                  <span key={i} className="velum-keyword-pill">{kw}</span>
                ))}
              </div>
            )}
          </header>

          {selectedItem.abstract && (
            <div className="velum-abstract-section">
              <p className={`velum-abstract-text velum-drop-cap ${isArabic ? 'amiri-font' : ''}`}>{selectedItem.abstract}</p>
            </div>
          )}

          {selectedItem.sections && selectedItem.sections.length > 0 && (
            <div className="velum-content-sections">
              {selectedItem.sections.map((section, i) => (
                <section key={i} className="velum-section-block">
                  {section.title && <h2 className="velum-section-title">{section.title}</h2>}
                  <div className={`velum-section-content ${isArabic ? 'amiri-font' : ''}`}>
                    {section.contentBlocks && section.contentBlocks.length > 0 ? (
                      section.contentBlocks.map((block, j) => (
                        <div key={j} className="velum-content-block">
                          {renderRichContentBlock(block, i === 0 && j === 0)}
                        </div>
                      ))
                    ) : section.content ? (
                      section.content.split('\n').map((para, j) => (
                        <p key={j} className={i === 0 && j === 0 ? 'velum-drop-cap' : ''}>{para}</p>
                      ))
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
          )}

          {selectedItem.bibliography && selectedItem.bibliography.length > 0 && (
            <div className="velum-bibliography">
              <h2>{t("velum-bibliography")}</h2>
              <ul className="velum-bibliography-list">
                {selectedItem.bibliography.map((ref, i) => (
                  <li key={i}>{ref}</li>
                ))}
              </ul>
            </div>
          )}
        </article>
      </div>
    )
  }
}
