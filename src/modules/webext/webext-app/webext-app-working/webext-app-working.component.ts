import { Component, Output } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { AppHelperService } from '../../../app/shared/app-helper/app-helper.service';
import { AlertService } from '../../../shared/alert/alert.service';
import { PlatformService } from '../../../shared/global-shared.interface';
import { SyncType } from '../../../shared/sync/sync.enum';
import { UtilityService } from '../../../shared/utility/utility.service';
import { WorkingContext } from '../../../shared/working/working.enum';
import { WorkingService } from '../../../shared/working/working.service';

@Component({
  controllerAs: 'vm',
  selector: 'appWorking',
  styles: [require('./webext-app-working.component.scss')],
  template: require('./webext-app-working.component.html')
})
export class WebExtAppWorkingComponent {
  Strings = require('../../../../../res/strings/en.json');

  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  currentContext: WorkingContext;
  currentTimeout: ng.IPromise<void>;
  enableCancel: boolean;
  message: string;
  show = false;
  WorkingContext = WorkingContext;

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

    // Watch working service for status changes to display as panel
    $scope.$watch(
      () => WorkingSvc.status,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          if (this.show !== newVal.activated) {
            if (newVal.activated) {
              if (newVal.context === WorkingContext.WaitingForSyncsToFinish) {
                this.showView(newVal.context);
              } else {
                this.showPanel(newVal.context);
              }
            } else {
              this.hidePanel();
            }
          }
        }
      }
    );
  }

  @boundMethod
  cancelSync(): void {
    this.cancelAction()().then(() => this.appHelperSvc.switchView());
  }

  hidePanel(): void {
    if (this.currentTimeout) {
      this.$timeout.cancel(this.currentTimeout);
    }
    this.currentContext = undefined;
    this.currentTimeout = undefined;
    this.show = false;
  }

  showPanel(context: WorkingContext): void {
    // Return if working panel already displayed
    if (this.currentContext) {
      return;
    }

    // Hide any alert messages
    this.alertSvc.clearCurrentAlert();

    // Set displayed message based on context
    this.currentContext = context;
    let message: string;
    switch (context) {
      case WorkingContext.Restoring:
        message = this.platformSvc.getI18nString(this.Strings.View.Working.Restoring);
        break;
      case WorkingContext.Resetting:
        message = this.platformSvc.getI18nString(this.Strings.View.Working.Resetting);
        break;
      default:
        message = this.platformSvc.getI18nString(this.Strings.View.Working.Syncing);
    }

    this.currentTimeout = this.$timeout(() => {
      this.enableCancel = false;
      this.message = message;
      this.show = true;
    });
  }

  showView(context: WorkingContext): void {
    this.currentContext = context;
    this.message = this.platformSvc.getI18nString(this.Strings.View.Working.Syncing);
    this.appHelperSvc.getCurrentSync().then((currentSync) => {
      this.enableCancel = currentSync?.type === SyncType.Remote || false;
      this.show = true;
    });
  }
}
