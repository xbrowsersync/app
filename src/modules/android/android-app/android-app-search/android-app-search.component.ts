import { Component } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import AppSearchComponent from '../../../app/app-search/app-search.component';
import { AppEventType } from '../../../app/app.enum';
import { AppHelperService } from '../../../app/app.interface';
import AlertService from '../../../shared/alert/alert.service';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { ExceptionHandler } from '../../../shared/exception/exception.interface';
import { PlatformService } from '../../../shared/global-shared.interface';
import SettingsService from '../../../shared/settings/settings.service';
import UtilityService from '../../../shared/utility/utility.service';
import WorkingService from '../../../shared/working/working.service';
import AndroidAppHelperService from '../android-app-helper/android-app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appSearch',
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
      if (!this.query) {
        this.displayDefaultSearchState();
      }
    });
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
}
