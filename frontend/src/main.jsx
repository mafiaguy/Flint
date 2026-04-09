import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </HashRouter>
);
