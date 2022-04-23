import angular from 'angular';
import { Component, OnInit } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { PlatformService } from '../../../shared/global-shared.interface';
import { LogLevel } from '../../../shared/log/log.enum';
import { LogService } from '../../../shared/log/log.service';
import { TelemetryService } from '../../../shared/telemetry/telemetry.service';
import { UtilityService } from '../../../shared/utility/utility.service';
import { RoutePath } from '../../app.enum';
import { AppHelperService } from '../../shared/app-helper/app-helper.service';

@Component({
  controllerAs: 'vm',
  selector: 'issuesSettings',
  styles: [require('./issues-settings.component.scss')],
  template: require('./issues-settings.component.html')
})
export class IssuesSettingsComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  appHelperSvc: AppHelperService;
  logSvc: LogService;
  platformSvc: PlatformService;
  telemetrySvc: TelemetryService;
  utilitySvc: UtilityService;

  downloadLogCompletedMessage: string;
  logSize: number;
  savingLog = false;

  static $inject = ['AppHelperService', 'LogService', 'PlatformService', 'TelemetryService', 'UtilityService'];
  constructor(
    AppHelperSvc: AppHelperService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    TelemetrySvc: TelemetryService,
    UtilitySvc: UtilityService
  ) {
    this.appHelperSvc = AppHelperSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.telemetrySvc = TelemetrySvc;
    this.utilitySvc = UtilitySvc;
  }

  @boundMethod
  clearLog(): void {
    // Clear trace log and update view model
    this.logSvc.clear().then(() => {
      this.logSize = 0;
    });
  }

  @boundMethod
  downloadLog(): void {
    this.savingLog = true;
    this.saveLogFile()
      .then((filename) => {
        if (!filename) {
          return;
        }
        // Only mobile platforms display a file downloaded message
        this.downloadLogCompletedMessage = this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)
          ? `${this.platformSvc.getI18nString(this.Strings.View.Settings.FileDownloaded)}: ${filename}`
          : '';
      })
      .finally(() => {
        this.savingLog = false;
        this.appHelperSvc.focusOnElement('.btn-done');
      });
  }

  getLogFilename(): string {
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

  saveLogFile(): ng.IPromise<string | void> {
    // Add telemetry to log before saving
    return this.telemetrySvc
      .getTelemetryPayload()
      .then((telemetry) => this.logSvc.logInfo(telemetry))
      .then(() => this.logSvc.getLogEntries())
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
        return this.platformSvc.downloadFile(this.getLogFilename(), log.join('\r\n'));
      });
  }

  @boundMethod
  switchToHelpView(): void {
    this.appHelperSvc.switchView(RoutePath.Help);
  }
}
