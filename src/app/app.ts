import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { FlowbiteService } from './core/services/flowbite/flowbite.services';
import { NgxSpinnerModule } from "ngx-spinner";
import { NavbarComponent } from "./core/components/navbar/navbar.component";
import { FooterComponent } from "./core/components/footer/footer.component";
import { filter } from 'rxjs';
@Component({
  selector: 'app-root',
  imports: [NgxSpinnerModule, RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
 private readonly flowbiteService =inject(FlowbiteService); 

  ngOnInit(): void {
    this.flowbiteService.loadFlowbite((flowbite) => {
      flowbite.initFlowbite();
    });
  }

showNavbarFooter = true;

constructor(private router: Router) {
  this.router.events
    .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
    .subscribe((e) => {
      const url = e.urlAfterRedirects ?? e.url;
      this.showNavbarFooter = !url.startsWith('/auth');
    });
}
}
