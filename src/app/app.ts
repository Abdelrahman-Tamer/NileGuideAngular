import { isPlatformBrowser } from '@angular/common';
import { Component, DOCUMENT, PLATFORM_ID, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NgxSpinnerModule } from 'ngx-spinner';
import { FlowbiteService } from './core/services/flowbite/flowbite.services';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { FooterComponent } from './core/components/footer/footer.component';

interface WidjetThemeConfig {
  mode: 'dark';
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
  inputBackground: string;
  inputTextColor: string;
  bubbleColor: string;
  bubbleTextColor: string;
  launcherBackground: string;
  launcherIconColor: string;
  borderRadius: number;
}

interface WidjetConfig {
  widgetId?: string;
  product_name?: string;
  theme?: WidjetThemeConfig;
}

declare global {
  interface Window {
    __wj?: WidjetConfig;
  }
}

@Component({
  selector: 'app-root',
  imports: [NgxSpinnerModule, RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly flowbiteService = inject(FlowbiteService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  showNavbarFooter = true;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = e.urlAfterRedirects ?? e.url;
        this.showNavbarFooter = !url.startsWith('/auth');
      });
  }

  ngOnInit(): void {
    this.flowbiteService.loadFlowbite((flowbite) => {
      flowbite.initFlowbite();
    });

    if (isPlatformBrowser(this.platformId)) {
      this.loadWidjetChatbot();
    }
  }

  private loadWidjetChatbot(): void {
    const widjetScriptId = 'widjet-chatbot-loader';

    if (this.document.getElementById(widjetScriptId)) {
      return;
    }

    window.__wj = window.__wj || {};
    window.__wj.widgetId = '8b6c4f92-2b13-4360-a131-be015711d632';
    window.__wj.product_name = 'widjet';
    window.__wj.theme = {
      mode: 'dark',
      primaryColor: '#f4bf17',
      accentColor: '#f4bf17',
      backgroundColor: '#17140f',
      surfaceColor: '#211d17',
      borderColor: 'rgba(244, 191, 23, 0.14)',
      textColor: '#f5ecd8',
      mutedTextColor: 'rgba(245, 236, 216, 0.72)',
      inputBackground: '#1d1811',
      inputTextColor: '#f5ecd8',
      bubbleColor: '#2a241c',
      bubbleTextColor: '#f5ecd8',
      launcherBackground: '#f4bf17',
      launcherIconColor: '#15120d',
      borderRadius: 22,
    };

    const script = this.document.createElement('script');
    script.id = widjetScriptId;
    script.async = true;
    script.src = 'https://jqvcafbrccpmygiihyry.supabase.co/functions/v1/widget-loader';
    this.document.body.appendChild(script);
  }
}
