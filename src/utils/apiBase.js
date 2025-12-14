const API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://wiki-data-qxef.onrender.com'
    : '';

export default API_BASE;
