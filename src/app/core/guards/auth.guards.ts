import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { AuthService } from '../../features/auth/services/auth.service';

function showWarning(message: string): void {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return;
  }

  const toastr = inject(ToastrService);
  toastr.warning(message);
}

function showError(message: string): void {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return;
  }

  const toastr = inject(ToastrService);
  toastr.error(message);
}

export const touristGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    showWarning('You are not authenticated. Please login first.');

    router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });

    return false;
  }

  if (!auth.isTourist()) {
    showError('This page is available for tourists only.');

    if (auth.isAdmin()) {
      router.navigateByUrl('/dashboard');
    } else {
      router.navigateByUrl('/home');
    }

    return false;
  }

  return true;
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    showWarning('You are not authenticated. Please login first.');

    router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });

    return false;
  }

  if (!auth.isAdmin()) {
    showError('You are not allowed to access dashboard.');
    router.navigateByUrl('/home');
    return false;
  }

  return true;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  if (auth.isAdmin()) {
    router.navigateByUrl('/dashboard');
    return false;
  }

  router.navigateByUrl('/home');
  return false;
};