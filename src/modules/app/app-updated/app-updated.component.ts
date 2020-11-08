import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import Globals from '../../shared/global-shared.constants';
import { PlatformService } from '../../shared/global-shared.interface';
import { StoreKey } from '../../shared/store/store.enum';
import StoreService from '../../shared/store/store.service';
import UtilityService from '../../shared/utility/utility.service';
import { AppViewType } from '../app.enum';
import AppHelperService from '../shared/app-helper/app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appUpdated',
  styles: [require('./app-updated.component.scss')],
  template: require('./app-updated.component.html')
})
export default class AppUpdatedComponent implements OnInit {
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

  close(): void {
    this.storeSvc.set(StoreKey.DisplayUpdated, false);
    this.appHelperSvc.switchView({ view: AppViewType.Support });
  }

  displayReleaseNotes(): void {
    this.appHelperSvc.openUrl(null, this.releaseNotesUrl);
  }

  ngOnInit(): void {
    // Initialise view model values
    this.platformSvc.getAppVersion().then((appVersion) => {
      this.appVersion = appVersion;
      const versionTag = appVersion.replace(/([a-z]+)\d+$/i, '$1');
      this.releaseNotesUrl = Globals.ReleaseNotesUrlStem + versionTag;
    });

    // Set initial focus
    this.appHelperSvc.focusOnElement('.focused');

    // Set links to open in new tabs
    this.appHelperSvc.attachClickEventsToNewTabLinks();
  }
}
