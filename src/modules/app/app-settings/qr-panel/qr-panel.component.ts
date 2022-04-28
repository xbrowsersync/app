import { Component, OnInit, Output } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import QRCode from 'qrcode-svg';
import { ApiSyncInfo } from '../../../shared/api/api.interface';
import { BackupRestoreService } from '../../../shared/backup-restore/backup-restore.service';
import { PlatformService } from '../../../shared/global-shared.interface';
import { StoreKey } from '../../../shared/store/store.enum';
import { StoreService } from '../../../shared/store/store.service';
import { UtilityService } from '../../../shared/utility/utility.service';
import { AppHelperService } from '../../shared/app-helper/app-helper.service';

@Component({
  controllerAs: 'vm',
  selector: 'qrPanel',
  styles: [require('./qr-panel.component.scss')],
  template: require('./qr-panel.component.html')
})
export class AppQrComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  $q: ng.IQService;
  appHelperSvc: AppHelperService;
  backupRestoreSvc: BackupRestoreService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  syncIdCopied = false;

  @Output() close: () => void;

  static $inject = [
    '$q',
    'AppHelperService',
    'BackupRestoreService',
    'PlatformService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    AppHelperSvc: AppHelperService,
    BackupRestoreSvc: BackupRestoreService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.appHelperSvc = AppHelperSvc;
    this.backupRestoreSvc = BackupRestoreSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  @boundMethod
  copySyncId(): void {
    this.storeSvc
      .get<ApiSyncInfo>(StoreKey.SyncInfo)
      .then((syncInfo) => this.appHelperSvc.copyTextToClipboard(syncInfo.id))
      .then(() => {
        this.syncIdCopied = true;
      });
  }

  ngOnInit(): void {
    // Generate QR code from sync info
    this.backupRestoreSvc.getSyncInfo().then((syncInfo) => {
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
    });
  }
}
