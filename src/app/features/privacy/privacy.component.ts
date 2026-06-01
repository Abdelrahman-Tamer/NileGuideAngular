import { Component } from '@angular/core';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.css',
})
export class PrivacyComponent {
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);

    if (!element) return;

    const navbarOffset = 110;
    const y = element.getBoundingClientRect().top + window.scrollY - navbarOffset;

    window.scrollTo({
      top: y,
      behavior: 'smooth',
    });
  }
}
