import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import Globals from '../../shared/global-shared.constants';
import { RoutePath } from '../app.enum';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appBackground',
  styles: [require('./app-background.component.scss')],
  template: require('./app-background.component.html')
})
export class AppBackgroundComponent implements OnInit {
  $location: ng.ILocationService;
  $timeout: ng.ITimeoutService;

  animateClouds = false;

  static $inject = ['$location', '$timeout'];
  constructor($location: ng.ILocationService, $timeout: ng.ITimeoutService) {
    this.$location = $location;
    this.$timeout = $timeout;
  }

  pageHasBackground(): boolean {
    return this.$location.path() !== RoutePath.Scan;
  }

  pageHasCloudBackground(): boolean {
    return (
      this.$location.path() === RoutePath.Login ||
      this.$location.path() === RoutePath.Support ||
      this.$location.path() === RoutePath.Permissions ||
      this.$location.path() === RoutePath.SyncRemoved ||
      this.$location.path() === RoutePath.Updated ||
      this.$location.path().indexOf(RoutePath.Help) === 0
    );
  }

  ngOnInit(): void {
    this.$timeout(() => {
      this.animateClouds = true;
    }, Globals.InterfaceReadyTimeout);
  }
}
