import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ImageUploader from './ImageUploader';
import RichContentEditor from './RichContentEditor';

export default function VelumEditor({ countryCode, lang = 'es' }) {
  const { user, getAuthHeaders } = useAuth();
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);

  const [formData, setFormData] = useState({
    id: '',
    title: '',
    subtitle: '',
    author: '',
    authorImage: '',
    coverImage: '',
    date: '',
    abstract: '',
    keywords: [],
    sections: [],
    bibliography: []
  });

  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    loadArticles();
  }, [countryCode, lang]);

  async function loadArticles() {
    try {
      const res = await fetch(`/api/cms/velum?lang=${lang}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(data.items || []);
      }
    } catch (error) {
      console.error('Error loading VELUM articles:', error);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingArticle(null);
    setFormData({
      id: '',
      title: '',
      subtitle: '',
      author: '',
      authorImage: '',
      coverImage: '',
      date: new Date().toISOString().split('T')[0],
      abstract: '',
      keywords: [],
      sections: [{ title: '', contentBlocks: [] }],
      bibliography: ['']
    });
    setShowModal(true);
  }

  async function openEditModal(article) {
    try {
      const res = await fetch(`/api/cms/velum/${article.id}?lang=${lang}`, {
        headers: getAuthHeaders()
      });
      
      let fullArticle = article;
      if (res.ok) {
        fullArticle = await res.json();
      }
      
      setEditingArticle(fullArticle);
      setFormData({
        id: fullArticle.id,
        title: fullArticle.title || '',
        subtitle: fullArticle.subtitle || '',
        author: fullArticle.author || '',
        authorImage: fullArticle.authorImage || '',
        coverImage: fullArticle.coverImage || '',
        date: fullArticle.date || '',
        abstract: fullArticle.abstract || '',
        keywords: fullArticle.keywords || [],
        sections: fullArticle.sections?.length 
          ? fullArticle.sections.map(s => ({
              ...s,
              contentBlocks: s.contentBlocks || convertContentToBlocks(s.content)
            }))
          : [{ title: '', contentBlocks: [] }],
        bibliography: fullArticle.bibliography?.length ? fullArticle.bibliography : ['']
      });
      setShowModal(true);
    } catch (error) {
      console.error('Error loading article:', error);
      alert('Error al cargar el artículo');
    }
  }

  function convertContentToBlocks(content) {
    if (!content) return [];
    return [{
      id: 'block-0',
      type: 'text',
      content: content,
      position: 'center'
    }];
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const body = {
      ...formData,
      id: formData.id || formData.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30),
      sections: formData.sections
        .filter(s => s.title.trim() || (s.contentBlocks && s.contentBlocks.length > 0))
        .map(s => ({
          ...s,
          content: s.contentBlocks
            ?.filter(b => b.type === 'text')
            .map(b => b.content)
            .join('\n\n') || ''
        })),
      bibliography: formData.bibliography.filter(b => b.trim())
    };

    const url = editingArticle
      ? `/api/cms/velum/${editingArticle.id}?lang=${lang}`
      : `/api/cms/velum?lang=${lang}`;

    const method = editingArticle ? 'PUT' : 'POST';

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
        setShowModal(false);
        if (data.pending) {
          alert('Cambio enviado para aprobación');
        }
        loadArticles();
      } else {
        alert(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  }

  async function handleDelete(article) {
    if (!window.confirm(`¿Eliminar "${article.title}"?`)) return;

    try {
      const res = await fetch(`/api/cms/velum/${article.id}?lang=${lang}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        loadArticles();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  }

  function addKeyword() {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      setFormData({ ...formData, keywords: [...formData.keywords, newKeyword.trim()] });
      setNewKeyword('');
    }
  }

  function removeKeyword(keyword) {
    setFormData({ ...formData, keywords: formData.keywords.filter(k => k !== keyword) });
  }

  function addSection() {
    setFormData({ ...formData, sections: [...formData.sections, { title: '', contentBlocks: [] }] });
  }

  function updateSectionTitle(index, title) {
    const newSections = [...formData.sections];
    newSections[index].title = title;
    setFormData({ ...formData, sections: newSections });
  }

  function updateSectionBlocks(index, blocks) {
    const newSections = [...formData.sections];
    newSections[index].contentBlocks = blocks;
    setFormData({ ...formData, sections: newSections });
  }

  function removeSection(index) {
    setFormData({ ...formData, sections: formData.sections.filter((_, i) => i !== index) });
  }

  function addBibliography() {
    setFormData({ ...formData, bibliography: [...formData.bibliography, ''] });
  }

  function updateBibliography(index, value) {
    const newBib = [...formData.bibliography];
    newBib[index] = value;
    setFormData({ ...formData, bibliography: newBib });
  }

  function removeBibliography(index) {
    setFormData({ ...formData, bibliography: formData.bibliography.filter((_, i) => i !== index) });
  }

  const canCreate = user.role === 'admin' || user.permissions?.canCreate;
  const canEdit = user.role === 'admin' || user.permissions?.canEdit;

  if (loading) {
    return <div className="admin-loading">Cargando artículos VELUM...</div>;
  }

  return (
    <div className="admin-editor">
      <div className="admin-editor-header">
        <h2>VELUM - Micro-tesis e Investigaciones</h2>
        {canCreate && (
          <button onClick={openCreateModal} className="admin-btn-primary">
            + Nuevo Artículo
          </button>
        )}
      </div>

      <div className="admin-velum-grid">
        {articles.map(article => (
          <div key={article.id} className="admin-velum-magazine-card">
            {article.coverImage && (
              <div className="admin-velum-cover">
                <img src={article.coverImage} alt={article.title} />
              </div>
            )}
            <div className="admin-velum-card-body">
              <div className="admin-velum-meta">
                <span className="admin-velum-date">{article.date}</span>
                <span className="admin-velum-author">{article.author}</span>
              </div>
              <h3 className="admin-velum-title">{article.title}</h3>
              {article.subtitle && (
                <p className="admin-velum-subtitle">{article.subtitle}</p>
              )}
              {article.abstract && (
                <p className="admin-velum-abstract">{article.abstract.substring(0, 120)}...</p>
              )}
              {article.keywords && article.keywords.length > 0 && (
                <div className="admin-velum-keywords">
                  {article.keywords.slice(0, 3).map((kw, i) => (
                    <span key={i} className="admin-velum-keyword">{kw}</span>
                  ))}
                </div>
              )}
            </div>
            {canEdit && (
              <div className="admin-velum-card-actions">
                <button onClick={() => openEditModal(article)} className="admin-btn-secondary small">
                  Editar
                </button>
                <button onClick={() => handleDelete(article)} className="admin-btn-danger small">
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
        {articles.length === 0 && (
          <div className="admin-empty">
            <p>No hay artículos en VELUM</p>
            {canCreate && (
              <button onClick={openCreateModal} className="admin-btn-primary">
                Crear primer artículo
              </button>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal extra-large" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingArticle ? 'Editar Artículo' : 'Nuevo Artículo VELUM'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="admin-velum-form">
              <div className="admin-form-row">
                <div className="admin-form-group" style={{ flex: 2 }}>
                  <label>Título *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Título del artículo"
                    className="velum-title-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Subtítulo</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Subtítulo o descripción breve"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Imagen de Portada</label>
                  <p className="admin-form-help">Esta imagen aparecerá en la tarjeta del artículo</p>
                  <ImageUploader
                    value={formData.coverImage}
                    onChange={(url) => setFormData({ ...formData, coverImage: url })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Autor</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Nombre del autor"
                  />
                  <label style={{ marginTop: '1rem' }}>Imagen del autor</label>
                  <ImageUploader
                    value={formData.authorImage}
                    onChange={(url) => setFormData({ ...formData, authorImage: url })}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Resumen / Introducción</label>
                <textarea
                  value={formData.abstract}
                  onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                  rows={4}
                  placeholder="Introducción breve del artículo (3-5 líneas)..."
                />
              </div>

              <div className="admin-form-group">
                <label>Palabras clave</label>
                <div className="admin-keywords-input">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="Añadir palabra clave"
                  />
                  <button type="button" onClick={addKeyword} className="admin-btn-add-keyword">+</button>
                </div>
                <div className="admin-keywords-list">
                  {formData.keywords.map((kw, i) => (
                    <span key={i} className="admin-keyword-tag">
                      {kw}
                      <button type="button" onClick={() => removeKeyword(kw)}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="admin-form-group">
                <label>Secciones del artículo</label>
                <p className="admin-form-help">Cada sección puede contener texto, imágenes, vídeos o audios mezclados.</p>
                {formData.sections.map((section, i) => (
                  <div key={i} className="admin-velum-section-item">
                    <div className="admin-section-header">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(i, e.target.value)}
                        placeholder={`Título de la sección ${i + 1} (ej: Lo que parece, El mecanismo real...)`}
                        className="section-title-input"
                      />
                      <button type="button" onClick={() => removeSection(i)} className="admin-btn-remove">×</button>
                    </div>
                    <RichContentEditor
                      blocks={section.contentBlocks || []}
                      onChange={(blocks) => updateSectionBlocks(i, blocks)}
                      allowAudio={true}
                    />
                  </div>
                ))}
                <button type="button" onClick={addSection} className="admin-btn-add">
                  + Añadir sección
                </button>
              </div>

              <div className="admin-form-group">
                <label>Fuentes / Bibliografía</label>
                {formData.bibliography.map((bib, i) => (
                  <div key={i} className="admin-array-item">
                    <input
                      type="text"
                      value={bib}
                      onChange={(e) => updateBibliography(i, e.target.value)}
                      placeholder="Referencia bibliográfica o fuente..."
                    />
                    <button type="button" onClick={() => removeBibliography(i)} className="admin-btn-remove">×</button>
                  </div>
                ))}
                <button type="button" onClick={addBibliography} className="admin-btn-add">
                  + Añadir fuente
                </button>
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="admin-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary">
                  {editingArticle ? 'Guardar Cambios' : 'Crear Artículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
