import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { FlowbiteService } from './core/services/flowbite/flowbite.services';
import { AuthService } from './features/auth/services/auth.service';

import { NgxSpinnerModule } from 'ngx-spinner';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { FooterComponent } from './core/components/footer/footer.component';
import { ChatbotComponent } from './core/components/chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  imports: [
    NgxSpinnerModule,
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    ChatbotComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly flowbiteService = inject(FlowbiteService);
  private readonly authService = inject(AuthService);

  showNavbar = true;
  showFooter = true;
  showChatbot = false;

  constructor(private router: Router) {
    this.updateLayoutState(this.router.url);

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = e.urlAfterRedirects ?? e.url;
        this.updateLayoutState(url);
      });
  }

  ngOnInit(): void {
    this.flowbiteService.loadFlowbite((flowbite) => {
      flowbite.initFlowbite();
    });
  }

  private updateLayoutState(url: string): void {
    const isAuthPage = url.startsWith('/auth');
    const isDetailsPage = url.startsWith('/activities/');
    const isDashboardPage = url.startsWith('/dashboard');
    const isAdmin = this.authService.isAdmin();

    this.showNavbar = !isAuthPage && !isDetailsPage;

    this.showFooter =
      !isAuthPage &&
      !isDetailsPage &&
      !isDashboardPage &&
      !isAdmin;

    this.showChatbot =
      this.authService.isAuthenticated() &&
      this.authService.isTourist() &&
      !isDashboardPage &&
      !isAuthPage;
  }
}