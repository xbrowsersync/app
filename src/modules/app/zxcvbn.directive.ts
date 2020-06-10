/* eslint-disable no-restricted-globals */
/* eslint-disable no-plusplus */
/* eslint-disable no-console */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import angular from 'angular';
import zxcvbn from 'zxcvbn';

export default class ZxcvbnDirective {
  require: 'ngModel';
  restrict: 'A';
  scope: {
    zxResult: '=?zxcvbn';
    zxExtras: '=?';
    zxMinScore: '@?';
  };

  link(scope, element, attrs, ngModelCtrl) {
    /**
     * Runs the zxcvbn algorithm with the scope variables: "zxPassword", "zxExtras".
     * Then assigns the result to "scope.zxResults".
     */
    scope.runZxcvbn = () => {
      if (angular.isUndefined(scope.zxPassword)) {
        scope.zxPassword = '';
      }

      if (angular.isDefined(scope.zxExtrasArray) && scope.zxExtrasArray.length > 0) {
        scope.zxResult = zxcvbn(scope.zxPassword, scope.zxExtrasArray);
      } else {
        scope.zxResult = zxcvbn(scope.zxPassword);
      }
    };

    scope.isForm = (value) => {
      try {
        return Object.getPrototypeOf(value).constructor.name === 'FormController';
      } catch (error) {
        return false;
      }
    };

    /**
     *  Clears the current extras watcher (if there is one) and then attempts to
     *  create a new one via a scope property. This property can be either an array
     *  or a form.
     */
    scope.setZxExtrasWatcher = () => {
      const extras = scope.zxExtras;

      // Clear the current watcher if there is one
      if (angular.isFunction(scope.zxExtrasWatcher)) {
        scope.zxExtrasWatcher();
      }
      scope.zxExtrasWatcher = undefined;

      if (angular.isDefined(extras)) {
        if (angular.isArray(extras)) {
          scope.zxArrayWatcher();
        } else if (scope.isForm(extras)) {
          scope.zxFormWatcher();
        }
      }
    };

    /**
     *  Watches scope.zxExtras - under the assumption it is a form object.
     *
     *  This method finds extra fields in forms and then pass them to the zxcvbn algorithm. Note: will ignore angular properties
     *  (those starting with "$") and default javascript properties (those starting with "__").
     */
    scope.zxFormWatcher = () => {
      const form = scope.zxExtras;
      console.assert(scope.isForm(form), 'zx-extras element is some how not a form.');

      scope.zxExtrasWatcher = scope.$watch(
        () => {
          const extrasArray = [];
          // Doesn't start with "$" or "__"
          const validPropertyRegex = new RegExp('^(?!\\$|__)');
          for (const prop in form) {
            // Property's containing the string "password" should also be ignored
            if (
              validPropertyRegex.test(prop) &&
              form[prop].hasOwnProperty('$viewValue') &&
              prop.toLowerCase().indexOf('password') === -1
            ) {
              extrasArray.push(form[prop].$viewValue);
            }
          }
          return extrasArray;
        },
        (newValue) => {
          scope.zxExtrasArray = [];
          // Only pass strings
          for (let i = 0; i < newValue.length; i++) {
            if (angular.isString(newValue[i])) {
              scope.zxExtrasArray.push(newValue[i]);
            }
          }
          ngModelCtrl.$validate();
        },
        true
      );
    };

    /**
     *  Watches scope.zxExtras - under the assumption it is an array.
     *  If the array changes (deep check) then the zxcvbn algorithm will be re-run
     *  with the updated extras data.
     */
    scope.zxArrayWatcher = () => {
      scope.zxExtrasWatcher = scope.$watch(
        'zxExtras',
        (newValue) => {
          scope.zxExtrasArray = newValue;
          ngModelCtrl.$validate();
        },
        true
      );
    };

    // Initially set the extras watcher
    scope.setZxExtrasWatcher();

    // Set the password validator and also run the zxcvbn algorithm on password change
    // TODO: fix this
    /* ngModelCtrl.$validators.passwordStrength = (value) => {
      let minScore = parseInt(scope.zxMinScore, 10);
      minScore = isNaN(minScore) || minScore < 0 || minScore > 4 ? 0 : minScore;
      scope.zxPassword = value;
      scope.runZxcvbn();
      return minScore <= scope.zxResult.score;
    }; */

    attrs.$observe('zxExtras', () => {
      scope.setZxExtrasWatcher();
      ngModelCtrl.$validate();
    });

    attrs.$observe('zxMinScore', (value) => {
      scope.zxMinScore = value;
      ngModelCtrl.$validate();
    });
  }

  static Factory() {
    return new ZxcvbnDirective();
  }
}
