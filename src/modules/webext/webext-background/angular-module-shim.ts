/**
 * Drop-in replacement for `import angular from 'angular'` in the background build.
 * Provides the same utility functions that shared services use (copy, isUndefined, etc.)
 * without pulling in the real AngularJS framework (which requires `window`/DOM).
 *
 * This module is wired in via webpack resolve.alias for the background entry point only.
 */

const angular: any = {
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

export default angular;
