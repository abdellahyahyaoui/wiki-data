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
      const res = await fetch(`${API_BASE}/api/cms/countries/${countryCode}/fototeca`, {
        headers: getAuthHeaders()
      });
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
      const res = await fetch(`${API_BASE}/api/upload/list`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const images = (data.images || []).map(img => ({ url: img.url, name: img.filename || img.name }));
        setGalleryImages(images);
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
    setLoadingGallery(false);
  }

  function openGalleryPicker() {
    loadGalleryImages();
    setShowGallery(true);
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
    if (!file) return;
    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('images', file);
    try {
      const res = await fetch(`${API_BASE}/api/upload/images`, {
        method: 'POST',
        body: uploadFormData
      });
      const data = await res.json();
      if (res.ok && data.files?.length > 0) {
        setFormData(prev => ({ ...prev, url: data.files[0].url }));
      }
    } catch (error) {
      console.error('Error uploading:', error);
    }
    setUploading(false);
  }

  async function handleSave() {
    if (!formData.title.trim() || !formData.url.trim()) return alert('Título y URL obligatorios');
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `/api/cms/countries/${countryCode}/fototeca/${editingItem.id}` : `/api/cms/countries/${countryCode}/fototeca`;
      const res = await fetch(`${API_BASE}${url}`, {
        method,
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        loadItems();
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm('¿Eliminar?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/cms/countries/${countryCode}/fototeca/${item.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) loadItems();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  }

  function getYoutubeEmbedUrl(url) {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  }

  if (loading) return <div className="admin-loading">Cargando...</div>;

  return (
    <div className="admin-editor">
      <div className="admin-editor-header">
        <h2>{sectionTitle}</h2>
        <button className="admin-btn-primary" onClick={openAddModal}>+ Agregar</button>
      </div>
      <div className="admin-fototeca-grid">
        {items.map(item => (
          <div key={item.id} className="admin-fototeca-item">
            <div className="admin-fototeca-media">
              {item.type === 'image' ? (
                <img src={item.url} alt={item.title} />
              ) : (
                getYoutubeEmbedUrl(item.url) ? (
                  <iframe width="100%" height="150" src={getYoutubeEmbedUrl(item.url)} frameBorder="0" allowFullScreen></iframe>
                ) : (
                  <video src={item.url} controls />
                )
              )}
            </div>
            <div className="admin-fototeca-info">
              <h4>{item.title}</h4>
              <div className="admin-fototeca-actions">
                <button onClick={() => openEditModal(item)}>✏️</button>
                <button onClick={() => handleDelete(item)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>{editingItem ? 'Editar' : 'Nuevo'}</h3>
            <div className="admin-form-group">
              <label>Tipo</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="image">Imagen</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label>Título</label>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div className="admin-form-group">
              <label>Archivo / URL</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button type="button" className="admin-btn-secondary" onClick={() => document.getElementById('file-input').click()}>📁 Subir</button>
                <input id="file-input" type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                {formData.type === 'image' && <button type="button" className="admin-btn-secondary" onClick={openGalleryPicker}>🖼️ Galería</button>}
              </div>
              <input type="text" placeholder="O pega URL (Cloudinary o YouTube)" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="admin-btn-primary" onClick={handleSave}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showGallery && (
        <div className="admin-modal-overlay" onClick={() => setShowGallery(false)}>
          <div className="admin-modal admin-modal-gallery" onClick={e => e.stopPropagation()}>
            <h3>Seleccionar de galería</h3>
            <div className="admin-gallery-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
              gap: '10px', 
              maxHeight: '400px', 
              overflowY: 'auto' 
            }}>
              {galleryImages.map((img, i) => (
                <div key={i} onClick={() => { setFormData({...formData, url: img.url}); setShowGallery(false); }} style={{ cursor: 'pointer' }}>
                  <img src={img.url} alt={img.name} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}