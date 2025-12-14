import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import RichContentEditor from './RichContentEditor';

export default function DescriptionEditor({ countryCode }) {
  const { user, getAuthHeaders } = useAuth();
  const [description, setDescription] = useState({ title: '', chapters: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [editingIndex, setEditingIndex] = useState(-1);

  const [formData, setFormData] = useState({
    id: '',
    title: '',
    contentBlocks: []
  });

  useEffect(() => {
    loadDescription();
  }, [countryCode]);

  async function loadDescription() {
    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/description?lang=es`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setDescription(data);
      }
    } catch (error) {
      console.error('Error loading description:', error);
    }
    setLoading(false);
  }

  function normalizeBlock(block) {
    if (block.type === 'text') {
      return {
        id: block.id,
        type: 'text',
        content: block.content || '',
        position: block.position || 'center'
      };
    } else {
      return {
        id: block.id,
        type: block.type,
        url: block.url || block.content || '',
        position: block.position || 'center',
        caption: block.caption || ''
      };
    }
  }

  function normalizeBlocks(blocks) {
    return blocks.map(normalizeBlock);
  }

  function convertLegacyToBlocks(chapter) {
    const blocks = [];
    
    if (chapter.image) {
      blocks.push({
        id: `img-${Date.now()}`,
        type: 'image',
        url: chapter.image,
        position: 'center',
        caption: ''
      });
    }
    
    if (chapter.content) {
      blocks.push({
        id: `text-${Date.now()}`,
        type: 'text',
        content: chapter.content,
        position: 'center'
      });
    }
    
    if (chapter.paragraphs && chapter.paragraphs.length > 0) {
      chapter.paragraphs.forEach((p, i) => {
        if (p.trim()) {
          blocks.push({
            id: `para-${Date.now()}-${i}`,
            type: 'text',
            content: p,
            position: 'center'
          });
        }
      });
    }
    
    return blocks;
  }

  function openCreateModal() {
    setEditingChapter(null);
    setEditingIndex(-1);
    setFormData({
      id: '',
      title: '',
      contentBlocks: []
    });
    setShowModal(true);
  }

  function openEditModal(chapter, index) {
    setEditingChapter(chapter);
    setEditingIndex(index);
    setFormData({
      id: chapter.id || '',
      title: chapter.title || '',
      contentBlocks: chapter.contentBlocks && chapter.contentBlocks.length > 0 
        ? normalizeBlocks(chapter.contentBlocks)
        : convertLegacyToBlocks(chapter)
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const normalizedBlocks = normalizeBlocks(formData.contentBlocks);
    
    const textContent = normalizedBlocks
      .filter(b => b.type === 'text')
      .map(b => b.content)
      .join('\n\n');
    
    const firstImage = normalizedBlocks.find(b => b.type === 'image');
    
    const chapterData = {
      id: formData.id || formData.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30),
      title: formData.title,
      contentBlocks: normalizedBlocks,
      content: textContent.substring(0, 500),
      paragraphs: normalizedBlocks
        .filter(b => b.type === 'text')
        .map(b => b.content),
      image: firstImage?.url || ''
    };

    const updatedChapters = [...description.chapters];
    
    if (editingIndex >= 0) {
      updatedChapters[editingIndex] = chapterData;
    } else {
      updatedChapters.push(chapterData);
    }

    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/description?lang=es`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: description.title || 'Descripción del Conflicto',
          chapters: updatedChapters
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setShowModal(false);
        if (data.pending) {
          alert('Cambio enviado para aprobación');
        }
        loadDescription();
      } else {
        alert(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  }

  async function handleDelete(index) {
    if (!window.confirm('¿Eliminar este capítulo?')) return;

    const updatedChapters = description.chapters.filter((_, i) => i !== index);

    try {
      const res = await fetch(`/api/cms/countries/${countryCode}/description?lang=es`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: description.title,
          chapters: updatedChapters
        })
      });

      if (res.ok) {
        loadDescription();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  }

  async function handleUpdateTitle(newTitle) {
    try {
      await fetch(`/api/cms/countries/${countryCode}/description?lang=es`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTitle,
          chapters: description.chapters
        })
      });
      setDescription(prev => ({ ...prev, title: newTitle }));
    } catch (error) {
      console.error('Error updating title:', error);
    }
  }

  function getChapterPreview(chapter) {
    if (chapter.contentBlocks && chapter.contentBlocks.length > 0) {
      const textBlock = chapter.contentBlocks.find(b => b.type === 'text');
      return textBlock ? textBlock.content.substring(0, 150) : '';
    }
    return chapter.content?.substring(0, 150) || '';
  }

  function getChapterMediaCount(chapter) {
    if (!chapter.contentBlocks) return 0;
    return chapter.contentBlocks.filter(b => b.type !== 'text').length;
  }

  const canCreate = user.role === 'admin' || user.permissions?.canCreate;
  const canEdit = user.role === 'admin' || user.permissions?.canEdit;
  const canDelete = user.role === 'admin' || user.permissions?.canDelete;

  if (loading) {
    return <div className="admin-loading">Cargando descripción...</div>;
  }

  return (
    <div className="admin-editor">
      <div className="admin-editor-header">
        <h2>Descripción del Conflicto</h2>
        {canCreate && (
          <button className="admin-btn admin-btn-primary" onClick={openCreateModal}>
            + Nuevo Capítulo
          </button>
        )}
      </div>

      <div className="admin-section-title-edit">
        <label>Título de la sección:</label>
        <input
          type="text"
          value={description.title || 'Descripción del Conflicto'}
          onChange={(e) => handleUpdateTitle(e.target.value)}
          className="admin-input"
          placeholder="Título de la sección"
        />
      </div>

      {description.chapters?.length === 0 ? (
        <div className="admin-empty-state">
          <p>No hay capítulos. Crea el primer capítulo para empezar.</p>
        </div>
      ) : (
        <div className="admin-chapters-list">
          {description.chapters.map((chapter, index) => (
            <div key={chapter.id || index} className="admin-chapter-card">
              <div className="admin-chapter-content">
                {chapter.image && (
                  <img src={chapter.image} alt={chapter.title} className="admin-chapter-thumb" />
                )}
                <div className="admin-chapter-info">
                  <h3 className="admin-chapter-title">{chapter.title}</h3>
                  <p className="admin-chapter-preview">
                    {getChapterPreview(chapter)}...
                  </p>
                  <span className="admin-chapter-paragraphs">
                    {chapter.contentBlocks?.filter(b => b.type === 'text').length || chapter.paragraphs?.length || 0} bloques de texto
                    {getChapterMediaCount(chapter) > 0 && ` | ${getChapterMediaCount(chapter)} multimedia`}
                  </span>
                </div>
              </div>
              <div className="admin-chapter-actions">
                {canEdit && (
                  <button 
                    className="admin-btn admin-btn-small"
                    onClick={() => openEditModal(chapter, index)}
                  >
                    Editar
                  </button>
                )}
                {canDelete && (
                  <button 
                    className="admin-btn admin-btn-small admin-btn-danger"
                    onClick={() => handleDelete(index)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal extra-large" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingChapter ? 'Editar Capítulo' : 'Nuevo Capítulo'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-form-group">
                <label>Título del Capítulo</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="admin-input"
                  placeholder="Ej: Orígenes del Conflicto"
                />
              </div>

              <div className="admin-form-group">
                <label>Contenido del Capítulo</label>
                <p className="admin-form-help">
                  Añade texto, imágenes, vídeos o audios. Puedes elegir la posición de cada elemento (izquierda, centro, derecha) para crear flujos de texto en L.
                </p>
                <RichContentEditor
                  blocks={formData.contentBlocks}
                  onChange={(blocks) => setFormData(prev => ({ ...prev, contentBlocks: blocks }))}
                  allowAudio={true}
                />
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary">
                  {editingChapter ? 'Guardar Cambios' : 'Crear Capítulo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
