import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ImageUploader from './ImageUploader';
import RichContentEditor from './RichContentEditor';

export default function ResistanceEditor({ countryCode, lang = 'es' }) {
  const { user, getAuthHeaders } = useAuth();
  const [resistors, setResistors] = useState([]);
  const [selectedResistor, setSelectedResistor] = useState(null);
  const [resistorDetail, setResistorDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResistorModal, setShowResistorModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingResistor, setEditingResistor] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [sectionHeader, setSectionHeader] = useState({
    title: 'Resistencia',
    description: 'Personas y grupos que luchan por la justicia y los derechos humanos'
  });
  
  const [resistorForm, setResistorForm] = useState({
    id: '',
    name: '',
    bio: '',
    image: '',
    social: { instagram: '', telegram: '', donation: '' }
  });

  const [entryForm, setEntryForm] = useState({
    id: '',
    title: '',
    summary: '',
    date: '',
    contentBlocks: [],
    media: []
  });

  useEffect(() => {
    loadResistors();
    loadSectionHeader();
  }, [countryCode, lang]);

  async function loadSectionHeader() {
    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/section-headers/resistance?lang=${lang}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title || data.description) {
          setSectionHeader(data);
        }
      }
    } catch (error) {
      console.log('Using default section header');
    }
  }

  async function saveSectionHeader() {
    try {
      await fetch(`/api/cms/countries/${countryCode}/section-headers/resistance?lang=${lang}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sectionHeader)
      });
    } catch (error) {
      console.error('Error saving section header:', error);
    }
  }

  async function loadResistors() {
    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/resistance?lang=${lang}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setResistors(data.items || []);
      }
    } catch (error) {
      console.error('Error loading resistance:', error);
    }
    setLoading(false);
  }

  async function loadResistorDetail(resistorId) {
    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/resistance/${resistorId}?lang=${lang}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setResistorDetail(data);
        setSelectedResistor(resistorId);
      }
    } catch (error) {
      console.error('Error loading resistor detail:', error);
    }
  }

  function openCreateResistorModal() {
    setEditingResistor(null);
    setResistorForm({
      id: '',
      name: '',
      bio: '',
      image: '',
      social: { instagram: '', telegram: '', donation: '' }
    });
    setShowResistorModal(true);
  }

  function openEditResistorModal() {
    if (!resistorDetail) return;
    setEditingResistor(resistorDetail);
    setResistorForm({
      id: resistorDetail.id,
      name: resistorDetail.name || '',
      bio: resistorDetail.bio || '',
      image: resistorDetail.image || '',
      social: resistorDetail.social || { instagram: '', telegram: '', donation: '' }
    });
    setShowResistorModal(true);
  }

  function openCreateEntryModal() {
    setEditingEntry(null);
    const nextId = `r${(resistorDetail?.entries?.length || 0) + 1}`;
    setEntryForm({
      id: nextId,
      title: '',
      summary: '',
      date: '',
      contentBlocks: [],
      media: []
    });
    setShowEntryModal(true);
  }

  async function openEditEntryModal(entry) {
    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/resistance/${selectedResistor}/entry/${entry.id}?lang=${lang}`, {
        headers: getAuthHeaders()
      });
      
      let fullEntry = entry;
      if (res.ok) {
        const data = await res.json();
        fullEntry = { ...entry, ...data };
      }
      
      setEditingEntry(fullEntry);
      setEntryForm({
        id: fullEntry.id,
        title: fullEntry.title || '',
        summary: fullEntry.summary || '',
        date: fullEntry.date || '',
        contentBlocks: fullEntry.contentBlocks || convertParagraphsToBlocks(fullEntry.paragraphs),
        media: fullEntry.media || []
      });
      setShowEntryModal(true);
    } catch (error) {
      console.error('Error loading entry:', error);
      setEditingEntry(entry);
      setEntryForm({
        id: entry.id,
        title: entry.title || '',
        summary: entry.summary || '',
        date: entry.date || '',
        contentBlocks: entry.contentBlocks || convertParagraphsToBlocks(entry.paragraphs),
        media: entry.media || []
      });
      setShowEntryModal(true);
    }
  }

  function convertParagraphsToBlocks(paragraphs) {
    if (!paragraphs || paragraphs.length === 0) return [];
    return paragraphs.map((p, i) => ({
      id: `block-${i}`,
      type: 'text',
      content: p,
      position: 'center'
    }));
  }

  async function handleResistorSubmit(e) {
    e.preventDefault();
    
    const url = editingResistor
      ? `/api/cms/countries/${countryCode}/resistance/${editingResistor.id}?lang=${lang}`
      : `/api/cms/countries/${countryCode}/resistance?lang=${lang}`;
    
    const method = editingResistor ? 'PUT' : 'POST';

    const body = {
      ...resistorForm,
      id: resistorForm.id || resistorForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (res.ok) {
        setShowResistorModal(false);
        if (data.pending) {
          alert('Cambio enviado para aprobación');
        }
        loadResistors();
        if (editingResistor) {
          loadResistorDetail(editingResistor.id);
        }
      } else {
        alert(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  }

  async function handleEntrySubmit(e) {
    e.preventDefault();
    
    const body = {
      ...entryForm,
      contentBlocks: entryForm.contentBlocks || [],
      paragraphs: entryForm.contentBlocks
        .filter(b => b.type === 'text')
        .map(b => b.content),
      media: entryForm.media || []
    };

    const isEdit = editingEntry && editingEntry.id;
    const url = isEdit
      ? `/api/cms/countries/${countryCode}/resistance/${selectedResistor}/entry/${editingEntry.id}?lang=${lang}`
      : `/api/cms/countries/${countryCode}/resistance/${selectedResistor}/entry?lang=${lang}`;

    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (res.ok) {
        setShowEntryModal(false);
        if (data.pending) {
          alert('Cambio enviado para aprobación');
        }
        loadResistorDetail(selectedResistor);
      } else {
        alert(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  }

  const canCreate = user.role === 'admin' || user.permissions?.canCreate;
  const canEdit = user.role === 'admin' || user.permissions?.canEdit;

  if (loading) {
    return <div className="admin-loading">Cargando resistencia...</div>;
  }

  return (
    <div className="admin-editor">
      <div className="admin-editor-header">
        <h2>Resistencia</h2>
        {canCreate && (
          <button onClick={openCreateResistorModal} className="admin-btn-primary">
            + Nueva Persona/Grupo
          </button>
        )}
      </div>

      <div className="admin-section-header-config">
        <h4>Encabezado de la sección (visible en la web)</h4>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>Título de la sección</label>
            <input
              type="text"
              value={sectionHeader.title}
              onChange={(e) => setSectionHeader({ ...sectionHeader, title: e.target.value })}
              onBlur={saveSectionHeader}
              placeholder="Resistencia"
            />
          </div>
          <div className="admin-form-group" style={{ flex: 2 }}>
            <label>Descripción</label>
            <input
              type="text"
              value={sectionHeader.description}
              onChange={(e) => setSectionHeader({ ...sectionHeader, description: e.target.value })}
              onBlur={saveSectionHeader}
              placeholder="Descripción breve de la sección..."
            />
          </div>
        </div>
      </div>

      <div className="admin-testimonies-layout">
        <div className="admin-witnesses-list">
          <h3>Personas/Grupos ({resistors.length})</h3>
          {resistors.map(resistor => (
            <div 
              key={resistor.id} 
              className={`admin-witness-item ${selectedResistor === resistor.id ? 'active' : ''}`}
              onClick={() => loadResistorDetail(resistor.id)}
            >
              {resistor.image && (
                <img src={resistor.image} alt={resistor.name} className="admin-witness-thumb" />
              )}
              <span>{resistor.name}</span>
            </div>
          ))}
          {resistors.length === 0 && (
            <div className="admin-empty-small">No hay entradas de resistencia</div>
          )}
        </div>

        <div className="admin-witness-detail">
          {resistorDetail ? (
            <>
              <div className="admin-witness-header">
                <div className="admin-witness-info">
                  {resistorDetail.image && (
                    <img src={resistorDetail.image} alt={resistorDetail.name} className="admin-witness-avatar" />
                  )}
                  <div>
                    <h3>{resistorDetail.name}</h3>
                    <p className="admin-witness-bio">{resistorDetail.bio}</p>
                  </div>
                </div>
                {canEdit && (
                  <button onClick={openEditResistorModal} className="admin-btn-secondary">
                    Editar
                  </button>
                )}
              </div>

              <div className="admin-testimonies-section">
                <div className="admin-section-header">
                  <h4>Entradas ({resistorDetail.entries?.length || 0})</h4>
                  {canCreate && (
                    <button onClick={openCreateEntryModal} className="admin-btn-primary small">
                      + Añadir Entrada
                    </button>
                  )}
                </div>

                <div className="admin-testimonies-list">
                  {resistorDetail.entries?.map(entry => (
                    <div key={entry.id} className="admin-testimony-card" onClick={() => canEdit && openEditEntryModal(entry)}>
                      <h5>{entry.title}</h5>
                      <p>{entry.summary}</p>
                      <span className="admin-testimony-date">{entry.date}</span>
                      {((entry.media && entry.media.length > 0) || (entry.contentBlocks && entry.contentBlocks.length > 0)) && (
                        <span className="admin-testimony-media-count">
                          Contenido multimedia incluido
                        </span>
                      )}
                    </div>
                  ))}
                  {(!resistorDetail.entries || resistorDetail.entries.length === 0) && (
                    <div className="admin-empty-small">No hay entradas</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="admin-empty">
              <p>Selecciona una persona o grupo para ver sus detalles</p>
            </div>
          )}
        </div>
      </div>

      {showResistorModal && (
        <div className="admin-modal-overlay" onClick={() => setShowResistorModal(false)}>
          <div className="admin-modal large" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingResistor ? 'Editar Persona/Grupo' : 'Nueva Persona/Grupo'}</h3>
              <button className="admin-modal-close" onClick={() => setShowResistorModal(false)}>×</button>
            </div>
            <form onSubmit={handleResistorSubmit}>
              <div className="admin-form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={resistorForm.name}
                  onChange={(e) => setResistorForm({ ...resistorForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Descripción/Biografía</label>
                <textarea
                  value={resistorForm.bio}
                  onChange={(e) => setResistorForm({ ...resistorForm, bio: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="admin-form-group">
                <label>Foto/Imagen</label>
                <ImageUploader
                  value={resistorForm.image}
                  onChange={(url) => setResistorForm({ ...resistorForm, image: url })}
                />
              </div>

              <div className="admin-form-group">
                <label>Redes Sociales / Enlaces</label>
                <div className="admin-social-inputs">
                  <input
                    type="text"
                    placeholder="Instagram URL"
                    value={resistorForm.social.instagram}
                    onChange={(e) => setResistorForm({ 
                      ...resistorForm, 
                      social: { ...resistorForm.social, instagram: e.target.value }
                    })}
                  />
                  <input
                    type="text"
                    placeholder="Telegram URL"
                    value={resistorForm.social.telegram}
                    onChange={(e) => setResistorForm({ 
                      ...resistorForm, 
                      social: { ...resistorForm.social, telegram: e.target.value }
                    })}
                  />
                  <input
                    type="text"
                    placeholder="Donación URL"
                    value={resistorForm.social.donation}
                    onChange={(e) => setResistorForm({ 
                      ...resistorForm, 
                      social: { ...resistorForm.social, donation: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowResistorModal(false)} className="admin-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary">
                  {editingResistor ? 'Guardar Cambios' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEntryModal && (
        <div className="admin-modal-overlay" onClick={() => setShowEntryModal(false)}>
          <div className="admin-modal extra-large" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingEntry ? 'Editar Entrada' : 'Nueva Entrada de Resistencia'}</h3>
              <button className="admin-modal-close" onClick={() => setShowEntryModal(false)}>×</button>
            </div>
            <form onSubmit={handleEntrySubmit}>
              <div className="admin-form-group">
                <label>Título</label>
                <input
                  type="text"
                  value={entryForm.title}
                  onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Resumen</label>
                  <input
                    type="text"
                    value={entryForm.summary}
                    onChange={(e) => setEntryForm({ ...entryForm, summary: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Fecha/Contexto</label>
                  <input
                    type="text"
                    value={entryForm.date}
                    onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Contenido de la Entrada</label>
                <p className="admin-form-help">Añade texto, imágenes, vídeos o audios. Puedes mezclar diferentes tipos y elegir la posición.</p>
                <RichContentEditor
                  blocks={entryForm.contentBlocks}
                  onChange={(blocks) => setEntryForm({ ...entryForm, contentBlocks: blocks })}
                  allowAudio={true}
                />
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowEntryModal(false)} className="admin-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary">
                  {editingEntry ? 'Guardar Cambios' : 'Crear Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
