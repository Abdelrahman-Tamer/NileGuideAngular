import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs/operators';

import { ProfileService } from '../../../features/profile/profile.service';
import { AuthService } from '../../../features/auth/services/auth.service';

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

  isAuthenticated = false;
  isTourist = false;
  isAdmin = false;

  userFullName = '';
  userAvatarUrl: string | null = null;
  userInitials = '';
  isNavbarProfileReady = false;

  private readonly isBrowser: boolean;
  private profileLoaded = false;

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateAuthState();
        this.loadNavbarProfileIfNeeded();
        this.closeMobileMenu();
        this.closeProfileMenu();
        this.refreshView();
      });
  }

  ngOnInit(): void {
    this.updateAuthState();
    this.loadNavbarProfileIfNeeded();
    this.refreshView();
  }

  private updateAuthState(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    this.isTourist = this.authService.isTourist();
    this.isAdmin = this.authService.isAdmin();

    if (!this.isAuthenticated) {
      this.resetNavbarProfile();
      return;
    }

    if (this.isAdmin) {
      this.profileLoaded = true;
      this.userFullName = 'Admin';
      this.userInitials = 'AD';
      this.userAvatarUrl = null;
      this.isNavbarProfileReady = true;
      return;
    }

    if (this.isTourist && !this.profileLoaded) {
      this.isNavbarProfileReady = false;
    }
  }

  private loadNavbarProfileIfNeeded(): void {
    if (!this.isBrowser) return;
    if (!this.isAuthenticated) return;
    if (!this.isTourist) return;
    if (this.profileLoaded) return;

    this.profileLoaded = true;

    this.profileService.getProfile().subscribe({
      next: (res) => {
        this.userFullName = res.fullName || '';
        this.userInitials = this.getInitials(this.userFullName);

        const picture = res.profile_picture_url || res.profilePictureUrl || null;
        const resolvedPicture = this.profileService.resolveFileUrl(picture);

        this.userAvatarUrl = resolvedPicture || null;
        this.isNavbarProfileReady = true;
        this.refreshView();
      },
      error: (err) => {
        console.error('Navbar profile error:', err);

        this.userAvatarUrl = null;
        this.userInitials = '';
        this.isNavbarProfileReady = true;
        this.profileLoaded = false;

        this.refreshView();
      },
    });
  }

  private resetNavbarProfile(): void {
    this.userFullName = '';
    this.userAvatarUrl = null;
    this.userInitials = '';
    this.isNavbarProfileReady = false;
    this.profileLoaded = false;
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
    this.refreshView();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.refreshView();
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    this.refreshView();
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
  }

  logout(): void {
    this.authService.clearAuth();
    this.resetNavbarProfile();

    this.isAuthenticated = false;
    this.isTourist = false;
    this.isAdmin = false;

    this.closeProfileMenu();
    this.closeMobileMenu();

    this.router.navigateByUrl('/home');
    this.refreshView();
  }

  private refreshView(): void {
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInsideProfileMenu = target.closest('.profile-menu-wrapper');

    if (!clickedInsideProfileMenu) {
      this.isProfileMenuOpen = false;
      this.refreshView();
    }
  }
}