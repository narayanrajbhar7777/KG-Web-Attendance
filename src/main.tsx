import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.1 });

const originalFetch = window.fetch;
let activeRequests = 0;

window.fetch = async (...args) => {
  let isSilent = false;
  if (args[1]?.headers) {
    const headers = args[1].headers as any;
    if (headers['X-Silent-Fetch']) {
      isSilent = true;
      delete headers['X-Silent-Fetch'];
    } else if (headers instanceof Headers && headers.has('X-Silent-Fetch')) {
      isSilent = true;
      headers.delete('X-Silent-Fetch');
    }
  }

  if (!isSilent) {
    activeRequests++;
    if (activeRequests === 1) {
      NProgress.start();
    }
  }

  try {
    const response = await originalFetch(...args);
    return response;
  } finally {
    if (!isSilent) {
      activeRequests--;
      if (activeRequests === 0) {
        NProgress.done();
      }
    }
  }
};

registerSW({
  onNeedRefresh() { },
  onOfflineReady() { },
})

createRoot(document.getElementById('root')!).render(
  <App />
);
