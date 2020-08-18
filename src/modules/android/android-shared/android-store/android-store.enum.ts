enum NativeStorageError {
  NativeWriteFailed = 1,
  ItemNotFound = 2,
  NullReference = 3,
  UndefinedType = 4,
  JsonError = 5,
  WrongParameter = 6
}

enum Table {
  App = 'app',
  TraceLog = 'traceLog'
}

enum TraceLogColumn {
  Timestamp = 'timestamp',
  Level = 'level',
  Message = 'message'
}

export { NativeStorageError, Table, TraceLogColumn };
