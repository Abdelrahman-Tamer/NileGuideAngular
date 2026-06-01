import { DASHBOARD_ROUTES } from './features/admin/dashboard.routes';
import { Routes } from '@angular/router';
import { GustLayoutComponent } from './core/layouts/gust-layout/gust-layout.component';
import { UserLayoutComponent } from './core/layouts/user-layout/user-layout.component';
import { Auth_ROUTES } from './features/auth/auth.routes';
import { Home_ROUTES } from './features/home/home.routes';
import { ActivitiesComponent } from './features/activities/activities.component';
import { ScheduleComponent } from './features/schedule/schedule.component';
import { MapComponent } from './features/map/map.component';
import { DetailsComponent } from './features/details/details.component';
import { WishlistComponent } from './features/wishlist/wishlist.component';
import { ProfileComponent } from './features/profile/profile.component';
import { TermsOfServiceComponent } from './features/terms-of-service/terms-of-service.component';
import { HelpCenterComponent } from './features/help-center/help-center.component';
import { ContactComponent } from './features/contact/contact.component';
import { PrivacyComponent } from './features/privacy/privacy.component';
import { DashboardComponent } from './features/admin/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  {
    path: '',
    component: UserLayoutComponent,
    children: [
      { path: 'home', children: Home_ROUTES },
      { path: 'activities', component: ActivitiesComponent },
      { path: 'activities/:id', component: DetailsComponent },
      { path: 'schedule', component: ScheduleComponent },
      { path: 'map', component: MapComponent },
      { path: 'wishlist', component: WishlistComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'terms', component: TermsOfServiceComponent },
      { path: 'help', component: HelpCenterComponent },
      { path: 'contact', component: ContactComponent },
      { path: 'privacy', component: PrivacyComponent },
      {
        path: 'dashboard',
        component: DashboardComponent,
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