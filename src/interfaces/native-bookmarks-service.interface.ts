export default interface NativeBookmarksService {
  enableEventListeners: () => ng.IPromise<void>;
  disableEventListeners: () => ng.IPromise<void>;
}
