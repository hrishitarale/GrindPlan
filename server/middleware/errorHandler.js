export function errorHandler(error, req, res, next) {
  console.error(error)
  if (res.headersSent) return next(error)
  const status = error.status || (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : error.code === 11000 ? 409 : 500)
  const message = error.code === 11000 ? 'A record with that value already exists' : status < 500 ? error.message : 'Something went wrong'
  res.status(status).json({ message })
}
