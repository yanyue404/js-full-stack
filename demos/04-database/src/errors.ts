export class NotFoundError extends Error {
  code = 'NOT_FOUND'
}

/** 乐观锁冲突：别人已经改过这条记录 */
export class ConflictError extends Error {
  code = 'VERSION_CONFLICT'
  constructor(
    message: string,
    public currentVersion?: number
  ) {
    super(message)
  }
}
