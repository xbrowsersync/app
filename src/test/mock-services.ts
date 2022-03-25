export const $injector: ng.auto.IInjectorService = (() => {
  return {
    annotate: () => {},
    get: () => {},
    has: () => {},
    instantiate: () => {},
    invoke: () => {},
    loadNewModules: () => {},
    modules: {},
    strictDi: false
  } as any;
})();

export const $log: ng.ILogService = (() => {
  return {
    debug: () => {},
    error: () => {},
    info: () => {},
    log: () => {},
    warn: () => {}
  };
})();

export const $q: ng.IQService = (() => {
  // eslint-disable-next-line func-style
  function mock$q(executor) {
    return new Promise(executor);
  }
  mock$q.all = Promise.all;
  mock$q.apply = Promise.apply;
  mock$q.bind = Promise.bind;
  mock$q.call = Promise.call;
  mock$q.race = Promise.race;
  mock$q.reject = Promise.reject;
  mock$q.resolve = Promise.resolve;
  return mock$q as any;
})();
