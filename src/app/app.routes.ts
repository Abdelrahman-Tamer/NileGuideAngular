import { Routes } from '@angular/router';
import { DASHBOARD_ROUTES } from './features/admin/dashboard.routes';
import { Auth_ROUTES } from './features/auth/auth.routes';
import { Home_ROUTES } from './features/home/home.routes';

import { GustLayoutComponent } from './core/layouts/gust-layout/gust-layout.component';
import { UserLayoutComponent } from './core/layouts/user-layout/user-layout.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  {
    path: '',
    component: UserLayoutComponent,
    children: [
      {
        path: 'home',
        children: Home_ROUTES,
      },
      {
        path: 'activities',
        loadComponent: () =>
          import('./features/activities/activities.component').then(
            (m) => m.ActivitiesComponent
          ),
      },
      {
        path: 'activities/:id',
        loadComponent: () =>
          import('./features/details/details.component').then(
            (m) => m.DetailsComponent
          ),
      },
      {
        path: 'schedule',
        loadComponent: () =>
          import('./features/schedule/schedule.component').then(
            (m) => m.ScheduleComponent
          ),
      },
      {
        path: 'map',
        loadComponent: () =>
          import('./features/map/map.component').then(
            (m) => m.MapComponent
          ),
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./features/wishlist/wishlist.component').then(
            (m) => m.WishlistComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
      },
      {
        path: 'terms',
        loadComponent: () =>
          import('./features/terms-of-service/terms-of-service.component').then(
            (m) => m.TermsOfServiceComponent
          ),
      },
      {
        path: 'help',
        loadComponent: () =>
          import('./features/help-center/help-center.component').then(
            (m) => m.HelpCenterComponent
          ),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/contact/contact.component').then(
            (m) => m.ContactComponent
          ),
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./features/privacy/privacy.component').then(
            (m) => m.PrivacyComponent
          ),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
        children: DASHBOARD_ROUTES,
      },
    ],
  },

  {
    path: 'auth',
    component: GustLayoutComponent,
    children: Auth_ROUTES,
  },
];