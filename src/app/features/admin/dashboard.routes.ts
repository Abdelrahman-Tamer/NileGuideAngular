import { ReportComponent } from './components/report/report.component';
import { Routes } from '@angular/router';
import { UsersComponent } from './components/users/users.component';
import { ActivityComponent } from './components/activity/activity.component';

export const DASHBOARD_ROUTES: Routes = [
            {path:'' , redirectTo:'activities-management' , pathMatch:'full'},

        {path:'users-management' , component: UsersComponent},
        {path:'activities-management' , component: ActivityComponent}, 
        {path:'reports' , component: ReportComponent}


];