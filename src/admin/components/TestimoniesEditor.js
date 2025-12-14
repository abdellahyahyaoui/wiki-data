import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ImageUploader from './ImageUploader';
import RichContentEditor from './RichContentEditor';

export default function TestimoniesEditor({ countryCode, lang = 'es' }) {
  const { user, getAuthHeaders } = useAuth();
  const [witnesses, setWitnesses] = useState([]);
  const [selectedWitness, setSelectedWitness] = useState(null);
  const [witnessDetail, setWitnessDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWitnessModal, setShowWitnessModal] = useState(false);
  const [showTestimonyModal, setShowTestimonyModal] = useState(false);
  const [editingWitness, setEditingWitness] = useState(null);
  const [editingTestimony, setEditingTestimony] = useState(null);
  const [sectionHeader, setSectionHeader] = useState({
    title: 'Testimonios',
    description: 'Voces de quienes han vivido el conflicto en primera persona'
  });
  
  const [witnessForm, setWitnessForm] = useState({
    id: '',
    name: '',
    bio: '',
    image: '',
    social: { instagram: '', telegram: '', donation: '' }
  });

  const [testimonyForm, setTestimonyForm] = useState({
    id: '',
    title: '',
    summary: '',
    date: '',
    contentBlocks: [],
    media: []
  });

  useEffect(() => {
    loadWitnesses();
    loadSectionHeader();
  }, [countryCode, lang]);

  async function loadSectionHeader() {
    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/section-headers/testimonies?lang=${lang}`, {
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
      await fetch(`/api/cms/countries/${countryCode}/section-headers/testimonies?lang=${lang}`, {
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

  async function loadWitnesses() {
    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/testimonies?lang=${lang}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setWitnesses(data.items || []);
      }
    } catch (error) {
      console.error('Error loading witnesses:', error);
    }
    setLoading(false);
  }

  async function loadWitnessDetail(witnessId) {
    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/testimonies/${witnessId}?lang=${lang}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setWitnessDetail(data);
        setSelectedWitness(witnessId);
      }
    } catch (error) {
      console.error('Error loading witness detail:', error);
    }
  }

  function openCreateWitnessModal() {
    setEditingWitness(null);
    setWitnessForm({
      id: '',
      name: '',
      bio: '',
      image: '',
      social: { instagram: '', telegram: '', donation: '' }
    });
    setShowWitnessModal(true);
  }

  function openEditWitnessModal() {
    if (!witnessDetail) return;
    setEditingWitness(witnessDetail);
    setWitnessForm({
      id: witnessDetail.id,
      name: witnessDetail.name || '',
      bio: witnessDetail.bio || '',
      image: witnessDetail.image || '',
      social: witnessDetail.social || { instagram: '', telegram: '', donation: '' }
    });
    setShowWitnessModal(true);
  }

  function openCreateTestimonyModal() {
    setEditingTestimony(null);
    const nextId = `t${(witnessDetail?.testimonies?.length || 0) + 1}`;
    setTestimonyForm({
      id: nextId,
      title: '',
      summary: '',
      date: '',
      contentBlocks: [],
      media: []
    });
    setShowTestimonyModal(true);
  }

  async function openEditTestimonyModal(testimony) {
    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/testimonies/${selectedWitness}/testimony/${testimony.id}?lang=${lang}`, {
        headers: getAuthHeaders()
      });
      
      let fullTestimony = testimony;
      if (res.ok) {
        const data = await res.json();
        fullTestimony = { ...testimony, ...data };
      }
      
      setEditingTestimony(fullTestimony);
      setTestimonyForm({
        id: fullTestimony.id,
        title: fullTestimony.title || '',
        summary: fullTestimony.summary || '',
        date: fullTestimony.date || '',
        contentBlocks: fullTestimony.contentBlocks || convertParagraphsToBlocks(fullTestimony.paragraphs),
        media: fullTestimony.media || []
      });
      setShowTestimonyModal(true);
    } catch (error) {
      console.error('Error loading testimony:', error);
      setEditingTestimony(testimony);
      setTestimonyForm({
        id: testimony.id,
        title: testimony.title || '',
        summary: testimony.summary || '',
        date: testimony.date || '',
        contentBlocks: testimony.contentBlocks || convertParagraphsToBlocks(testimony.paragraphs),
        media: testimony.media || []
      });
      setShowTestimonyModal(true);
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

  async function handleWitnessSubmit(e) {
    e.preventDefault();
    
    const url = editingWitness
      ? `/api/cms/countries/${countryCode}/testimonies/${editingWitness.id}?lang=${lang}`
      : `/api/cms/countries/${countryCode}/testimonies?lang=${lang}`;
    
    const method = editingWitness ? 'PUT' : 'POST';

    const body = {
      ...witnessForm,
      id: witnessForm.id || witnessForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)
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
        setShowWitnessModal(false);
        if (data.pending) {
          alert('Cambio enviado para aprobación');
        }
        loadWitnesses();
        if (editingWitness) {
          loadWitnessDetail(editingWitness.id);
        }
      } else {
        alert(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  }

  async function handleTestimonySubmit(e) {
    e.preventDefault();
    
    const body = {
      ...testimonyForm,
      contentBlocks: testimonyForm.contentBlocks || [],
      paragraphs: testimonyForm.contentBlocks
        .filter(b => b.type === 'text')
        .map(b => b.content),
      media: testimonyForm.media || []
    };

    const isEdit = editingTestimony && editingTestimony.id;
    const url = isEdit
      ? `/api/cms/countries/${countryCode}/testimonies/${selectedWitness}/testimony/${editingTestimony.id}?lang=${lang}`
      : `/api/cms/countries/${countryCode}/testimonies/${selectedWitness}/testimony?lang=${lang}`;

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
        setShowTestimonyModal(false);
        if (data.pending) {
          alert('Cambio enviado para aprobación');
        }
        loadWitnessDetail(selectedWitness);
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
    return <div className="admin-loading">Cargando testimonios...</div>;
  }

  return (
    <div className="admin-editor">
      <div className="admin-editor-header">
        <h2>Testimonios</h2>
        {canCreate && (
          <button onClick={openCreateWitnessModal} className="admin-btn-primary">
            + Nuevo Testigo
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
              placeholder="Testimonios"
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
          <h3>Testigos ({witnesses.length})</h3>
          {witnesses.map(witness => (
            <div 
              key={witness.id} 
              className={`admin-witness-item ${selectedWitness === witness.id ? 'active' : ''}`}
              onClick={() => loadWitnessDetail(witness.id)}
            >
              {witness.image && (
                <img src={witness.image} alt={witness.name} className="admin-witness-thumb" />
              )}
              <span>{witness.name}</span>
            </div>
          ))}
          {witnesses.length === 0 && (
            <div className="admin-empty-small">No hay testigos</div>
          )}
        </div>

        <div className="admin-witness-detail">
          {witnessDetail ? (
            <>
              <div className="admin-witness-header">
                <div className="admin-witness-info">
                  {witnessDetail.image && (
                    <img src={witnessDetail.image} alt={witnessDetail.name} className="admin-witness-avatar" />
                  )}
                  <div>
                    <h3>{witnessDetail.name}</h3>
                    <p className="admin-witness-bio">{witnessDetail.bio}</p>
                  </div>
                </div>
                {canEdit && (
                  <button onClick={openEditWitnessModal} className="admin-btn-secondary">
                    Editar Testigo
                  </button>
                )}
              </div>

              <div className="admin-testimonies-section">
                <div className="admin-section-header">
                  <h4>Testimonios ({witnessDetail.testimonies?.length || 0})</h4>
                  {canCreate && (
                    <button onClick={openCreateTestimonyModal} className="admin-btn-primary small">
                      + Añadir Testimonio
                    </button>
                  )}
                </div>

                <div className="admin-testimonies-list">
                  {witnessDetail.testimonies?.map(t => (
                    <div key={t.id} className="admin-testimony-card" onClick={() => canEdit && openEditTestimonyModal(t)}>
                      <h5>{t.title}</h5>
                      <p>{t.summary}</p>
                      <span className="admin-testimony-date">{t.date}</span>
                      {((t.media && t.media.length > 0) || (t.contentBlocks && t.contentBlocks.length > 0)) && (
                        <span className="admin-testimony-media-count">
                          Contenido multimedia incluido
                        </span>
                      )}
                    </div>
                  ))}
                  {(!witnessDetail.testimonies || witnessDetail.testimonies.length === 0) && (
                    <div className="admin-empty-small">No hay testimonios</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="admin-empty">
              <p>Selecciona un testigo para ver sus detalles</p>
            </div>
          )}
        </div>
      </div>

      {showWitnessModal && (
        <div className="admin-modal-overlay" onClick={() => setShowWitnessModal(false)}>
          <div className="admin-modal large" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingWitness ? 'Editar Testigo' : 'Nuevo Testigo'}</h3>
              <button className="admin-modal-close" onClick={() => setShowWitnessModal(false)}>×</button>
            </div>
            <form onSubmit={handleWitnessSubmit}>
              <div className="admin-form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={witnessForm.name}
                  onChange={(e) => setWitnessForm({ ...witnessForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Biografía</label>
                <textarea
                  value={witnessForm.bio}
                  onChange={(e) => setWitnessForm({ ...witnessForm, bio: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="admin-form-group">
                <label>Foto</label>
                <ImageUploader
                  value={witnessForm.image}
                  onChange={(url) => setWitnessForm({ ...witnessForm, image: url })}
                />
              </div>

              <div className="admin-form-group">
                <label>Redes Sociales</label>
                <div className="admin-social-inputs">
                  <input
                    type="text"
                    placeholder="Instagram URL"
                    value={witnessForm.social.instagram}
                    onChange={(e) => setWitnessForm({ 
                      ...witnessForm, 
                      social: { ...witnessForm.social, instagram: e.target.value }
                    })}
                  />
                  <input
                    type="text"
                    placeholder="Telegram URL"
                    value={witnessForm.social.telegram}
                    onChange={(e) => setWitnessForm({ 
                      ...witnessForm, 
                      social: { ...witnessForm.social, telegram: e.target.value }
                    })}
                  />
                  <input
                    type="text"
                    placeholder="Donación URL"
                    value={witnessForm.social.donation}
                    onChange={(e) => setWitnessForm({ 
                      ...witnessForm, 
                      social: { ...witnessForm.social, donation: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowWitnessModal(false)} className="admin-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary">
                  {editingWitness ? 'Guardar Cambios' : 'Crear Testigo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTestimonyModal && (
        <div className="admin-modal-overlay" onClick={() => setShowTestimonyModal(false)}>
          <div className="admin-modal extra-large" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingTestimony ? 'Editar Testimonio' : 'Nuevo Testimonio'}</h3>
              <button className="admin-modal-close" onClick={() => setShowTestimonyModal(false)}>×</button>
            </div>
            <form onSubmit={handleTestimonySubmit}>
              <div className="admin-form-group">
                <label>Título</label>
                <input
                  type="text"
                  value={testimonyForm.title}
                  onChange={(e) => setTestimonyForm({ ...testimonyForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Resumen</label>
                  <input
                    type="text"
                    value={testimonyForm.summary}
                    onChange={(e) => setTestimonyForm({ ...testimonyForm, summary: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Fecha/Contexto</label>
                  <input
                    type="text"
                    value={testimonyForm.date}
                    onChange={(e) => setTestimonyForm({ ...testimonyForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Contenido del Testimonio</label>
                <p className="admin-form-help">Añade texto, imágenes, vídeos o audios. Puedes mezclar diferentes tipos y elegir la posición.</p>
                <RichContentEditor
                  blocks={testimonyForm.contentBlocks}
                  onChange={(blocks) => setTestimonyForm({ ...testimonyForm, contentBlocks: blocks })}
                  allowAudio={true}
                />
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowTestimonyModal(false)} className="admin-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary">
                  {editingTestimony ? 'Guardar Cambios' : 'Crear Testimonio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
