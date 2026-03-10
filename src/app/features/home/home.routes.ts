import { Routes } from "@angular/router";

export const Home_ROUTES : Routes = [

    {
        path:'',
        loadComponent: () =>
       import('./pages/home-page/home-page.component').then(m => m.HomePageComponent),
    },
]