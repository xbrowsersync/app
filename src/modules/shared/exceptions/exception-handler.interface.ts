export default interface ExceptionHandler {
  (exception: Error, cause?: string, displayAlert?: boolean): void;
}
