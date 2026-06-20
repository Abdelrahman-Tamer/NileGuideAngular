import { HttpInterceptorFn } from '@angular/common/http';
import { STORED_KEYS } from '../constants/Stored_keys';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORED_KEYS.USER_TOKEN)
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