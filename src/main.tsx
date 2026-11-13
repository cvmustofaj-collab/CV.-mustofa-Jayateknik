import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ToastProvider } from './context/ToastContext.tsx';
import { FirebaseProvider } from './context/FirebaseContext.tsx';

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <FirebaseProvider>
      <App />
    </FirebaseProvider>
  </ToastProvider>
);
