/**
 * Drop-in replacement for `angular-ts-decorators` in the background build.
 * Provides no-op decorators so that shared services (which use @Injectable, etc.)
 * can be loaded without pulling in the real angular-ts-decorators package
 * (which depends on AngularJS and the DOM).
 *
 * This module is wired in via webpack resolve.alias for the background entry point only.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

// No-op class decorator: returns the class unchanged
const noopClassDecorator = (_options?: any): ClassDecorator => {
  return (target: any) => target;
};

// No-op property decorator
const noopPropertyDecorator = (_options?: any): PropertyDecorator => {
  return (_target: any, _propertyKey: string | symbol) => {};
};

export const Injectable = noopClassDecorator;
export const Component = noopClassDecorator;
export const NgModule = noopClassDecorator;
export const Directive = noopClassDecorator;
export const Pipe = noopClassDecorator;
export const Input = noopPropertyDecorator;
export const Output = noopPropertyDecorator;
export const ViewParent = noopPropertyDecorator;

// Lifecycle interfaces — no-op in background context
export interface OnInit {
  ngOnInit(): void;
}
export interface OnDestroy {
  ngOnDestroy(): void;
}
