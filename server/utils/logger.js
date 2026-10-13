/* Minimal levelled logger (no external dependency, easy to swap for pino). */
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const envLevel = LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug);

function emit(level, stream, args) {
  const timestamp = new Date().toISOString();
  stream(`[${timestamp}] [${level.toUpperCase()}]`, ...args);
}

export const logger = {
  error: (...args) => envLevel >= LEVELS.error && emit('error', console.error, args),
  warn: (...args) => envLevel >= LEVELS.warn && emit('warn', console.warn, args),
  info: (...args) => envLevel >= LEVELS.info && emit('info', console.log, args),
  debug: (...args) => envLevel >= LEVELS.debug && emit('debug', console.log, args),
  child: () => logger,
};

export default logger;
