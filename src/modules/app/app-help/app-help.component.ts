import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { PlatformService } from '../../shared/global-shared.interface';
import { StoreKey } from '../../shared/store/store.enum';
import StoreService from '../../shared/store/store.service';
import UtilityService from '../../shared/utility/utility.service';
import { KeyCode } from '../app.enum';
import AppHelperService from '../shared/app-helper/app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appHelp',
  styles: [require('./app-help.component.scss')],
  template: require('./app-help.component.html')
})
export default class AppHelpComponent implements OnInit {
  Strings = require('../../../../res/strings/en.json');

  $timeout: ng.ITimeoutService;
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  currentPage = 0;
  pages: string[];

  static $inject = ['$timeout', 'AppHelperService', 'PlatformService', 'StoreService', 'UtilityService'];
  constructor(
    $timeout: ng.ITimeoutService,
    AppHelperSvc: AppHelperService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$timeout = $timeout;
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  close(): void {
    this.storeSvc.set(StoreKey.DisplayHelp, false).then(() => this.appHelperSvc.switchView());
  }

  displayPage(panelToDisplay = 0): void {
    if (panelToDisplay < 0 || panelToDisplay >= this.pages.length) {
      return this.close();
    }

    this.currentPage = panelToDisplay;

    // Focus on next button and set links to open in new tabs
    this.appHelperSvc.focusOnElement('.focused:not(.ng-hide)');
    this.appHelperSvc.attachClickEventsToNewTabLinks();
  }

  displayNextPage(): void {
    this.displayPage(this.currentPage + 1);
  }

  displayPreviousPage(): void {
    this.displayPage(this.currentPage - 1);
  }

  handleKeyDown(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case KeyCode.Escape:
        event.preventDefault();
        this.appHelperSvc.switchView();
        break;
      case KeyCode.ArrowLeft:
        event.preventDefault();
        this.displayPreviousPage();
        break;
      case KeyCode.ArrowRight:
        event.preventDefault();
        this.displayNextPage();
        break;
      default:
    }
  }

  ngOnInit(): void {
    // Load help pages and display first page
    this.pages = this.appHelperSvc.getHelpPages();
    this.displayPage(0);
  }
}
