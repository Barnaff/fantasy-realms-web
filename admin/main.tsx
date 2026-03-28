import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import CardsPage from './pages/CardsPage';
import RelicsPage from './pages/RelicsPage';
import EventsPage from './pages/EventsPage';
import ThemesPage from './pages/ThemesPage';
import ConfigPage from './pages/ConfigPage';
import SimulatorPage from './pages/SimulatorPage';
import './admin.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/cards" replace />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="relics" element={<RelicsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="themes" element={<ThemesPage />} />
          <Route path="config" element={<ConfigPage />} />
          <Route path="simulator" element={<SimulatorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
