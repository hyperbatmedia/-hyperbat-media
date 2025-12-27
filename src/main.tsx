// Fichier: src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import HyperBatMediaSite from './HyperBatMediaSite'; // Importation de votre composant principal
import './index.css'; // Importation du CSS (y compris Tailwind)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HyperBatMediaSite />
  </React.StrictMode>
);