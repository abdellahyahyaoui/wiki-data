import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DescriptionEditor from './components/DescriptionEditor';
import TimelineEditor from './components/TimelineEditor';
import TestimoniesEditor from './components/TestimoniesEditor';
import AnalystsEditor from './components/AnalystsEditor';
import FototecaEditor from './components/FototecaEditor';
import ResistanceEditor from './components/ResistanceEditor';
import VelumEditor from './components/VelumEditor';
import TerminologyEditor from './components/TerminologyEditor';
import GalleryManager from './components/GalleryManager';
import AILaboratory from './pages/AILaboratory';
import API_BASE from '../utils/apiBase';

import './admin.css';

const AVAILABLE_LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'ar', name: 'العربية' }
];

const REGION_LABELS = {
  'Oriente Medio': 'Oriente Medio',
  'Norte de África': 'Norte de África',
  'África Oriental': 'África Oriental',
  'Europa': 'Europa',
  'África': 'África',
  'Asia': 'Asia',
  'Asia Central': 'Asia Central',
  'Sudeste Asiático': 'Sudeste Asiático',
  'Oceanía': 'Oceanía',
  'Norteamérica': 'Norteamérica',
  'Centroamérica': 'Centroamérica',
  'Sudamérica': 'Sudamérica',
  'Caribe': 'Caribe'
};

export default function AdminCountry() {
  const { countryCode: urlCountryCode } = useParams();
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [country, setCountry] = useState(null);
  const [activeSection, setActiveSection] = useState('description');
  const [loading, setLoading] = useState(true);
  const [loadingPredefined, setLoadingPredefined] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(urlCountryCode || 'palestine');
  const [selectedLang, setSelectedLang] = useState('es');
  const [availableCountries, setAvailableCountries] = useState([]);
  const [predefinedCountries, setPredefinedCountries] = useState([]);

  useEffect(() => {
    loadPredefinedCountries();
  }, []);

  useEffect(() => {
    if (!loadingPredefined) {
      loadCountry();
    }
  }, [selectedCountry, selectedLang, loadingPredefined, predefinedCountries]);

  async function loadPredefinedCountries() {
    setLoadingPredefined(true);
    try {
      const res = await fetch(`${API_BASE}/api/cms/predefined-countries`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setPredefinedCountries(data.countries || []);
      } else {
        console.error('Failed to load predefined countries:', res.status);
      }
    } catch (error) {
      console.error('Error loading predefined countries:', error);
    }
    setLoadingPredefined(false);
  }

  async function loadCountry() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/cms/countries?lang=${selectedLang}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableCountries(data.countries || []);
        const found = data.countries.find(c => c.code === selectedCountry);
        if (found) {
          setCountry(found);
        } else {
          const countryInfo = predefinedCountries.find(c => c.code === selectedCountry);
          setCountry({
            code: selectedCountry,
            name: countryInfo?.name || selectedCountry,
            sections: []
          });
        }
      }
    } catch (error) {
      console.error('Error loading country:', error);
      const countryInfo = predefinedCountries.find(c => c.code === selectedCountry);
      setCountry({
        code: selectedCountry,
        name: countryInfo?.name || selectedCountry,
        sections: []
      });
    }
    setLoading(false);
  }

  function handleCountryChange(newCountry) {
    setSelectedCountry(newCountry);
    navigate(`/admin/country/${newCountry}`, { replace: true });
  }

  if (loadingPredefined || (loading && !country)) {
    return <div className="admin-loading">Cargando...</div>;
  }

  const countryName = country?.name || predefinedCountries.find(c => c.code === selectedCountry)?.name || selectedCountry;

  const sections = [
    { id: 'description', label: 'Descripción', icon: '📖' },
    { id: 'velum', label: 'VELUM', icon: '📜' },
    { id: 'terminology', label: 'Terminología', icon: '📚' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
    { id: 'testimonies', label: 'Testimonios', icon: '👤' },
    { id: 'resistance', label: 'Resistencia', icon: '✊' },
    { id: 'analysts', label: 'Analistas', icon: '📊' },
    { id: 'gallery', label: 'Galería', icon: '🖼️' },
    { id: 'photos', label: 'Fotos', icon: '📷' },
    { id: 'videos', label: 'Videos', icon: '🎬' },
    { id: 'ai-lab', label: 'Laboratorio IA', icon: '🤖' }
  ];

  const uniqueRegions = [...new Set(predefinedCountries.map(c => c.region))].sort();
  const groupedCountries = {};
  uniqueRegions.forEach(region => {
    groupedCountries[REGION_LABELS[region] || region] = predefinedCountries.filter(c => c.region === region);
  });

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-left">
          <Link to="/admin" className="admin-back-link">← Volver</Link>
          <h1>{countryName}</h1>
        </div>
        <div className="admin-header-right">
          <span className="admin-user-name">{user.name}</span>
        </div>
      </header>

      <div className="admin-cms-selectors">
        <div className="admin-selector-group">
          <label>País</label>
          <select 
            value={selectedCountry} 
            onChange={(e) => handleCountryChange(e.target.value)}
          >
            {Object.entries(groupedCountries).map(([region, countries]) => (
              <optgroup key={region} label={region}>
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="admin-selector-group">
          <label>Idioma</label>
          <select 
            value={selectedLang} 
            onChange={(e) => setSelectedLang(e.target.value)}
          >
            {AVAILABLE_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-country-layout">
        <aside className="admin-sidebar">
          <nav className="admin-sidebar-nav">
            {sections.map(section => (
              <button
                key={section.id}
                className={`admin-sidebar-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="admin-sidebar-icon">{section.icon}</span>
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="admin-content">
          {activeSection === 'description' && (
            <DescriptionEditor countryCode={selectedCountry} lang={selectedLang} />
          )}
          {activeSection === 'velum' && (
            <VelumEditor countryCode={selectedCountry} lang={selectedLang} />
          )}
          {activeSection === 'terminology' && (
            <TerminologyEditor lang={selectedLang} />
          )}
          {activeSection === 'timeline' && (
            <TimelineEditor countryCode={selectedCountry} lang={selectedLang} />
          )}
          {activeSection === 'testimonies' && (
            <TestimoniesEditor countryCode={selectedCountry} lang={selectedLang} />
          )}
          {activeSection === 'resistance' && (
            <ResistanceEditor countryCode={selectedCountry} lang={selectedLang} />
          )}
          {activeSection === 'analysts' && (
            <AnalystsEditor countryCode={selectedCountry} lang={selectedLang} />
          )}
          {activeSection === 'gallery' && (
            <GalleryManager />
          )}
          {activeSection === 'photos' && (
            <FototecaEditor countryCode={selectedCountry} mediaType="image" lang={selectedLang} />
          )}
          {activeSection === 'videos' && (
            <FototecaEditor countryCode={selectedCountry} mediaType="video" lang={selectedLang} />
          )}
          {activeSection === 'ai-lab' && (
            <AILaboratory countryCode={selectedCountry} />
          )}
        </main>
      </div>
    </div>
  );
}
