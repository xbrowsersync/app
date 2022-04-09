import { Component, OnInit } from 'angular-ts-decorators';
import Globals from '../../shared/global-shared.constants';
import { UtilityService } from '../../shared/utility/utility.service';
import { RoutePath } from '../app.enum';

@Component({
  controllerAs: 'vm',
  selector: 'appBackground',
  styles: [require('./app-background.component.scss')],
  template: require('./app-background.component.html')
})
export class AppBackgroundComponent implements OnInit {
  $timeout: ng.ITimeoutService;
  utilitySvc: UtilityService;

  animateClouds = false;

  static $inject = ['$timeout', 'UtilityService'];
  constructor($timeout: ng.ITimeoutService, UtilitySvc: UtilityService) {
    this.$timeout = $timeout;
    this.utilitySvc = UtilitySvc;
  }

  pageHasBackground(): boolean {
    return !this.utilitySvc.checkCurrentRoute(RoutePath.Scan);
  }

  pageHasCloudBackground(): boolean {
    return (
      this.utilitySvc.checkCurrentRoute(RoutePath.Help) ||
      this.utilitySvc.checkCurrentRoute(RoutePath.Login) ||
      this.utilitySvc.checkCurrentRoute(RoutePath.Permissions) ||
      this.utilitySvc.checkCurrentRoute(RoutePath.Support) ||
      this.utilitySvc.checkCurrentRoute(RoutePath.SyncRemoved) ||
      this.utilitySvc.checkCurrentRoute(RoutePath.TelemetryCheck) ||
      this.utilitySvc.checkCurrentRoute(RoutePath.Updated)
    );
  }

  ngOnInit(): void {
    this.$timeout(() => {
      this.animateClouds = true;
    }, Globals.InterfaceReadyTimeout);
  }
}
