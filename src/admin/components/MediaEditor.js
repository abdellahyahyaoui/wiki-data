import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function MediaEditor({ countryCode }) {
  const { getAuthHeaders } = useAuth();
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadMedia();
  }, []);

  async function loadMedia() {
    try {
      const res = await fetch('/api/upload/list', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Error loading media:', error);
    }
    setLoading(false);
  }

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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
        loadMedia();
      } else {
        alert('Error al subir archivos');
      }
    } catch (error) {
      console.error('Error uploading:', error);
    }
    setUploading(false);
    e.target.value = '';
  }

  async function handleDelete(filename) {
    if (!window.confirm('¿Eliminar este archivo?')) return;

    try {
      const res = await fetch(`/api/upload/${filename}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        loadMedia();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url);
    alert('URL copiada al portapapeles');
  }

  if (loading) {
    return <div className="admin-loading">Cargando medios...</div>;
  }

  return (
    <div className="admin-editor">
      <div className="admin-editor-header">
        <h2>Biblioteca de Medios</h2>
        <label className="admin-btn-primary">
          {uploading ? 'Subiendo...' : '+ Subir Archivos'}
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleUpload}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </label>
      </div>

      <div className="admin-media-section">
        <h3>Imágenes ({images.length})</h3>
        <div className="admin-media-grid">
          {images.map(img => (
            <div key={img.filename} className="admin-media-item">
              <img src={img.url} alt={img.filename} />
              <div className="admin-media-overlay">
                <button onClick={() => copyUrl(img.url)} title="Copiar URL">
                  📋
                </button>
                <button onClick={() => handleDelete(img.filename)} title="Eliminar">
                  🗑️
                </button>
              </div>
              <span className="admin-media-name">{img.filename}</span>
            </div>
          ))}
          {images.length === 0 && (
            <div className="admin-empty-small">No hay imágenes</div>
          )}
        </div>
      </div>

      <div className="admin-media-section">
        <h3>Videos ({videos.length})</h3>
        <div className="admin-media-grid">
          {videos.map(vid => (
            <div key={vid.filename} className="admin-media-item video">
              <video src={vid.url} />
              <div className="admin-media-overlay">
                <button onClick={() => copyUrl(vid.url)} title="Copiar URL">
                  📋
                </button>
                <button onClick={() => handleDelete(vid.filename)} title="Eliminar">
                  🗑️
                </button>
              </div>
              <span className="admin-media-name">{vid.filename}</span>
            </div>
          ))}
          {videos.length === 0 && (
            <div className="admin-empty-small">No hay videos</div>
          )}
        </div>
      </div>
    </div>
  );
}
