"use client";

export default function ChaptersOverlay({ chapters, selectedId, onSelect, onClose }) {
  return (
    <div className="teal-overlay" onClick={onClose}>
      <div className="teal-panel chapters-panel" onClick={(e) => e.stopPropagation()}>

        {/* TOP */}
        <div className="teal-top">
          <span className="teal-title">Índice</span>
          <button className="teal-close" onClick={onClose}>✕</button>
        </div>

        {/* LIST */}
        <div className="teal-nav">
          {chapters && chapters.map((ch) => (
            <button
              key={ch.id}
              className={`menu-item ${selectedId === ch.id ? "active" : ""}`}
              onClick={() => {
                onSelect(ch);
                onClose();
              }}
            >
              {ch.title}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
