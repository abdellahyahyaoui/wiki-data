import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const AILaboratory = ({ countryCode: propCountryCode }) => {
  const { countryCode: paramsCountryCode } = useParams();
  const countryCode = propCountryCode || paramsCountryCode;
  const [text, setText] = useState('');
  const [history, setHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [countryCode]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/ai/history/${countryCode}`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    try {
      await fetch(`/api/ai/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode, content: text })
      });
      setText('');
      fetchHistory();
    } catch (err) {
      alert("Error al guardar");
    }
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/ai/process/${countryCode}`, { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert("Error al procesar con IA");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    alert("Copiado al portapapeles");
  };

  return (
    <div className="ai-lab-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Laboratorio de IA - {countryCode?.toUpperCase()}</h1>
      
      <div className="input-section" style={{ marginBottom: '30px', background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <h3>Recolección de Información</h3>
        <textarea 
          style={{ width: '100%', minHeight: '150px', marginBottom: '10px', padding: '10px' }}
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
          <h3>Materia Prima Acumulada</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
            {history.length === 0 ? <p>No hay textos acumulados.</p> : history.map(item => (
              <div key={item.id} style={{ marginBottom: '10px', padding: '10px', borderBottom: '1px solid #eee', fontSize: '0.9em' }}>
                <small>{new Date(item.created_at).toLocaleDateString()}</small>
                <p>{item.content.substring(0, 100)}...</p>
              </div>
            ))}
          </div>
          <button 
            onClick={handleProcess}
            disabled={isProcessing || history.length === 0}
            style={{ marginTop: '20px', padding: '15px 30px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
          >
            {isProcessing ? 'Procesando con IA...' : 'EJECUTAR IA (Organizar y Extraer)'}
          </button>
        </div>

        <div className="result-section">
          <h3>Resultados de la IA</h3>
          {result ? (
            <div style={{ border: '2px solid #28a745', padding: '15px', borderRadius: '8px' }}>
              {Object.keys(result).map(section => (
                <div key={section} style={{ marginBottom: '20px' }}>
                  <h4 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>{section.toUpperCase()}</h4>
                  <pre style={{ background: '#f8f9fa', padding: '10px', fontSize: '0.8em', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(result[section], null, 2)}
                  </pre>
                  <button 
                    onClick={() => copyToClipboard(result[section])}
                    style={{ fontSize: '0.8em', padding: '5px 10px' }}
                  >
                    Copiar {section}
                  </button>
                </div>
              ))}
            </div>
          ) : <p>Los resultados aparecerán aquí tras procesar.</p>}
        </div>
      </div>
    </div>
  );
};

export default AILaboratory;
