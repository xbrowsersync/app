export const $q: ng.IQService = (() => {
  const mock$q = (executor) => {
    return new Promise(executor);
  };
  mock$q.all = Promise.all;
  mock$q.apply = Promise.apply;
  mock$q.bind = Promise.bind;
  mock$q.call = Promise.call;
  mock$q.race = Promise.race;
  mock$q.reject = Promise.reject;
  mock$q.resolve = Promise.resolve;
  return mock$q as any;
})();
