import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function GalleryManager({ onSelect, selectMode = false, mediaFilter = null }) {
  const { getAuthHeaders } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState(mediaFilter || 'all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    tags: ''
  });

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const res = await fetch('/api/upload/list', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const allItems = [
          ...(data.images || []),
          ...(data.videos || [])
        ];
        setItems(allItems);
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
    setLoading(false);
  }

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      const res = await fetch('/api/upload/images', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      if (res.ok) {
        loadItems();
        setShowUploadModal(false);
      }
    } catch (error) {
      console.error('Error uploading:', error);
    }
    setUploading(false);
  }

  async function handleDelete(filename) {
    if (!window.confirm('¿Eliminar este archivo de la galería?')) return;

    try {
      const res = await fetch(`/api/upload/${filename}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        loadItems();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  }

  function getFileType(url) {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    return 'other';
  }

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return getFileType(item.url) === filter;
  });

  if (loading) {
    return <div className="admin-loading">Cargando galería...</div>;
  }

  return (
    <div className="gallery-manager">
      <div className="gallery-header">
        <h2>Galería de Medios</h2>
        <div className="gallery-actions">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="gallery-filter"
          >
            <option value="all">Todos</option>
            <option value="image">Imágenes</option>
            <option value="video">Vídeos</option>
            <option value="audio">Audios</option>
          </select>
          <label className="admin-btn admin-btn-primary gallery-upload-btn">
            + Subir Archivos
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {uploading && (
        <div className="gallery-uploading">Subiendo archivos...</div>
      )}

      {filteredItems.length === 0 ? (
        <div className="gallery-empty">
          <p>No hay archivos en la galería.</p>
          <p>Sube imágenes, vídeos o audios para usarlos en otras secciones.</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {filteredItems.map((item, index) => {
            const type = getFileType(item.url);
            return (
              <div 
                key={index} 
                className={`gallery-item ${selectMode ? 'gallery-item-selectable' : ''}`}
                onClick={() => selectMode && onSelect && onSelect(item.url)}
              >
                <div className="gallery-item-preview">
                  {type === 'image' && (
                    <img src={item.url} alt={item.filename} />
                  )}
                  {type === 'video' && (
                    <div className="gallery-video-thumb">
                      <video src={item.url} />
                      <span className="gallery-type-icon">🎬</span>
                    </div>
                  )}
                  {type === 'audio' && (
                    <div className="gallery-audio-thumb">
                      <span className="gallery-type-icon">🎵</span>
                    </div>
                  )}
                </div>
                <div className="gallery-item-info">
                  <span className="gallery-item-name">{item.filename}</span>
                  {!selectMode && (
                    <div className="gallery-item-actions">
                      <button
                        className="gallery-action-btn gallery-copy-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(item.url);
                          alert('URL copiada al portapapeles');
                        }}
                        title="Copiar URL"
                      >
                        📋
                      </button>
                      <button
                        className="gallery-action-btn gallery-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.filename);
                        }}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
