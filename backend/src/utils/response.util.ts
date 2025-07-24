/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data
  }

  res.status(statusCode).json(response)
}

/**
 * Send paginated response
 */
export const sendPaginatedResponse = <T>(
  res: Response,
  message: string,
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  },
  statusCode: number = 200
): void => {
  const response: PaginatedResponse<T> = {
    data,
    pagination
  }
  
  res.status(statusCode).json({
    success: true,
    message,
    ...response
  })
}

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  error: string,
  message: string,
  statusCode: number = 500,
  details?: any
): void => {
  const response: ErrorResponse = {
    error,
    message,
    details,
    statusCode
  }
  
  res.status(statusCode).json(response)
}

/**
 * Send created response
 */
export const sendCreated = <T>(
  res: Response,
  message: string,
  data?: T
): void => {
  sendSuccess(res, message, data, 201)
}

/**
 * Send no content response
 */
export const sendNoContent = (res: Response): void => {
  res.status(204).send()
}
