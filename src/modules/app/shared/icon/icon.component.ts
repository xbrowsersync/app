import { Component, Input, OnInit } from 'angular-ts-decorators';

@Component({
  controllerAs: 'vm',
  selector: 'icon',
  styles: [require('./icon.component.scss')],
  template: require('./icon.component.html'),
  transclude: true
})
export class IconComponent implements OnInit {
  icons = {
    'align-justify': require('lucide-static/icons/align-justify.svg'),
    'align-left': require('lucide-static/icons/align-left.svg'),
    bookmark: require('lucide-static/icons/bookmark.svg'),
    check: require('lucide-static/icons/check.svg'),
    'chevron-down': require('lucide-static/icons/chevron-down.svg'),
    'chevron-up': require('lucide-static/icons/chevron-up.svg'),
    'download-cloud': require('lucide-static/icons/download-cloud.svg'),
    edit: require('lucide-static/icons/edit.svg'),
    'edit-3': require('lucide-static/icons/edit-3.svg'),
    eye: require('lucide-static/icons/eye.svg'),
    'eye-off': require('lucide-static/icons/eye-off.svg'),
    flashlight: require('lucide-static/icons/flashlight.svg'),
    'flashlight-off': require('lucide-static/icons/flashlight-off.svg'),
    folder: require('lucide-static/icons/folder.svg'),
    'folder-open': require('lucide-static/icons/folder-open.svg'),
    'help-circle': require('lucide-static/icons/help-circle.svg'),
    minus: require('lucide-static/icons/minus.svg'),
    search: require('lucide-static/icons/search.svg'),
    settings: require('lucide-static/icons/settings.svg'),
    'share-2': require('lucide-static/icons/share-2.svg'),
    'trash-2': require('lucide-static/icons/trash-2.svg'),
    x: require('lucide-static/icons/x.svg'),
    'x-circle': require('lucide-static/icons/x-circle.svg')
  };
  svg: string;

  @Input('<?') bold = false;
  @Input('<type') iconType: string;

  $sce: ng.ISCEService;

  static $inject = ['$scope', '$sce'];
  constructor($scope: ng.IScope, $sce: ng.ISCEService) {
    this.$sce = $sce;

    $scope.$watch(
      () => this.iconType,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          this.setSvg();
        }
      }
    );
  }

  ngOnInit(): void {
    this.setSvg();
  }

  setSvg(): void {
    this.svg = this.$sce.trustAsHtml(this.icons[this.iconType]);
  }
}
