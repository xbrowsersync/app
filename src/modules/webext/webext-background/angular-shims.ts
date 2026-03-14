/* eslint-disable no-console */

/**
 * Lightweight shims for AngularJS services used by shared code,
 * allowing them to run in a service worker context without the full AngularJS framework.
 */

import Globals from '../../shared/global-shared.constants';

// --- $q shim: wraps native Promise to satisfy ng.IQService interface ---

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

const $qFactory = (): ng.IQService => {
  const $q: any = <T>(
    resolver: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void
  ): Promise<T> => {
    return new Promise<T>(resolver);
  };

  $q.defer = <T>(): Deferred<T> => {
    let resolve: any;
    let reject: any;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  $q.resolve = <T>(value?: T | PromiseLike<T>): Promise<T> => Promise.resolve(value);
  $q.reject = (reason?: any): Promise<never> => Promise.reject(reason);
  $q.when = <T>(value?: T | PromiseLike<T>): Promise<T> => Promise.resolve(value);
  $q.all = (promises: any): Promise<any> => {
    if (Array.isArray(promises)) {
      return Promise.all(promises);
    }
    // Handle object of promises
    const keys = Object.keys(promises);
    return Promise.all(keys.map((k) => promises[k])).then((values) => {
      const result: any = {};
      keys.forEach((k, i) => {
        result[k] = values[i];
      });
      return result;
    });
  };

  return $q as ng.IQService;
};

// --- $timeout shim: wraps setTimeout ---

const $timeoutFactory = (): ng.ITimeoutService => {
  const $timeout: any = (fn: () => any, delay = 0): Promise<any> => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const promise: any = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        resolve(fn());
      }, delay);
    });
    promise.$$timeoutId = timeoutId;
    return promise;
  };

  $timeout.cancel = (promise: any): boolean => {
    if (promise && promise.$$timeoutId != null) {
      clearTimeout(promise.$$timeoutId);
      return true;
    }
    return false;
  };

  return $timeout as ng.ITimeoutService;
};

// --- $interval shim: wraps setInterval ---

const $intervalFactory = (): ng.IIntervalService => {
  const $interval: any = (fn: () => any, delay = 0, count = 0): Promise<any> => {
    let intervalId: ReturnType<typeof setInterval>;
    let iterations = 0;
    const promise: any = new Promise<void>((resolve) => {
      intervalId = setInterval(() => {
        fn();
        iterations += 1;
        if (count > 0 && iterations >= count) {
          clearInterval(intervalId);
          resolve();
        }
      }, delay);
    });
    promise.$$intervalId = intervalId;
    return promise;
  };

  $interval.cancel = (promise: any): boolean => {
    if (promise && promise.$$intervalId != null) {
      clearInterval(promise.$$intervalId);
      return true;
    }
    return false;
  };

  return $interval as ng.IIntervalService;
};

// --- $http shim: wraps fetch() API ---

const $httpFactory = (): ng.IHttpService => {
  const applyInterceptors = (config: ng.IRequestConfig): ng.IRequestConfig => {
    // Apply Accept-Version header (same as ApiRequestInterceptorFactory)
    if (config.url !== Globals.ReleaseLatestUrl) {
      config.headers = config.headers || {};
      config.headers['Accept-Version'] = Globals.MinApiVersion;
    }
    // Set default timeout
    config.timeout = config.timeout || 12000;
    return config;
  };

  const doRequest = <T>(reqConfig: ng.IRequestConfig): Promise<ng.IHttpResponse<T>> => {
    const config = applyInterceptors(reqConfig);

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout>;
    if (typeof config.timeout === 'number' && config.timeout > 0) {
      timeoutId = setTimeout(() => controller.abort(), config.timeout);
    }

    const fetchOptions: { method: string; headers: Record<string, string>; signal: AbortSignal; body?: string } = {
      method: config.method || 'GET',
      headers: (config.headers as Record<string, string>) || {},
      signal: controller.signal
    };

    if (config.data) {
      fetchOptions.body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
      if (!fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    }

    return fetch(config.url, fetchOptions)
      .then((response) => {
        if (timeoutId) clearTimeout(timeoutId);
        const xhrStatus = response.ok ? 'complete' : 'error';
        return response.text().then((text) => {
          let data: T;
          try {
            data = JSON.parse(text);
          } catch {
            data = text as any;
          }
          const httpResponse: ng.IHttpResponse<T> = {
            data,
            status: response.status,
            statusText: response.statusText,
            headers: ((name?: string) => {
              if (name) return response.headers.get(name);
              const headers: any = {};
              response.headers.forEach((v, k) => {
                headers[k] = v;
              });
              return headers;
            }) as any,
            config,
            xhrStatus
          };

          if (!response.ok) {
            return Promise.reject(httpResponse);
          }
          return httpResponse;
        });
      })
      .catch((err) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (err && err.status) {
          // Already an httpResponse-shaped error
          return Promise.reject(err);
        }
        // Network or abort error
        const xhrStatus = err?.name === 'AbortError' ? 'timeout' : 'error';
        const httpResponse: ng.IHttpResponse<T> = {
          data: null as any,
          status: 0,
          statusText: '',
          headers: (() => null) as any,
          config,
          xhrStatus
        };
        return Promise.reject(httpResponse);
      });
  };

  const $http: any = <T>(config: ng.IRequestConfig) => doRequest<T>(config);
  $http.get = <T>(url: string, config?: ng.IRequestConfig) => doRequest<T>({ ...config, method: 'GET', url });
  $http.post = <T>(url: string, data?: any, config?: ng.IRequestConfig) =>
    doRequest<T>({ ...config, method: 'POST', url, data });
  $http.put = <T>(url: string, data?: any, config?: ng.IRequestConfig) =>
    doRequest<T>({ ...config, method: 'PUT', url, data });
  $http.delete = <T>(url: string, config?: ng.IRequestConfig) => doRequest<T>({ ...config, method: 'DELETE', url });

  return $http as ng.IHttpService;
};

// --- $log shim: maps to console ---

const $logFactory = (): ng.ILogService => {
  return {
    debug: console.debug.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    log: console.log.bind(console),
    warn: console.warn.bind(console)
  } as ng.ILogService;
};

// --- $injector shim: simple Map-based service locator ---

const $injectorFactory = (): ng.auto.IInjectorService => {
  const services = new Map<string, any>();

  const injector: any = {
    get: (name: string): any => {
      const svc = services.get(name);
      if (!svc) {
        throw new Error(`Service '${name}' not registered in background injector`);
      }
      return svc;
    },
    has: (name: string): boolean => services.has(name),
    register: (name: string, instance: any): void => {
      services.set(name, instance);
    }
  };

  return injector;
};

// --- angular global shim ---

const setupAngularShim = (): void => {
  const angularShim: any = {
    isUndefined: (value: any): boolean => value === undefined,
    isString: (value: any): boolean => typeof value === 'string',
    isNumber: (value: any): boolean => typeof value === 'number',
    isObject: (value: any): boolean => value !== null && typeof value === 'object',
    isArray: Array.isArray,
    copy: <T>(source: T): T => {
      if (source === null || source === undefined) return source;
      return JSON.parse(JSON.stringify(source));
    },
    equals: (a: any, b: any): boolean => JSON.stringify(a) === JSON.stringify(b),
    noop: () => {},
    element: () => {
      throw new Error('angular.element() is not available in service worker context');
    },
    module: () => {
      throw new Error('angular.module() is not available in service worker context');
    },
    bootstrap: () => {
      throw new Error('angular.bootstrap() is not available in service worker context');
    }
  };

  // eslint-disable-next-line no-undef, no-restricted-globals
  (self as any).angular = angularShim;
};

// --- $rootScope shim: no-op for background context ---

const $rootScopeFactory = (): ng.IRootScopeService => {
  return {
    $broadcast: () => ({}),
    $on: () => () => {},
    $emit: () => ({}),
    $apply: (fn?: any) => {
      if (typeof fn === 'function') fn();
    },
    $digest: () => {},
    $watch: () => () => {}
  } as any;
};

// --- $location shim: stub for background context ---

const $locationFactory = (): ng.ILocationService => {
  return {
    path: () => '',
    url: () => '',
    absUrl: () => '',
    hash: () => '',
    search: () => ({})
  } as any;
};

// --- Export factory functions ---

export {
  $httpFactory,
  $injectorFactory,
  $intervalFactory,
  $locationFactory,
  $logFactory,
  $qFactory,
  $rootScopeFactory,
  $timeoutFactory,
  setupAngularShim
};
