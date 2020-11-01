import { Component } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import AlertService from '../../shared/alert/alert.service';
import WebExtBackgroundService from './webext-background.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'webextBackground',
  template: require('./webext-background.component.html')
})
export default class WebExtBackgroundComponent {
  backgroundSvc: WebExtBackgroundService;

  startupInitiated = false;

  static $inject = ['$scope', 'AlertService', 'WebExtBackgroundService'];
  constructor($scope: ng.IScope, AlertSvc: AlertService, BackgroundSvc: WebExtBackgroundService) {
    this.backgroundSvc = BackgroundSvc;

    $scope.$watch(
      () => AlertSvc.currentAlert,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          this.backgroundSvc.displayAlert(newVal);
        }
      }
    );
  }

  install(event) {
    if (this.startupInitiated) {
      return;
    }

    this.startupInitiated = true;
    this.backgroundSvc.onInstall(event);
  }

  startup() {
    if (this.startupInitiated) {
      return;
    }

    this.backgroundSvc.init();
  }
}
