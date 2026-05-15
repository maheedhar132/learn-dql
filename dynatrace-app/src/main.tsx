import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoot } from '@dynatrace/strato-components/core';
import { App } from './App';
import './styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppRoot>
      <BrowserRouter basename="ui">
        <App />
      </BrowserRouter>
    </AppRoot>
  </React.StrictMode>,
);
