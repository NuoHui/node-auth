const Redis = require("ioredis");
const { Store } = require("koa-session2");

class RedisStore extends Store {
  constructor() {
    super();
    this.redis = new Redis(); // Connect to 127.0.0.1:6379
  }
  async get(sid, ctx) {
    try {
      const data = await this.redis.get(`jssessionId:${sid}`);
      return JSON.parse(data);
    } catch (err) {
      throw new Error(err);
    }
  }

  async set(session, { sid = this.getID(24), maxAge = 1000000 } = {}, ctx) {
    try {
      // EX: redis支持过了有效期自动删除
      await this.redis.set(
        `jssessionId:${sid}`,
        JSON.stringify(session),
        "EX",
        maxAge / 1000
      );
    } catch (err) {
      throw new Error(err);
    }
    return sid;
  }
}

module.exports = RedisStore;
