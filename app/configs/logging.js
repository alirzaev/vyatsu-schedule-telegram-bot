const logging = require('log4js');

const ENV = process.env.NODE_ENV || 'development';

const level = ENV === 'development' ? 'debug' : 'info';

module.exports = {
    getLogger: (name) => {
        const logger = logging.getLogger(name);
        logger.level = level;
        return logger;
    }
};
