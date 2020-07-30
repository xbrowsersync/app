import './app-help.component.scss';
import { Component, OnInit, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../res/strings/en.json';
import { PlatformService } from '../../shared/global-shared.interface';
import UtilityService from '../../shared/utility/utility.service';
import { KeyCode } from '../app.enum';
import { AppHelperService } from '../app.interface';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appHelp',
  template: require('./app-help.component.html')
})
export default class AppHelpComponent implements OnInit {
  $timeout: ng.ITimeoutService;
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  currentPage = 0;
  pages: string[];
  strings = Strings;

  @Output() close: () => any;

  static $inject = ['$timeout', 'AppHelperService', 'PlatformService', 'UtilityService'];
  constructor(
    $timeout: ng.ITimeoutService,
    AppHelperSvc: AppHelperService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService
  ) {
    this.$timeout = $timeout;
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  displayPage(panelToDisplay = 0): void {
    if (panelToDisplay < 0 || panelToDisplay >= this.pages.length) {
      return this.close()();
    }

    this.currentPage = panelToDisplay;
    this.$timeout(() => {
      (document.querySelector('app-help .view-content > div') as HTMLDivElement).focus();
    }, 150);
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
        this.close()();
        break;
      case KeyCode.ArrowLeft:
        event.preventDefault();
        this.displayPage(this.currentPage - 1);
        break;
      case KeyCode.ArrowRight:
        event.preventDefault();
        this.displayPage(this.currentPage + 1);
        break;
      default:
    }
  }

  ngOnInit(): void {
    // Load help pages and display first page
    this.pages = this.appHelperSvc.getHelpPages();
  }
}
