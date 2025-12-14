"use client"

import { useState } from "react"
import "./media-gallery.css"

export default function MediaGallery({ items }) {
  const [selectedIndex, setSelectedIndex] = useState(null)

  if (!items || items.length === 0) {
    return (
      <div className="media-empty">
        <p>No hay contenido multimedia disponible en esta sección.</p>
      </div>
    )
  }

  const openItem = (index) => {
    setSelectedIndex(index)
    document.body.style.overflow = "hidden"
  }

  const closeItem = () => {
    setSelectedIndex(null)
    document.body.style.overflow = "auto"
  }

  const prevItem = () => setSelectedIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1))
  const nextItem = () => setSelectedIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1))

  const handleKeyDown = (e) => {
    if (selectedIndex === null) return
    if (e.key === "ArrowLeft") prevItem()
    if (e.key === "ArrowRight") nextItem()
    if (e.key === "Escape") closeItem()
  }

  return (
    <div className="media-gallery" onKeyDown={handleKeyDown} role="region" aria-label="Media gallery">
      {/* GRID DE MINIATURAS */}
      <div className="media-grid">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="media-card"
            onClick={() => openItem(index)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                openItem(index)
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Open ${item.title}`}
          >
            {item.type === "image" && (
              <img
                src={item.url || "/placeholder.svg"}
                alt={item.title}
                className="media-thumb"
                onError={(e) => {
                  e.target.src = "/placeholder.svg?height=200&width=300&text=Imagen+no+disponible"
                }}
              />
            )}
            {item.type === "video" && <video src={item.url} className="media-thumb" muted preload="metadata" />}
            <div className="media-title">{item.title}</div>
          </div>
        ))}
      </div>

      {/* MODAL DE DETALLE */}
      {selectedIndex !== null && (
        <div className="media-modal" onClick={closeItem} role="dialog" aria-modal="true">
          <button className="media-close" onClick={closeItem} aria-label="Close media viewer" title="Close (Esc)">
            ×
          </button>
          <button
            className="media-prev"
            onClick={(e) => {
              e.stopPropagation()
              prevItem()
            }}
            aria-label="Previous item"
            title="Previous (Arrow Left)"
          >
            ‹
          </button>
          <button
            className="media-next"
            onClick={(e) => {
              e.stopPropagation()
              nextItem()
            }}
            aria-label="Next item"
            title="Next (Arrow Right)"
          >
            ›
          </button>

          <div className="media-detail-content" onClick={(e) => e.stopPropagation()}>
            {items[selectedIndex].type === "image" && (
              <img
                src={items[selectedIndex].url || "/placeholder.svg"}
                alt={items[selectedIndex].title}
                className="media-full"
                onError={(e) => {
                  e.target.src = "/placeholder.svg?height=600&width=800&text=Imagen+no+disponible"
                }}
              />
            )}
            {items[selectedIndex].type === "video" && (
              <video className="media-full" controls>
                <source src={items[selectedIndex].url} type="video/mp4" />
              </video>
            )}
            <h3 className="media-detail-title">{items[selectedIndex].title}</h3>
          </div>
        </div>
      )}
    </div>
  )
}
