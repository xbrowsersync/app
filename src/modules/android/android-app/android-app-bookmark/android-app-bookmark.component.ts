import './android-app-bookmark.component.scss';
import angular from 'angular';
import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import AppBookmarkComponent from '../../../app/app-bookmark/app-bookmark.component';
import { AppEventType } from '../../../app/app.enum';
import { AppHelperService } from '../../../app/app.interface';
import { AlertType } from '../../../shared/alert/alert.enum';
import AlertService from '../../../shared/alert/alert.service';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import {
  Bookmark,
  BookmarkChange,
  BookmarkMetadata,
  ModifyBookmarkChangeData,
  RemoveBookmarkChangeData
} from '../../../shared/bookmark/bookmark.interface';
import { ExceptionHandler } from '../../../shared/exception/exception.interface';
import Globals from '../../../shared/global-shared.constants';
import { PlatformService } from '../../../shared/global-shared.interface';
import LogService from '../../../shared/log/log.service';
import SyncEngineService from '../../../shared/sync/sync-engine/sync-engine.service';
import { SyncType } from '../../../shared/sync/sync.enum';
import UtilityService from '../../../shared/utility/utility.service';
import WorkingService from '../../../shared/working/working.service';
import AndroidPlatformService from '../../android-shared/android-platform/android-platform.service';
import AndroidAppHelperService from '../android-app-helper/android-app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appBookmark',
  template: require('../../../app/app-bookmark/app-bookmark.component.html')
})
export default class AndroidAppBookmarkComponent extends AppBookmarkComponent implements OnInit {
  appHelperSvc: AndroidAppHelperService;
  logSvc: LogService;
  platformSvc: AndroidPlatformService;
  syncEngineSvc: SyncEngineService;

  static $inject = [
    '$exceptionHandler',
    '$q',
    '$scope',
    '$timeout',
    'AlertService',
    'AppHelperService',
    'BookmarkHelperService',
    'LogService',
    'PlatformService',
    'SyncEngineService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $q: ng.IQService,
    $scope: ng.IScope,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    AppHelperSvc: AppHelperService,
    BookmarkHelperSvc: BookmarkHelperService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    SyncEngineSvc: SyncEngineService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    super(
      $exceptionHandler,
      $q,
      $timeout,
      AlertSvc,
      AppHelperSvc,
      BookmarkHelperSvc,
      PlatformSvc,
      UtilitySvc,
      WorkingSvc
    );

    this.logSvc = LogSvc;
    this.syncEngineSvc = SyncEngineSvc;

    // If user cancels loading bookmark metadata
    $scope.$on(AppEventType.WorkingCancelAction, () => {
      if (this.platformSvc.cancelGetPageMetadata) {
        this.platformSvc.cancelGetPageMetadata();
      }
    });
  }

  getMetadataForCurrentPage(): ng.IPromise<BookmarkMetadata> {
    if (!angular.isUndefined(this.platformSvc.currentPage)) {
      // Show a message if current page has no url - user shared an value that did not contain a valid url
      if (angular.isUndefined(this.platformSvc.currentPage.url)) {
        this.alertSvc.setCurrentAlert({
          message: this.platformSvc.getI18nString(this.Strings.View.Bookmark.InvalidUrlShared),
          type: AlertType.Error
        });
        this.$timeout(() => (document.activeElement as HTMLInputElement)?.blur(), Globals.InterfaceReadyTimeout * 2);
      } else {
        this.bookmarkFormData = this.platformSvc.currentPage;
        this.originalUrl = this.bookmarkFormData.url;
      }
    }
    return super.getMetadataForCurrentPage();
  }

  ngOnInit(): ng.IPromise<void> {
    return super.ngOnInit().finally(() => {
      // Clear current page
      this.platformSvc.currentPage = undefined;
    });
  }

  queueSync(changeInfo: BookmarkChange): ng.IPromise<any> {
    // Check for updates before syncing
    return this.syncEngineSvc.checkForUpdates().then((updatesAvailable) => {
      // Queue sync to get updates
      return (!updatesAvailable
        ? this.$q.resolve(true)
        : this.platformSvc
            .queueSync({
              type: SyncType.Local
            })
            .then(() => {
              // Proceed with sync only if changed bookmark still exists
              return this.bookmarkHelperSvc.getCachedBookmarks().then((bookmarks) => {
                const changedBookmarkId =
                  (changeInfo.changeData as RemoveBookmarkChangeData)?.id ??
                  (changeInfo.changeData as ModifyBookmarkChangeData)?.bookmark?.id;
                const changedBookmark = this.bookmarkHelperSvc.findBookmarkById(
                  changedBookmarkId,
                  bookmarks
                ) as Bookmark;
                if (angular.isUndefined(changedBookmark)) {
                  this.logSvc.logInfo('Changed bookmark could not be found, cancelling sync');
                  return false;
                }
                return true;
              });
            })
      ).then((proceedWithSync) => {
        if (!proceedWithSync) {
          return;
        }
        return super.queueSync(changeInfo);
      });
    });
  }
}
