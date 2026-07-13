import React from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';
import '../content/content.css'; // Reuses tailwind config and classes

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}
