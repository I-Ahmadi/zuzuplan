export default function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { message: 'Not found', statusCode: 404 },
  });
}
