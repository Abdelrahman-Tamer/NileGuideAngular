import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('user_token')
      : null;

  if (!token) {
    return next(req);
  }

  const cleanToken = token.replace(/^"|"$/g, '');

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${cleanToken}`,
    },
  });

  return next(authReq);
};