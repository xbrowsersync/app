import './app-alert.component.scss';
import angular from 'angular';
import { Component } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../res/strings/en.json';
import { Alert } from '../../shared/alert/alert.interface';
import AlertService from '../../shared/alert/alert.service';
import { PlatformService } from '../../shared/global-shared.interface';
import UtilityService from '../../shared/utility/utility.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'alertPanel',
  template: require('./app-alert.component.html')
})
export default class AppAlertComponent {
  $scope: ng.IScope;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  alert: Alert;
  showAlert = false;
  strings = Strings;

  static $inject = ['$scope', '$timeout', 'AlertService', 'PlatformService', 'UtilityService'];
  constructor(
    $scope: ng.IScope,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService
  ) {
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;

    $scope.$watch(
      () => AlertSvc.currentAlert,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          this.alert = newVal;
          this.showAlert = !angular.isUndefined(newVal ?? undefined);
        }
      }
    );

    $scope.$watch(
      () => PlatformSvc.showAlert,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          this.showAlert = newVal;
        }
      }
    );
  }

  close(): void {
    this.$timeout(() => {
      this.showAlert = false;
      this.alertSvc.clearCurrentAlert();
    });
  }
}
