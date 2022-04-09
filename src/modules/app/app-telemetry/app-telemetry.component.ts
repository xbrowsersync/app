import { Component, OnInit } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { PlatformService } from '../../shared/global-shared.interface';
import { SettingsService } from '../../shared/settings/settings.service';
import { StoreKey } from '../../shared/store/store.enum';
import { StoreService } from '../../shared/store/store.service';
import { UtilityService } from '../../shared/utility/utility.service';
import { AppHelperService } from '../shared/app-helper/app-helper.service';

@Component({
  controllerAs: 'vm',
  selector: 'appTelemetry',
  styles: [require('./app-telemetry.component.scss')],
  template: require('./app-telemetry.component.html')
})
export class AppTelemetryComponent implements OnInit {
  Strings = require('../../../../res/strings/en.json');

  $q: ng.IQService;
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  settingsSvc: SettingsService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  releaseNotesUrl: string;

  static $inject = ['$q', 'AppHelperService', 'PlatformService', 'SettingsService', 'StoreService', 'UtilityService'];
  constructor(
    $q: ng.IQService,
    AppHelperSvc: AppHelperService,
    PlatformSvc: PlatformService,
    SettingsSvc: SettingsService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.settingsSvc = SettingsSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  @boundMethod
  confirm(): void {
    this.$q
      .all([this.settingsSvc.telemetryEnabled(true), this.storeSvc.set(StoreKey.DisplayTelemetryCheck, false)])
      .then(() => this.appHelperSvc.switchView());
  }

  @boundMethod
  deny(): void {
    this.$q
      .all([this.settingsSvc.telemetryEnabled(false), this.storeSvc.set(StoreKey.DisplayTelemetryCheck, false)])
      .then(() => this.appHelperSvc.switchView());
  }

  @boundMethod
  displayReleaseNotes(): void {
    this.appHelperSvc.openUrl(null, this.releaseNotesUrl);
  }

  ngOnInit(): void {
    // Set initial focus
    this.appHelperSvc.focusOnElement('.focused');

    // Set links to open in new tabs
    this.appHelperSvc.attachClickEventsToNewTabLinks();
  }
}
