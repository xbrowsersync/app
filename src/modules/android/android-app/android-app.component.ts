import './android-app.component.scss';
import { Component, OnInit } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import AppMainComponent from '../../app/app-main/app-main.component';
import { AppView } from '../../app/app.enum';
import { StoreKey } from '../../shared/store/store.enum';
import AndroidPlatformService from '../android-platform.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  template: require('../../app/app-main/app-main.component.html')
})
export default class AndroidAppComponent extends AppMainComponent implements OnInit {
  platformSvc: AndroidPlatformService;

  initialised = false;

  displayDefaultSearchState() {
    // Set clear search button to display all bookmarks
    return super.displayDefaultSearchState().then(this.searchBookmarks);
  }

  init() {
    // Enable select file to restore
    this.vm.settings.fileRestoreEnabled = true;

    // Increase search results timeout to avoid display lag
    this.vm.settings.getSearchResultsDelay = 500;

    // Display existing sync panel by default
    this.vm.login.displayNewSyncPanel = false;

    // Load i18n strings
    return this.platformSvc
      .initI18n()
      .then(() => {
        // Bind to cordova device events
        return this.$q<void>((resolve, reject) => {
          document.addEventListener(
            'deviceready',
            () => {
              this.platformSvc.handleDeviceReady(this.vm, resolve, reject);
            },
            false
          );
          document.addEventListener('resume', this.platformSvc.handleResume, false);
        });
      })
      .then(() => {
        // Set component to display and continue initialisation
        this.initialised = true;
        return super.init();
      });
  }

  ngOnInit(): void {
    this.init();
  }

  scanCompleted(scannedSyncInfo: any): ng.IPromise<void> {
    // Update stored sync id and service values
    this.sync.id = scannedSyncInfo.id;
    return this.$q
      .all([this.storeSvc.set(StoreKey.SyncId, scannedSyncInfo.id), this.updateServiceUrl(scannedSyncInfo.url)])
      .then(this.displayMainView)
      .then(() => {
        // Focus on password field
        this.$timeout(() => {
          (document.querySelector('.active-login-form  input[name="txtPassword"]') as HTMLInputElement).focus();
        });
      });
  }

  syncForm_ScanCode_Click() {
    this.changeView(AppView.Scan);
  }

  workingCancelAction(): ng.IPromise<void> {
    // TODO: implement
    return this.$q.resolve();
  }
}
