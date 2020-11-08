import angular from 'angular';
import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { PlatformService } from '../../../shared/global-shared.interface';
import { LogLevel } from '../../../shared/log/log.enum';
import LogService from '../../../shared/log/log.service';
import UtilityService from '../../../shared/utility/utility.service';
import { AppViewType } from '../../app.enum';
import AppHelperService from '../../shared/app-helper/app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'issuesSettings',
  styles: [require('./issues-settings.component.scss')],
  template: require('./issues-settings.component.html')
})
export default class IssuesSettingsComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  appHelperSvc: AppHelperService;
  logSvc: LogService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  downloadLogCompletedMessage: string;
  logSize: number;
  savingLog = false;

  static $inject = ['AppHelperService', 'LogService', 'PlatformService', 'UtilityService'];
  constructor(
    AppHelperSvc: AppHelperService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService
  ) {
    this.appHelperSvc = AppHelperSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  clearLog(): void {
    // Clear trace log and update view model
    this.logSvc.clear().then(() => {
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
    this.logSvc.getLogEntries().then((traceLogItems) => {
      if (angular.isUndefined(traceLogItems ?? undefined)) {
        this.logSize = 0;
        return;
      }
      this.logSize = new TextEncoder().encode(traceLogItems.join()).length;
    });
  }

  saveLogFile(): ng.IPromise<void> {
    return this.logSvc
      .getLogEntries()
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
