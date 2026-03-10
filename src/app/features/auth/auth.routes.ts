import { Routes } from "@angular/router";
import { LoginPageComponent } from "./pages/login-page/login-page.component";
import { RegisterPageComponent } from "./pages/register-page/register-page.component";
import { ForgetPassPageComponent } from "./pages/forget-pass-page/forget-pass-page.component";
import { ResetPasswordComponent } from "./pages/reset-password/reset-password.component";

export const Auth_ROUTES : Routes = [

    {
        path: 'login',
        component:LoginPageComponent
    },
    {
        path: 'register',
        component:RegisterPageComponent
    },
    {
        path: 'forgot-password',
        component:ForgetPassPageComponent
    },
    {
        path: 'reset-password',
        component:ResetPasswordComponent
    },

]