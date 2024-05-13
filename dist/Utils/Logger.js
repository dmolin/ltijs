"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Logger = void 0;
exports.setupCustomLogger = setupCustomLogger;
const provMainDebug = require("debug")("provider:main");
const Logger = exports.Logger = {
  info: provMainDebug,
  error: provMainDebug,
  warn: provMainDebug
};
function setupCustomLogger(logger) {
  if (logger) {
    Object.assign(Logger, logger);
  }
}
var _default = exports.default = Logger;