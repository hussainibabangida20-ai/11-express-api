export default class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    if (fields) {
      this.fields = fields;
    }
  }
}
