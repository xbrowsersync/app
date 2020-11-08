import { Component, Output } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import AppHelperService from '../../../app/shared/app-helper/app-helper.service';
import AlertService from '../../../shared/alert/alert.service';
import { PlatformService } from '../../../shared/global-shared.interface';
import UtilityService from '../../../shared/utility/utility.service';
import { WorkingContext } from '../../../shared/working/working.enum';
import WorkingService from '../../../shared/working/working.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appWorking'
})
export default class AndroidAppWorkingComponent {
  Strings = require('../../../../../res/strings/en.json');

  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  currentContext: WorkingContext;
  message: string;
  currentTimeout: ng.IPromise<void>;

  @Output() cancelAction: () => any;

  static $inject = [
    '$scope',
    '$timeout',
    'AlertService',
    'AppHelperService',
    'PlatformService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $scope: ng.IScope,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    AppHelperSvc: AppHelperService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;

    // Watch working service for status changes to display spinner dialog
    $scope.$watch(
      () => WorkingSvc.status,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          if (newVal.activated) {
            this.showSpinnerDialog(newVal.context);
          } else {
            this.hideSpinnerDialog();
          }
        }
      }
    );
  }

  hideSpinnerDialog(): void {
    if (this.currentTimeout) {
      this.$timeout.cancel(this.currentTimeout);
    }
    this.currentContext = undefined;
    window.SpinnerDialog.hide();
  }

  showSpinnerDialog(context?: WorkingContext): void {
    // Return if spinner dialog already displayed
    if (this.currentContext) {
      return;
    }

    // Hide any alert messages
    this.alertSvc.clearCurrentAlert();

    // Set displayed message based on context
    this.currentContext = context;
    switch (context) {
      case WorkingContext.DelayedSyncing:
        this.currentTimeout = this.$timeout(() => {
          window.SpinnerDialog.show(
            null,
            `${this.platformSvc.getI18nString(this.Strings.View.Working.Syncing)}…`,
            true
          );
        }, 250);
        break;
      case WorkingContext.Restoring:
        this.currentTimeout = this.$timeout(() => {
          window.SpinnerDialog.show(
            null,
            `${this.platformSvc.getI18nString(this.Strings.View.Working.Restoring)}…`,
            true
          );
        });
        break;
      case WorkingContext.RetrievingMetadata:
        window.SpinnerDialog.hide();
        this.currentTimeout = this.$timeout(() => {
          window.SpinnerDialog.show(
            null,
            this.platformSvc.getI18nString(this.Strings.Alert.GetMetadata.Message),
            () => {
              window.SpinnerDialog.hide();
              this.currentContext = undefined;
              this.cancelAction()();
            }
          );
        }, 250);
        break;
      case WorkingContext.Syncing:
      default:
        this.currentTimeout = this.$timeout(() => {
          window.SpinnerDialog.show(
            null,
            `${this.platformSvc.getI18nString(this.Strings.View.Working.Syncing)}…`,
            true
          );
        });
    }
  }
}
