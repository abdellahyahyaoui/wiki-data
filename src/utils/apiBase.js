// src/utils/apiBase.js
// Use empty string for relative API calls - works in both local and production
// when the frontend and backend are served from the same origin
// src/utils/apiBase.js
const API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://wiki-data-qxef.onrender.com'
    : 'http://localhost:5000';

export default API_BASE;
