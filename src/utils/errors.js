const mongoose = require('mongoose');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function toObjectId(id) {
  if (!mongoose.isValidObjectId(id) || String(new mongoose.Types.ObjectId(id)) !== String(id)) {
    throw new HttpError(400, 'Invalid id');
  }
  return new mongoose.Types.ObjectId(id);
}

module.exports = { HttpError, toObjectId };
