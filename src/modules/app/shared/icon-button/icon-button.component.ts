import { Component, Input, Output } from 'angular-ts-decorators';

@Component({
  controllerAs: 'vm',
  selector: 'iconButton',
  styles: [require('./icon-button.component.scss')],
  template: require('./icon-button.component.html'),
  transclude: true
})
export class IconButtonComponent {
  @Input() bold: boolean;
  @Input('@title') buttonTitle: string;
  @Input('<?') fab = false;
  @Input('@?') size = '1.5em';
  @Input('<type') iconType: string;
  @Input() tabIndex: number;

  @Output('&') onClick: () => void;
}
