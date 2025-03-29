import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { FronteggProvider } from '@frontegg/react';

const contextOptions = {
  baseUrl: 'https://app-569bcb21sjhg.frontegg.com',  // Your Frontegg base URL
  clientId: 'c8c4f00f-5057-482f-ab2e-68dfaf5dc8ce',  // Your Frontegg Client ID
  appId: 'fe5f039f-4cce-4556-92a7-a3e11bbf1c35',  // Your Frontegg App ID
};

const authOptions = {
  keepSessionAlive: true, // Uncomment this in order to maintain the session alive
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <FronteggProvider 
    contextOptions={contextOptions} 
    authOptions={authOptions} 
    hostedLoginBox={true} // This enables the Frontegg-hosted login box
  >
    <App />
  </FronteggProvider>
);
