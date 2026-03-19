jest.mock('angular', () => ({
  default: {
    isUndefined: (value: any) => typeof value === 'undefined',
    isArray: (value: any) => Array.isArray(value),
    isString: (value: any) => typeof value === 'string',
    copy: <T>(source: T, destination?: T): T => {
      if (destination) {
        // angular.copy(source, destination) mutates destination
        Object.keys(destination).forEach((key) => delete (destination as any)[key]);
        Object.assign(destination, JSON.parse(JSON.stringify(source)));
        return destination;
      }
      return JSON.parse(JSON.stringify(source));
    }
  },
  __esModule: true
}));
