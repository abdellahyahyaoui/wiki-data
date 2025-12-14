import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './admin.css';

export default function AdminPending() {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role !== 'admin') {
      navigate('/admin');
      return;
    }
    loadChanges();
  }, []);

  async function loadChanges() {
    try {
      const res = await fetch('/api/cms/pending', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setChanges(data.changes || []);
      }
    } catch (error) {
      console.error('Error loading changes:', error);
    }
    setLoading(false);
  }

  async function handleApprove(changeId) {
    try {
      const res = await fetch(`/api/cms/pending/${changeId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        loadChanges();
      }
    } catch (error) {
      console.error('Error approving:', error);
    }
  }

  async function handleReject(changeId) {
    if (!window.confirm('¿Rechazar este cambio?')) return;
    
    try {
      const res = await fetch(`/api/cms/pending/${changeId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        loadChanges();
      }
    } catch (error) {
      console.error('Error rejecting:', error);
    }
  }

  function getTypeLabel(type) {
    switch (type) {
      case 'create': return 'Crear';
      case 'edit': return 'Editar';
      case 'delete': return 'Eliminar';
      default: return type;
    }
  }

  function getSectionLabel(section) {
    switch (section) {
      case 'timeline': return 'Timeline';
      case 'testimonies': return 'Testimonios';
      case 'testimony': return 'Testimonio';
      case 'analysts': return 'Analistas';
      default: return section;
    }
  }

  if (loading) {
    return <div className="admin-loading">Cargando...</div>;
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-left">
          <Link to="/admin" className="admin-back-link">← Volver</Link>
          <h1>Cambios Pendientes</h1>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-section">
          {changes.length === 0 ? (
            <div className="admin-empty">
              <p>No hay cambios pendientes de aprobación</p>
            </div>
          ) : (
            <div className="admin-pending-list">
              {changes.map(change => (
                <div key={change.id} className="admin-pending-card">
                  <div className="admin-pending-header">
                    <span className={`admin-pending-type ${change.type}`}>
                      {getTypeLabel(change.type)}
                    </span>
                    <span className="admin-pending-section">
                      {getSectionLabel(change.section)}
                    </span>
                    <span className="admin-pending-country">
                      {change.countryCode}
                    </span>
                  </div>
                  
                  <div className="admin-pending-meta">
                    <span>Por: {change.userName}</span>
                    <span>{new Date(change.createdAt).toLocaleString()}</span>
                  </div>

                  {change.data && (
                    <div className="admin-pending-preview">
                      <strong>{change.data.title || change.data.name}</strong>
                      {change.data.summary && <p>{change.data.summary}</p>}
                    </div>
                  )}

                  <div className="admin-pending-actions">
                    <button 
                      onClick={() => handleApprove(change.id)} 
                      className="admin-btn-success"
                    >
                      Aprobar
                    </button>
                    <button 
                      onClick={() => handleReject(change.id)} 
                      className="admin-btn-danger"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
