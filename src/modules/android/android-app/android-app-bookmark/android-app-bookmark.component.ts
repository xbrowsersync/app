import angular from 'angular';
import { Component, OnInit } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { AppEventType } from '../../../app/app.enum';
import { AppBookmarkComponent } from '../../../app/app-bookmark/app-bookmark.component';
import { AppHelperService } from '../../../app/shared/app-helper/app-helper.service';
import { AlertType } from '../../../shared/alert/alert.enum';
import { AlertService } from '../../../shared/alert/alert.service';
import { Bookmark, BookmarkMetadata } from '../../../shared/bookmark/bookmark.interface';
import { BookmarkHelperService } from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { ExceptionHandler } from '../../../shared/errors/errors.interface';
import Globals from '../../../shared/global-shared.constants';
import { PlatformService } from '../../../shared/global-shared.interface';
import { LogService } from '../../../shared/log/log.service';
import { SettingsService } from '../../../shared/settings/settings.service';
import { SyncType } from '../../../shared/sync/sync.enum';
import { SyncService } from '../../../shared/sync/sync.service';
import { UtilityService } from '../../../shared/utility/utility.service';
import { WorkingService } from '../../../shared/working/working.service';
import { AndroidPlatformService } from '../../android-shared/android-platform/android-platform.service';
import { AndroidAlert } from '../android-app.interface';
import { AndroidAppHelperService } from '../shared/android-app-helper/android-app-helper.service';

@Component({
  controllerAs: 'vm',
  selector: 'appBookmark',
  styles: [require('./android-app-bookmark.component.scss')],
  template: require('../../../app/app-bookmark/app-bookmark.component.html')
})
export class AndroidAppBookmarkComponent extends AppBookmarkComponent implements OnInit {
  appHelperSvc: AndroidAppHelperService;
  logSvc: LogService;
  platformSvc: AndroidPlatformService;
  settingsSvc: SettingsService;
  syncSvc: SyncService;

  static $inject = [
    '$exceptionHandler',
    '$q',
    '$routeParams',
    '$scope',
    '$timeout',
    'AlertService',
    'AppHelperService',
    'BookmarkHelperService',
    'LogService',
    'PlatformService',
    'SettingsService',
    'SyncService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $q: ng.IQService,
    $routeParams: ng.route.IRouteParamsService,
    $scope: ng.IScope,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    AppHelperSvc: AppHelperService,
    BookmarkHelperSvc: BookmarkHelperService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    SettingsSvc: SettingsService,
    SyncSvc: SyncService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    super(
      $exceptionHandler,
      $q,
      $routeParams,
      $scope,
      $timeout,
      AlertSvc,
      AppHelperSvc,
      BookmarkHelperSvc,
      PlatformSvc,
      UtilitySvc,
      WorkingSvc
    );

    this.logSvc = LogSvc;
    this.settingsSvc = SettingsSvc;
    this.syncSvc = SyncSvc;

    // If user cancels loading bookmark metadata
    $scope.$on(AppEventType.WorkingCancelAction, () => {
      if (this.platformSvc.cancelGetPageMetadata) {
        this.platformSvc.cancelGetPageMetadata();
      }
    });
  }

  @boundMethod
  createBookmark(): ng.IPromise<void> {
    return super.createBookmark().then((result) => {
      this.$timeout(() => {
        this.alertSvc.currentAlert = {
          message: this.platformSvc.getI18nString(this.Strings.Alert.BookmarkCreated)
        } as AndroidAlert;
      }, Globals.InterfaceReadyTimeout);
    });
  }

  @boundMethod
  deleteBookmark(): ng.IPromise<void> {
    // Get current cached bookmarks for undo
    return this.bookmarkHelperSvc.getCachedBookmarks().then((cachedBookmarks) => {
      return super.deleteBookmark().then(() => {
        this.$timeout(() => {
          this.alertSvc.currentAlert = {
            action: this.platformSvc.getI18nString(this.Strings.Button.Undo),
            actionCallback: () => this.undoBookmarkAction(cachedBookmarks),
            message: this.platformSvc.getI18nString(this.Strings.Alert.BookmarkDeleted)
          } as AndroidAlert;
        }, Globals.InterfaceReadyTimeout);
      });
    });
  }

  getMetadataForCurrentPage(): ng.IPromise<Boolean | BookmarkMetadata> {
    if (angular.isUndefined(this.platformSvc.sharedBookmark)) {
      return this.$q.resolve(undefined);
    }

    // Show a message if current page has no url - user shared an value that did not contain a valid url
    if (angular.isUndefined(this.platformSvc.sharedBookmark.url)) {
      this.alertSvc.currentAlert = {
        message: this.platformSvc.getI18nString(this.Strings.View.Bookmark.InvalidUrlShared),
        type: AlertType.Error
      };
      return this.$q.resolve().then(() => false);
    }

    // Check auto fetch metadata preference before retrieving metadata
    this.bookmarkFormData = this.platformSvc.sharedBookmark;
    this.originalUrl = this.bookmarkFormData.url;
    return this.settingsSvc.autoFetchMetadata().then((autoFetchMetadata) => {
      if (!autoFetchMetadata) {
        this.displayUpdatePropertiesButton = true;
        return this.platformSvc.sharedBookmark;
      }
      return super.getMetadataForCurrentPage();
    });
  }

  ngOnInit(): ng.IPromise<void> {
    return super.ngOnInit().finally(() => {
      // Clear current page
      this.platformSvc.sharedBookmark = undefined;
    });
  }

  undoBookmarkAction(bookmarks: Bookmark[]): void {
    // Sync pre-change bookmarks and refresh display
    this.workingSvc.show();
    this.platformSvc
      .queueSync({
        bookmarks,
        type: SyncType.LocalAndRemote
      })
      .finally(() => this.utilitySvc.broadcastEvent(AppEventType.RefreshBookmarkSearchResults));
  }

  @boundMethod
  updateBookmark(): ng.IPromise<void> {
    // Get current cached bookmarks for undo
    return this.bookmarkHelperSvc.getCachedBookmarks().then((cachedBookmarks) => {
      return super.updateBookmark().then(() => {
        this.$timeout(() => {
          this.alertSvc.currentAlert = {
            action: this.platformSvc.getI18nString(this.Strings.Button.Undo),
            actionCallback: () => this.undoBookmarkAction(cachedBookmarks),
            message: this.platformSvc.getI18nString(this.Strings.Alert.BookmarkUpdated)
          } as AndroidAlert;
        }, Globals.InterfaceReadyTimeout);
      });
    });
  }
}
