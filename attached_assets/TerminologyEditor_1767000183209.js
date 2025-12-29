import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API_BASE from '../../utils/apiBase';


const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'personaje', label: 'Personaje' },
  { value: 'organizacion', label: 'Organización' },
  { value: 'concepto', label: 'Concepto' },
  { value: 'lugar', label: 'Lugar' },
  { value: 'evento', label: 'Evento' }
];

export default function TerminologyEditor({ lang = 'es' }) {
  const { user, getAuthHeaders } = useAuth();
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  const [termForm, setTermForm] = useState({
    term: '',
    definition: '',
    category: 'general',
    relatedTerms: [],
    sources: []
  });

  const [newRelatedTerm, setNewRelatedTerm] = useState('');
  const [newSource, setNewSource] = useState('');

  useEffect(() => {
    loadTerms();
  }, [lang]);

  async function loadTerms() {
    try {
      const res = await fetch(`${API_BASE}/api/cms/terminology?lang=${lang}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setTerms(data.items || []);
      }
    } catch (error) {
      console.error('Error loading terminology:', error);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingTerm(null);
    setTermForm({
      term: '',
      definition: '',
      category: 'general',
      relatedTerms: [],
      sources: []
    });
    setShowModal(true);
  }

  function openEditModal(term) {
    setEditingTerm(term);
    setTermForm({
      term: term.term,
      definition: term.definition,
      category: term.category || 'general',
      relatedTerms: term.relatedTerms || [],
      sources: term.sources || []
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const url = editingTerm
      ? `/api/cms/terminology/${editingTerm.id}?lang=${lang}`
      : `/api/cms/terminology?lang=${lang}`;
    
    const method = editingTerm ? 'PUT' : 'POST';

    try {
      const res = await fetch(`${API_BASE}${url}`, {
        method,
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(termForm)
      });

      const data = await res.json();
      
      if (res.ok) {
        setShowModal(false);
        if (data.pending) {
          alert('Cambio enviado para aprobación');
        }
        loadTerms();
      } else {
        alert(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  }

  async function handleDelete(termId) {
    if (!window.confirm('¿Eliminar este término?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/cms/terminology/${termId}?lang=${lang}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        loadTerms();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  }

  function addRelatedTerm() {
    if (newRelatedTerm.trim()) {
      setTermForm({
        ...termForm,
        relatedTerms: [...termForm.relatedTerms, newRelatedTerm.trim()]
      });
      setNewRelatedTerm('');
    }
  }

  function removeRelatedTerm(index) {
    setTermForm({
      ...termForm,
      relatedTerms: termForm.relatedTerms.filter((_, i) => i !== index)
    });
  }

  function addSource() {
    if (newSource.trim()) {
      setTermForm({
        ...termForm,
        sources: [...termForm.sources, newSource.trim()]
      });
      setNewSource('');
    }
  }

  function removeSource(index) {
    setTermForm({
      ...termForm,
      sources: termForm.sources.filter((_, i) => i !== index)
    });
  }

  const canCreate = user.role === 'admin' || user.permissions?.canCreate;
  const canEdit = user.role === 'admin' || user.permissions?.canEdit;
  const canDelete = user.role === 'admin' || user.permissions?.canDelete;

  const filteredTerms = terms.filter(term => {
    const termText = (term.term || '').toLowerCase();
    const definitionText = (term.definition || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = termText.includes(query) || definitionText.includes(query);
    const matchesCategory = filterCategory === 'all' || term.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="admin-loading">Cargando terminología...</div>;
  }

  return (
    <div className="admin-editor">
      <div className="admin-editor-header">
        <h2>Terminología</h2>
        {canCreate && (
          <button onClick={openCreateModal} className="admin-btn-primary">
            + Nuevo Término
          </button>
        )}
      </div>

      <div className="admin-filters">
        <div className="admin-search-box">
          <input
            type="text"
            placeholder="Buscar términos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="admin-filter-select">
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas las categorías</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-terminology-grid">
        {filteredTerms.map(term => (
          <div key={term.id} className="admin-term-card">
            <div className="admin-term-header">
              <h4>{term.term}</h4>
              <span className={`admin-term-category cat-${term.category}`}>
                {CATEGORIES.find(c => c.value === term.category)?.label || term.category}
              </span>
            </div>
            <p className="admin-term-definition">{term.definition}</p>
            {term.relatedTerms && term.relatedTerms.length > 0 && (
              <div className="admin-term-related">
                <span className="label">Relacionados:</span>
                {term.relatedTerms.map((rt, i) => (
                  <span key={i} className="admin-term-tag">{rt}</span>
                ))}
              </div>
            )}
            <div className="admin-term-actions">
              {canEdit && (
                <button onClick={() => openEditModal(term)} className="admin-btn-secondary small">
                  Editar
                </button>
              )}
              {canDelete && (
                <button onClick={() => handleDelete(term.id)} className="admin-btn-danger small">
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredTerms.length === 0 && (
          <div className="admin-empty">
            {searchQuery || filterCategory !== 'all' 
              ? 'No se encontraron términos con esos filtros'
              : 'No hay términos en la terminología. Añade el primero.'}
          </div>
        )}
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal large" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingTerm ? 'Editar Término' : 'Nuevo Término'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="admin-form-row">
                <div className="admin-form-group" style={{ flex: 2 }}>
                  <label>Término</label>
                  <input
                    type="text"
                    value={termForm.term}
                    onChange={(e) => setTermForm({ ...termForm, term: e.target.value })}
                    required
                    placeholder="Ej: Nakba, Hamas, Ocupación..."
                  />
                </div>
                <div className="admin-form-group">
                  <label>Categoría</label>
                  <select
                    value={termForm.category}
                    onChange={(e) => setTermForm({ ...termForm, category: e.target.value })}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label>Definición</label>
                <textarea
                  value={termForm.definition}
                  onChange={(e) => setTermForm({ ...termForm, definition: e.target.value })}
                  rows={5}
                  required
                  placeholder="Explicación clara y objetiva del término..."
                />
              </div>

              <div className="admin-form-group">
                <label>Términos Relacionados</label>
                <div className="admin-tags-input">
                  <div className="admin-tags-list">
                    {termForm.relatedTerms.map((rt, i) => (
                      <span key={i} className="admin-tag">
                        {rt}
                        <button type="button" onClick={() => removeRelatedTerm(i)}>×</button>
                      </span>
                    ))}
                  </div>
                  <div className="admin-tag-add">
                    <input
                      type="text"
                      value={newRelatedTerm}
                      onChange={(e) => setNewRelatedTerm(e.target.value)}
                      placeholder="Añadir término relacionado..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRelatedTerm())}
                    />
                    <button type="button" onClick={addRelatedTerm} className="admin-btn-secondary small">
                      Añadir
                    </button>
                  </div>
                </div>
              </div>

              <div className="admin-form-group">
                <label>Fuentes</label>
                <div className="admin-tags-input">
                  <div className="admin-tags-list">
                    {termForm.sources.map((src, i) => (
                      <span key={i} className="admin-tag source">
                        {src}
                        <button type="button" onClick={() => removeSource(i)}>×</button>
                      </span>
                    ))}
                  </div>
                  <div className="admin-tag-add">
                    <input
                      type="text"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      placeholder="URL o referencia de la fuente..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSource())}
                    />
                    <button type="button" onClick={addSource} className="admin-btn-secondary small">
                      Añadir
                    </button>
                  </div>
                </div>
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="admin-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary">
                  {editingTerm ? 'Guardar Cambios' : 'Crear Término'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
