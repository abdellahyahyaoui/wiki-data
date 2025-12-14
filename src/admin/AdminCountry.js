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
import GalleryManager from './components/GalleryManager';
import './admin.css';

const AVAILABLE_COUNTRIES = [
  { code: 'palestine', name: 'Palestina', region: 'middle-east' },
  { code: 'libya', name: 'Libia', region: 'arab' },
  { code: 'morocco', name: 'Marruecos', region: 'arab' },
  { code: 'algeria', name: 'Argelia', region: 'arab' },
  { code: 'tunisia', name: 'Túnez', region: 'arab' },
  { code: 'egypt', name: 'Egipto', region: 'arab' },
  { code: 'sudan', name: 'Sudán', region: 'arab' },
  { code: 'mauritania', name: 'Mauritania', region: 'arab' },
  { code: 'yemen', name: 'Yemen', region: 'arab' },
  { code: 'syria', name: 'Siria', region: 'arab' },
  { code: 'iraq', name: 'Irak', region: 'arab' },
  { code: 'jordan', name: 'Jordania', region: 'arab' },
  { code: 'lebanon', name: 'Líbano', region: 'arab' },
  { code: 'saudi', name: 'Arabia Saudí', region: 'arab' },
  { code: 'uae', name: 'Emiratos Árabes', region: 'arab' },
  { code: 'qatar', name: 'Qatar', region: 'arab' },
  { code: 'kuwait', name: 'Kuwait', region: 'arab' },
  { code: 'oman', name: 'Omán', region: 'arab' },
  { code: 'bahrain', name: 'Baréin', region: 'arab' },
  { code: 'iran', name: 'Irán', region: 'middle-east' },
  { code: 'turkey', name: 'Turquía', region: 'middle-east' },
  { code: 'spain', name: 'España', region: 'europe' },
  { code: 'france', name: 'Francia', region: 'europe' },
  { code: 'germany', name: 'Alemania', region: 'europe' },
  { code: 'uk', name: 'Reino Unido', region: 'europe' },
  { code: 'italy', name: 'Italia', region: 'europe' },
  { code: 'poland', name: 'Polonia', region: 'europe' },
  { code: 'ukraine', name: 'Ucrania', region: 'europe' },
  { code: 'russia', name: 'Rusia', region: 'europe' },
  { code: 'mexico', name: 'México', region: 'latam' },
  { code: 'colombia', name: 'Colombia', region: 'latam' },
  { code: 'venezuela', name: 'Venezuela', region: 'latam' },
  { code: 'brazil', name: 'Brasil', region: 'latam' },
  { code: 'argentina', name: 'Argentina', region: 'latam' },
  { code: 'chile', name: 'Chile', region: 'latam' },
  { code: 'peru', name: 'Perú', region: 'latam' },
  { code: 'cuba', name: 'Cuba', region: 'latam' },
  { code: 'guatemala', name: 'Guatemala', region: 'latam' },
  { code: 'honduras', name: 'Honduras', region: 'latam' },
  { code: 'nicaragua', name: 'Nicaragua', region: 'latam' },
  { code: 'el-salvador', name: 'El Salvador', region: 'latam' }
];

const AVAILABLE_LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'ar', name: 'العربية' }
];

export default function AdminCountry() {
  const { countryCode: urlCountryCode } = useParams();
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [country, setCountry] = useState(null);
  const [activeSection, setActiveSection] = useState('description');
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(urlCountryCode || 'palestine');
  const [selectedLang, setSelectedLang] = useState('es');
  const [availableCountries, setAvailableCountries] = useState([]);

  useEffect(() => {
    loadCountry();
  }, [selectedCountry, selectedLang]);

  async function loadCountry() {
    setLoading(true);
    try {
      const res = await fetch(`/api/cms/countries?lang=${selectedLang}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAvailableCountries(data.countries || []);
        const found = data.countries.find(c => c.code === selectedCountry);
        if (found) {
          setCountry(found);
        } else {
          const countryInfo = AVAILABLE_COUNTRIES.find(c => c.code === selectedCountry);
          setCountry({
            code: selectedCountry,
            name: countryInfo?.name || selectedCountry,
            sections: []
          });
        }
      }
    } catch (error) {
      console.error('Error loading country:', error);
      const countryInfo = AVAILABLE_COUNTRIES.find(c => c.code === selectedCountry);
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

  if (loading && !country) {
    return <div className="admin-loading">Cargando...</div>;
  }

  const countryName = country?.name || AVAILABLE_COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry;

  const sections = [
    { id: 'description', label: 'Descripción', icon: '📖' },
    { id: 'velum', label: 'VELUM', icon: '📜' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
    { id: 'testimonies', label: 'Testimonios', icon: '👤' },
    { id: 'resistance', label: 'Resistencia', icon: '✊' },
    { id: 'analysts', label: 'Analistas', icon: '📊' },
    { id: 'gallery', label: 'Galería', icon: '🖼️' },
    { id: 'photos', label: 'Fotos', icon: '📷' },
    { id: 'videos', label: 'Videos', icon: '🎬' }
  ];

  const groupedCountries = {
    'Oriente Medio': AVAILABLE_COUNTRIES.filter(c => c.region === 'middle-east'),
    'Países Árabes': AVAILABLE_COUNTRIES.filter(c => c.region === 'arab'),
    'Europa': AVAILABLE_COUNTRIES.filter(c => c.region === 'europe'),
    'Latinoamérica': AVAILABLE_COUNTRIES.filter(c => c.region === 'latam')
  };

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
        </main>
      </div>
    </div>
  );
}
