// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./context/LanguageContext";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

ReactDOM.createRoot(document.getElementById("root")).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);

// Registrar el Service Worker solo en producción
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register();
}
