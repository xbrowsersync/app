import './app-permissions.component.scss';
import { Component, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../res/strings/en.json';
import { PlatformService } from '../../shared/global-shared.interface';
import { StoreKey } from '../../shared/store/store.enum';
import StoreService from '../../shared/store/store.service';
import UtilityService from '../../shared/utility/utility.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'permissionsPanel',
  template: require('./app-permissions.component.html')
})
export default class AppPermissionsComponent {
  $q: ng.IQService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  strings = Strings;

  @Output() close: () => any;
  @Output() request: () => any;

  static $inject = ['$q', 'PlatformService', 'StoreService', 'UtilityService'];
  constructor($q: ng.IQService, PlatformSvc: PlatformService, StoreSvc: StoreService, UtilitySvc: UtilityService) {
    this.$q = $q;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  requestPermissions(): ng.IPromise<void> {
    return this.$q
      .all([this.request()(), this.storeSvc.set(StoreKey.DisplayPermissions, false)])
      .then(() => {})
      .finally(this.close());
  }
}
