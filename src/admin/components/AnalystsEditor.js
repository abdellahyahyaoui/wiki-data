import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ImageUploader from './ImageUploader';

export default function AnalystsEditor({ countryCode }) {
  const { user, getAuthHeaders } = useAuth();
  const [analysts, setAnalysts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnalyst, setEditingAnalyst] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    bio: '',
    image: ''
  });

  useEffect(() => {
    loadAnalysts();
  }, [countryCode]);

  async function loadAnalysts() {
    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/analysts?lang=es`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysts(data.items || []);
      }
    } catch (error) {
      console.error('Error loading analysts:', error);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingAnalyst(null);
    setFormData({
      id: '',
      name: '',
      bio: '',
      image: ''
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const body = {
      ...formData,
      id: formData.id || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)
    };

    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/analysts?lang=es`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (res.ok) {
        setShowModal(false);
        if (data.pending) {
          alert('Cambio enviado para aprobación');
        }
        loadAnalysts();
      } else {
        alert(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  }

  const canCreate = user.role === 'admin' || user.permissions?.canCreate;

  if (loading) {
    return <div className="admin-loading">Cargando analistas...</div>;
  }

  return (
    <div className="admin-editor">
      <div className="admin-editor-header">
        <h2>Analistas</h2>
        {canCreate && (
          <button onClick={openCreateModal} className="admin-btn-primary">
            + Nuevo Analista
          </button>
        )}
      </div>

      <div className="admin-items-grid">
        {analysts.length === 0 ? (
          <div className="admin-empty">
            <p>No hay analistas registrados</p>
          </div>
        ) : (
          analysts.map(analyst => (
            <div key={analyst.id} className="admin-analyst-card">
              {analyst.image && (
                <img src={analyst.image} alt={analyst.name} className="admin-analyst-image" />
              )}
              <div className="admin-analyst-info">
                <h3>{analyst.name}</h3>
                <p>{analyst.bio}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3>Nuevo Analista</h3>
            <form onSubmit={handleSubmit}>
              <div className="admin-form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Biografía</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="admin-form-group">
                <label>Foto</label>
                <ImageUploader
                  value={formData.image}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                />
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="admin-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary">
                  Crear Analista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
