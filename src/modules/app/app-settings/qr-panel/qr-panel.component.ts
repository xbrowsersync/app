import { Component, OnInit, Output } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import QRCode from 'qrcode-svg';
import BackupRestoreService from '../../../shared/backup-restore/backup-restore.service';
import { PlatformService } from '../../../shared/global-shared.interface';
import { StoreKey } from '../../../shared/store/store.enum';
import StoreService from '../../../shared/store/store.service';
import UtilityService from '../../../shared/utility/utility.service';
import AppHelperService from '../../shared/app-helper/app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'qrPanel',
  styles: [require('./qr-panel.component.scss')],
  template: require('./qr-panel.component.html')
})
export default class AppQrComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  $q: ng.IQService;
  appHelperSvc: AppHelperService;
  backupRestoreSvc: BackupRestoreService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  serviceUrl: string;
  syncId: string;
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

  copySyncId(): void {
    this.appHelperSvc.copyTextToClipboard(this.syncId).then(() => {
      this.syncIdCopied = true;
    });
  }

  ngOnInit(): void {
    // Retrieve sync data from store
    this.$q.all([this.storeSvc.get<string>(StoreKey.SyncId), this.utilitySvc.getServiceUrl()]).then((data) => {
      this.syncId = data[0];
      this.serviceUrl = data[1];

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
    });
  }
}
