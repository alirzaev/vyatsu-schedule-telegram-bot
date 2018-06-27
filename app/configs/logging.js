const logging = require('log4js');

const ENV = process.env.NODE_ENV || 'development';

let level = 'info';

if (ENV === 'development') {
    level = 'debug';
}

module.exports = {
    getLogger: (name) =>
        logging.getLogger(name)
};
