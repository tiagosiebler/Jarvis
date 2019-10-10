// replacement for silly generateError function
class SimpleError {
  constructor(key, message) {
    this.error = true;
    this.errorID = key;
    this.errorMSG = message;

    return this;
  }
}

module.exports = SimpleError;
