import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API_BASE from '../../utils/apiBase';

export default function FototecaEditor({ countryCode, mediaType = null }) {
  const { user, getAuthHeaders } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const sectionTitle = mediaType === 'image' ? 'Fotos' : mediaType === 'video' ? 'Videos' : 'Fototeca';

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    description: '',
    type: mediaType || 'image',
    url: ''
  });

  useEffect(() => {
    loadItems();
  }, [countryCode]);

  async function loadItems() {
    try {
      const res = await fetch(`${API_BASE}/api/cms/countries/${countryCode}/fototeca`);
      if (res.ok) {
        const data = await res.json();
        let allItems = data.items || [];
        if (mediaType) {
          allItems = allItems.filter(item => item.type === mediaType);
        }
        setItems(allItems);
      }
    } catch (error) {
      console.error('Error loading fototeca:', error);
    }
    setLoading(false);
  }

  async function loadGalleryImages() {
    setLoadingGallery(true);
    try {
      const res = await fetch(`${API_BASE}/api/cms/gallery/images`);
      if (res.ok) {
        const data = await res.json();
        setGalleryImages(data.images || []);
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
    setLoadingGallery(false);
  }

  function openAddModal() {
    setEditingItem(null);
    setFormData({
      title: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      type: mediaType || 'image',
      url: ''
    });
    setShowModal(true);
  }

  function openEditModal(item) {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      date: item.date || '',
      description: item.description || '',
      type: item.type || 'image',
      url: item.url || ''
    });
    setShowModal(true);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    console.log('handleFileUpload called:', file?.name, file?.size);
    if (!file) return;

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('images', file);

    try {
      console.log('Uploading to:', `${API_BASE}/api/upload/images`);
      const res = await fetch(`${API_BASE}/api/upload/images`, {
        method: 'POST',
        body: uploadFormData
      });

      console.log('Upload response status:', res.status, res.statusText);
      const data = await res.json();
      console.log('Upload response data:', data);
      
      if (res.ok) {
        if (data.files && data.files.length > 0) {
          const url = data.files[0].url;
          console.log('Setting URL:', url);
          setFormData(prev => ({ ...prev, url }));
          console.log('✅ Imagen subida:', url);
        } else {
          console.error('No files in response:', data);
          alert('Error: No se recibió la URL del archivo');
        }
      } else {
        console.error('Upload failed:', data);
        alert('Error al subir archivo: ' + (data.error || 'desconocido'));
      }
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error al subir: ' + error.message);
    }
    setUploading(false);
  }

  function handleSelectFromGallery(image) {
    setFormData(prev => ({ ...prev, url: image.url }));
    setShowGallery(false);
  }

  function openGalleryPicker() {
    loadGalleryImages();
    setShowGallery(true);
  }

  async function handleSave() {
    if (!formData.title.trim() || !formData.url.trim()) {
      alert('El título y la URL son obligatorios');
      return;
    }

    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem 
        ? `/api/cms/countries/${countryCode}/fototeca/${editingItem.id}`
        : `/api/cms/countries/${countryCode}/fototeca`;

     const res = await fetch(`${API_BASE}${url}`, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowModal(false);
        loadItems();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`¿Eliminar "${item.title}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/cms/countries/${countryCode}/fototeca/${item.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        loadItems();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  }

  if (loading) {
    return <div className="admin-loading">Cargando fototeca...</div>;
  }

  return (
    <div className="admin-editor">
      <div className="admin-editor-header">
        <h2>{sectionTitle}</h2>
        <button className="admin-btn-primary" onClick={openAddModal}>
          + Agregar {mediaType === 'image' ? 'foto' : mediaType === 'video' ? 'video' : 'elemento'}
        </button>
      </div>

      <div className="admin-fototeca-grid">
        {items.map(item => (
          <div key={item.id} className="admin-fototeca-item">
            <div className="admin-fototeca-media">
              {item.type === 'image' ? (
                <img src={item.url} alt={item.title} />
              ) : (
                <video src={item.url} />
              )}
              <span className="admin-fototeca-type">{item.type === 'image' ? '🖼️' : '🎬'}</span>
            </div>
            <div className="admin-fototeca-info">
              <span className="admin-fototeca-date">{item.date}</span>
              <h4 className="admin-fototeca-title">{item.title}</h4>
            </div>
            <div className="admin-fototeca-actions">
              <button onClick={() => openEditModal(item)} title="Editar">✏️</button>
              <button onClick={() => handleDelete(item)} title="Eliminar">🗑️</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="admin-empty">
            <p>No hay {mediaType === 'image' ? 'fotos' : mediaType === 'video' ? 'videos' : 'elementos'}</p>
            <button className="admin-btn-primary" onClick={openAddModal}>
              Agregar {mediaType === 'image' ? 'primera foto' : mediaType === 'video' ? 'primer video' : 'primer elemento'}
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal admin-modal-large" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingItem ? 'Editar elemento' : 'Nuevo elemento'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="admin-modal-body">
              {!mediaType && (
                <div className="admin-form-group">
                  <label>Tipo</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="image">Imagen</option>
                    <option value="video">Video</option>
                  </select>
                </div>
              )}

              <div className="admin-form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título del elemento"
                />
              </div>

              <div className="admin-form-group">
                <label>Fecha</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div className="admin-form-group">
                <label>Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción del elemento"
                  rows={3}
                />
              </div>

              <div className="admin-form-group">
                <label>Archivo *</label>
                <div className="admin-file-options">
                  <div className="admin-file-upload">
                    <label className="admin-btn-secondary">
                      📁 Subir desde dispositivo
                      <input
                        type="file"
                        accept={formData.type === 'image' ? 'image/*' : 'video/*'}
                        onChange={handleFileUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {uploading && <span className="admin-uploading">Subiendo...</span>}
                  </div>
                  {formData.type === 'video' && (
                    <div className="admin-youtube-input" style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                      <input 
                        type="text"
                        placeholder="Pegar URL de YouTube..."
                        className="admin-input-small"
                        value={formData.url.includes('youtube.com') || formData.url.includes('youtu.be') ? formData.url : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      />
                      <span style={{ fontSize: '12px', color: '#666', alignSelf: 'center' }}>🎬 YouTube</span>
                    </div>
                  )}
                  {formData.type === 'image' && (
                    <button 
                      type="button" 
                      className="admin-btn-secondary"
                      onClick={openGalleryPicker}
                    >
                      🖼️ Seleccionar de galería
                    </button>
                  )}
                </div>
                {formData.url && (
                  <div className="admin-file-preview">
                    {formData.type === 'image' ? (
                      <img src={formData.url} alt="Preview" />
                    ) : (
                      <video src={formData.url} controls />
                    )}
                    <input
                      type="text"
                      value={formData.url}
                      onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="O ingresa la URL directamente"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="admin-btn-primary" onClick={handleSave} disabled={uploading}>
                {editingItem ? 'Guardar cambios' : 'Crear elemento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGallery && (
        <div className="admin-modal-overlay" onClick={() => setShowGallery(false)}>
          <div className="admin-modal admin-modal-gallery" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Seleccionar de galería</h3>
              <button className="admin-modal-close" onClick={() => setShowGallery(false)}>×</button>
            </div>
            <div className="admin-modal-body">
              {loadingGallery ? (
                <div className="admin-loading">Cargando galería...</div>
              ) : galleryImages.length === 0 ? (
                <div className="admin-empty">
                  <p>No hay imágenes en la galería</p>
                </div>
              ) : (
                <div className="admin-gallery-grid">
                  {galleryImages.map((image, index) => (
                    <div 
                      key={index} 
                      className="admin-gallery-item"
                      onClick={() => handleSelectFromGallery(image)}
                    >
                      <img src={image.url} alt={image.name} />
                      <span className="admin-gallery-name">{image.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
