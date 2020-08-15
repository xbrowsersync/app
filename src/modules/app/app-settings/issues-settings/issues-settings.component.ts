import './issues-settings.component.scss';
import angular from 'angular';
import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import Strings from '../../../../../res/strings/en.json';
import { PlatformService } from '../../../shared/global-shared.interface';
import { LogLevel } from '../../../shared/log/log.enum';
import { StoreKey } from '../../../shared/store/store.enum';
import { TraceLogItem } from '../../../shared/store/store.interface';
import StoreService from '../../../shared/store/store.service';
import UtilityService from '../../../shared/utility/utility.service';
import { AppViewType } from '../../app.enum';
import { AppHelperService } from '../../app.interface';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'issuesSettings',
  template: require('./issues-settings.component.html')
})
export default class IssuesSettingsComponent implements OnInit {
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  downloadLogCompletedMessage: string;
  logSize: number;
  savingLog = false;
  strings = Strings;

  static $inject = ['AppHelperService', 'PlatformService', 'StoreService', 'UtilityService'];
  constructor(
    AppHelperSvc: AppHelperService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  clearLog(): void {
    // Clear trace log
    this.storeSvc.remove(StoreKey.TraceLog).then(() => {
      this.logSize = 0;
    });
  }

  downloadLog(): void {
    this.savingLog = true;

    this.saveLogFile().finally(() => {
      this.savingLog = false;

      // Focus on done button
      this.appHelperSvc.focusOnElement('.btn-done');
    });
  }

  getLogFileName(): string {
    const fileName = `xbs_log_${this.utilitySvc.getDateTimeString(new Date())}.txt`;
    return fileName;
  }

  ngOnInit(): void {
    // Calculate log size and initialise view model values
    this.storeSvc.get<TraceLogItem[]>(StoreKey.TraceLog).then((traceLogItems) => {
      if (angular.isUndefined(traceLogItems ?? undefined)) {
        this.logSize = 0;
        return;
      }
      this.logSize = new TextEncoder().encode(traceLogItems.join()).length;
    });
  }

  saveLogFile(): ng.IPromise<void> {
    // Retrieve trace log items
    return this.storeSvc
      .get<TraceLogItem[]>(StoreKey.TraceLog)
      .then((traceLogItems) => {
        // Convert trace log items into string array
        const log = traceLogItems.map((traceLogItem) => {
          let messageLogText = `${new Date(traceLogItem.timestamp).toISOString().replace(/[A-Z]/g, ' ').trim()}\t`;
          switch (traceLogItem.level) {
            case LogLevel.Error:
              messageLogText += '[error]\t';
              break;
            case LogLevel.Warn:
              messageLogText += '[warn]\t';
              break;
            case LogLevel.Trace:
            default:
              messageLogText += '[trace]\t';
          }
          messageLogText += traceLogItem.message;
          return messageLogText;
        });

        // Trigger download
        return this.appHelperSvc.downloadFile(this.getLogFileName(), log.join('\r\n'), 'downloadLogFileLink');
      })
      .then((message) => {
        // Display message
        this.downloadLogCompletedMessage = message;
      });
  }

  switchToHelpView(): void {
    this.appHelperSvc.switchView({ view: AppViewType.Help });
  }
}
