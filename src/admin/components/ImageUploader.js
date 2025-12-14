import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ImageUploader({ value, onChange, currentImage, onImageChange }) {
  const { getAuthHeaders } = useAuth();
  
  const imageValue = value || currentImage || '';
  const handleChange = onChange || onImageChange;
  const [uploading, setUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [gallery, setGallery] = useState([]);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (typeof handleChange !== 'function') {
      console.error('ImageUploader: onChange/onImageChange is required');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        handleChange(data.url);
      } else {
        alert('Error al subir imagen');
      }
    } catch (error) {
      console.error('Error uploading:', error);
    }
    setUploading(false);
    e.target.value = '';
  }

  async function openGallery() {
    try {
      const res = await fetch('/api/upload/list', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGallery(data.images || []);
        setShowGallery(true);
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
  }

  function selectFromGallery(url) {
    if (typeof handleChange === 'function') {
      handleChange(url);
    }
    setShowGallery(false);
  }

  return (
    <div className="admin-image-uploader">
      {imageValue && (
        <div className="admin-image-preview">
          <img src={imageValue} alt="Preview" />
          <button type="button" onClick={() => handleChange && handleChange('')} className="admin-btn-remove-image">
            ×
          </button>
        </div>
      )}
      
      <div className="admin-image-actions">
        <label className="admin-btn-upload">
          {uploading ? 'Subiendo...' : 'Subir imagen'}
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </label>
        <button type="button" onClick={openGallery} className="admin-btn-gallery">
          Elegir de galería
        </button>
        <input
          type="text"
          value={imageValue}
          onChange={(e) => handleChange && handleChange(e.target.value)}
          placeholder="O pegar URL de imagen"
          className="admin-image-url-input"
        />
      </div>

      {showGallery && (
        <div className="admin-modal-overlay" onClick={() => setShowGallery(false)}>
          <div className="admin-modal gallery" onClick={e => e.stopPropagation()}>
            <h3>Seleccionar Imagen</h3>
            <div className="admin-gallery-grid">
              {gallery.map(img => (
                <div 
                  key={img.filename} 
                  className="admin-gallery-item"
                  onClick={() => selectFromGallery(img.url)}
                >
                  <img src={img.url} alt={img.filename} />
                </div>
              ))}
              {gallery.length === 0 && (
                <div className="admin-empty">No hay imágenes en la galería</div>
              )}
            </div>
            <button type="button" onClick={() => setShowGallery(false)} className="admin-btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
