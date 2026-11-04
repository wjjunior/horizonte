import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import { App } from './App.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('#root não encontrado');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
