import { Component } from '@angular/core';

@Component({
  selector: 'app-terms-of-service',
  templateUrl: './terms-of-service.component.html',
  styleUrl: './terms-of-service.component.css',
})
export class TermsOfServiceComponent {
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);

    if (!element) return;

    const navbarOffset = 120;
    const y = element.getBoundingClientRect().top + window.scrollY - navbarOffset;

    window.scrollTo({
      top: y,
      behavior: 'smooth',
    });
  }
}