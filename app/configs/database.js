const mongo = require('mongoose');
const {getLogger} = require('./configs/logging');

const logger = getLogger('database');

module.exports = {
    connect: () => {
        mongo.connect(process.env.MONGODB_URI)
            .then(() => {
                logger.info('Successfully connected to MongoDB cluster');
            })
            .catch(error => {
                logger.error('Error when connecting to MongoDB cluster');
                logger.error(error);
            });
    }
};
