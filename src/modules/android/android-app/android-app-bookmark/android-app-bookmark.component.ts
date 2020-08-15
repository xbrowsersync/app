import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import AppBookmarkComponent from '../../../app/app-bookmark/app-bookmark.component';
import { AppEventType } from '../../../app/app.enum';
import { AppHelperService } from '../../../app/app.interface';
import AlertService from '../../../shared/alert/alert.service';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { ExceptionHandler } from '../../../shared/exception/exception.interface';
import { PlatformService } from '../../../shared/global-shared.interface';
import UtilityService from '../../../shared/utility/utility.service';
import WorkingService from '../../../shared/working/working.service';
import AndroidPlatformService from '../../android-platform.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appBookmark',
  template: require('../../../app/app-bookmark/app-bookmark.component.html')
})
export default class AndroidAppBookmarkComponent extends AppBookmarkComponent implements OnInit {
  platformSvc: AndroidPlatformService;

  static $inject = [
    '$exceptionHandler',
    '$q',
    '$scope',
    '$timeout',
    'AlertService',
    'AppHelperService',
    'BookmarkHelperService',
    'PlatformService',
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

    // If user cancels loading bookmark metadata
    $scope.$on(AppEventType.WorkingCancelAction, () => {
      if (this.platformSvc.cancelGetPageMetadata) {
        this.platformSvc.cancelGetPageMetadata();
      }
    });
  }

  ngOnInit(): void {
    super.ngOnInit();
  }
}
