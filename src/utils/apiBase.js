// src/utils/apiBase.js
const API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://wiki-data-qxef.onrender.com'
    : 'http://localhost:5000';

export default API_BASE;
