import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {  OnDestroy, OnInit } from '@angular/core';
import {NavigationStart, NavigationEnd, Router,} from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {

   private routerSub?: Subscription;
  private savedScrollY = 0;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationStart || event instanceof NavigationEnd
        )
      )
      .subscribe((event) => {
        const currentUrl = this.router.url;

        const isInsideDashboard =
          currentUrl.startsWith('/dashboard') ||
          (event instanceof NavigationStart &&
            event.url.startsWith('/dashboard'));

        if (!isInsideDashboard) return;

        if (event instanceof NavigationStart) {
          this.savedScrollY = window.scrollY;
        }

        if (event instanceof NavigationEnd) {
          setTimeout(() => {
            window.scrollTo(0, this.savedScrollY);
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
}
