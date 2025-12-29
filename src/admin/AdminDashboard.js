import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE from '../utils/apiBase';
import AILaboratory from './pages/AILaboratory';

import './admin.css';

export default function AdminDashboard() {
  const { user, logout, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [predefinedCountries, setPredefinedCountries] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNewCountry, setShowNewCountry] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [showAILab, setShowAILab] = useState(false);
  const [aiLabCountry, setAiLabCountry] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [countriesRes, pendingRes, predefinedRes] = await Promise.all([
   fetch(`${API_BASE}/api/cms/countries?lang=es`, { headers: getAuthHeaders() }),
user.role === 'admin'
  ? fetch(`${API_BASE}/api/cms/pending`, { headers: getAuthHeaders() })
  : Promise.resolve({ ok: true, json: () => ({ changes: [] }) }),
fetch(`${API_BASE}/api/cms/predefined-countries`, { headers: getAuthHeaders() })

      ]);

      if (countriesRes.ok) {
        const data = await countriesRes.json();
        setCountries(data.countries || []);
      }

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingCount(data.changes?.length || 0);
      }

      if (predefinedRes.ok) {
        const data = await predefinedRes.json();
        setPredefinedCountries(data.countries || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  }

  async function handleCreateCountry(e) {
    e.preventDefault();
    if (!selectedCountry) return;

    const country = predefinedCountries.find(c => c.code === selectedCountry);
    if (!country) return;

    try {
      const res = await fetch(`${API_BASE}/api/cms/countries`, {

        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: country.code, name: country.name, lang: 'es' })
      });

      if (res.ok) {
        setShowNewCountry(false);
        setSelectedCountry('');
        loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al crear país');
      }
    } catch (error) {
      console.error('Error creating country:', error);
    }
  }

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  if (loading) {
    return <div className="admin-loading">Cargando...</div>;
  }

  if (showAILab && aiLabCountry) {
    return (
      <div className="admin-container">
        <header className="admin-header">
          <div className="admin-header-left">
            <h1>Wiki<span>Conflicts</span> AI Lab</h1>
          </div>
          <div className="admin-header-right">
            <button onClick={() => setShowAILab(false)} className="admin-btn-secondary">Volver</button>
          </div>
        </header>
        <main className="admin-main">
          <AILaboratory countryCode={aiLabCountry} />
        </main>
      </div>
    );
  }

  const existingCodes = countries.map(c => c.code);
  const availableCountries = predefinedCountries.filter(c => !existingCodes.includes(c.code));
  const groupedCountries = availableCountries.reduce((acc, country) => {
    const region = country.region || 'Otros';
    if (!acc[region]) acc[region] = [];
    acc[region].push(country);
    return acc;
  }, {});

  if (loading) {
    return <div className="admin-loading">Cargando...</div>;
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>Wiki<span>Conflicts</span> CMS</h1>
        </div>
        <div className="admin-header-right">
          <span className="admin-user-name">{user.name}</span>
          <span className="admin-user-role">{user.role === 'admin' ? 'Administrador' : 'Editor'}</span>
          <button onClick={handleLogout} className="admin-btn-logout">Cerrar Sesión</button>
        </div>
      </header>

      <nav className="admin-nav">
        <Link to="/admin" className="admin-nav-item active">Países</Link>
        {user.role === 'admin' && (
          <>
            <Link to="/admin/users" className="admin-nav-item">Usuarios</Link>
            <Link to="/admin/pending" className="admin-nav-item">
              Pendientes {pendingCount > 0 && <span className="admin-badge">{pendingCount}</span>}
            </Link>
          </>
        )}
        <Link to="/admin/media" className="admin-nav-item">Medios</Link>
        <a href="/" className="admin-nav-item admin-nav-back">← Volver al sitio</a>
      </nav>

      <main className="admin-main">
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>Países</h2>
            {(user.role === 'admin' || user.permissions?.canCreate) && (
              <button onClick={() => setShowNewCountry(true)} className="admin-btn-primary">
                + Nuevo País
              </button>
            )}
          </div>

          {showNewCountry && (
            <div className="admin-modal-overlay">
              <div className="admin-modal">
                <h3>Crear Nuevo País</h3>
                <form onSubmit={handleCreateCountry}>
                  <div className="admin-form-group">
                    <label>Selecciona un país</label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      required
                      className="admin-select"
                    >
                      <option value="">-- Selecciona un país --</option>
                      {Object.entries(groupedCountries).map(([region, countries]) => (
                        <optgroup key={region} label={region}>
                          {countries.map(country => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  {selectedCountry && (
                    <div className="admin-form-info">
                      <p><strong>Código:</strong> {selectedCountry}</p>
                      <p><strong>Nombre:</strong> {predefinedCountries.find(c => c.code === selectedCountry)?.name}</p>
                    </div>
                  )}
                  <div className="admin-modal-actions">
                    <button type="button" onClick={() => { setShowNewCountry(false); setSelectedCountry(''); }} className="admin-btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" className="admin-btn-primary" disabled={!selectedCountry}>
                      Crear País
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="admin-countries-grid">
            {countries.map(country => {
              const hasAccess = user.role === 'admin' || 
                user.countries?.includes('all') || 
                user.countries?.includes(country.code);
              
              return (
                <div 
                  key={country.code} 
                  className={`admin-country-card ${!hasAccess ? 'disabled' : ''}`}
                >
                  <h3>{country.name}</h3>
                  <p className="admin-country-code">{country.code}</p>
                  <p className="admin-country-sections">
                    {country.sections?.length || 0} secciones
                  </p>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                    {hasAccess ? (
                      <>
                        <Link to={`/admin/country/${country.code}`} className="admin-btn-secondary" style={{ flex: 1, textAlign: 'center' }}>
                          Gestionar
                        </Link>
                        <button 
                          onClick={() => {
                            setAiLabCountry(country.code);
                            setShowAILab(true);
                          }} 
                          className="admin-btn-primary" 
                          style={{ flex: 1, fontSize: '0.8em' }}
                        >
                          IA Lab
                        </button>
                      </>
                    ) : (
                      <span className="admin-no-access">Sin acceso</span>
                    )}
                  </div>
                </div>
              );
            })}

            {countries.length === 0 && (
              <div className="admin-empty">
                <p>No hay países configurados</p>
                <p>Haz clic en "Nuevo País" para comenzar</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
