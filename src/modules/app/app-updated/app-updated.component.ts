import { Component, OnInit } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import Globals from '../../shared/global-shared.constants';
import { PlatformService } from '../../shared/global-shared.interface';
import { StoreKey } from '../../shared/store/store.enum';
import { StoreService } from '../../shared/store/store.service';
import { UtilityService } from '../../shared/utility/utility.service';
import { RoutePath } from '../app.enum';
import { AppHelperService } from '../shared/app-helper/app-helper.service';

@Component({
  controllerAs: 'vm',
  selector: 'appUpdated',
  styles: [require('./app-updated.component.scss')],
  template: require('./app-updated.component.html')
})
export class AppUpdatedComponent implements OnInit {
  Strings = require('../../../../res/strings/en.json');

  $timeout: ng.ITimeoutService;
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  appVersion: string;
  releaseNotesUrl: string;

  static $inject = ['$timeout', 'AppHelperService', 'PlatformService', 'StoreService', 'UtilityService'];
  constructor(
    $timeout: ng.ITimeoutService,
    AppHelperSvc: AppHelperService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$timeout = $timeout;
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  @boundMethod
  close(event?: Event): void {
    event?.preventDefault();
    this.storeSvc.set(StoreKey.DisplayUpdated, false);
    this.appHelperSvc.switchView(RoutePath.Support);
  }

  @boundMethod
  displayReleaseNotes(): void {
    this.appHelperSvc.openUrl(null, this.releaseNotesUrl);
  }

  ngOnInit(): void {
    // Initialise view model values
    this.platformSvc.getAppVersionName().then((appVersion) => {
      this.appVersion = appVersion;
      this.releaseNotesUrl = `${Globals.ReleaseNotesUrlStem}${appVersion}`;
    });

    // Set initial focus
    this.appHelperSvc.focusOnElement('.focused');

    // Set links to open in new tabs
    this.appHelperSvc.attachClickEventsToNewTabLinks();
  }
}
