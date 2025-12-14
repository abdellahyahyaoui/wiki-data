import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function MultiMediaUploader({ value = [], onChange, allowedTypes = ['image', 'video', 'audio'] }) {
  const { getAuthHeaders } = useAuth();
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    const newMedia = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload/media', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          const fileType = file.type.startsWith('video/') ? 'video' 
            : file.type.startsWith('audio/') ? 'audio' 
            : 'image';
          newMedia.push({
            url: data.url,
            type: fileType,
            caption: ''
          });
        }
      } catch (error) {
        console.error('Error uploading:', error);
      }
    }

    onChange([...value, ...newMedia]);
    setUploading(false);
    e.target.value = '';
  }

  function updateCaption(index, caption) {
    const updated = [...value];
    updated[index] = { ...updated[index], caption };
    onChange(updated);
  }

  function removeMedia(index) {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  }

  function moveMedia(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= value.length) return;
    
    const updated = [...value];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  }

  function addUrlMedia(url, type) {
    if (!url.trim()) return;
    onChange([...value, { url: url.trim(), type, caption: '' }]);
  }

  const acceptTypes = [];
  if (allowedTypes.includes('image')) acceptTypes.push('image/*');
  if (allowedTypes.includes('video')) acceptTypes.push('video/*');
  if (allowedTypes.includes('audio')) acceptTypes.push('audio/*');

  return (
    <div className="admin-multi-media-uploader">
      <div className="admin-media-list">
        {value.map((media, index) => (
          <div key={index} className="admin-media-item">
            <div className="admin-media-preview">
              {media.type === 'image' && (
                <img src={media.url} alt={media.caption || `Media ${index + 1}`} />
              )}
              {media.type === 'video' && (
                <video src={media.url} controls />
              )}
              {media.type === 'audio' && (
                <audio src={media.url} controls />
              )}
              <span className="admin-media-type-badge">
                {media.type === 'image' ? '🖼️' : media.type === 'video' ? '🎬' : '🎵'}
              </span>
            </div>
            <div className="admin-media-controls">
              <input
                type="text"
                value={media.caption || ''}
                onChange={(e) => updateCaption(index, e.target.value)}
                placeholder="Pie de foto/video..."
                className="admin-media-caption"
              />
              <div className="admin-media-buttons">
                <button 
                  type="button" 
                  onClick={() => moveMedia(index, -1)} 
                  disabled={index === 0}
                  className="admin-btn-mini"
                  title="Mover arriba"
                >
                  ↑
                </button>
                <button 
                  type="button" 
                  onClick={() => moveMedia(index, 1)} 
                  disabled={index === value.length - 1}
                  className="admin-btn-mini"
                  title="Mover abajo"
                >
                  ↓
                </button>
                <button 
                  type="button" 
                  onClick={() => removeMedia(index)} 
                  className="admin-btn-mini danger"
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-media-actions">
        <label className="admin-btn-upload">
          {uploading ? 'Subiendo...' : '+ Subir archivo(s)'}
          <input
            type="file"
            accept={acceptTypes.join(',')}
            onChange={handleUpload}
            style={{ display: 'none' }}
            disabled={uploading}
            multiple
          />
        </label>
      </div>

      <div className="admin-media-url-inputs">
        <div className="admin-url-input-row">
          <input
            type="text"
            id="url-input-image"
            placeholder="URL de imagen"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrlMedia(e.target.value, 'image');
                e.target.value = '';
              }
            }}
          />
          <button 
            type="button" 
            onClick={(e) => {
              const input = e.target.previousSibling;
              addUrlMedia(input.value, 'image');
              input.value = '';
            }}
            className="admin-btn-add-url"
          >
            +
          </button>
        </div>
        {allowedTypes.includes('video') && (
          <div className="admin-url-input-row">
            <input
              type="text"
              id="url-input-video"
              placeholder="URL de video (YouTube, Vimeo, etc.)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addUrlMedia(e.target.value, 'video');
                  e.target.value = '';
                }
              }}
            />
            <button 
              type="button" 
              onClick={(e) => {
                const input = e.target.previousSibling;
                addUrlMedia(input.value, 'video');
                input.value = '';
              }}
              className="admin-btn-add-url"
            >
              +
            </button>
          </div>
        )}
        {allowedTypes.includes('audio') && (
          <div className="admin-url-input-row">
            <input
              type="text"
              id="url-input-audio"
              placeholder="URL de audio"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addUrlMedia(e.target.value, 'audio');
                  e.target.value = '';
                }
              }}
            />
            <button 
              type="button" 
              onClick={(e) => {
                const input = e.target.previousSibling;
                addUrlMedia(input.value, 'audio');
                input.value = '';
              }}
              className="admin-btn-add-url"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
