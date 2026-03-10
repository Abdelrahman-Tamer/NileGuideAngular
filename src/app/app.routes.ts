import { Routes } from '@angular/router';
import { GustLayoutComponent } from './core/layouts/gust-layout/gust-layout.component';
import { UserLayoutComponent } from './core/layouts/user-layout/user-layout.component';
import { Auth_ROUTES } from './features/auth/auth.routes';
import { Home_ROUTES } from './features/home/home.routes';
import { ActivitiesComponent } from './features/activities/activities.component';
import { ScheduleComponent } from './features/schedule/schedule.component';
import { MapComponent } from './features/map/map.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // User layout
  {
    path: '',
    component: UserLayoutComponent,
    children: [
      { path: 'home', children: Home_ROUTES },
      { path: 'activities', component: ActivitiesComponent },
     { path: 'schedule', component: ScheduleComponent },
     { path: 'map', component: MapComponent },
    ],
  },

  // Auth layout
  {
    path: 'auth',
    component: GustLayoutComponent,
    children: Auth_ROUTES,
  },

 
];
