import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/print.css';
import { bootstrap } from './state/bootstrap.js';
import { initRouter } from './lib/router.js';
import { mountSettings } from './features/settings/dialog.js';

console.log('main.js loaded');

(async () => {
  try {
    await bootstrap();
    initRouter();
    mountSettings();
    console.log('Bootstrap complete');
  } catch (e) {
    console.error('Initial load failed', e);
  }
})();


