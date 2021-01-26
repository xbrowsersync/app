import angular from 'angular';
import { Component } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { AppEventType } from '../../../app/app.enum';
import AppSearchComponent from '../../../app/app-search/app-search.component';
import AppHelperService from '../../../app/shared/app-helper/app-helper.service';
import AlertService from '../../../shared/alert/alert.service';
import { BookmarkChangeType } from '../../../shared/bookmark/bookmark.enum';
import { Bookmark, BookmarkChange, RemoveBookmarkChangeData } from '../../../shared/bookmark/bookmark.interface';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import * as Exceptions from '../../../shared/exception/exception';
import { ExceptionHandler } from '../../../shared/exception/exception.interface';
import Globals from '../../../shared/global-shared.constants';
import { PlatformService } from '../../../shared/global-shared.interface';
import SettingsService from '../../../shared/settings/settings.service';
import { SyncType } from '../../../shared/sync/sync.enum';
import UtilityService from '../../../shared/utility/utility.service';
import WorkingService from '../../../shared/working/working.service';
import { AndroidAlert } from '../android-app.interface';
import AndroidAppHelperService from '../shared/android-app-helper/android-app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appSearch',
  styles: [require('./android-app-search.component.scss')],
  template: require('../../../app/app-search/app-search.component.html')
})
export default class AndroidAppSearchComponent extends AppSearchComponent {
  appHelperSvc: AndroidAppHelperService;

  static $inject = [
    '$exceptionHandler',
    '$q',
    '$scope',
    '$timeout',
    'AlertService',
    'AppHelperService',
    'BookmarkHelperService',
    'PlatformService',
    'SettingsService',
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
    PlatformSvc: PlatformService,
    SettingsSvc: SettingsService,
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
      SettingsSvc,
      UtilitySvc,
      WorkingSvc
    );

    $scope.$on(AppEventType.ClearSelectedBookmark, () => {
      this.selectedBookmarkId = undefined;
    });

    $scope.$on(AppEventType.RefreshBookmarkSearchResults, () => {
      this.displayDefaultSearchState();
    });
  }

  clearSearch(): void {
    // Display default search results and focus on search box
    this.displayDefaultSearchState().then(this.searchBookmarks);
  }

  deleteBookmark(event: Event, bookmark: Bookmark): void {
    // Stop event propogation
    this.utilitySvc.stopEventPropagation(event);

    let originalBookmarks;
    if (this.displayFolderView) {
      // Find and remove the deleted bookmark element in the bookmark tree
      originalBookmarks = angular.copy(this.bookmarkTree);

      // Find parent of bookmark to delete
      let parent;
      let childIndex = -1;
      this.bookmarkHelperSvc.eachBookmark(this.bookmarkTree, (current) => {
        if (angular.isUndefined(current.children ?? undefined) || current.children.length === 0) {
          return;
        }

        // Check children for target bookmark
        const index = current.children.findIndex((child) => {
          return child.id === bookmark.id;
        });
        if (index >= 0) {
          parent = current;
          childIndex = index;
        }
      });

      // If target bookmark and parent were found, remove the bookmark
      if (parent && childIndex >= 0) {
        parent.children.splice(childIndex, 1);
      }
    } else {
      // Find and remove the deleted bookmark element in the search results
      originalBookmarks = angular.copy(this.results);

      const removedBookmarkIndex = this.results.findIndex((result) => {
        return result.id === bookmark.id;
      });
      if (removedBookmarkIndex >= 0) {
        this.results.splice(removedBookmarkIndex, 1);
      }
    }

    this.$timeout(() => {
      // Display loading overlay
      this.workingSvc.show();

      // Get current cached bookmarks for undo
      this.bookmarkHelperSvc
        .getCachedBookmarks()
        .then((cachedBookmarks) => {
          // Create change info and sync changes
          const data: RemoveBookmarkChangeData = {
            id: bookmark.id
          };
          const changeInfo: BookmarkChange = {
            changeData: data,
            type: BookmarkChangeType.Remove
          };
          return this.platformSvc
            .queueSync({
              changeInfo,
              type: SyncType.LocalAndRemote
            })
            .then((result) => {
              if (!result.success) {
                return;
              }

              this.$timeout(() => {
                this.alertSvc.setCurrentAlert({
                  action: this.platformSvc.getI18nString(this.Strings.Button.Undo),
                  actionCallback: () => this.undoBookmarkAction(cachedBookmarks),
                  message: this.platformSvc.getI18nString(this.Strings.Alert.BookmarkDeleted)
                } as AndroidAlert);
              }, Globals.InterfaceReadyTimeout);
            });
        })
        .catch((err) => {
          return (err instanceof Exceptions.DataOutOfSyncException
            ? this.displayDefaultSearchState()
            : this.$q.resolve().then(() => {
                // Restore previous bookmarks results
                if (this.displayFolderView) {
                  this.bookmarkTree = originalBookmarks;
                } else {
                  this.results = originalBookmarks;
                }
              })
          ).then(() => this.$exceptionHandler(err));
        });
    }, 1e3);
  }

  displayDefaultSearchState(): ng.IPromise<void> {
    // Set clear search button to display all bookmarks
    return super.displayDefaultSearchState().then(() => {
      if (!this.displayFolderView) {
        return this.searchBookmarks();
      }
    });
  }

  ngOnInit(): ng.IPromise<void> {
    // Clear selected bookmark on touch
    this.$timeout(() =>
      document.querySelector('.view-content').addEventListener(
        'touchstart',
        () =>
          this.$timeout(() => {
            this.selectedBookmarkId = undefined;
          }),
        false
      )
    );

    return super.ngOnInit();
  }

  undoBookmarkAction(bookmarks: Bookmark[]): void {
    // Sync pre-change bookmarks and refresh display
    this.workingSvc.show();
    this.platformSvc
      .queueSync({
        bookmarks,
        type: SyncType.LocalAndRemote
      })
      .finally(this.displayDefaultSearchState);
  }
}
