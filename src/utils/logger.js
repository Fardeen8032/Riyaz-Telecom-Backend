const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
};

const logger = {
  info(message) {
    console.log(formatMessage("INFO", message));
  },

  warn(message) {
    console.warn(formatMessage("WARN", message));
  },

  error(message, error) {
    console.error(formatMessage("ERROR", message));

    if (error) {
      console.error(error.stack || error.message || error);
    }
  },
};

export default logger;
