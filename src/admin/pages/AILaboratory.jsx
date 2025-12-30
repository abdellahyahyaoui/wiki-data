import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const AILaboratory = ({ countryCode: propCountryCode }) => {
  const { countryCode: paramsCountryCode } = useParams();
  const countryCode = propCountryCode || paramsCountryCode;
  const [text, setText] = useState('');
  const [history, setHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedSection, setSelectedSection] = useState('description');

  useEffect(() => {
    fetchHistory();
  }, [countryCode]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/cms/ai/history/${countryCode}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    try {
      await fetch(`/api/cms/ai/save`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ countryCode, content: text })
      });
      setText('');
      fetchHistory();
    } catch (err) {
      alert("Error al guardar");
    }
  };

  const handleClear = async () => {
    if (!window.confirm("¿Estás seguro de que quieres vaciar toda la materia prima acumulada para este país?")) return;
    try {
      await fetch(`/api/cms/ai/history/${countryCode}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchHistory();
    } catch (err) {
      alert("Error al vaciar");
    }
  };

  const handleProcess = async () => {
    if (!selectedSection) {
      alert("Por favor, selecciona una sección primero");
      return;
    }
    setIsProcessing(true);
    setResult(null);
    try {
      const res = await fetch(`/api/cms/ai/process/${countryCode}`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ section: selectedSection })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.result);
    } catch (err) {
      alert("Error al procesar con IA: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    alert("Copiado al portapapeles");
  };

  return (
    <div className="ai-lab-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Laboratorio de IA - {countryCode?.toUpperCase()}</h1>
      
      <div className="input-section" style={{ marginBottom: '30px', background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <h3>Recolección de Información</h3>
        <textarea 
          style={{ width: '100%', minHeight: '150px', marginBottom: '10px', padding: '10px', fontSize: '16px' }}
          placeholder="Pega aquí textos, noticias o apuntes sobre el conflicto..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button 
          onClick={handleSave}
          style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Guardar en MySQL
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="history-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3>Materia Prima Acumulada</h3>
            {history.length > 0 && (
              <button 
                onClick={handleClear}
                style={{ fontSize: '0.8em', padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Vaciar Todo
              </button>
            )}
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid #ddd', padding: '15px', background: 'white' }}>
            {history.length === 0 ? <p>No hay textos acumulados.</p> : history.map(item => (
              <div key={item.id} style={{ marginBottom: '20px', padding: '15px', borderBottom: '2px solid #eee', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <small style={{ color: '#666' }}>{new Date(item.created_at).toLocaleString()}</small>
                </div>
                <p style={{ whiteSpace: 'pre-wrap', direction: 'rtl', fontSize: '15px', lineHeight: '1.5', margin: 0 }}>{item.content}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', padding: '20px', background: '#e9ecef', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Configuración de Procesamiento</h4>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Sección Destino:</label>
              <select 
                value={selectedSection} 
                onChange={(e) => setSelectedSection(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="description">Descripción General</option>
                <option value="timeline">Cronología (Eventos)</option>
                <option value="testimonies">Testimonios</option>
                <option value="resistance">Resistencia</option>
                <option value="velum">Artículo Velum</option>
              </select>
            </div>
            <button 
              onClick={handleProcess}
              disabled={isProcessing || history.length === 0}
              style={{ padding: '15px 30px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontSize: '16px', fontWeight: 'bold' }}
            >
              {isProcessing ? 'Procesando con IA...' : `PROCESAR PARA ${selectedSection.toUpperCase()}`}
            </button>
          </div>
        </div>

        <div className="result-section">
          <h3>Resultados de la IA (Texto Limpio para Copiar)</h3>
          {result ? (
            <div style={{ border: '2px solid #28a745', padding: '20px', borderRadius: '8px', background: 'white', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ color: '#28a745', fontWeight: 'bold' }}>Sección: {selectedSection.toUpperCase()}</span>
                <button 
                  onClick={() => copyToClipboard(result)}
                  style={{ padding: '5px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Copiar Todo
                </button>
              </div>
              <pre style={{ 
                background: '#f8f9fa', 
                padding: '15px', 
                fontSize: '14px', 
                whiteSpace: 'pre-wrap', 
                fontFamily: 'inherit',
                lineHeight: '1.6',
                minHeight: '500px',
                border: '1px solid #eee'
              }}>
                {result}
              </pre>
            </div>
          ) : (
            <div style={{ border: '1px dashed #ccc', padding: '40px', textAlign: 'center', color: '#999' }}>
              <p>1. Selecciona la sección arriba a la izquierda.</p>
              <p>2. Pulsa el botón verde para ejecutar.</p>
              <p><small>La IA adaptará el formato a los campos de esa sección.</small></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AILaboratory;
