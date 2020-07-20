import './app-help.component.scss';
import { Component, OnInit, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../res/strings/en.json';
import { PlatformService } from '../../shared/global-shared.interface';
import UtilityService from '../../shared/utility/utility.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'helpPanel',
  template: require('./app-help.component.html')
})
export default class AppHelpComponent implements OnInit {
  $timeout: ng.ITimeoutService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  currentPage = 0;
  pages: string[];
  strings = Strings;

  @Output() close: () => any;
  @Output() loadPages: () => any;

  static $inject = ['$timeout', 'PlatformService', 'UtilityService'];
  constructor($timeout: ng.ITimeoutService, PlatformSvc: PlatformService, UtilitySvc: UtilityService) {
    this.$timeout = $timeout;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  displayPage(panelToDisplay = 0): void {
    if (panelToDisplay < 0 || panelToDisplay >= this.pages.length) {
      return this.close()();
    }

    this.currentPage = panelToDisplay;
    this.$timeout(() => {
      (document.querySelector('help-panel .view-content > div') as HTMLDivElement).focus();
    }, 150);
  }

  displayNextPage(): void {
    this.displayPage(this.currentPage + 1);
  }

  displayPreviousPage(): void {
    this.displayPage(this.currentPage - 1);
  }

  handleKeyDown(event: KeyboardEvent): void {
    switch (true) {
      // Escape key
      case event.keyCode === 27:
        event.preventDefault();
        this.close()();
        break;
      // Left arrow key
      case event.keyCode === 37:
        event.preventDefault();
        this.displayPage(this.currentPage - 1);
        break;
      // Right arrow key
      case event.keyCode === 39:
        event.preventDefault();
        this.displayPage(this.currentPage + 1);
        break;
      default:
    }
  }

  ngOnInit(): void {
    // Load help pages and display first page
    this.pages = this.loadPages()();
  }
}
