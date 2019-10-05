const Koa = require("koa");
const Router = require("koa-router");
const bodyParser = require("koa-bodyparser");
const session = require("koa-session2");
const Store = require("./Store.js");

const app = new Koa();
const router = new Router();

app.keys = ["this is my secret key"];
app.use(bodyParser());

app.use(
  session({
    key: "jssessionId"
  })
);

// 模拟登陆
router.post("/login", async (ctx, next) => {
  const { username = "", password = "" } = ctx.request.body || {};
  // fake data
  const _username = "xyz";
  const _password = 123456;
  if (username === _username && password === _password) {
    const store = new Store();
    const sid = await store.set({
      username,
      password
    }, {
      maxAge: 1000 * 60 * 2 // 设定只有120s的有效时间
    });
    ctx.cookies.set('jssessionId', sid)
    ctx.body = {
      success: true,
      msg: "登陆成功"
    };
  } else {
    ctx.status = 401;
    ctx.body = {
      success: false,
      code: 10000,
      msg: "账号或者密码错误"
    };
  }
});

// 获取用户信息
router.get(
  "/user",
  async (ctx, next) => {
    const store = new Store();
    const jssessionId = ctx.cookies.get('jssessionId')
    const userSession = await store.get(jssessionId)
    console.log('获取到请求的cookie', jssessionId, 'session', userSession)
    if (!userSession) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        msg: "oAuth Faill"
      };
    } else {
      ctx.userSession = userSession
      await next();
    }
  },
  async (ctx, next) => {
    ctx.body = {
      success: true,
      data: ctx.userSession
    };
  }
);

app.use(router.routes()).use(router.allowedMethods());
app.on("error", (err, ctx) => {
  console.error("server error", err, ctx);
});
app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
