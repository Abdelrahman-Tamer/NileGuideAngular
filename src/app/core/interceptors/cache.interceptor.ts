import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';

type CacheEntry = {
  response: HttpResponse<unknown>;
  expiry: number;
};

const cache = new Map<string, CacheEntry>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url.toLowerCase();

  if (isMutationRequest(req.method) && shouldClearActivitiesCache(url)) {
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          clearActivitiesCache();
        }
      })
    );
  }

  if (req.method !== 'GET') {
    return next(req);
  }

  if (!isCacheableGetRequest(url)) {
    return next(req);
  }

  const cacheKey = req.urlWithParams;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    return of(cached.response.clone());
  }

  if (cached) {
    cache.delete(cacheKey);
  }

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.set(cacheKey, {
          response: event.clone(),
          expiry: Date.now() + CACHE_DURATION,
        });
      }
    })
  );
};

function isCacheableGetRequest(url: string): boolean {
  if (url.includes('/wishlist')) return false;
  if (url.includes('/schedule')) return false;
  if (url.includes('/users/me/profile')) return false;
  if (url.includes('/auth')) return false;
  if (url.includes('/admin')) return false;
  if (url.includes('/reviews')) return false;

  return (
    url.includes('/activities') ||
    url.includes('/categories') ||
    url.includes('/cities')
  );
}

function isMutationRequest(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

function shouldClearActivitiesCache(url: string): boolean {
  return (
    url.includes('/activities') ||
    url.includes('/admin/activities') ||
    url.includes('/categories') ||
    url.includes('/cities')
  );
}

function clearActivitiesCache(): void {
  Array.from(cache.keys()).forEach((key) => {
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey.includes('/activities') ||
      normalizedKey.includes('/categories') ||
      normalizedKey.includes('/cities')
    ) {
      cache.delete(key);
    }
  });
}