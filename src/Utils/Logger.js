const provMainDebug = require('debug')('provider:main')

const Logger = {
  info: provMainDebug,
  error: provMainDebug,
  warn: provMainDebug
};

export function setupCustomLogger (logger) {
  if (logger) {
    Object.assign(Logger, logger);
  }
}

export default Logger;
