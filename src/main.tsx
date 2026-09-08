// Fichier: src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import HyperBatMediaSite from './HyperBatMediaSite'; // Importation de votre composant principal
import ThemeSubmissionPage from './components/ThemeSubmission/ThemeSubmissionPage';
import './index.css'; // Importation du CSS (y compris Tailwind)

// Pas de librairie de routes sur ce site, et GitHub Pages ne sert qu'un seul
// index.html : un chemin comme /soumettre donnerait une 404. On utilise donc
// un paramètre d'URL à la place : https://tonsite.com/?soumettre
const isSubmissionPage = new URLSearchParams(window.location.search).has('soumettre');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isSubmissionPage ? <ThemeSubmissionPage /> : <HyperBatMediaSite />}
  </React.StrictMode>
);