import './app-qr.component.scss';
import { Component, Input, OnInit, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import QRCode from 'qrcode-svg';
import Strings from '../../../../res/strings/en.json';
import BackupRestoreService from '../../shared/backup-restore/backup-restore.service';
import { PlatformService } from '../../shared/global-shared.interface';
import UtilityService from '../../shared/utility/utility.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'qrPanel',
  template: require('./app-qr.component.html')
})
export default class AppQrComponent implements OnInit {
  $timeout: ng.ITimeoutService;
  backupRestoreSvc: BackupRestoreService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  strings = Strings;
  syncIdCopied = false;

  @Input() serviceUrl: string;
  @Input() syncId: string;

  @Output() close: () => void;
  @Output() copyTextToClipboard: () => any;

  static $inject = ['$timeout', 'BackupRestoreService', 'PlatformService', 'UtilityService'];
  constructor(
    $timeout: ng.ITimeoutService,
    BackupRestoreSvc: BackupRestoreService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService
  ) {
    this.$timeout = $timeout;
    this.backupRestoreSvc = BackupRestoreSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  copySyncId() {
    return this.copyTextToClipboard()(this.syncId).then(() => {
      this.$timeout(() => {
        this.syncIdCopied = true;
      });
    });
  }

  ngOnInit(): void {
    // QR code should encode sync info
    const syncInfo = this.backupRestoreSvc.createSyncInfoObject(this.syncId, this.serviceUrl);

    // Generate QR code
    const qrcode = new QRCode({
      content: JSON.stringify(syncInfo),
      padding: 4,
      width: 200,
      height: 200,
      color: '#000000',
      background: '#ffffff',
      ecl: 'M'
    });
    const svgString = qrcode
      .svg()
      .replace('width="200" height="200"', 'viewBox="0, 0, 200, 200" preserveAspectRatio="xMidYMid meet"');

    // Add new qr code svg to qr container
    const svg = new DOMParser().parseFromString(svgString, 'text/xml').firstElementChild;
    const qrContainer = document.getElementById('qr');
    while (qrContainer.firstElementChild) {
      qrContainer.removeChild(qrContainer.firstElementChild);
    }
    qrContainer.appendChild(svg);
  }
}
