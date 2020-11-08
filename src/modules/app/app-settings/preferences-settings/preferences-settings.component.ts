import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { PlatformService } from '../../../shared/global-shared.interface';
import { AllSettings } from '../../../shared/settings/settings.interface';
import SettingsService from '../../../shared/settings/settings.service';
import { SyncType } from '../../../shared/sync/sync.enum';
import UtilityService from '../../../shared/utility/utility.service';
import WorkingService from '../../../shared/working/working.service';
import AppHelperService from '../../shared/app-helper/app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'preferencesSettings',
  styles: [require('./preferences-settings.component.scss')],
  template: require('./preferences-settings.component.html')
})
export default class PreferencesSettingsComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  $timeout: ng.ITimeoutService;
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  settingsSvc: SettingsService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  displaySyncBookmarksToolbarConfirmation = false;
  settings: AllSettings;

  static $inject = [
    '$timeout',
    'AppHelperService',
    'PlatformService',
    'SettingsService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $timeout: ng.ITimeoutService,
    AppHelperSvc: AppHelperService,
    PlatformSvc: PlatformService,
    SettingsSvc: SettingsService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$timeout = $timeout;
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.settingsSvc = SettingsSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;
  }

  cancelSyncBookmarksToolbar(): void {
    this.displaySyncBookmarksToolbarConfirmation = false;
    this.settings.syncBookmarksToolbar = false;
  }

  confirmSyncBookmarksToolbar(): void {
    this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
      if (!syncEnabled) {
        return;
      }

      // Hide sync confirmation and display loading overlay
      this.displaySyncBookmarksToolbarConfirmation = false;
      this.workingSvc.show();

      // Enable setting and refresh local sync data
      return this.settingsSvc
        .syncBookmarksToolbar(true)
        .then(() => this.platformSvc.queueSync({ type: SyncType.Local }));
    });
  }

  ngOnInit(): void {
    // Initialise view model values
    this.settingsSvc.all().then((allSettings) => {
      this.settings = allSettings;
    });
  }

  toggleAlternateSearchBarPosition(): void {
    this.settings.alternateSearchBarPosition = !this.settings.alternateSearchBarPosition;
    this.settingsSvc.alternateSearchBarPosition(this.settings.alternateSearchBarPosition);
  }

  toggleAutoFetchMetadata(): void {
    this.settings.autoFetchMetadata = !this.settings.autoFetchMetadata;
    this.settingsSvc.autoFetchMetadata(this.settings.autoFetchMetadata);
  }

  toggleCheckForAppUpdates(): void {
    this.settings.checkForAppUpdates = !this.settings.checkForAppUpdates;
    this.settingsSvc.checkForAppUpdates(this.settings.checkForAppUpdates);
  }

  toggleDefaultToFolderView(): void {
    this.settings.defaultToFolderView = !this.settings.defaultToFolderView;
    this.settingsSvc.defaultToFolderView(this.settings.defaultToFolderView);
  }

  toggleEnableDarkMode(): void {
    this.settings.darkModeEnabled = !this.settings.darkModeEnabled;
    this.settingsSvc.darkModeEnabled(this.settings.darkModeEnabled);
  }

  toggleSyncBookmarksToolbar(): void {
    this.settingsSvc.syncBookmarksToolbar().then((syncBookmarksToolbar) => {
      this.settings.syncBookmarksToolbar = !this.settings.syncBookmarksToolbar;

      // If confirmation message is currently displayed, hide it and return
      if (this.displaySyncBookmarksToolbarConfirmation) {
        this.displaySyncBookmarksToolbarConfirmation = false;
        return;
      }

      return this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
        // If sync not enabled or user just clicked to disable toolbar sync, update stored value and return
        if (!syncEnabled || syncBookmarksToolbar) {
          return this.settingsSvc.syncBookmarksToolbar(this.settings.syncBookmarksToolbar);
        }

        // Otherwise, display sync confirmation
        this.displaySyncBookmarksToolbarConfirmation = true;
        this.appHelperSvc.focusOnElement('.btn-confirm-sync-toolbar');
      });
    });
  }
}
