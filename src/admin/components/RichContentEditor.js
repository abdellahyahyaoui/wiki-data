import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function RichContentEditor({ blocks = [], onChange, allowAudio = true }) {
  const { getAuthHeaders } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryFilter, setGalleryFilter] = useState('all');
  const [targetBlockIndex, setTargetBlockIndex] = useState(null);
  const [targetMediaType, setTargetMediaType] = useState(null);

  function addBlock(type) {
    const newBlock = {
      id: Date.now().toString(),
      type,
      content: type === 'text' ? '' : undefined,
      url: type !== 'text' ? '' : undefined,
      position: 'center',
      caption: ''
    };
    onChange([...blocks, newBlock]);
  }

  function updateBlock(index, updates) {
    const updated = blocks.map((block, i) => 
      i === index ? { ...block, ...updates } : block
    );
    onChange(updated);
  }

  function removeBlock(index) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function moveBlock(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    
    const updated = [...blocks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  }

  async function handleFileUpload(index, file, type) {
    setUploading(true);
    const formData = new FormData();
    
    if (type === 'video') {
      formData.append('video', file);
    } else if (type === 'audio') {
      formData.append('file', file);
    } else {
      formData.append('image', file);
    }

    try {
      let endpoint = '/api/upload/image';
      if (type === 'video') endpoint = '/api/upload/video';
      else if (type === 'audio') endpoint = '/api/upload/media';
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const url = data.url || data.files?.[0]?.url;
        if (url) {
          updateBlock(index, { url: url });
        }
      } else {
        console.error('Error uploading file:', await res.text());
        alert('Error al subir el archivo. Intenta con un archivo más pequeño.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir el archivo');
    }
    setUploading(false);
  }

  async function openGallery(index, mediaType) {
    setTargetBlockIndex(index);
    setTargetMediaType(mediaType);
    
    try {
      const res = await fetch('/api/upload/list', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const allItems = [
          ...(data.images || []).map(img => ({ ...img, type: 'image' })),
          ...(data.videos || []).map(vid => ({ ...vid, type: 'video' }))
        ];
        setGalleryItems(allItems);
        setGalleryFilter(mediaType === 'image' ? 'image' : mediaType === 'video' ? 'video' : 'all');
        setShowGallery(true);
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
  }

  function selectFromGallery(url) {
    if (targetBlockIndex !== null) {
      updateBlock(targetBlockIndex, { url });
    }
    setShowGallery(false);
    setTargetBlockIndex(null);
    setTargetMediaType(null);
  }

  const filteredGalleryItems = galleryItems.filter(item => {
    if (galleryFilter === 'all') return true;
    return item.type === galleryFilter;
  });

  return (
    <div className="rich-content-editor">
      <div className="rich-content-toolbar">
        <span className="toolbar-label">Añadir bloque:</span>
        <button type="button" className="rich-btn" onClick={() => addBlock('text')}>
          Texto
        </button>
        <button type="button" className="rich-btn" onClick={() => addBlock('image')}>
          Imagen
        </button>
        <button type="button" className="rich-btn" onClick={() => addBlock('video')}>
          Vídeo
        </button>
        {allowAudio && (
          <button type="button" className="rich-btn" onClick={() => addBlock('audio')}>
            Audio
          </button>
        )}
      </div>

      <div className="rich-content-blocks">
        {blocks.length === 0 && (
          <div className="rich-content-empty">
            Usa los botones de arriba para añadir contenido (texto, imágenes, vídeos...)
          </div>
        )}

        {blocks.map((block, index) => (
          <div key={block.id || index} className={`rich-block rich-block-${block.type}`}>
            <div className="rich-block-header">
              <span className="rich-block-type">
                {block.type === 'text' && 'Texto'}
                {block.type === 'image' && 'Imagen'}
                {block.type === 'video' && 'Vídeo'}
                {block.type === 'audio' && 'Audio'}
              </span>
              <div className="rich-block-controls">
                <button 
                  type="button" 
                  className="rich-control-btn"
                  onClick={() => moveBlock(index, -1)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button 
                  type="button" 
                  className="rich-control-btn"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === blocks.length - 1}
                >
                  ↓
                </button>
                <button 
                  type="button" 
                  className="rich-control-btn rich-control-delete"
                  onClick={() => removeBlock(index)}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="rich-block-content">
              {block.type === 'text' && (
                <textarea
                  value={block.content || ''}
                  onChange={(e) => updateBlock(index, { content: e.target.value })}
                  placeholder="Escribe el texto aquí..."
                  className="rich-textarea"
                  rows={4}
                />
              )}

              {block.type === 'image' && (
                <div className="rich-media-block">
                  <div className="rich-media-position">
                    <label>Posición:</label>
                    <select 
                      value={block.position || 'center'}
                      onChange={(e) => updateBlock(index, { position: e.target.value })}
                    >
                      <option value="left">Izquierda (texto en L)</option>
                      <option value="right">Derecha (texto en L)</option>
                      <option value="center">Centrada</option>
                      <option value="full">Ancho completo</option>
                    </select>
                  </div>
                  
                  {block.url ? (
                    <div className="rich-media-preview">
                      <img src={block.url} alt="Preview" />
                      <button 
                        type="button"
                        className="rich-btn rich-btn-small"
                        onClick={() => updateBlock(index, { url: '' })}
                      >
                        Cambiar imagen
                      </button>
                    </div>
                  ) : (
                    <div className="rich-media-upload">
                      <div className="rich-upload-options">
                        <button 
                          type="button" 
                          className="rich-btn rich-btn-gallery"
                          onClick={() => openGallery(index, 'image')}
                        >
                          Elegir de Galería
                        </button>
                        <label className="rich-btn rich-btn-upload">
                          Subir desde PC
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(index, e.target.files[0], 'image')}
                            disabled={uploading}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      <span className="rich-upload-or">o pegar URL:</span>
                      <input
                        type="text"
                        placeholder="URL de la imagen"
                        value={block.url || ''}
                        onChange={(e) => updateBlock(index, { url: e.target.value })}
                        className="rich-url-input"
                      />
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Pie de foto (opcional)"
                    value={block.caption || ''}
                    onChange={(e) => updateBlock(index, { caption: e.target.value })}
                    className="rich-caption-input"
                  />
                </div>
              )}

              {block.type === 'video' && (
                <div className="rich-media-block">
                  <div className="rich-media-position">
                    <label>Posición:</label>
                    <select 
                      value={block.position || 'center'}
                      onChange={(e) => updateBlock(index, { position: e.target.value })}
                    >
                      <option value="left">Izquierda (texto en L)</option>
                      <option value="right">Derecha (texto en L)</option>
                      <option value="center">Centrado</option>
                      <option value="full">Ancho completo</option>
                    </select>
                  </div>

                  {block.url ? (
                    <div className="rich-media-preview">
                      <video src={block.url} controls style={{ maxWidth: '100%' }} />
                      <button 
                        type="button"
                        className="rich-btn rich-btn-small"
                        onClick={() => updateBlock(index, { url: '' })}
                      >
                        Cambiar vídeo
                      </button>
                    </div>
                  ) : (
                    <div className="rich-media-upload">
                      <div className="rich-upload-options">
                        <button 
                          type="button" 
                          className="rich-btn rich-btn-gallery"
                          onClick={() => openGallery(index, 'video')}
                        >
                          Elegir de Galería
                        </button>
                        <label className="rich-btn rich-btn-upload">
                          Subir desde PC
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(index, e.target.files[0], 'video')}
                            disabled={uploading}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      <span className="rich-upload-or">o pegar URL:</span>
                      <input
                        type="text"
                        placeholder="URL del vídeo (YouTube, Vimeo, archivo...)"
                        value={block.url || ''}
                        onChange={(e) => updateBlock(index, { url: e.target.value })}
                        className="rich-url-input"
                      />
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Descripción del vídeo (opcional)"
                    value={block.caption || ''}
                    onChange={(e) => updateBlock(index, { caption: e.target.value })}
                    className="rich-caption-input"
                  />
                </div>
              )}

              {block.type === 'audio' && (
                <div className="rich-media-block">
                  {block.url ? (
                    <div className="rich-media-preview">
                      <audio src={block.url} controls style={{ width: '100%' }} />
                      <button 
                        type="button"
                        className="rich-btn rich-btn-small"
                        onClick={() => updateBlock(index, { url: '' })}
                      >
                        Cambiar audio
                      </button>
                    </div>
                  ) : (
                    <div className="rich-media-upload">
                      <div className="rich-upload-options">
                        <button 
                          type="button" 
                          className="rich-btn rich-btn-gallery"
                          onClick={() => openGallery(index, 'audio')}
                        >
                          Elegir de Galería
                        </button>
                        <label className="rich-btn rich-btn-upload">
                          Subir desde PC
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(index, e.target.files[0], 'audio')}
                            disabled={uploading}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      <span className="rich-upload-or">o pegar URL:</span>
                      <input
                        type="text"
                        placeholder="URL del audio"
                        value={block.url || ''}
                        onChange={(e) => updateBlock(index, { url: e.target.value })}
                        className="rich-url-input"
                      />
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Descripción del audio (opcional)"
                    value={block.caption || ''}
                    onChange={(e) => updateBlock(index, { caption: e.target.value })}
                    className="rich-caption-input"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {uploading && (
        <div className="rich-uploading">Subiendo archivo...</div>
      )}

      {showGallery && (
        <div className="admin-modal-overlay" onClick={() => setShowGallery(false)}>
          <div className="admin-modal gallery-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Seleccionar de la Galería</h3>
              <button className="admin-modal-close" onClick={() => setShowGallery(false)}>×</button>
            </div>
            <div className="gallery-filter-bar">
              <button 
                className={`gallery-filter-btn ${galleryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setGalleryFilter('all')}
              >
                Todos
              </button>
              <button 
                className={`gallery-filter-btn ${galleryFilter === 'image' ? 'active' : ''}`}
                onClick={() => setGalleryFilter('image')}
              >
                Imágenes
              </button>
              <button 
                className={`gallery-filter-btn ${galleryFilter === 'video' ? 'active' : ''}`}
                onClick={() => setGalleryFilter('video')}
              >
                Vídeos
              </button>
            </div>
            <div className="admin-gallery-grid">
              {filteredGalleryItems.map((item, idx) => (
                <div 
                  key={item.filename || idx} 
                  className="admin-gallery-item"
                  onClick={() => selectFromGallery(item.url)}
                >
                  {item.type === 'image' ? (
                    <img src={item.url} alt={item.filename} />
                  ) : (
                    <div className="gallery-video-thumb">
                      <video src={item.url} />
                      <span className="gallery-type-icon">🎬</span>
                    </div>
                  )}
                  <span className="gallery-item-name">{item.filename}</span>
                </div>
              ))}
              {filteredGalleryItems.length === 0 && (
                <div className="admin-empty">No hay archivos en la galería</div>
              )}
            </div>
            <div className="admin-modal-actions">
              <button type="button" onClick={() => setShowGallery(false)} className="admin-btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
