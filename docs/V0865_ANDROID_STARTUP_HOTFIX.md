# V0.8.65 启动热修复

## 已确认根因

0.8.64 真机启动直接出现 `Script error.`。

拆解实际 APK 后执行 `assets/game.bundle.js`，得到真实异常：

`ReferenceError: shopScene is not defined`

来源：

```js
sceneManager.register(
  'property',
  shopScene
);
```

但 `src/main.js` 并没有 `shopScene` 变量。

旧找铺页面实际已经通过：

```js
const propertyMarketScene =
  require('./scenes/shopScene.js');
```

引入。

因此正确注册为：

```js
sceneManager.register(
  'property',
  propertyMarketScene
);
```

## 实际验证

对最新 0.8.64 APK 内的 game.bundle.js 做同等替换后执行：

- V29 正常
- V32 正常
- V33 正常
- V34 正常
- V35 正常
- 新存档初始化正常
- 保存正常
- main 启动完成
- `BUNDLE_BOOT_OK`

## 防止复发

新增 `tests/androidStartupSmoke.test.js`。

它不只是检查源码字符串，也不只是检查能不能打 APK，而是：

1. 模拟 Android WebView / Canvas / localStorage；
2. `require('../android/entry.js')`；
3. 真正加载全部 main 依赖；
4. 真正执行启动初始化；
5. 必须成功注册 `GameRuntime.requestRender`。

以后类似 undefined variable、启动期模块异常会直接让 CI 失败，不能再产出“构建成功但真机秒崩”的 APK。
