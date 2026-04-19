import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';
import { GlobalRulesProvider } from './context/GlobalRulesContext';

axios.interceptors.request.use((config) => {
  const impersonateId = localStorage.getItem('impersonate_college_id');
  if (impersonateId) {
    config.headers['x-college-id'] = impersonateId;
  }
  return config;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalRulesProvider>
      <App />
    </GlobalRulesProvider>
  </React.StrictMode>,
);

