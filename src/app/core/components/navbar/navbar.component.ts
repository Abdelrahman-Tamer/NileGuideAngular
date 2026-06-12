import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  Inject,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ProfileService } from '../../../features/profile/profile.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
  isMobileMenuOpen = false;
  isProfileMenuOpen = false;
  isLogin = true;

  userFullName = '';
  userAvatarUrl: string | null = null;
userInitials = '';
isNavbarProfileReady = false;
  private readonly isBrowser: boolean;
  private profileLoaded = false;

 constructor(
  private router: Router,
  private profileService: ProfileService,
  private cdr: ChangeDetectorRef,
  @Inject(PLATFORM_ID) private platformId: Object
) {
  this.isBrowser = isPlatformBrowser(this.platformId);

  this.updateIsLogin(this.router.url);

  this.router.events
    .pipe(filter((event) => event instanceof NavigationEnd))
    .subscribe((event: NavigationEnd) => {
      this.updateIsLogin(event.urlAfterRedirects);
      this.loadNavbarProfileIfNeeded(event.urlAfterRedirects);
    });
}

  ngOnInit(): void {
    this.loadNavbarProfileIfNeeded(this.router.url);
  }

  private updateIsLogin(url: string): void {
    if (url.includes('/home') || url === '/') {
      this.isLogin = false;
    } else {
      this.isLogin = true;
    }
  }

  private loadNavbarProfileIfNeeded(url: string): void {
    if (!this.isBrowser || !this.isLogin || this.profileLoaded) {
      return;
    }

    if (url.includes('/auth/login') || url.includes('/auth/register')) {
      return;
    }

    this.profileLoaded = true;

    this.profileService.getProfile().subscribe({
  next: (res) => {
  this.userFullName = res.fullName || '';
  this.userInitials = this.getInitials(this.userFullName);

  const picture =
    res.profile_picture_url ||
    res.profilePictureUrl ||
    null;

  const resolvedPicture = this.profileService.resolveFileUrl(picture);
  this.userAvatarUrl = resolvedPicture || null;

  this.isNavbarProfileReady = true;
  this.cdr.detectChanges();
},
  error: (err) => {
  console.error('Navbar profile error:', err);

  this.userAvatarUrl = null;
  this.userInitials = '';
  this.isNavbarProfileReady = true;
  this.profileLoaded = false;

  this.cdr.detectChanges();
},
});
  }

 private getInitials(fullName: string): string {
  const name = fullName.trim();

  if (!name) {
    return '';
  }

  const parts = name.split(/\s+/);

  if (parts.length >= 2) {
    return (
      this.getFirstChar(parts[0]) +
      this.getFirstChar(parts[parts.length - 1])
    ).toUpperCase();
  }

  const chars = Array.from(parts[0]);

  if (chars.length === 1) {
    return chars[0].toUpperCase();
  }

  return (chars[0] + chars[chars.length - 1]).toUpperCase();
}

  private getFirstChar(value: string): string {
    return Array.from(value.trim())[0] || '';
  }

  onAvatarError(): void {
  this.userAvatarUrl = null;
  this.cdr.detectChanges();
}
  
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
  }

  logout(): void {
    this.closeProfileMenu();
    console.log('logout');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInsideProfileMenu = target.closest('.profile-menu-wrapper');

    if (!clickedInsideProfileMenu) {
      this.isProfileMenuOpen = false;
    }
  }
}