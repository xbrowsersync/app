import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import LogService from '../log/log.service';
import { StoreKey } from '../store/store.enum';
import StoreService from '../store/store.service';
import { AllSettings } from './settings.interface';

@autobind
@Injectable('SettingsService')
export default class SettingsService {
  logSvc: LogService;
  storeSvc: StoreService;

  darkMode: boolean;

  static $inject = ['LogService', 'StoreService'];
  constructor(LogSvc: LogService, StoreSvc: StoreService) {
    this.logSvc = LogSvc;
    this.storeSvc = StoreSvc;
  }

  all(): ng.IPromise<AllSettings> {
    return this.storeSvc
      .get([
        StoreKey.AlternateSearchBarPosition,
        StoreKey.AutoFetchMetadata,
        StoreKey.CheckForAppUpdates,
        StoreKey.DarkModeEnabled,
        StoreKey.DefaultToFolderView,
        StoreKey.SyncBookmarksToolbar
      ])
      .then((values) => {
        return {
          ...values
        };
      });
  }

  alternateSearchBarPosition(newValue?: boolean): ng.IPromise<boolean> {
    if (angular.isUndefined(newValue ?? undefined)) {
      return this.storeSvc.get<boolean>(StoreKey.AlternateSearchBarPosition);
    }

    return this.storeSvc.set(StoreKey.AlternateSearchBarPosition, newValue).then(() => {
      this.logSvc.logInfo(`Search bar position setting: ${newValue ? 'enabled' : 'disabled'}`);
      return newValue;
    });
  }

  autoFetchMetadata(newValue?: boolean): ng.IPromise<boolean> {
    if (angular.isUndefined(newValue ?? undefined)) {
      return this.storeSvc.get<boolean>(StoreKey.AutoFetchMetadata);
    }

    return this.storeSvc.set(StoreKey.AutoFetchMetadata, newValue).then(() => {
      this.logSvc.logInfo(`Auto-fetch metadata setting: ${newValue ? 'enabled' : 'disabled'}`);
      return newValue;
    });
  }

  checkForAppUpdates(newValue?: boolean): ng.IPromise<boolean> {
    if (angular.isUndefined(newValue ?? undefined)) {
      return this.storeSvc.get<boolean>(StoreKey.CheckForAppUpdates);
    }

    return this.storeSvc.set(StoreKey.CheckForAppUpdates, newValue).then(() => {
      this.logSvc.logInfo(`Check for app updates setting: ${newValue ? 'enabled' : 'disabled'}`);
      return newValue;
    });
  }

  darkModeEnabled(newValue?: boolean): ng.IPromise<boolean> {
    if (angular.isUndefined(newValue ?? undefined)) {
      return this.storeSvc.get<boolean>(StoreKey.DarkModeEnabled).then((darkModeEnabled) => {
        this.darkMode = darkModeEnabled;
        return darkModeEnabled;
      });
    }

    return this.storeSvc.set(StoreKey.DarkModeEnabled, newValue).then(() => {
      this.logSvc.logInfo(`Dark mode setting: ${newValue ? 'enabled' : 'disabled'}`);
      this.darkMode = newValue;
      return newValue;
    });
  }

  defaultToFolderView(newValue?: boolean): ng.IPromise<boolean> {
    if (angular.isUndefined(newValue ?? undefined)) {
      return this.storeSvc.get<boolean>(StoreKey.DefaultToFolderView);
    }

    return this.storeSvc.set(StoreKey.DefaultToFolderView, newValue).then(() => {
      this.logSvc.logInfo(`Folder view setting: ${newValue ? 'enabled' : 'disabled'}`);
      return newValue;
    });
  }

  syncBookmarksToolbar(newValue?: boolean): ng.IPromise<boolean> {
    if (angular.isUndefined(newValue ?? undefined)) {
      return this.storeSvc.get<boolean>(StoreKey.SyncBookmarksToolbar);
    }

    return this.storeSvc.set(StoreKey.SyncBookmarksToolbar, newValue).then(() => {
      this.logSvc.logInfo(`Toolbar sync setting: ${newValue ? 'enabled' : 'disabled'}`);
      return newValue;
    });
  }
}
