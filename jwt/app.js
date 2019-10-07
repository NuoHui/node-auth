const Koa = require("koa");
const Router = require("koa-router");
const bodyParser = require("koa-bodyparser");
const md5 = require("crypto-js/md5");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("./models/user.js");
const config = require("./config.js");

const app = new Koa();
const router = new Router();

mongoose.connect(config.db, { useUnifiedTopology: true });

app.use(bodyParser());

/**
 * @description 创建用户
 */
router.post("/user", async (ctx, next) => {
  const { username = "", password = "", age, isAdmin } = ctx.request.body || {};
  if (username === "" || password === "") {
    ctx.status = 401;
    return (ctx.body = {
      success: false,
      code: 10000,
      msg: "用户名或者密码不能为空"
    });
  }
  // 先对密码md5
  const md5PassWord = md5(String(password)).toString();
  // 生成随机salt
  const salt = String(Math.random()).substring(2, 10);
  // 加盐再md5
  const saltMD5PassWord = md5(`${md5PassWord}:${salt}`).toString();
  try {
    // 类似用户查找,保存的操作一般我们都会封装到一个实体里面,本demo只是演示为主, 生产环境不要这么写
    const searchUser = await User.findOne({ name: username });
    if (!searchUser) {
      const user = new User({
        name: username,
        password: saltMD5PassWord,
        salt,
        isAdmin,
        age
      });
      const result = await user.save();
      ctx.body = {
        success: true,
        msg: "创建成功"
      };
    } else {
      ctx.body = {
        success: false,
        msg: "已存在同名用户"
      };
    }
  } catch (error) {
    // 一般这样的我们在生成环境处理异常都是直接抛出 异常类, 再有全局错误处理去处理
    ctx.body = {
      success: false,
      msg: "serve is mistakes"
    };
  }
});

/**
 * @description 用户登陆
 */
router.post("/login", async (ctx, next) => {
  const { username = "", password = "" } = ctx.request.body || {};
  if (username === "" || password === "") {
    ctx.status = 401;
    return (ctx.body = {
      success: false,
      code: 10000,
      msg: "用户名或者密码不能为空"
    });
  }
  // 一般客户端对密码需要md5加密传输过来, 这里我就自己加密处理,假设客户端不加密。
  // 类似用户查找,保存的操作一般我们都会封装到一个实体里面,本demo只是演示为主, 生产环境不要这么写
  try {
    // username在注册时候就不会允许重复
    const searchUser = await User.findOne({ name: username });
    if (!searchUser) {
      ctx.body = {
        success: false,
        msg: "用户不存在"
      };
    } else {
      // 需要去数据库验证用户密码
      const md5PassWord = md5(String(password)).toString();
      const saltMD5PassWord = md5(
        `${md5PassWord}:${searchUser.salt}`
      ).toString();
      if (saltMD5PassWord === searchUser.password) {
        // Payload: 负载, 不建议存储一些敏感信息
        const payload = {
          id: searchUser._id
        };
        const token = jwt.sign(payload, config.secret, {
          expiresIn: "2h"
        });
        ctx.body = {
          success: true,
          data: {
            token
          }
        };
      } else {
        ctx.body = {
          success: false,
          msg: "密码错误"
        };
      }
    }
  } catch (error) {
    ctx.body = {
      success: false,
      msg: "serve is mistakes"
    };
  }
});

/**
 * @description 获取用户信息
 */
router.get(
  "/user",
  async (ctx, next) => {
    // 这里应该抽成一个auth中间件
    const token = ctx.request.query.token || ctx.request.headers["token"];
    if (token) {
      jwt.verify(token, config.secret, async function(err, decoded) {
        if (err) {
          return (ctx.body = {
            success: false,
            msg: "Failed to authenticate token."
          });
        } else {
          ctx.decoded = decoded;
          await next();
        }
      });
    } else {
      ctx.status = 401;
      ctx.body = {
        success: false,
        msg: "need token"
      };
    }
  },
  async (ctx, next) => {
    try {
      const { id } = ctx.decoded;
      const { name, age, isAdmin } = await User.findOne({ _id: id });
      ctx.body = {
        success: true,
        data: { name, age, isAdmin }
      };
    } catch (error) {
      ctx.body = {
        success: false,
        msg: "server is mistakes"
      };
    }

  }
);

app.use(router.routes()).use(router.allowedMethods());
app.on("error", (err, ctx) => {
  console.error("server error", err, ctx);
});
app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
