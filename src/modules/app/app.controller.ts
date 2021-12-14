export class AppController {
  showComponent = false;

  static $inject = ['$timeout'];
  constructor($timeout: ng.ITimeoutService) {
    $timeout(() => {
      this.showComponent = true;
    });
  }
}
