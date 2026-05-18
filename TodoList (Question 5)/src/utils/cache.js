const { client } = require('../config/redis');
const logger = require('./logger');

const getCache = async (key) => {
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Redis Get Error', error);
    return null;
  }
};

const setCache = async (key, value, expiry = 3600) => {
  try {
    await client.set(key, JSON.stringify(value), {
      EX: expiry
    });
  } catch (error) {
    logger.error('Redis Set Error', error);
  }
};

const delCache = async (key) => {
  try {
    await client.del(key);
  } catch (error) {
    logger.error('Redis Del Error', error);
  }
};

module.exports = { getCache, setCache, delCache };
