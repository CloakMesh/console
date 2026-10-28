import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { APP_BASE_HREF } from '@angular/common';

import { AppModule } from './app/app.module';
import { installZhCn } from './app/i18n/i18n-runtime';
import { applyStoredTheme } from './app/theme/theme-bootstrap';

applyStoredTheme();
installZhCn();

platformBrowserDynamic([
  {
    provide: APP_BASE_HREF,
    useFactory: () => document.querySelector('base')?.getAttribute('href') ?? '/',
  },
]).bootstrapModule(AppModule)
  .catch(err => console.error(err));
