"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/core/simulationConfig.js
  var require_simulationConfig = __commonJS({
    "src/core/simulationConfig.js"(exports, module) {
      "use strict";
      module.exports = {
        time: {
          // 1× 时，每现实 1 秒推进多少游戏分钟。
          baseGameMinutesPerSecond: 6,
          allowedSpeeds: [
            1,
            2,
            5,
            10
          ]
        },
        city: {
          // 常住人口的每日自然/迁移变化上限。
          maxDailyResidentChangeRatio: 25e-4,
          // 商圈“活动人口”相对常住人口的合理波动范围。
          minEffectivePopulationRatio: 0.68,
          maxEffectivePopulationRatio: 1.42,
          // 动态数据的惯性，避免一天暴涨暴跌。
          rentSmoothing: 0.16,
          spendSmoothing: 0.12,
          economySmoothing: 0.08,
          // 餐厅数量每天最多向均衡值移动多少家。
          maxRestaurantChangePerDay: 2,
          // 商圈饱和度显示边界与竞争分级。
          minSaturation: 25,
          maxSaturation: 160,
          saturatedThreshold: 85,
          competitionBands: {
            medium: 65,
            high: 80,
            extreme: 90
          }
        },
        demand: {
          weekdayFactors: {
            weekday: 1,
            weekend: 1.06
          },
          weatherFactors: {
            sunny: 1,
            cloudy: 0.98,
            rain: 0.9,
            heavyRain: 0.76,
            hot: 0.93,
            cold: 1.04
          }
        },
        weather: {
          temperatureNoise: 4,
          seasonalBaseTemperature: {
            spring: 18,
            summer: 29,
            autumn: 20,
            winter: 8
          },
          /**
           * 各季节天气概率。
           * 概率只是生成规则，实际天气每天由 seed + 日期确定。
           */
          profiles: {
            spring: [
              ["sunny", 0.35],
              ["cloudy", 0.31],
              ["rain", 0.25],
              ["heavyRain", 0.05],
              ["cold", 0.04]
            ],
            summer: [
              ["sunny", 0.28],
              ["cloudy", 0.2],
              ["rain", 0.22],
              ["heavyRain", 0.1],
              ["hot", 0.2]
            ],
            autumn: [
              ["sunny", 0.44],
              ["cloudy", 0.29],
              ["rain", 0.15],
              ["heavyRain", 0.03],
              ["cold", 0.09]
            ],
            winter: [
              ["sunny", 0.35],
              ["cloudy", 0.31],
              ["rain", 0.08],
              ["cold", 0.26]
            ]
          }
        },
        news: {
          maxItems: 18,
          // 浮动通报按游戏小时轮换，不按真实秒计时。
          rotateEveryGameHours: 2
        }
      };
    }
  });

  // src/core/gameState.js
  var require_gameState = __commonJS({
    "src/core/gameState.js"(exports, module) {
      "use strict";
      var INITIAL_STATE = {
        version: 1,
        player: {
          cash: 5e4,
          brandName: "\u672A\u547D\u540D\u54C1\u724C",
          reputation: 0
        },
        time: {
          year: 1,
          month: 4,
          day: 12,
          hour: 10,
          minute: 20,
          speed: 1,
          paused: false
        },
        world: {
          currentCityId: "yunzhou",
          cityName: "",
          currentDistrictId: "university",
          // 天气不再写死为“晴23℃”，由 simulationSystem 初始化并每日更新。
          weather: null,
          temperature: null,
          simulation: {
            initialized: false,
            lastProcessedDay: null,
            seed: null,
            districtState: {},
            weatherHistory: [],
            newsFeed: [],
            lastDailySnapshot: null
          }
        },
        business: {
          hasShop: false,
          currentShopId: null,
          shops: [],
          propertyProcess: {
            visits: {},
            negotiations: {},
            leases: {}
          },
          renovations: {},
          renovationTemplates: [],
          openingPrep: {
            equipment: {},
            permits: {},
            staffing: {}
          },
          finance: {
            openingLoans: {}
          }
        },
        progress: {
          firstLaunch: true,
          tutorialStep: 0
        }
      };
      function clone(value) {
        return JSON.parse(
          JSON.stringify(value)
        );
      }
      function mergeDefaults(defaults, source) {
        if (source === void 0 || source === null) {
          return clone(defaults);
        }
        if (Array.isArray(defaults)) {
          return Array.isArray(source) ? clone(source) : clone(defaults);
        }
        if (typeof defaults !== "object") {
          return source;
        }
        const result = clone(defaults);
        const keys = Object.keys(source);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (defaults[key] !== void 0 && defaults[key] !== null && typeof defaults[key] === "object" && !Array.isArray(defaults[key]) && source[key] !== null && typeof source[key] === "object" && !Array.isArray(source[key])) {
            result[key] = mergeDefaults(
              defaults[key],
              source[key]
            );
          } else {
            result[key] = clone(source[key]);
          }
        }
        return result;
      }
      var GameState = class {
        constructor() {
          this.data = clone(INITIAL_STATE);
        }
        getData() {
          return this.data;
        }
        getPlayer() {
          return this.data.player;
        }
        getTime() {
          return this.data.time;
        }
        getWorld() {
          return this.data.world;
        }
        getBusiness() {
          return this.data.business;
        }
        getPropertyProcess() {
          const business = this.data.business;
          if (!business.propertyProcess) {
            business.propertyProcess = {
              visits: {},
              negotiations: {},
              leases: {}
            };
          }
          return business.propertyProcess;
        }
        getRenovations() {
          const business = this.data.business;
          if (!business.renovations) {
            business.renovations = {};
          }
          return business.renovations;
        }
        getRenovationTemplates() {
          const business = this.data.business;
          if (!Array.isArray(
            business.renovationTemplates
          )) {
            business.renovationTemplates = [];
          }
          return business.renovationTemplates;
        }
        getOpeningPrep() {
          const business = this.data.business;
          if (!business.openingPrep) {
            business.openingPrep = {
              equipment: {},
              permits: {},
              staffing: {}
            };
          }
          return business.openingPrep;
        }
        getFinance() {
          const business = this.data.business;
          if (!business.finance) {
            business.finance = {
              openingLoans: {}
            };
          }
          if (!business.finance.openingLoans) {
            business.finance.openingLoans = {};
          }
          return business.finance;
        }
        getSimulation() {
          const world = this.data.world;
          if (!world.simulation) {
            world.simulation = clone(
              INITIAL_STATE.world.simulation
            );
          }
          return world.simulation;
        }
        /* =========================
           城市名称
        ========================= */
        getCityName() {
          const name = this.data.world.cityName;
          return name && name.trim() ? name : "\u672A\u547D\u540D\u57CE\u5E02";
        }
        setCityName(name) {
          const cleanName = String(
            name || ""
          ).trim();
          if (!cleanName) {
            return false;
          }
          this.data.world.cityName = cleanName.slice(
            0,
            12
          );
          return true;
        }
        clearCityName() {
          this.data.world.cityName = "";
        }
        /* =========================
           时间控制
        ========================= */
        getTimeSpeed() {
          const speed = Number(
            this.data.time.speed
          );
          return speed || 1;
        }
        setTimeSpeed(speed) {
          const config = require_simulationConfig();
          const value = Number(speed);
          if (config.time.allowedSpeeds.indexOf(
            value
          ) === -1) {
            return false;
          }
          this.data.time.speed = value;
          this.data.time.paused = false;
          return true;
        }
        isTimePaused() {
          return !!this.data.time.paused;
        }
        setTimePaused(value) {
          this.data.time.paused = !!value;
        }
        toggleTimePause() {
          this.data.time.paused = !this.data.time.paused;
          return this.data.time.paused;
        }
        /* =========================
           玩家资金
        ========================= */
        setCash(value) {
          this.data.player.cash = Math.max(
            0,
            Math.floor(value)
          );
        }
        addCash(value) {
          this.setCash(
            this.data.player.cash + value
          );
        }
        spendCash(value) {
          if (this.data.player.cash < value) {
            return false;
          }
          this.data.player.cash -= value;
          return true;
        }
        /* =========================
           世界状态
        ========================= */
        setDistrict(id) {
          this.data.world.currentDistrictId = id;
        }
        setWeather(weather, temperature) {
          this.data.world.weather = weather || null;
          this.data.world.temperature = temperature == null ? null : Number(
            temperature
          );
        }
        addShop(shop) {
          this.data.business.shops.push(
            shop
          );
          this.data.business.hasShop = true;
          this.data.business.currentShopId = shop.id;
        }
        /* =========================
           存档
        ========================= */
        reset() {
          this.data = clone(INITIAL_STATE);
        }
        exportSave() {
          return clone(
            this.data
          );
        }
        importSave(saveData) {
          if (!saveData) {
            return false;
          }
          if (saveData.version !== INITIAL_STATE.version) {
            return false;
          }
          this.data = mergeDefaults(
            INITIAL_STATE,
            saveData
          );
          return true;
        }
      };
      var gameState = new GameState();
      module.exports = gameState;
    }
  });

  // src/core/timeSystem.js
  var require_timeSystem = __commonJS({
    "src/core/timeSystem.js"(exports, module) {
      "use strict";
      var gameState = require_gameState();
      var simulationConfig = require_simulationConfig();
      var DAYS_IN_MONTH = [
        31,
        28,
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31
      ];
      var TimeSystem = class {
        constructor() {
          this.minuteAccumulator = 0;
        }
        getTime() {
          return gameState.getTime();
        }
        update(deltaMs) {
          if (gameState.isTimePaused()) {
            return 0;
          }
          let delta = Number(deltaMs);
          if (!Number.isFinite(delta) || delta <= 0) {
            return 0;
          }
          delta = Math.min(
            delta,
            1e3
          );
          const seconds = delta / 1e3;
          const speed = gameState.getTimeSpeed();
          const gameMinutes = seconds * simulationConfig.time.baseGameMinutesPerSecond * speed;
          this.minuteAccumulator += gameMinutes;
          const wholeMinutes = Math.floor(
            this.minuteAccumulator
          );
          if (wholeMinutes <= 0) {
            return 0;
          }
          this.minuteAccumulator -= wholeMinutes;
          this.addMinutes(
            wholeMinutes
          );
          return wholeMinutes;
        }
        setSpeed(speed) {
          return gameState.setTimeSpeed(
            speed
          );
        }
        getSpeed() {
          return gameState.getTimeSpeed();
        }
        getSpeedText() {
          return this.getSpeed() + "\xD7";
        }
        getEffectiveMinutesPerSecond() {
          return simulationConfig.time.baseGameMinutesPerSecond * this.getSpeed();
        }
        pause() {
          gameState.setTimePaused(
            true
          );
        }
        resume() {
          gameState.setTimePaused(
            false
          );
        }
        togglePause() {
          return gameState.toggleTimePause();
        }
        isPaused() {
          return gameState.isTimePaused();
        }
        resetAccumulator() {
          this.minuteAccumulator = 0;
        }
        isLeapYear(year) {
          return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
        }
        getDaysInMonth(year, month) {
          if (month === 2 && this.isLeapYear(year)) {
            return 29;
          }
          return DAYS_IN_MONTH[month - 1];
        }
        addMinutes(minutes) {
          const value = Math.floor(
            Number(minutes)
          );
          if (!Number.isFinite(value) || value <= 0) {
            return;
          }
          const time = gameState.getTime();
          time.minute += value;
          while (time.minute >= 60) {
            time.minute -= 60;
            time.hour += 1;
          }
          while (time.hour >= 24) {
            time.hour -= 24;
            this.addDays(1);
          }
        }
        addHours(hours) {
          const value = Math.floor(
            Number(hours)
          );
          if (!Number.isFinite(value) || value <= 0) {
            return;
          }
          this.addMinutes(
            value * 60
          );
        }
        addDays(days) {
          const value = Math.floor(
            Number(days)
          );
          if (!Number.isFinite(value) || value <= 0) {
            return;
          }
          const time = gameState.getTime();
          for (let i = 0; i < value; i++) {
            time.day += 1;
            const maxDay = this.getDaysInMonth(
              time.year,
              time.month
            );
            if (time.day > maxDay) {
              time.day = 1;
              time.month += 1;
            }
            if (time.month > 12) {
              time.month = 1;
              time.year += 1;
            }
          }
        }
        nextDay() {
          const time = gameState.getTime();
          this.addDays(1);
          time.hour = 8;
          time.minute = 0;
          this.resetAccumulator();
        }
        setTime(hour, minute) {
          const time = gameState.getTime();
          time.hour = Math.max(
            0,
            Math.min(
              23,
              Math.floor(
                Number(hour) || 0
              )
            )
          );
          time.minute = Math.max(
            0,
            Math.min(
              59,
              Math.floor(
                Number(minute) || 0
              )
            )
          );
          this.resetAccumulator();
        }
        getTimeText() {
          const time = gameState.getTime();
          const hour = String(
            time.hour
          ).padStart(
            2,
            "0"
          );
          const minute = String(
            time.minute
          ).padStart(
            2,
            "0"
          );
          return hour + ":" + minute;
        }
        getDateText() {
          const time = gameState.getTime();
          return "\u7B2C" + time.year + "\u5E74 " + time.month + "\u6708" + time.day + "\u65E5";
        }
        getFullText() {
          return this.getDateText() + " " + this.getTimeText();
        }
        getDisplayState() {
          return {
            date: this.getDateText(),
            time: this.getTimeText(),
            speed: this.getSpeed(),
            speedText: this.getSpeedText(),
            effectiveMinutesPerSecond: this.getEffectiveMinutesPerSecond(),
            paused: this.isPaused(),
            mealPeriod: this.getMealPeriod()
          };
        }
        getMealPeriod() {
          const hour = gameState.getTime().hour;
          if (hour >= 6 && hour < 10) {
            return "breakfast";
          }
          if (hour >= 10 && hour < 14) {
            return "lunch";
          }
          if (hour >= 14 && hour < 17) {
            return "afternoon";
          }
          if (hour >= 17 && hour < 21) {
            return "dinner";
          }
          return "night";
        }
      };
      var timeSystem = new TimeSystem();
      module.exports = timeSystem;
    }
  });

  // src/core/sceneManager.js
  var require_sceneManager = __commonJS({
    "src/core/sceneManager.js"(exports, module) {
      "use strict";
      var SceneManager = class {
        constructor() {
          this.scenes = {};
          this.currentSceneId = null;
          this.currentScene = null;
          this.previousSceneId = null;
        }
        /**
         * 注册页面
         */
        register(id, scene) {
          if (!id || !scene) {
            return false;
          }
          this.scenes[id] = scene;
          return true;
        }
        /**
         * 判断页面是否存在
         */
        has(id) {
          return !!this.scenes[id];
        }
        /**
         * 切换页面
         */
        switchTo(id, payload) {
          const nextScene = this.scenes[id];
          if (!nextScene) {
            console.warn(
              "\u9875\u9762\u4E0D\u5B58\u5728\uFF1A" + id
            );
            return false;
          }
          if (this.currentScene && typeof this.currentScene.exit === "function") {
            this.currentScene.exit();
          }
          this.previousSceneId = this.currentSceneId;
          this.currentSceneId = id;
          this.currentScene = nextScene;
          if (typeof nextScene.enter === "function") {
            nextScene.enter(
              payload || {}
            );
          }
          return true;
        }
        /**
         * 返回上一个页面
         */
        back() {
          if (!this.previousSceneId) {
            return false;
          }
          const target = this.previousSceneId;
          return this.switchTo(target);
        }
        /**
         * 当前页面 ID
         */
        getCurrentId() {
          return this.currentSceneId;
        }
        /**
         * 当前页面
         */
        getCurrentScene() {
          return this.currentScene;
        }
        /**
         * 页面绘制
         */
        render(ctx2) {
          if (!this.currentScene || typeof this.currentScene.render !== "function") {
            return;
          }
          this.currentScene.render(ctx2);
        }
        /**
         * 页面更新
         *
         * 后面NPC移动、
         * 动画、
         * 时间流逝、
         * 顾客等都会用。
         */
        update(deltaTime) {
          if (!this.currentScene || typeof this.currentScene.update !== "function") {
            return;
          }
          this.currentScene.update(
            deltaTime
          );
        }
        /**
         * 点击事件交给当前页面
         */
        handleTap(x, y) {
          if (!this.currentScene || typeof this.currentScene.handleTap !== "function") {
            return false;
          }
          return this.currentScene.handleTap(
            x,
            y
          );
        }
        /**
         * 清空所有页面
         * 主要用于开发测试
         */
        reset() {
          this.scenes = {};
          this.currentSceneId = null;
          this.currentScene = null;
          this.previousSceneId = null;
        }
      };
      var sceneManager = new SceneManager();
      module.exports = sceneManager;
    }
  });

  // src/core/animationManager.js
  var require_animationManager = __commonJS({
    "src/core/animationManager.js"(exports, module) {
      "use strict";
      var EASING = {
        linear(t) {
          return t;
        },
        easeInQuad(t) {
          return t * t;
        },
        easeOutQuad(t) {
          return 1 - (1 - t) * (1 - t);
        },
        easeInOutQuad(t) {
          return t < 0.5 ? 2 * t * t : 1 - Math.pow(
            -2 * t + 2,
            2
          ) / 2;
        },
        easeOutCubic(t) {
          return 1 - Math.pow(
            1 - t,
            3
          );
        },
        easeInOutCubic(t) {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(
            -2 * t + 2,
            3
          ) / 2;
        },
        /**
         * 轻微回弹
         * 很适合弹窗、按钮和定位点
         */
        easeOutBack(t) {
          const c1 = 1.70158;
          const c3 = c1 + 1;
          return 1 + c3 * Math.pow(
            t - 1,
            3
          ) + c1 * Math.pow(
            t - 1,
            2
          );
        }
      };
      var AnimationManager = class {
        constructor() {
          this.animations = /* @__PURE__ */ new Map();
          this.autoId = 0;
        }
        /**
         * 创建动画
         *
         * animationManager.start({
         *   id: 'districtPopup',
         *   from: 0,
         *   to: 1,
         *   duration: 260,
         *   easing: 'easeOutCubic',
         *
         *   onUpdate(value, progress) {
         *   },
         *
         *   onComplete() {
         *   }
         * });
         */
        start(options) {
          const config = options || {};
          const id = config.id || "animation_" + ++this.autoId;
          const from = Number(
            config.from
          );
          const to = Number(
            config.to
          );
          const duration = Math.max(
            1,
            Number(
              config.duration
            ) || 250
          );
          const easingName = config.easing || "easeOutCubic";
          const easing = typeof config.easing === "function" ? config.easing : EASING[easingName] || EASING.linear;
          const animation = {
            id,
            group: config.group || null,
            from: Number.isFinite(from) ? from : 0,
            to: Number.isFinite(to) ? to : 1,
            duration,
            elapsed: 0,
            easing,
            onUpdate: typeof config.onUpdate === "function" ? config.onUpdate : null,
            onComplete: typeof config.onComplete === "function" ? config.onComplete : null,
            onCancel: typeof config.onCancel === "function" ? config.onCancel : null
          };
          if (this.animations.has(
            id
          )) {
            this.cancel(id);
          }
          this.animations.set(
            id,
            animation
          );
          if (animation.onUpdate) {
            animation.onUpdate(
              animation.from,
              0
            );
          }
          return id;
        }
        /**
         * 每帧更新
         */
        update(deltaMs) {
          if (this.animations.size === 0) {
            return false;
          }
          let delta = Number(deltaMs);
          if (!Number.isFinite(delta) || delta <= 0) {
            return false;
          }
          delta = Math.min(
            delta,
            100
          );
          const finished = [];
          this.animations.forEach(
            function(animation, id) {
              animation.elapsed += delta;
              const rawProgress = Math.min(
                1,
                animation.elapsed / animation.duration
              );
              const easedProgress = animation.easing(
                rawProgress
              );
              const value = animation.from + (animation.to - animation.from) * easedProgress;
              if (animation.onUpdate) {
                animation.onUpdate(
                  value,
                  rawProgress
                );
              }
              if (rawProgress >= 1) {
                finished.push(
                  id
                );
              }
            }
          );
          for (let i = 0; i < finished.length; i++) {
            const id = finished[i];
            const animation = this.animations.get(
              id
            );
            if (!animation) {
              continue;
            }
            this.animations.delete(
              id
            );
            if (animation.onComplete) {
              animation.onComplete();
            }
          }
          return true;
        }
        /**
         * 取消单个动画
         */
        cancel(id) {
          const animation = this.animations.get(
            id
          );
          if (!animation) {
            return false;
          }
          this.animations.delete(
            id
          );
          if (animation.onCancel) {
            animation.onCancel();
          }
          return true;
        }
        /**
         * 取消同组动画
         *
         * 比如：
         * popup
         * map
         * button
         */
        cancelGroup(group) {
          const ids = [];
          this.animations.forEach(
            function(animation, id) {
              if (animation.group === group) {
                ids.push(id);
              }
            }
          );
          for (let i = 0; i < ids.length; i++) {
            this.cancel(
              ids[i]
            );
          }
          return ids.length;
        }
        /**
         * 是否正在播放
         */
        isRunning(id) {
          return this.animations.has(
            id
          );
        }
        /**
         * 当前动画数量
         */
        getCount() {
          return this.animations.size;
        }
        /**
         * 清空全部动画
         */
        clear() {
          const ids = Array.from(
            this.animations.keys()
          );
          for (let i = 0; i < ids.length; i++) {
            this.cancel(
              ids[i]
            );
          }
        }
        /**
         * 常用：淡入
         */
        fadeIn(id, duration, onUpdate, onComplete) {
          return this.start({
            id,
            group: "fade",
            from: 0,
            to: 1,
            duration: duration || 220,
            easing: "easeOutCubic",
            onUpdate,
            onComplete
          });
        }
        /**
         * 常用：淡出
         */
        fadeOut(id, duration, onUpdate, onComplete) {
          return this.start({
            id,
            group: "fade",
            from: 1,
            to: 0,
            duration: duration || 180,
            easing: "easeInQuad",
            onUpdate,
            onComplete
          });
        }
      };
      var animationManager = new AnimationManager();
      module.exports = animationManager;
    }
  });

  // src/core/resourceManager.js
  var require_resourceManager = __commonJS({
    "src/core/resourceManager.js"(exports, module) {
      "use strict";
      var runtime = globalThis.GameRuntime;
      if (!runtime) {
        throw new Error(
          "ResourceManager\uFF1AGameRuntime \u672A\u521D\u59CB\u5316"
        );
      }
      var api = runtime.api || {};
      var ResourceManager = class {
        constructor() {
          this.images = /* @__PURE__ */ new Map();
          this.loading = /* @__PURE__ */ new Map();
          this.failed = /* @__PURE__ */ new Map();
          this.groups = /* @__PURE__ */ new Map();
        }
        /**
         * 创建跨平台 Image
         */
        createImage() {
          if (api && typeof api.createImage === "function") {
            return api.createImage();
          }
          if (typeof Image !== "undefined") {
            return new Image();
          }
          throw new Error(
            "\u5F53\u524D\u5E73\u53F0\u4E0D\u652F\u6301\u56FE\u7247\u52A0\u8F7D"
          );
        }
        /**
         * 加载单张图片
         *
         * 使用：
         *
         * await resourceManager.loadImage(
         *   'city_bg',
         *   'assets/images/map/city_01.webp'
         * );
         */
        loadImage(key, path, group) {
          if (!key) {
            return Promise.reject(
              new Error(
                "\u8D44\u6E90 key \u4E0D\u80FD\u4E3A\u7A7A"
              )
            );
          }
          if (!path) {
            return Promise.reject(
              new Error(
                "\u56FE\u7247\u8DEF\u5F84\u4E0D\u80FD\u4E3A\u7A7A"
              )
            );
          }
          if (this.images.has(key)) {
            return Promise.resolve(
              this.images.get(key)
            );
          }
          if (this.loading.has(key)) {
            return this.loading.get(key);
          }
          const promise = new Promise(
            (resolve, reject) => {
              let image;
              try {
                image = this.createImage();
              } catch (error) {
                reject(error);
                return;
              }
              image.onload = () => {
                this.images.set(
                  key,
                  image
                );
                this.loading.delete(
                  key
                );
                this.failed.delete(
                  key
                );
                if (group) {
                  this.addToGroup(
                    group,
                    key
                  );
                }
                resolve(image);
              };
              image.onerror = (error) => {
                this.loading.delete(
                  key
                );
                this.failed.set(
                  key,
                  {
                    path,
                    error
                  }
                );
                reject(
                  new Error(
                    "\u56FE\u7247\u52A0\u8F7D\u5931\u8D25\uFF1A" + path
                  )
                );
              };
              image.src = path;
            }
          );
          this.loading.set(
            key,
            promise
          );
          return promise;
        }
        /**
         * 批量加载资源
         *
         * resources 示例：
         *
         * [
         *   {
         *     key: 'city_bg',
         *     path:
         *       'assets/images/map/city.webp'
         *   },
         *   {
         *     key: 'shop_01',
         *     path:
         *       'assets/images/shops/shop_01.webp'
         *   }
         * ]
         */
        async loadImages(resources, group) {
          if (!Array.isArray(
            resources
          )) {
            return [];
          }
          const tasks = resources.map(
            (item) => this.loadImage(
              item.key,
              item.path,
              group
            )
          );
          return Promise.all(
            tasks
          );
        }
        /**
         * 获取已加载图片
         */
        getImage(key) {
          return this.images.get(key) || null;
        }
        /**
         * 是否已经加载
         */
        hasImage(key) {
          return this.images.has(
            key
          );
        }
        /**
         * 是否正在加载
         */
        isLoading(key) {
          return this.loading.has(
            key
          );
        }
        /**
         * 是否加载失败过
         */
        hasFailed(key) {
          return this.failed.has(
            key
          );
        }
        /**
         * 加入资源分组
         */
        addToGroup(group, key) {
          if (!this.groups.has(group)) {
            this.groups.set(
              group,
              /* @__PURE__ */ new Set()
            );
          }
          this.groups.get(group).add(key);
        }
        /**
         * 获取一个资源组
         */
        getGroup(group) {
          if (!this.groups.has(group)) {
            return [];
          }
          return Array.from(
            this.groups.get(group)
          );
        }
        /**
         * 释放单张图片
         *
         * 后期城市很多时很重要，
         * 防止内存一直增长。
         */
        releaseImage(key) {
          if (!this.images.has(key)) {
            return false;
          }
          const image = this.images.get(key);
          try {
            if (image && typeof image.src === "string") {
              image.src = "";
            }
          } catch (error) {
          }
          this.images.delete(key);
          for (const group of this.groups.values()) {
            group.delete(key);
          }
          return true;
        }
        /**
         * 释放整个资源组
         *
         * 比如离开某座城市：
         *
         * releaseGroup(
         *   'city_yunzhou'
         * )
         */
        releaseGroup(group) {
          const keys = this.getGroup(group);
          for (let i = 0; i < keys.length; i++) {
            this.releaseImage(
              keys[i]
            );
          }
          this.groups.delete(
            group
          );
        }
        /**
         * 释放所有资源
         */
        clear() {
          const keys = Array.from(
            this.images.keys()
          );
          for (let i = 0; i < keys.length; i++) {
            this.releaseImage(
              keys[i]
            );
          }
          this.loading.clear();
          this.failed.clear();
          this.groups.clear();
        }
        /**
         * 当前资源状态
         *
         * 后面开发调试时很好用
         */
        getStats() {
          return {
            loaded: this.images.size,
            loading: this.loading.size,
            failed: this.failed.size,
            groups: this.groups.size
          };
        }
      };
      var resourceManager = new ResourceManager();
      module.exports = resourceManager;
    }
  });

  // src/ui/safeArea.js
  var require_safeArea = __commonJS({
    "src/ui/safeArea.js"(exports, module) {
      "use strict";
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(
            max,
            value
          )
        );
      }
      function getLogicalInsets(info, scale) {
        const source = info || {};
        const safeArea = source.safeArea || null;
        const windowHeight = Number(
          source.windowHeight
        ) || 0;
        const logicalScale = Math.max(
          0.01,
          Number(
            scale
          ) || 1
        );
        if (!safeArea || !windowHeight) {
          return {
            top: 0,
            bottom: 0
          };
        }
        const top = Math.max(
          0,
          Number(
            safeArea.top
          ) || 0
        ) / logicalScale;
        const bottomPixels = Math.max(
          0,
          windowHeight - (Number(
            safeArea.bottom
          ) || windowHeight)
        );
        return {
          top: clamp(
            top,
            0,
            24
          ),
          bottom: clamp(
            bottomPixels / logicalScale,
            0,
            24
          )
        };
      }
      module.exports = {
        getLogicalInsets
      };
    }
  });

  // src/city/citySystem.js
  var require_citySystem = __commonJS({
    "src/city/citySystem.js"(exports, module) {
      "use strict";
      var gameState = require_gameState();
      var simulationConfig = require_simulationConfig();
      var CITY_DATA = {
        yunzhou: {
          id: "yunzhou",
          name: "\u4E91\u5DDE\u5E02",
          population: 628400,
          economyLevel: 3,
          districts: [
            "oldtown",
            "cbd",
            "university",
            "market",
            "village",
            "industry",
            "hightech"
          ]
        }
      };
      var DISTRICT_DATA = {
        oldtown: {
          id: "oldtown",
          cityId: "yunzhou",
          name: "\u8001\u57CE\u533A",
          population: 30240,
          avgSpend: 22.4,
          baseDemand: 7200,
          restaurantCount: 89,
          saturation: 67,
          rentIndex: 0.55,
          mainCustomers: [
            "resident",
            "elderly",
            "family"
          ],
          mealDemand: {
            breakfast: 0.18,
            lunch: 0.31,
            afternoon: 0.08,
            dinner: 0.34,
            night: 0.09
          }
        },
        cbd: {
          id: "cbd",
          cityId: "yunzhou",
          name: "\u5546\u4E1A\u4E2D\u5FC3",
          population: 48700,
          avgSpend: 48.6,
          baseDemand: 13800,
          restaurantCount: 152,
          saturation: 91,
          rentIndex: 1,
          mainCustomers: [
            "office",
            "business",
            "tourist"
          ],
          mealDemand: {
            breakfast: 0.12,
            lunch: 0.42,
            afternoon: 0.12,
            dinner: 0.27,
            night: 0.07
          }
        },
        university: {
          id: "university",
          cityId: "yunzhou",
          name: "\u5927\u5B66\u57CE",
          population: 36300,
          avgSpend: 21.6,
          baseDemand: 14820,
          restaurantCount: 126,
          saturation: 84,
          rentIndex: 0.72,
          mainCustomers: [
            "student",
            "teacher",
            "resident"
          ],
          mealDemand: {
            breakfast: 0.15,
            lunch: 0.34,
            afternoon: 0.09,
            dinner: 0.29,
            night: 0.13
          }
        },
        market: {
          id: "market",
          cityId: "yunzhou",
          name: "\u4E1C\u95E8\u5E02\u573A",
          population: 27400,
          avgSpend: 18.3,
          baseDemand: 8600,
          restaurantCount: 74,
          saturation: 64,
          rentIndex: 0.48,
          mainCustomers: [
            "resident",
            "vendor",
            "worker"
          ],
          mealDemand: {
            breakfast: 0.22,
            lunch: 0.32,
            afternoon: 0.08,
            dinner: 0.3,
            night: 0.08
          }
        },
        village: {
          id: "village",
          cityId: "yunzhou",
          name: "\u57CE\u4E2D\u6751",
          population: 41800,
          avgSpend: 16.8,
          baseDemand: 10200,
          restaurantCount: 103,
          saturation: 72,
          rentIndex: 0.38,
          mainCustomers: [
            "worker",
            "tenant",
            "student"
          ],
          mealDemand: {
            breakfast: 0.19,
            lunch: 0.28,
            afternoon: 0.05,
            dinner: 0.31,
            night: 0.17
          }
        },
        industry: {
          id: "industry",
          cityId: "yunzhou",
          name: "\u5DE5\u4E1A\u56ED",
          population: 32900,
          avgSpend: 19.5,
          baseDemand: 9200,
          restaurantCount: 81,
          saturation: 61,
          rentIndex: 0.44,
          mainCustomers: [
            "worker",
            "driver",
            "staff"
          ],
          mealDemand: {
            breakfast: 0.17,
            lunch: 0.43,
            afternoon: 0.04,
            dinner: 0.29,
            night: 0.07
          }
        },
        hightech: {
          id: "hightech",
          cityId: "yunzhou",
          name: "\u9AD8\u65B0\u533A",
          population: 38100,
          avgSpend: 36.2,
          baseDemand: 9800,
          restaurantCount: 97,
          saturation: 75,
          rentIndex: 0.84,
          mainCustomers: [
            "office",
            "tech",
            "business"
          ],
          mealDemand: {
            breakfast: 0.13,
            lunch: 0.4,
            afternoon: 0.12,
            dinner: 0.28,
            night: 0.07
          }
        }
      };
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(
            max,
            value
          )
        );
      }
      function hashFloat(text) {
        let h = 2166136261;
        const source = String(
          text
        );
        for (let i = 0; i < source.length; i++) {
          h ^= source.charCodeAt(i);
          h = Math.imul(
            h,
            16777619
          );
        }
        return (h >>> 0) % 1e5 / 1e5;
      }
      var CitySystem = class {
        getBaseCity(id) {
          return CITY_DATA[id] || null;
        }
        getBaseDistrict(id) {
          return DISTRICT_DATA[id] || null;
        }
        ensureDistrictState(districtId) {
          const base = this.getBaseDistrict(
            districtId
          );
          if (!base) {
            return null;
          }
          const simulation = gameState.getSimulation();
          if (!simulation.districtState[districtId]) {
            const supportCapacity = base.restaurantCount / Math.max(
              0.01,
              base.saturation / 100
            );
            simulation.districtState[districtId] = {
              residentPopulation: base.population,
              effectivePopulation: base.population,
              basePopulationAnchor: base.population,
              demandPerCapita: base.baseDemand / Math.max(
                1,
                base.population
              ),
              dailyDemandBase: base.baseDemand,
              restaurantCount: base.restaurantCount,
              restaurantSupportAnchor: supportCapacity,
              avgSpend: base.avgSpend,
              rentIndex: base.rentIndex,
              marketRentAnchor: null,
              currentMarketRent: null,
              economyMomentum: 1,
              eventTrafficFactor: 1,
              eventDemandFactor: 1,
              eventPopulationFactor: 1,
              eventRentFactor: 1,
              populationDelta: 0,
              demandDeltaRatio: 0,
              lastUpdatedDay: null
            };
          }
          return simulation.districtState[districtId];
        }
        ensureAllDistrictStates() {
          const ids = Object.keys(
            DISTRICT_DATA
          );
          for (let i = 0; i < ids.length; i++) {
            this.ensureDistrictState(
              ids[i]
            );
          }
        }
        getCity(id) {
          const base = this.getBaseCity(
            id
          );
          if (!base) {
            return null;
          }
          this.ensureAllDistrictStates();
          let baselineSum = 0;
          let currentSum = 0;
          for (let i = 0; i < base.districts.length; i++) {
            const districtId = base.districts[i];
            const districtBase = this.getBaseDistrict(
              districtId
            );
            const state = this.ensureDistrictState(
              districtId
            );
            baselineSum += districtBase.population;
            currentSum += state.residentPopulation;
          }
          const growthRatio = baselineSum > 0 ? currentSum / baselineSum : 1;
          return {
            ...base,
            population: Math.round(
              base.population * growthRatio
            ),
            basePopulation: base.population,
            populationGrowthRatio: growthRatio
          };
        }
        getCurrentCity() {
          const world = gameState.getWorld();
          return this.getCity(
            world.currentCityId
          );
        }
        getDistrict(id) {
          const base = this.getBaseDistrict(
            id
          );
          if (!base) {
            return null;
          }
          const state = this.ensureDistrictState(
            id
          );
          const demandRatio = state.dailyDemandBase / Math.max(
            1,
            base.baseDemand
          );
          const supportCapacity = state.restaurantSupportAnchor * Math.max(
            0.45,
            demandRatio
          );
          const saturation = clamp(
            Math.round(
              state.restaurantCount / Math.max(
                1,
                supportCapacity
              ) * 100
            ),
            simulationConfig.city.minSaturation,
            simulationConfig.city.maxSaturation
          );
          return {
            ...base,
            population: Math.round(
              state.effectivePopulation
            ),
            residentPopulation: Math.round(
              state.residentPopulation
            ),
            populationDelta: Math.round(
              state.populationDelta
            ),
            avgSpend: Number(
              state.avgSpend.toFixed(
                1
              )
            ),
            baseDemand: Math.max(
              0,
              Math.round(
                state.dailyDemandBase
              )
            ),
            demandDeltaRatio: state.demandDeltaRatio,
            restaurantCount: Math.max(
              0,
              Math.round(
                state.restaurantCount
              )
            ),
            saturation,
            rentIndex: Number(
              state.rentIndex.toFixed(
                2
              )
            ),
            economyMomentum: state.economyMomentum,
            eventTrafficFactor: state.eventTrafficFactor,
            eventDemandFactor: state.eventDemandFactor,
            eventPopulationFactor: state.eventPopulationFactor,
            eventRentFactor: state.eventRentFactor,
            lastUpdatedDay: state.lastUpdatedDay
          };
        }
        getCurrentDistrict() {
          const world = gameState.getWorld();
          return this.getDistrict(
            world.currentDistrictId
          );
        }
        getDistrictsByCity(cityId) {
          const city = this.getBaseCity(
            cityId
          );
          if (!city) {
            return [];
          }
          return city.districts.map(
            (id) => this.getDistrict(
              id
            )
          ).filter(Boolean);
        }
        setCurrentDistrict(id) {
          if (!DISTRICT_DATA[id]) {
            return false;
          }
          gameState.setDistrict(id);
          return true;
        }
        getMealDemand(districtId, mealPeriod) {
          const district = this.getDistrict(
            districtId
          );
          if (!district) {
            return 0;
          }
          const ratio = district.mealDemand[mealPeriod] || 0;
          return Math.floor(
            district.baseDemand * ratio
          );
        }
        getEventAggregate(districtId, events) {
          const list = Array.isArray(
            events
          ) ? events : [];
          let trafficFactor = 1;
          let rentFactor = 1;
          let npcDemandFactor = 1;
          let listingSupplyFactor = 1;
          for (let i = 0; i < list.length; i++) {
            const event = list[i];
            const applies = !event.districtId || event.districtId === districtId;
            if (!applies) {
              continue;
            }
            trafficFactor *= Number(
              event.trafficFactor
            ) || 1;
            rentFactor *= Number(
              event.rentPressure
            ) || 1;
            npcDemandFactor *= Number(
              event.npcDemandFactor
            ) || 1;
            listingSupplyFactor *= Number(
              event.listingSupplyFactor
            ) || 1;
          }
          const demandFactor = clamp(
            Math.sqrt(
              trafficFactor * npcDemandFactor
            ),
            0.58,
            1.58
          );
          const populationFactor = clamp(
            1 + (trafficFactor - 1) * 0.42 + (npcDemandFactor - 1) * 0.18,
            simulationConfig.city.minEffectivePopulationRatio,
            simulationConfig.city.maxEffectivePopulationRatio
          );
          return {
            trafficFactor: clamp(
              trafficFactor,
              0.45,
              1.75
            ),
            rentFactor: clamp(
              rentFactor,
              0.7,
              1.45
            ),
            npcDemandFactor: clamp(
              npcDemandFactor,
              0.5,
              1.8
            ),
            listingSupplyFactor: clamp(
              listingSupplyFactor,
              0.55,
              1.75
            ),
            demandFactor,
            populationFactor
          };
        }
        getActivityFactor(base, dayOfWeek) {
          const weekend = dayOfWeek === 0 || dayOfWeek === 6;
          if (!weekend) {
            return 1;
          }
          const main = base.mainCustomers || [];
          let factor = 1;
          if (main.indexOf(
            "office"
          ) !== -1 || main.indexOf(
            "business"
          ) !== -1) {
            factor *= 0.82;
          }
          if (main.indexOf(
            "worker"
          ) !== -1 || main.indexOf(
            "staff"
          ) !== -1) {
            factor *= 0.9;
          }
          if (main.indexOf(
            "resident"
          ) !== -1 || main.indexOf(
            "family"
          ) !== -1 || main.indexOf(
            "tourist"
          ) !== -1) {
            factor *= 1.1;
          }
          if (main.indexOf(
            "student"
          ) !== -1) {
            factor *= 1.03;
          }
          return clamp(
            factor,
            0.72,
            1.24
          );
        }
        applyDailySimulation(context) {
          const ctx2 = context || {};
          const dayOrdinal = Number(
            ctx2.dayOrdinal
          ) || 1;
          const dayOfWeek = Number(
            ctx2.dayOfWeek
          ) || 0;
          const events = Array.isArray(
            ctx2.events
          ) ? ctx2.events : [];
          const marketSummaries = ctx2.marketSummaries || {};
          const result = {};
          const ids = Object.keys(
            DISTRICT_DATA
          );
          for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const base = DISTRICT_DATA[id];
            const state = this.ensureDistrictState(
              id
            );
            const beforePopulation = state.effectivePopulation;
            const beforeDemand = state.dailyDemandBase;
            const event = this.getEventAggregate(
              id,
              events
            );
            const activity = this.getActivityFactor(
              base,
              dayOfWeek
            );
            const random = hashFloat(
              String(
                gameState.getSimulation().seed
              ) + ":" + dayOrdinal + ":" + id
            );
            const randomDrift = (random - 0.5) * simulationConfig.city.maxDailyResidentChangeRatio;
            const economySignal = (event.npcDemandFactor - 1) * 1e-3 + (event.trafficFactor - 1) * 55e-5 - Math.max(
              0,
              event.rentFactor - 1
            ) * 35e-5 - Math.max(
              0,
              event.listingSupplyFactor - 1
            ) * 2e-4;
            const migrationRate = clamp(
              economySignal + randomDrift,
              -simulationConfig.city.maxDailyResidentChangeRatio,
              simulationConfig.city.maxDailyResidentChangeRatio
            );
            const residentBefore = state.residentPopulation;
            state.residentPopulation = clamp(
              residentBefore * (1 + migrationRate),
              state.basePopulationAnchor * 0.82,
              state.basePopulationAnchor * 1.35
            );
            const populationFactor = clamp(
              event.populationFactor * activity,
              simulationConfig.city.minEffectivePopulationRatio,
              simulationConfig.city.maxEffectivePopulationRatio
            );
            state.effectivePopulation = state.residentPopulation * populationFactor;
            const economyTarget = clamp(
              1 + (event.npcDemandFactor - 1) * 0.16 + (event.trafficFactor - 1) * 0.1 - Math.max(
                0,
                event.listingSupplyFactor - 1
              ) * 0.06,
              0.82,
              1.22
            );
            state.economyMomentum += (economyTarget - state.economyMomentum) * simulationConfig.city.economySmoothing;
            const populationDemandRatio = state.effectivePopulation / Math.max(
              1,
              base.population
            );
            const demandTarget = base.baseDemand * populationDemandRatio * event.demandFactor * state.economyMomentum;
            state.dailyDemandBase = Math.max(
              0,
              demandTarget
            );
            const spendTarget = base.avgSpend * clamp(
              state.economyMomentum * (1 + (event.rentFactor - 1) * 0.3),
              0.78,
              1.28
            );
            state.avgSpend += (spendTarget - state.avgSpend) * simulationConfig.city.spendSmoothing;
            const market = marketSummaries[id] || null;
            if (market && Number(
              market.averageAskingRent
            ) > 0) {
              if (!state.marketRentAnchor) {
                state.marketRentAnchor = Number(
                  market.averageAskingRent
                );
              }
              state.currentMarketRent = Number(
                market.averageAskingRent
              );
              const targetRentIndex = base.rentIndex * (state.currentMarketRent / Math.max(
                1,
                state.marketRentAnchor
              ));
              state.rentIndex += (targetRentIndex - state.rentIndex) * simulationConfig.city.rentSmoothing;
            }
            const demandRatio = state.dailyDemandBase / Math.max(
              1,
              base.baseDemand
            );
            const targetRestaurantCount = Math.max(
              1,
              Math.round(
                base.restaurantCount * Math.pow(
                  demandRatio,
                  0.72
                ) * Math.pow(
                  event.npcDemandFactor,
                  0.28
                )
              )
            );
            const restaurantGap = targetRestaurantCount - state.restaurantCount;
            if (Math.abs(
              restaurantGap
            ) >= 1) {
              const move = Math.min(
                simulationConfig.city.maxRestaurantChangePerDay,
                Math.abs(
                  Math.round(
                    restaurantGap
                  )
                )
              );
              const probability = clamp(
                Math.abs(
                  restaurantGap
                ) / Math.max(
                  1,
                  base.restaurantCount * 0.08
                ),
                0.12,
                0.92
              );
              const roll = hashFloat(
                id + ":restaurant:" + dayOrdinal + ":" + gameState.getSimulation().seed
              );
              if (roll < probability) {
                state.restaurantCount += restaurantGap > 0 ? move : -move;
              }
            }
            state.eventTrafficFactor = event.trafficFactor;
            state.eventDemandFactor = event.demandFactor;
            state.eventPopulationFactor = populationFactor;
            state.eventRentFactor = event.rentFactor;
            state.populationDelta = state.effectivePopulation - beforePopulation;
            state.demandDeltaRatio = beforeDemand > 0 ? (state.dailyDemandBase - beforeDemand) / beforeDemand : 0;
            state.lastUpdatedDay = dayOrdinal;
            result[id] = this.getDistrict(
              id
            );
          }
          return result;
        }
        isSaturated(districtId) {
          const district = this.getDistrict(
            districtId
          );
          if (!district) {
            return false;
          }
          return district.saturation >= simulationConfig.city.saturatedThreshold;
        }
        getCompetitionLevel(districtId) {
          const district = this.getDistrict(
            districtId
          );
          if (!district) {
            return "unknown";
          }
          if (district.saturation >= simulationConfig.city.competitionBands.extreme) {
            return "extreme";
          }
          if (district.saturation >= simulationConfig.city.competitionBands.high) {
            return "high";
          }
          if (district.saturation >= simulationConfig.city.competitionBands.medium) {
            return "medium";
          }
          return "low";
        }
        getDistrictSummary(districtId) {
          const district = this.getDistrict(
            districtId
          );
          if (!district) {
            return null;
          }
          return {
            id: district.id,
            name: district.name,
            population: district.population,
            residentPopulation: district.residentPopulation,
            populationDelta: district.populationDelta,
            avgSpend: district.avgSpend,
            dailyDemand: district.baseDemand,
            demandDeltaRatio: district.demandDeltaRatio,
            restaurantCount: district.restaurantCount,
            saturation: district.saturation,
            rentIndex: district.rentIndex,
            competition: this.getCompetitionLevel(
              districtId
            )
          };
        }
      };
      var citySystem = new CitySystem();
      module.exports = citySystem;
    }
  });

  // src/city/demandSystem.js
  var require_demandSystem = __commonJS({
    "src/city/demandSystem.js"(exports, module) {
      "use strict";
      var citySystem = require_citySystem();
      var timeSystem = require_timeSystem();
      var gameState = require_gameState();
      var simulationConfig = require_simulationConfig();
      var CUSTOMER_TYPES = {
        student: {
          id: "student",
          name: "\u5B66\u751F",
          priceSensitivity: 0.9,
          speedSensitivity: 0.72,
          qualitySensitivity: 0.58,
          repeatSensitivity: 0.72
        },
        teacher: {
          id: "teacher",
          name: "\u6559\u5E08",
          priceSensitivity: 0.52,
          speedSensitivity: 0.6,
          qualitySensitivity: 0.74,
          repeatSensitivity: 0.78
        },
        resident: {
          id: "resident",
          name: "\u5468\u8FB9\u5C45\u6C11",
          priceSensitivity: 0.66,
          speedSensitivity: 0.48,
          qualitySensitivity: 0.72,
          repeatSensitivity: 0.86
        },
        elderly: {
          id: "elderly",
          name: "\u8001\u5E74\u5C45\u6C11",
          priceSensitivity: 0.74,
          speedSensitivity: 0.3,
          qualitySensitivity: 0.62,
          repeatSensitivity: 0.9
        },
        family: {
          id: "family",
          name: "\u5BB6\u5EAD\u5BA2",
          priceSensitivity: 0.58,
          speedSensitivity: 0.46,
          qualitySensitivity: 0.82,
          repeatSensitivity: 0.8
        },
        office: {
          id: "office",
          name: "\u767D\u9886",
          priceSensitivity: 0.46,
          speedSensitivity: 0.92,
          qualitySensitivity: 0.78,
          repeatSensitivity: 0.66
        },
        business: {
          id: "business",
          name: "\u5546\u52A1\u5BA2",
          priceSensitivity: 0.28,
          speedSensitivity: 0.7,
          qualitySensitivity: 0.92,
          repeatSensitivity: 0.52
        },
        tourist: {
          id: "tourist",
          name: "\u6E38\u5BA2",
          priceSensitivity: 0.48,
          speedSensitivity: 0.5,
          qualitySensitivity: 0.76,
          repeatSensitivity: 0.16
        },
        vendor: {
          id: "vendor",
          name: "\u5546\u8D29",
          priceSensitivity: 0.8,
          speedSensitivity: 0.84,
          qualitySensitivity: 0.54,
          repeatSensitivity: 0.82
        },
        worker: {
          id: "worker",
          name: "\u5DE5\u4EBA",
          priceSensitivity: 0.86,
          speedSensitivity: 0.76,
          qualitySensitivity: 0.54,
          repeatSensitivity: 0.84
        },
        tenant: {
          id: "tenant",
          name: "\u79DF\u4F4F\u4EBA\u53E3",
          priceSensitivity: 0.82,
          speedSensitivity: 0.6,
          qualitySensitivity: 0.58,
          repeatSensitivity: 0.76
        },
        driver: {
          id: "driver",
          name: "\u53F8\u673A",
          priceSensitivity: 0.68,
          speedSensitivity: 0.88,
          qualitySensitivity: 0.52,
          repeatSensitivity: 0.46
        },
        staff: {
          id: "staff",
          name: "\u56ED\u533A\u804C\u5458",
          priceSensitivity: 0.58,
          speedSensitivity: 0.84,
          qualitySensitivity: 0.68,
          repeatSensitivity: 0.7
        },
        tech: {
          id: "tech",
          name: "\u79D1\u6280\u4ECE\u4E1A\u8005",
          priceSensitivity: 0.42,
          speedSensitivity: 0.86,
          qualitySensitivity: 0.82,
          repeatSensitivity: 0.68
        }
      };
      var DISTRICT_CUSTOMER_MIX = {
        oldtown: {
          resident: 0.48,
          elderly: 0.28,
          family: 0.24
        },
        cbd: {
          office: 0.6,
          business: 0.22,
          tourist: 0.18
        },
        university: {
          student: 0.72,
          teacher: 0.1,
          resident: 0.18
        },
        market: {
          resident: 0.42,
          vendor: 0.32,
          worker: 0.26
        },
        village: {
          worker: 0.46,
          tenant: 0.38,
          student: 0.16
        },
        industry: {
          worker: 0.68,
          driver: 0.14,
          staff: 0.18
        },
        hightech: {
          office: 0.54,
          tech: 0.34,
          business: 0.12
        }
      };
      var DemandSystem = class {
        getCustomerType(id) {
          return CUSTOMER_TYPES[id] || null;
        }
        getCustomerMix(districtId) {
          return DISTRICT_CUSTOMER_MIX[districtId] || {};
        }
        getWeatherModifier() {
          const world = gameState.getWorld();
          return simulationConfig.demand.weatherFactors[world.weather] || 1;
        }
        getWeekdayModifier() {
          const time = gameState.getTime();
          const dateIndex = this.getDayOrdinal(
            time
          );
          const weekday = dateIndex % 7;
          const weekend = weekday === 0 || weekday === 6;
          return weekend ? simulationConfig.demand.weekdayFactors.weekend : simulationConfig.demand.weekdayFactors.weekday;
        }
        isLeapYear(year) {
          return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
        }
        getDayOrdinal(time) {
          const y = Math.max(
            1,
            Number(
              time.year
            ) || 1
          );
          const m = Math.max(
            1,
            Math.min(
              12,
              Number(
                time.month
              ) || 1
            )
          );
          const d = Math.max(
            1,
            Number(
              time.day
            ) || 1
          );
          const y0 = y - 1;
          let days = y0 * 365 + Math.floor(
            y0 / 4
          ) - Math.floor(
            y0 / 100
          ) + Math.floor(
            y0 / 400
          );
          const monthDays = [
            31,
            this.isLeapYear(
              y
            ) ? 29 : 28,
            31,
            30,
            31,
            30,
            31,
            31,
            30,
            31,
            30,
            31
          ];
          for (let i = 0; i < m - 1; i++) {
            days += monthDays[i];
          }
          return days + d;
        }
        getBaseDemand(districtId) {
          const mealPeriod = timeSystem.getMealPeriod();
          return citySystem.getMealDemand(
            districtId,
            mealPeriod
          );
        }
        getDemandBreakdown(districtId) {
          const district = citySystem.getDistrict(
            districtId
          );
          if (!district) {
            return null;
          }
          const mealPeriod = timeSystem.getMealPeriod();
          const mealRatio = district.mealDemand[mealPeriod] || 0;
          const dynamicDailyDemand = district.baseDemand;
          const beforeWeather = dynamicDailyDemand * mealRatio;
          const weatherFactor = this.getWeatherModifier();
          const weekdayFactor = this.getWeekdayModifier();
          const total = Math.max(
            0,
            Math.floor(
              beforeWeather * weatherFactor * weekdayFactor
            )
          );
          return {
            districtId,
            mealPeriod,
            effectivePopulation: district.population,
            residentPopulation: district.residentPopulation,
            dynamicDailyDemand,
            mealRatio,
            weatherFactor,
            weekdayFactor,
            eventDemandFactor: district.eventDemandFactor,
            eventTrafficFactor: district.eventTrafficFactor,
            total
          };
        }
        getTotalDemand(districtId) {
          const breakdown = this.getDemandBreakdown(
            districtId
          );
          return breakdown ? breakdown.total : 0;
        }
        getDemandByCustomerType(districtId) {
          const total = this.getTotalDemand(
            districtId
          );
          const mix = this.getCustomerMix(
            districtId
          );
          const result = {};
          let assigned = 0;
          const keys = Object.keys(
            mix
          );
          for (let i = 0; i < keys.length; i++) {
            const typeId = keys[i];
            let amount;
            if (i === keys.length - 1) {
              amount = total - assigned;
            } else {
              amount = Math.floor(
                total * mix[typeId]
              );
              assigned += amount;
            }
            result[typeId] = {
              typeId,
              name: CUSTOMER_TYPES[typeId] ? CUSTOMER_TYPES[typeId].name : typeId,
              demand: Math.max(
                0,
                amount
              )
            };
          }
          return result;
        }
        createDemandPool(districtId) {
          const district = citySystem.getDistrict(
            districtId
          );
          if (!district) {
            return null;
          }
          const mealPeriod = timeSystem.getMealPeriod();
          const totalDemand = this.getTotalDemand(
            districtId
          );
          const customerGroups = this.getDemandByCustomerType(
            districtId
          );
          return {
            districtId,
            districtName: district.name,
            mealPeriod,
            totalDemand,
            remainingDemand: totalDemand,
            customerGroups,
            createdAt: Date.now()
          };
        }
        consumeDemand(pool, amount) {
          if (!pool || amount <= 0) {
            return 0;
          }
          const actual = Math.min(
            pool.remainingDemand,
            Math.floor(
              amount
            )
          );
          pool.remainingDemand -= actual;
          return actual;
        }
        consumeCustomerType(pool, typeId, amount) {
          if (!pool || !pool.customerGroups || !pool.customerGroups[typeId]) {
            return 0;
          }
          const group = pool.customerGroups[typeId];
          const actual = Math.min(
            group.demand,
            pool.remainingDemand,
            Math.floor(
              amount
            )
          );
          group.demand -= actual;
          pool.remainingDemand -= actual;
          return actual;
        }
        getRemainingRatio(pool) {
          if (!pool || pool.totalDemand <= 0) {
            return 0;
          }
          return pool.remainingDemand / pool.totalDemand;
        }
      };
      var demandSystem = new DemandSystem();
      module.exports = demandSystem;
    }
  });

  // src/property/propertyData.js
  var require_propertyData = __commonJS({
    "src/property/propertyData.js"(exports, module) {
      "use strict";
      var DISTRICT_PROFILES = {
        university: {
          id: "university",
          name: "\u5927\u5B66\u57CE",
          character: "\u6821\u56ED\u6D88\u8D39",
          demandPattern: "\u5348\u9910\u3001\u665A\u9910\u3001\u591C\u5BB5\u96C6\u4E2D",
          averageRentFactor: 0.82,
          vacancyRate: 0.072,
          newListingRate: 0.13,
          takeawayRatio: 0.46,
          weekendFactor: 0.88,
          nightFactor: 1.26
        },
        cbd: {
          id: "cbd",
          name: "\u5546\u4E1A\u4E2D\u5FC3",
          character: "\u9AD8\u5BA2\u5355\u5546\u52A1\u6D88\u8D39",
          demandPattern: "\u5DE5\u4F5C\u65E5\u5348\u9910\u7206\u53D1\uFF0C\u665A\u9910\u5546\u52A1\u9700\u6C42\u7A33\u5B9A",
          averageRentFactor: 1.28,
          vacancyRate: 0.041,
          newListingRate: 0.09,
          takeawayRatio: 0.31,
          weekendFactor: 0.74,
          nightFactor: 0.92
        },
        hightech: {
          id: "hightech",
          name: "\u9AD8\u65B0\u533A",
          character: "\u79D1\u6280\u56ED\u4E0E\u65B0\u793E\u533A",
          demandPattern: "\u5DE5\u4F5C\u65E5\u5348\u9910\u5F3A\uFF0C\u793E\u533A\u665A\u9910\u589E\u957F\u5FEB",
          averageRentFactor: 1.02,
          vacancyRate: 0.066,
          newListingRate: 0.16,
          takeawayRatio: 0.42,
          weekendFactor: 0.79,
          nightFactor: 0.86
        },
        oldtown: {
          id: "oldtown",
          name: "\u8001\u57CE\u533A",
          character: "\u5C45\u6C11\u719F\u5BA2\u578B\u6D88\u8D39",
          demandPattern: "\u65E9\u9910\u4E0E\u665A\u9910\u7A33\u5B9A\uFF0C\u590D\u8D2D\u7387\u9AD8",
          averageRentFactor: 0.72,
          vacancyRate: 0.058,
          newListingRate: 0.08,
          takeawayRatio: 0.27,
          weekendFactor: 1.08,
          nightFactor: 0.84
        },
        village: {
          id: "village",
          name: "\u57CE\u4E2D\u6751",
          character: "\u4F4E\u4EF7\u9AD8\u9891\u751F\u6D3B\u6D88\u8D39",
          demandPattern: "\u65E9\u9910\u3001\u665A\u9910\u3001\u591C\u5BB5\u5F3A",
          averageRentFactor: 0.54,
          vacancyRate: 0.094,
          newListingRate: 0.18,
          takeawayRatio: 0.51,
          weekendFactor: 1.04,
          nightFactor: 1.38
        },
        market: {
          id: "market",
          name: "\u4E1C\u95E8\u5E02\u573A",
          character: "\u5546\u8D29\u4E0E\u5C45\u6C11\u6DF7\u5408\u6D88\u8D39",
          demandPattern: "\u6E05\u6668\u4E0E\u5348\u9910\u5F3A\uFF0C\u95ED\u5E02\u540E\u5FEB\u901F\u56DE\u843D",
          averageRentFactor: 0.63,
          vacancyRate: 0.081,
          newListingRate: 0.12,
          takeawayRatio: 0.24,
          weekendFactor: 1.12,
          nightFactor: 0.61
        },
        industry: {
          id: "industry",
          name: "\u5DE5\u4E1A\u56ED",
          character: "\u5DE5\u5382\u4E0E\u7269\u6D41\u56ED\u521A\u9700",
          demandPattern: "\u5348\u9910\u96C6\u4E2D\uFF0C\u65E9\u665A\u73ED\u5F62\u6210\u7B2C\u4E8C\u6CE2\u9700\u6C42",
          averageRentFactor: 0.59,
          vacancyRate: 0.087,
          newListingRate: 0.14,
          takeawayRatio: 0.39,
          weekendFactor: 0.67,
          nightFactor: 0.78
        }
      };
      var STREETS = [
        // 大学城
        {
          id: "uni_xuefu",
          districtId: "university",
          name: "\u5B66\u5E9C\u8DEF",
          type: "\u6821\u56ED\u4E3B\u8857",
          traffic: 94,
          vehicleTraffic: 48,
          competition: 91,
          rentFactor: 1.18,
          delivery: 91,
          parking: 43,
          night: 86,
          office: 18,
          resident: 38,
          student: 100,
          worker: 12
        },
        {
          id: "uni_qingnian",
          districtId: "university",
          name: "\u9752\u5E74\u8857",
          type: "\u751F\u6D3B\u5546\u4E1A\u8857",
          traffic: 88,
          vehicleTraffic: 52,
          competition: 84,
          rentFactor: 1.02,
          delivery: 93,
          parking: 46,
          night: 96,
          office: 14,
          resident: 61,
          student: 92,
          worker: 19
        },
        {
          id: "uni_nanyuan",
          districtId: "university",
          name: "\u5357\u82D1\u8DEF",
          type: "\u5BBF\u820D\u751F\u6D3B\u5708",
          traffic: 79,
          vehicleTraffic: 41,
          competition: 73,
          rentFactor: 0.86,
          delivery: 88,
          parking: 38,
          night: 91,
          office: 8,
          resident: 57,
          student: 89,
          worker: 15
        },
        {
          id: "uni_tiyu",
          districtId: "university",
          name: "\u4F53\u80B2\u9986\u8DEF",
          type: "\u8D5B\u4E8B\u6D3B\u52A8\u8857",
          traffic: 71,
          vehicleTraffic: 67,
          competition: 58,
          rentFactor: 0.91,
          delivery: 72,
          parking: 74,
          night: 73,
          office: 17,
          resident: 36,
          student: 78,
          worker: 9
        },
        {
          id: "uni_shuyuan",
          districtId: "university",
          name: "\u4E66\u9662\u8857",
          type: "\u6587\u6559\u793E\u533A\u8857",
          traffic: 68,
          vehicleTraffic: 36,
          competition: 61,
          rentFactor: 0.79,
          delivery: 84,
          parking: 31,
          night: 64,
          office: 22,
          resident: 62,
          student: 74,
          worker: 11
        },
        {
          id: "uni_ximen",
          districtId: "university",
          name: "\u897F\u95E8\u5DF7",
          type: "\u6821\u95E8\u5C0F\u5403\u8857",
          traffic: 90,
          vehicleTraffic: 24,
          competition: 95,
          rentFactor: 1.09,
          delivery: 96,
          parking: 18,
          night: 100,
          office: 7,
          resident: 43,
          student: 100,
          worker: 21
        },
        // 商业中心
        {
          id: "cbd_finance",
          districtId: "cbd",
          name: "\u91D1\u878D\u5927\u9053",
          type: "\u6838\u5FC3\u5199\u5B57\u697C\u8857",
          traffic: 98,
          vehicleTraffic: 89,
          competition: 96,
          rentFactor: 1.32,
          delivery: 78,
          parking: 62,
          night: 71,
          office: 100,
          resident: 22,
          student: 3,
          worker: 36
        },
        {
          id: "cbd_central",
          districtId: "cbd",
          name: "\u4E2D\u592E\u8857",
          type: "\u7EFC\u5408\u5546\u4E1A\u8857",
          traffic: 96,
          vehicleTraffic: 76,
          competition: 94,
          rentFactor: 1.25,
          delivery: 82,
          parking: 58,
          night: 88,
          office: 91,
          resident: 34,
          student: 8,
          worker: 27
        },
        {
          id: "cbd_riverside",
          districtId: "cbd",
          name: "\u6EE8\u6CB3\u8DEF",
          type: "\u591C\u95F4\u6D88\u8D39\u5E26",
          traffic: 84,
          vehicleTraffic: 64,
          competition: 81,
          rentFactor: 1.04,
          delivery: 75,
          parking: 69,
          night: 98,
          office: 58,
          resident: 49,
          student: 9,
          worker: 16
        },
        {
          id: "cbd_plaza",
          districtId: "cbd",
          name: "\u65F6\u4EE3\u5E7F\u573A\u8857",
          type: "\u5546\u573A\u96C6\u7FA4",
          traffic: 99,
          vehicleTraffic: 71,
          competition: 100,
          rentFactor: 1.41,
          delivery: 66,
          parking: 81,
          night: 92,
          office: 82,
          resident: 29,
          student: 11,
          worker: 25
        },
        {
          id: "cbd_station",
          districtId: "cbd",
          name: "\u67A2\u7EBD\u5357\u8DEF",
          type: "\u4EA4\u901A\u67A2\u7EBD\u5546\u4E1A",
          traffic: 93,
          vehicleTraffic: 98,
          competition: 86,
          rentFactor: 1.16,
          delivery: 73,
          parking: 54,
          night: 83,
          office: 71,
          resident: 21,
          student: 13,
          worker: 49
        },
        {
          id: "cbd_backstreet",
          districtId: "cbd",
          name: "\u4E07\u8C61\u540E\u8857",
          type: "\u5199\u5B57\u697C\u540E\u8857",
          traffic: 78,
          vehicleTraffic: 39,
          competition: 76,
          rentFactor: 0.88,
          delivery: 94,
          parking: 33,
          night: 69,
          office: 89,
          resident: 31,
          student: 6,
          worker: 39
        },
        // 高新区
        {
          id: "ht_kechuang",
          districtId: "hightech",
          name: "\u79D1\u521B\u5927\u9053",
          type: "\u79D1\u6280\u529E\u516C\u8857",
          traffic: 91,
          vehicleTraffic: 83,
          competition: 84,
          rentFactor: 1.13,
          delivery: 87,
          parking: 76,
          night: 72,
          office: 100,
          resident: 27,
          student: 4,
          worker: 48
        },
        {
          id: "ht_software",
          districtId: "hightech",
          name: "\u8F6F\u4EF6\u56ED\u8DEF",
          type: "\u56ED\u533A\u914D\u5957\u8857",
          traffic: 84,
          vehicleTraffic: 71,
          competition: 72,
          rentFactor: 0.97,
          delivery: 91,
          parking: 82,
          night: 61,
          office: 94,
          resident: 22,
          student: 5,
          worker: 53
        },
        {
          id: "ht_zhigu",
          districtId: "hightech",
          name: "\u667A\u8C37\u8857",
          type: "\u65B0\u793E\u533A\u5546\u4E1A",
          traffic: 73,
          vehicleTraffic: 68,
          competition: 59,
          rentFactor: 0.82,
          delivery: 86,
          parking: 77,
          night: 68,
          office: 64,
          resident: 76,
          student: 7,
          worker: 31
        },
        {
          id: "ht_chuangye",
          districtId: "hightech",
          name: "\u521B\u4E1A\u8DEF",
          type: "\u5B75\u5316\u5668\u8857\u533A",
          traffic: 78,
          vehicleTraffic: 61,
          competition: 66,
          rentFactor: 0.89,
          delivery: 92,
          parking: 70,
          night: 74,
          office: 88,
          resident: 35,
          student: 12,
          worker: 33
        },
        {
          id: "ht_hupan",
          districtId: "hightech",
          name: "\u6E56\u7554\u8857",
          type: "\u54C1\u8D28\u793E\u533A\u8857",
          traffic: 69,
          vehicleTraffic: 57,
          competition: 55,
          rentFactor: 0.93,
          delivery: 79,
          parking: 84,
          night: 79,
          office: 49,
          resident: 92,
          student: 6,
          worker: 17
        },
        {
          id: "ht_metro",
          districtId: "hightech",
          name: "\u5730\u94C1\u79D1\u6280\u57CE\u7AD9\u524D\u8857",
          type: "\u8F68\u9053\u7AD9\u70B9\u5546\u4E1A",
          traffic: 89,
          vehicleTraffic: 58,
          competition: 78,
          rentFactor: 1.06,
          delivery: 88,
          parking: 55,
          night: 77,
          office: 86,
          resident: 54,
          student: 8,
          worker: 42
        },
        // 老城区
        {
          id: "old_jiefang",
          districtId: "oldtown",
          name: "\u89E3\u653E\u8DEF",
          type: "\u8001\u57CE\u4E3B\u8857",
          traffic: 84,
          vehicleTraffic: 67,
          competition: 78,
          rentFactor: 1.08,
          delivery: 75,
          parking: 35,
          night: 69,
          office: 24,
          resident: 100,
          student: 13,
          worker: 32
        },
        {
          id: "old_changle",
          districtId: "oldtown",
          name: "\u957F\u4E50\u8857",
          type: "\u793E\u533A\u9910\u996E\u8857",
          traffic: 78,
          vehicleTraffic: 43,
          competition: 71,
          rentFactor: 0.88,
          delivery: 82,
          parking: 29,
          night: 73,
          office: 13,
          resident: 96,
          student: 11,
          worker: 29
        },
        {
          id: "old_beimen",
          districtId: "oldtown",
          name: "\u5317\u95E8\u5DF7",
          type: "\u8001\u8857\u5DF7\u53E3",
          traffic: 64,
          vehicleTraffic: 22,
          competition: 51,
          rentFactor: 0.64,
          delivery: 61,
          parking: 17,
          night: 58,
          office: 6,
          resident: 91,
          student: 8,
          worker: 18
        },
        {
          id: "old_miaoqian",
          districtId: "oldtown",
          name: "\u5E99\u524D\u8857",
          type: "\u4F20\u7EDF\u5546\u4E1A\u8857",
          traffic: 88,
          vehicleTraffic: 31,
          competition: 82,
          rentFactor: 1.01,
          delivery: 69,
          parking: 21,
          night: 82,
          office: 9,
          resident: 88,
          student: 14,
          worker: 26
        },
        {
          id: "old_xihe",
          districtId: "oldtown",
          name: "\u897F\u6CB3\u8DEF",
          type: "\u6EE8\u6C34\u5C45\u6C11\u8857",
          traffic: 70,
          vehicleTraffic: 56,
          competition: 57,
          rentFactor: 0.73,
          delivery: 77,
          parking: 48,
          night: 64,
          office: 11,
          resident: 94,
          student: 8,
          worker: 20
        },
        {
          id: "old_hospital",
          districtId: "oldtown",
          name: "\u4EBA\u6C11\u533B\u9662\u8857",
          type: "\u533B\u9662\u5468\u8FB9\u5546\u4E1A",
          traffic: 86,
          vehicleTraffic: 72,
          competition: 74,
          rentFactor: 0.96,
          delivery: 88,
          parking: 42,
          night: 76,
          office: 28,
          resident: 71,
          student: 5,
          worker: 44
        },
        // 城中村
        {
          id: "vil_xinmin",
          districtId: "village",
          name: "\u65B0\u6C11\u8857",
          type: "\u57CE\u4E2D\u6751\u4E3B\u8857",
          traffic: 91,
          vehicleTraffic: 46,
          competition: 84,
          rentFactor: 1.05,
          delivery: 96,
          parking: 27,
          night: 100,
          office: 12,
          resident: 95,
          student: 31,
          worker: 83
        },
        {
          id: "vil_chengnan",
          districtId: "village",
          name: "\u57CE\u5357\u8DEF",
          type: "\u901A\u52E4\u9053\u8DEF",
          traffic: 81,
          vehicleTraffic: 79,
          competition: 68,
          rentFactor: 0.88,
          delivery: 91,
          parking: 51,
          night: 82,
          office: 9,
          resident: 78,
          student: 22,
          worker: 94
        },
        {
          id: "vil_anju",
          districtId: "village",
          name: "\u5B89\u5C45\u5DF7",
          type: "\u79DF\u4F4F\u751F\u6D3B\u533A",
          traffic: 69,
          vehicleTraffic: 23,
          competition: 54,
          rentFactor: 0.69,
          delivery: 83,
          parking: 20,
          night: 87,
          office: 5,
          resident: 100,
          student: 26,
          worker: 72
        },
        {
          id: "vil_night",
          districtId: "village",
          name: "\u591C\u5E02\u8857",
          type: "\u591C\u95F4\u644A\u5E97\u8857",
          traffic: 77,
          vehicleTraffic: 19,
          competition: 92,
          rentFactor: 0.97,
          delivery: 88,
          parking: 14,
          night: 100,
          office: 4,
          resident: 83,
          student: 38,
          worker: 79
        },
        {
          id: "vil_factory",
          districtId: "village",
          name: "\u5382\u524D\u8DEF",
          type: "\u5DE5\u5382\u751F\u6D3B\u8857",
          traffic: 75,
          vehicleTraffic: 61,
          competition: 63,
          rentFactor: 0.76,
          delivery: 87,
          parking: 47,
          night: 72,
          office: 6,
          resident: 69,
          student: 14,
          worker: 100
        },
        {
          id: "vil_bridge",
          districtId: "village",
          name: "\u6865\u5934\u8857",
          type: "\u4EA4\u901A\u8282\u70B9\u5546\u4E1A",
          traffic: 83,
          vehicleTraffic: 91,
          competition: 70,
          rentFactor: 0.84,
          delivery: 79,
          parking: 44,
          night: 79,
          office: 7,
          resident: 75,
          student: 18,
          worker: 86
        },
        // 东门市场
        {
          id: "mkt_dongmen",
          districtId: "market",
          name: "\u4E1C\u95E8\u8857",
          type: "\u5E02\u573A\u5165\u53E3\u8857",
          traffic: 96,
          vehicleTraffic: 61,
          competition: 87,
          rentFactor: 1.12,
          delivery: 79,
          parking: 31,
          night: 54,
          office: 5,
          resident: 78,
          student: 8,
          worker: 74
        },
        {
          id: "mkt_trade",
          districtId: "market",
          name: "\u5546\u8D38\u8DEF",
          type: "\u6279\u53D1\u914D\u5957\u8857",
          traffic: 86,
          vehicleTraffic: 92,
          competition: 71,
          rentFactor: 0.91,
          delivery: 81,
          parking: 67,
          night: 49,
          office: 8,
          resident: 56,
          student: 3,
          worker: 91
        },
        {
          id: "mkt_caishi",
          districtId: "market",
          name: "\u83DC\u5E02\u5DF7",
          type: "\u5C45\u6C11\u83DC\u5E02\u573A\u8857",
          traffic: 74,
          vehicleTraffic: 34,
          competition: 59,
          rentFactor: 0.72,
          delivery: 63,
          parking: 23,
          night: 42,
          office: 3,
          resident: 100,
          student: 7,
          worker: 53
        },
        {
          id: "mkt_fresh",
          districtId: "market",
          name: "\u9C9C\u6D3B\u6C34\u4EA7\u8857",
          type: "\u4E13\u4E1A\u5E02\u573A\u8857",
          traffic: 82,
          vehicleTraffic: 77,
          competition: 65,
          rentFactor: 0.86,
          delivery: 58,
          parking: 52,
          night: 38,
          office: 3,
          resident: 61,
          student: 2,
          worker: 88
        },
        {
          id: "mkt_station",
          districtId: "market",
          name: "\u8D27\u8FD0\u7AD9\u8DEF",
          type: "\u7269\u6D41\u914D\u5957\u8857",
          traffic: 72,
          vehicleTraffic: 100,
          competition: 48,
          rentFactor: 0.67,
          delivery: 72,
          parking: 81,
          night: 57,
          office: 4,
          resident: 37,
          student: 1,
          worker: 100
        },
        {
          id: "mkt_south",
          districtId: "market",
          name: "\u5357\u5E02\u53E3",
          type: "\u5C45\u6C11\u5546\u4E1A\u53E3",
          traffic: 79,
          vehicleTraffic: 57,
          competition: 69,
          rentFactor: 0.83,
          delivery: 84,
          parking: 39,
          night: 64,
          office: 6,
          resident: 94,
          student: 9,
          worker: 58
        },
        // 工业园
        {
          id: "ind_xingye",
          districtId: "industry",
          name: "\u5174\u4E1A\u8DEF",
          type: "\u5DE5\u5382\u4E3B\u5E72\u9053",
          traffic: 87,
          vehicleTraffic: 89,
          competition: 71,
          rentFactor: 1.04,
          delivery: 84,
          parking: 74,
          night: 65,
          office: 13,
          resident: 24,
          student: 1,
          worker: 100
        },
        {
          id: "ind_logistics",
          districtId: "industry",
          name: "\u7269\u6D41\u5927\u9053",
          type: "\u7269\u6D41\u56ED\u914D\u5957",
          traffic: 80,
          vehicleTraffic: 100,
          competition: 59,
          rentFactor: 0.91,
          delivery: 72,
          parking: 93,
          night: 74,
          office: 8,
          resident: 17,
          student: 1,
          worker: 100
        },
        {
          id: "ind_worker",
          districtId: "industry",
          name: "\u5DE5\u4EBA\u8DEF",
          type: "\u5BBF\u820D\u751F\u6D3B\u8857",
          traffic: 74,
          vehicleTraffic: 51,
          competition: 51,
          rentFactor: 0.79,
          delivery: 88,
          parking: 58,
          night: 83,
          office: 7,
          resident: 73,
          student: 3,
          worker: 98
        },
        {
          id: "ind_east",
          districtId: "industry",
          name: "\u4E1C\u5382\u8857",
          type: "\u5236\u9020\u4F01\u4E1A\u914D\u5957\u8857",
          traffic: 68,
          vehicleTraffic: 82,
          competition: 44,
          rentFactor: 0.71,
          delivery: 76,
          parking: 88,
          night: 48,
          office: 10,
          resident: 14,
          student: 0,
          worker: 95
        },
        {
          id: "ind_gate",
          districtId: "industry",
          name: "\u56ED\u533A\u5317\u95E8\u8857",
          type: "\u56ED\u533A\u5165\u53E3\u5546\u4E1A",
          traffic: 89,
          vehicleTraffic: 94,
          competition: 76,
          rentFactor: 1.09,
          delivery: 82,
          parking: 69,
          night: 69,
          office: 17,
          resident: 29,
          student: 1,
          worker: 100
        },
        {
          id: "ind_service",
          districtId: "industry",
          name: "\u7EFC\u5408\u670D\u52A1\u8857",
          type: "\u56ED\u533A\u751F\u6D3B\u4E2D\u5FC3",
          traffic: 82,
          vehicleTraffic: 66,
          competition: 68,
          rentFactor: 0.98,
          delivery: 91,
          parking: 77,
          night: 78,
          office: 24,
          resident: 41,
          student: 2,
          worker: 94
        }
      ];
      var PROPERTY_TYPES = [
        {
          id: "street_shop",
          name: "\u4E34\u8857\u5E95\u5546",
          minArea: 28,
          maxArea: 180,
          floorOptions: ["1\u5C42"],
          frontageMin: 3.2,
          frontageMax: 9,
          visibilityBonus: 12,
          rentFactor: 1.08
        },
        {
          id: "corner_shop",
          name: "\u8F6C\u89D2\u94FA",
          minArea: 45,
          maxArea: 220,
          floorOptions: ["1\u5C42"],
          frontageMin: 6,
          frontageMax: 15,
          visibilityBonus: 22,
          rentFactor: 1.22
        },
        {
          id: "community_shop",
          name: "\u793E\u533A\u5E95\u5546",
          minArea: 35,
          maxArea: 160,
          floorOptions: ["1\u5C42"],
          frontageMin: 3.5,
          frontageMax: 8.5,
          visibilityBonus: 7,
          rentFactor: 0.92
        },
        {
          id: "mall_shop",
          name: "\u5546\u573A\u5185\u94FA",
          minArea: 30,
          maxArea: 260,
          floorOptions: ["B1", "1\u5C42", "2\u5C42", "3\u5C42"],
          frontageMin: 3,
          frontageMax: 10,
          visibilityBonus: 9,
          rentFactor: 1.18
        },
        {
          id: "foodcourt_stall",
          name: "\u7F8E\u98DF\u57CE\u6863\u53E3",
          minArea: 12,
          maxArea: 45,
          floorOptions: ["B1", "1\u5C42", "2\u5C42", "3\u5C42"],
          frontageMin: 2.2,
          frontageMax: 5,
          visibilityBonus: 5,
          rentFactor: 0.74
        },
        {
          id: "office_podium",
          name: "\u5199\u5B57\u697C\u88D9\u623F",
          minArea: 45,
          maxArea: 210,
          floorOptions: ["1\u5C42", "2\u5C42"],
          frontageMin: 3.8,
          frontageMax: 10,
          visibilityBonus: 10,
          rentFactor: 1.12
        },
        {
          id: "market_shop",
          name: "\u5E02\u573A\u95E8\u9762",
          minArea: 18,
          maxArea: 95,
          floorOptions: ["1\u5C42"],
          frontageMin: 2.5,
          frontageMax: 6.5,
          visibilityBonus: 4,
          rentFactor: 0.79
        },
        {
          id: "village_shop",
          name: "\u57CE\u4E2D\u6751\u6CBF\u8857\u94FA",
          minArea: 22,
          maxArea: 130,
          floorOptions: ["1\u5C42", "1-2\u5C42"],
          frontageMin: 2.8,
          frontageMax: 7,
          visibilityBonus: 3,
          rentFactor: 0.66
        },
        {
          id: "detached",
          name: "\u72EC\u680B\u9910\u996E\u94FA",
          minArea: 120,
          maxArea: 520,
          floorOptions: ["1\u5C42", "1-2\u5C42", "1-3\u5C42"],
          frontageMin: 7,
          frontageMax: 22,
          visibilityBonus: 18,
          rentFactor: 1.04
        },
        {
          id: "duplex",
          name: "\u53CC\u5C42\u8857\u94FA",
          minArea: 80,
          maxArea: 300,
          floorOptions: ["1-2\u5C42"],
          frontageMin: 4.5,
          frontageMax: 11,
          visibilityBonus: 8,
          rentFactor: 0.91
        },
        {
          id: "station_shop",
          name: "\u4EA4\u901A\u67A2\u7EBD\u94FA",
          minArea: 20,
          maxArea: 130,
          floorOptions: ["B1", "1\u5C42", "2\u5C42"],
          frontageMin: 2.8,
          frontageMax: 7.5,
          visibilityBonus: 15,
          rentFactor: 1.26
        },
        {
          id: "park_canteen",
          name: "\u56ED\u533A\u9910\u996E\u6863\u53E3",
          minArea: 20,
          maxArea: 90,
          floorOptions: ["1\u5C42", "2\u5C42"],
          frontageMin: 2.5,
          frontageMax: 6,
          visibilityBonus: 2,
          rentFactor: 0.68
        }
      ];
      var LAYOUT_TYPES = [
        {
          id: "single_bay",
          name: "\u5355\u5F00\u95F4",
          usableRatio: 0.9,
          kitchenEase: 62,
          seatsFactor: 0.64
        },
        {
          id: "double_bay",
          name: "\u53CC\u5F00\u95F4",
          usableRatio: 0.92,
          kitchenEase: 78,
          seatsFactor: 0.72
        },
        {
          id: "long_narrow",
          name: "\u72ED\u957F\u578B",
          usableRatio: 0.87,
          kitchenEase: 55,
          seatsFactor: 0.57
        },
        {
          id: "front_back",
          name: "\u524D\u5E97\u540E\u53A8",
          usableRatio: 0.91,
          kitchenEase: 94,
          seatsFactor: 0.66
        },
        {
          id: "corner_l",
          name: "L\u578B\u8F6C\u89D2",
          usableRatio: 0.86,
          kitchenEase: 68,
          seatsFactor: 0.63
        },
        {
          id: "through_shop",
          name: "\u524D\u540E\u901A\u94FA",
          usableRatio: 0.93,
          kitchenEase: 88,
          seatsFactor: 0.69
        },
        {
          id: "duplex_layout",
          name: "\u4E0A\u4E0B\u4E24\u5C42",
          usableRatio: 0.82,
          kitchenEase: 59,
          seatsFactor: 0.75
        },
        {
          id: "high_ceiling",
          name: "\u6311\u9AD8\u5F00\u95F4",
          usableRatio: 0.89,
          kitchenEase: 71,
          seatsFactor: 0.67
        },
        {
          id: "mall_rect",
          name: "\u5546\u573A\u77E9\u5F62\u94FA",
          usableRatio: 0.94,
          kitchenEase: 73,
          seatsFactor: 0.7
        },
        {
          id: "stall",
          name: "\u6863\u53E3\u578B",
          usableRatio: 0.96,
          kitchenEase: 82,
          seatsFactor: 0.18
        }
      ];
      var PREVIOUS_BUSINESS_TYPES = [
        "\u4E2D\u5F0F\u5FEB\u9910",
        "\u9762\u9986",
        "\u7C73\u7C89\u5E97",
        "\u706B\u9505\u5E97",
        "\u70E7\u70E4\u5E97",
        "\u5976\u8336\u5E97",
        "\u5496\u5561\u5E97",
        "\u4FBF\u5229\u5E97",
        "\u65E9\u9910\u52A0\u76DF",
        "\u70D8\u7119\u5E97",
        "\u5DDD\u6E58\u83DC\u9986",
        "\u65E5\u5F0F\u7B80\u9910",
        "\u7A7A\u7F6E\u6BDB\u576F"
      ];
      var VACANCY_REASONS = [
        "\u539F\u79DF\u6237\u5408\u540C\u5230\u671F",
        "\u539F\u5E97\u7ECF\u8425\u4E8F\u635F\u9000\u51FA",
        "\u623F\u4E1C\u4E3B\u52A8\u6536\u56DE\u91CD\u65B0\u51FA\u79DF",
        "\u54C1\u724C\u8FC1\u5740",
        "\u539F\u5E97\u9762\u79EF\u4E0D\u8DB3\u5347\u7EA7\u642C\u8FC1",
        "\u7269\u4E1A\u4E1A\u6001\u8C03\u6574",
        "\u539F\u5E97\u8F6C\u8BA9\u672A\u6210\u4EA4\u540E\u9000\u79DF"
      ];
      var RISK_LIBRARY = [
        { id: "none", name: "\u65E0\u660E\u663E\u786C\u4F24", level: 0, costImpact: 0 },
        { id: "exhaust_rework", name: "\u6392\u70DF\u7BA1\u9053\u9700\u6574\u6539", level: 2, costImpact: 12e3 },
        { id: "drainage", name: "\u540E\u53A8\u6392\u6C34\u9700\u8981\u6539\u9020", level: 2, costImpact: 9e3 },
        { id: "power", name: "\u73B0\u6709\u7535\u5BB9\u4E0D\u8DB3", level: 2, costImpact: 7e3 },
        { id: "gas_limit", name: "\u5929\u7136\u6C14\u589E\u5BB9\u5BA1\u6279\u8F83\u6162", level: 2, costImpact: 5e3 },
        { id: "sign_limit", name: "\u95E8\u5934\u62DB\u724C\u5C3A\u5BF8\u53D7\u9650\u5236", level: 1, costImpact: 2500 },
        { id: "noise", name: "\u697C\u4E0A\u5C45\u6C11\u5BF9\u591C\u95F4\u566A\u97F3\u654F\u611F", level: 2, costImpact: 0 },
        { id: "parking", name: "\u95E8\u524D\u505C\u8F66\u6761\u4EF6\u5DEE", level: 1, costImpact: 0 },
        {
          id: "landlord_sale",
          name: "\u623F\u4E1C\u672A\u6765\u4E24\u5E74\u5B58\u5728\u51FA\u552E\u610F\u5411",
          level: 3,
          costImpact: 0
        },
        { id: "roadwork", name: "\u95E8\u524D\u9053\u8DEF\u8BA1\u5212\u65BD\u5DE5", level: 3, costImpact: 0 },
        { id: "fire", name: "\u6D88\u9632\u55B7\u6DCB\u9700\u8981\u8865\u70B9", level: 2, costImpact: 8e3 },
        { id: "grease", name: "\u9694\u6CB9\u8BBE\u65BD\u4E0D\u8FBE\u6807", level: 2, costImpact: 6500 }
      ];
      var LANDLORD_PROFILES = [
        {
          id: "stable_personal",
          name: "\u7A33\u5065\u578B\u4E2A\u4EBA\u623F\u4E1C",
          negotiation: 58,
          renewalRisk: 22,
          inspectionStrictness: 46
        },
        {
          id: "price_personal",
          name: "\u4EF7\u683C\u654F\u611F\u578B\u4E2A\u4EBA\u623F\u4E1C",
          negotiation: 74,
          renewalRisk: 38,
          inspectionStrictness: 39
        },
        {
          id: "commercial_company",
          name: "\u5546\u4E1A\u8FD0\u8425\u516C\u53F8",
          negotiation: 31,
          renewalRisk: 16,
          inspectionStrictness: 84
        },
        {
          id: "second_landlord",
          name: "\u4E8C\u623F\u4E1C\u8F6C\u79DF",
          negotiation: 66,
          renewalRisk: 67,
          inspectionStrictness: 28
        },
        {
          id: "family_owner",
          name: "\u5BB6\u5EAD\u5171\u540C\u6301\u6709",
          negotiation: 47,
          renewalRisk: 44,
          inspectionStrictness: 52
        },
        {
          id: "asset_company",
          name: "\u8D44\u4EA7\u7BA1\u7406\u516C\u53F8",
          negotiation: 24,
          renewalRisk: 18,
          inspectionStrictness: 91
        }
      ];
      var BROKERS = [
        {
          id: "broker_chen",
          name: "\u9648\u542F\u660E",
          age: 34,
          agency: "\u6D77\u57CE\u5546\u4E1A\u5730\u4EA7",
          reliability: 86,
          feeRate: 0.5,
          specialty: "\u4E34\u8857\u9910\u996E\u94FA",
          inventoryStrength: 89,
          negotiation: 76
        },
        {
          id: "broker_zhou",
          name: "\u5468\u5A49\u5B81",
          age: 29,
          agency: "\u5B89\u5C45\u5546\u4E1A",
          reliability: 78,
          feeRate: 0.4,
          specialty: "\u6821\u56ED\u4E0E\u793E\u533A\u5546\u94FA",
          inventoryStrength: 82,
          negotiation: 69
        },
        {
          id: "broker_luo",
          name: "\u7F57\u5FD7\u5F3A",
          age: 42,
          agency: "\u767E\u6C47\u5546\u94FA\u4E2D\u5FC3",
          reliability: 92,
          feeRate: 0.65,
          specialty: "\u9910\u996E\u8F6C\u8BA9\u94FA",
          inventoryStrength: 91,
          negotiation: 88
        },
        {
          id: "broker_he",
          name: "\u4F55\u8FDC\u822A",
          age: 38,
          agency: "\u57CE\u5E02\u94FA\u7F51",
          reliability: 73,
          feeRate: 0.35,
          specialty: "\u5DE5\u4E1A\u56ED\u4E0E\u5E02\u573A\u95E8\u9762",
          inventoryStrength: 85,
          negotiation: 63
        },
        {
          id: "broker_sun",
          name: "\u5B59\u96C5\u7434",
          age: 31,
          agency: "\u4E07\u94FA\u8054\u884C",
          reliability: 88,
          feeRate: 0.55,
          specialty: "\u5546\u573A\u4E0E\u5199\u5B57\u697C\u5546\u4E1A",
          inventoryStrength: 87,
          negotiation: 81
        },
        {
          id: "broker_ma",
          name: "\u9A6C\u56FD\u6881",
          age: 46,
          agency: "\u672C\u5730\u5546\u94FA\u901A",
          reliability: 81,
          feeRate: 0.45,
          specialty: "\u8001\u57CE\u533A\u4E0E\u57CE\u4E2D\u6751\u5546\u94FA",
          inventoryStrength: 93,
          negotiation: 84
        }
      ];
      var PAYMENT_CYCLES = [
        { id: "monthly", name: "\u62BC\u540E\u6708\u4ED8", monthsPerPayment: 1, rentDiscount: 0 },
        {
          id: "quarterly",
          name: "\u62BC\u540E\u5B63\u4ED8",
          monthsPerPayment: 3,
          rentDiscount: 0.01
        },
        { id: "halfyear", name: "\u534A\u5E74\u4ED8", monthsPerPayment: 6, rentDiscount: 0.025 }
      ];
      module.exports = {
        DISTRICT_PROFILES,
        STREETS,
        PROPERTY_TYPES,
        LAYOUT_TYPES,
        PREVIOUS_BUSINESS_TYPES,
        VACANCY_REASONS,
        RISK_LIBRARY,
        LANDLORD_PROFILES,
        BROKERS,
        PAYMENT_CYCLES
      };
    }
  });

  // src/property/propertySystem.js
  var require_propertySystem = __commonJS({
    "src/property/propertySystem.js"(exports, module) {
      "use strict";
      var data = require_propertyData();
      var DEFAULT_LISTINGS_PER_STREET = 8;
      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }
      function roundTo(value, step) {
        return Math.round(value / step) * step;
      }
      function hashText(text) {
        let value = 2166136261;
        for (let i = 0; i < text.length; i++) {
          value ^= text.charCodeAt(i);
          value = Math.imul(value, 16777619);
        }
        return value >>> 0;
      }
      function pseudo(seed, salt) {
        let x = seed + salt * 374761393 >>> 0;
        x = Math.imul(x ^ x >>> 13, 1274126177);
        x = (x ^ x >>> 16) >>> 0;
        return x / 4294967295;
      }
      function pick(list, seed, salt) {
        if (!Array.isArray(list) || list.length === 0) {
          return null;
        }
        const index = Math.floor(pseudo(seed, salt) * list.length) % list.length;
        return list[index];
      }
      function copy(value) {
        return JSON.parse(JSON.stringify(value));
      }
      var PropertySystem = class {
        constructor() {
          this.marketEpoch = 1;
        }
        setMarketEpoch(epoch) {
          const value = Math.max(1, Math.floor(Number(epoch) || 1));
          this.marketEpoch = value;
          return value;
        }
        getMarketEpoch() {
          return this.marketEpoch;
        }
        getDistrictProfile(districtId) {
          const item = data.DISTRICT_PROFILES[districtId];
          return item ? copy(item) : null;
        }
        getStreets(districtId) {
          return data.STREETS.filter(
            (street) => street.districtId === districtId
          ).map(copy);
        }
        getStreet(streetId) {
          const item = data.STREETS.find((street) => street.id === streetId);
          return item ? copy(item) : null;
        }
        getPropertyType(typeId) {
          const item = data.PROPERTY_TYPES.find((type) => type.id === typeId);
          return item ? copy(item) : null;
        }
        getBroker(brokerId) {
          const item = data.BROKERS.find((broker) => broker.id === brokerId);
          return item ? copy(item) : null;
        }
        getBrokers() {
          return data.BROKERS.map(copy);
        }
        choosePropertyTypesForStreet(street) {
          const all = data.PROPERTY_TYPES;
          if (street.type.indexOf("\u5546\u573A") >= 0) {
            return all.filter(
              (item) => ["mall_shop", "foodcourt_stall", "street_shop", "corner_shop"].includes(
                item.id
              )
            );
          }
          if (street.type.indexOf("\u5199\u5B57\u697C") >= 0 || street.type.indexOf("\u79D1\u6280") >= 0 || street.type.indexOf("\u56ED\u533A") >= 0) {
            return all.filter(
              (item) => [
                "office_podium",
                "street_shop",
                "community_shop",
                "park_canteen",
                "corner_shop"
              ].includes(item.id)
            );
          }
          if (street.districtId === "market") {
            return all.filter(
              (item) => [
                "market_shop",
                "street_shop",
                "foodcourt_stall",
                "corner_shop"
              ].includes(item.id)
            );
          }
          if (street.districtId === "village") {
            return all.filter(
              (item) => ["village_shop", "street_shop", "duplex", "community_shop"].includes(
                item.id
              )
            );
          }
          if (street.districtId === "industry") {
            return all.filter(
              (item) => ["park_canteen", "street_shop", "community_shop", "detached"].includes(
                item.id
              )
            );
          }
          return all.filter(
            (item) => [
              "street_shop",
              "corner_shop",
              "community_shop",
              "duplex",
              "detached"
            ].includes(item.id)
          );
        }
        generateListing(streetId, index) {
          const street = data.STREETS.find((item) => item.id === streetId);
          if (!street) {
            return null;
          }
          const district = data.DISTRICT_PROFILES[street.districtId];
          if (!district) {
            return null;
          }
          const seed = hashText(streetId + ":" + index + ":" + this.marketEpoch);
          const typePool = this.choosePropertyTypesForStreet(street);
          const propertyType = pick(typePool, seed, 1);
          const layoutType = pick(data.LAYOUT_TYPES, seed, 2);
          const areaRange = propertyType.maxArea - propertyType.minArea;
          let grossArea = propertyType.minArea + Math.round(areaRange * pseudo(seed, 3));
          grossArea = Math.max(
            propertyType.minArea,
            Math.min(propertyType.maxArea, grossArea)
          );
          const usableArea = Math.max(
            10,
            Math.round(grossArea * layoutType.usableRatio)
          );
          const kitchenSuggestedArea = Math.max(
            8,
            Math.round(usableArea * (0.26 + pseudo(seed, 4) * 0.12))
          );
          const diningSuggestedArea = Math.max(
            0,
            usableArea - kitchenSuggestedArea - Math.round(usableArea * 0.13)
          );
          const seatEstimate = Math.max(
            propertyType.id === "foodcourt_stall" || propertyType.id === "park_canteen" ? 0 : 6,
            Math.floor(diningSuggestedArea * layoutType.seatsFactor / 1.55)
          );
          const frontage = Number(
            (propertyType.frontageMin + (propertyType.frontageMax - propertyType.frontageMin) * pseudo(seed, 5)).toFixed(1)
          );
          const depth = Number((grossArea / Math.max(2.4, frontage)).toFixed(1));
          const floor = pick(propertyType.floorOptions, seed, 6);
          const ceilingHeight = Number(
            (3 + pseudo(seed, 7) * (propertyType.id === "detached" ? 2.1 : 1.2)).toFixed(1)
          );
          const baseRentPerSqm = 42 + street.traffic * 0.52 + street.competition * 0.18;
          const rentPerSqm = roundTo(
            baseRentPerSqm * district.averageRentFactor * street.rentFactor * propertyType.rentFactor * (0.88 + pseudo(seed, 8) * 0.24),
            1
          );
          const monthlyRent = roundTo(grossArea * rentPerSqm, 100);
          const propertyFeePerSqm = floor === "B1" || propertyType.id === "mall_shop" || propertyType.id === "office_podium" ? roundTo(4 + pseudo(seed, 9) * 16, 0.5) : roundTo(1 + pseudo(seed, 9) * 5, 0.5);
          const propertyFee = roundTo(grossArea * propertyFeePerSqm, 10);
          const depositMonths = 1 + Math.floor(pseudo(seed, 10) * 3);
          const paymentCycle = pick(data.PAYMENT_CYCLES, seed, 11);
          const freeRentDays = 3 + Math.floor(pseudo(seed, 12) * 28);
          const leaseYears = 1 + Math.floor(pseudo(seed, 13) * 5);
          const annualIncrease = Number((pseudo(seed, 14) * 0.08).toFixed(3));
          const previousBusiness = pick(data.PREVIOUS_BUSINESS_TYPES, seed, 15);
          const vacantMonths = Math.floor(pseudo(seed, 16) * 15);
          const vacancyReason = pick(data.VACANCY_REASONS, seed, 17);
          const risk1 = pick(data.RISK_LIBRARY, seed, 18);
          const risk2 = pseudo(seed, 19) > 0.68 ? pick(data.RISK_LIBRARY, seed, 20) : null;
          const riskMap = /* @__PURE__ */ new Map();
          [risk1, risk2].filter(Boolean).forEach((risk) => riskMap.set(risk.id, risk));
          if (riskMap.size === 0) {
            riskMap.set("none", data.RISK_LIBRARY[0]);
          }
          if (riskMap.size > 1 && riskMap.has("none")) {
            riskMap.delete("none");
          }
          const risks = Array.from(riskMap.values());
          const landlord = pick(data.LANDLORD_PROFILES, seed, 21);
          const broker = pick(data.BROKERS, seed, 22);
          const transferFee = previousBusiness === "\u7A7A\u7F6E\u6BDB\u576F" ? 0 : roundTo(monthlyRent * (0.4 + pseudo(seed, 23) * 5.6), 500);
          const brokerFee = roundTo(monthlyRent * broker.feeRate, 100);
          const exhaust = propertyType.id === "foodcourt_stall" || propertyType.id === "mall_shop" ? pseudo(seed, 24) > 0.27 : pseudo(seed, 24) > 0.16;
          const gas = pseudo(seed, 25) > (propertyType.id === "mall_shop" || propertyType.id === "foodcourt_stall" ? 0.53 : 0.22);
          const threePhase = pseudo(seed, 26) > 0.18;
          const drainage = pseudo(seed, 27) > 0.14;
          const greaseTrap = pseudo(seed, 28) > 0.31;
          const fireSprinkler = propertyType.id === "mall_shop" || propertyType.id === "office_podium" || propertyType.id === "foodcourt_stall" ? true : pseudo(seed, 29) > 0.24;
          const independentToilet = grossArea >= 80 && pseudo(seed, 30) > 0.36;
          const loadingAccess = clamp(
            Math.round(
              street.vehicleTraffic * 0.62 + street.parking * 0.28 + pseudo(seed, 31) * 18
            ),
            0,
            100
          );
          const riderAccess = clamp(
            Math.round(street.delivery * 0.78 + pseudo(seed, 32) * 22),
            0,
            100
          );
          const visibility = clamp(
            Math.round(
              street.traffic * 0.53 + propertyType.visibilityBonus + frontage * 2.1 + pseudo(seed, 33) * 18
            ),
            0,
            100
          );
          const noiseTolerance = clamp(
            Math.round(34 + street.night * 0.44 + pseudo(seed, 34) * 25),
            0,
            100
          );
          const electricCapacityKw = roundTo(
            25 + grossArea * (0.28 + pseudo(seed, 35) * 0.45),
            5
          );
          const waterPressure = clamp(Math.round(55 + pseudo(seed, 36) * 44), 0, 100);
          const renovationLevel = previousBusiness === "\u7A7A\u7F6E\u6BDB\u576F" ? "\u6BDB\u576F" : pseudo(seed, 37) > 0.58 ? "\u53EF\u7EE7\u7EED\u4F7F\u7528" : "\u9700\u8981\u7FFB\u65B0";
          const renovationEstimate = renovationLevel === "\u6BDB\u576F" ? roundTo(grossArea * (900 + pseudo(seed, 38) * 700), 1e3) : renovationLevel === "\u9700\u8981\u7FFB\u65B0" ? roundTo(grossArea * (420 + pseudo(seed, 38) * 480), 1e3) : roundTo(grossArea * (120 + pseudo(seed, 38) * 230), 1e3);
          const riskRepairCost = risks.reduce(
            (total, risk) => total + (risk.costImpact || 0),
            0
          );
          const firstPaymentMonths = paymentCycle.monthsPerPayment;
          const upfrontCash = monthlyRent * (depositMonths + firstPaymentMonths) + transferFee + brokerFee + renovationEstimate + riskRepairCost;
          const monthlyFixedOccupancyCost = monthlyRent + propertyFee;
          const suitableFor = [];
          if (grossArea <= 55) {
            suitableFor.push("\u5C0F\u5403", "\u5976\u8336", "\u5496\u5561", "\u9762\u9986");
          }
          if (grossArea >= 45 && grossArea <= 160) {
            suitableFor.push("\u5FEB\u9910", "\u7B80\u9910", "\u65E9\u9910\u52A0\u76DF");
          }
          if (grossArea >= 90 && exhaust && gas) {
            suitableFor.push("\u7092\u83DC\u9986", "\u70E7\u70E4");
          }
          if (grossArea >= 140 && exhaust && electricCapacityKw >= 70) {
            suitableFor.push("\u706B\u9505", "\u5927\u578B\u6B63\u9910");
          }
          const code = String(10 + seed % 89);
          return {
            id: streetId + "_P" + String(index + 1).padStart(2, "0"),
            marketEpoch: this.marketEpoch,
            districtId: street.districtId,
            streetId,
            address: street.name + code + "\u53F7",
            propertyTypeId: propertyType.id,
            propertyTypeName: propertyType.name,
            layoutTypeId: layoutType.id,
            layoutTypeName: layoutType.name,
            grossArea,
            usableArea,
            kitchenSuggestedArea,
            diningSuggestedArea,
            seatEstimate,
            floor,
            frontage,
            depth,
            ceilingHeight,
            corner: propertyType.id === "corner_shop",
            monthlyRent,
            rentPerSqm,
            propertyFee,
            propertyFeePerSqm,
            depositMonths,
            paymentCycleId: paymentCycle.id,
            paymentCycleName: paymentCycle.name,
            paymentMonths: paymentCycle.monthsPerPayment,
            freeRentDays,
            leaseYears,
            annualIncrease,
            transferFee,
            brokerFee,
            previousBusiness,
            vacantMonths,
            vacancyReason,
            renovationLevel,
            renovationEstimate,
            landlordId: landlord.id,
            landlordName: landlord.name,
            landlordNegotiation: landlord.negotiation,
            landlordRenewalRisk: landlord.renewalRisk,
            brokerId: broker.id,
            brokerName: broker.name,
            brokerAgency: broker.agency,
            exhaust,
            gas,
            threePhase,
            drainage,
            greaseTrap,
            fireSprinkler,
            independentToilet,
            electricCapacityKw,
            waterPressure,
            loadingAccess,
            riderAccess,
            parkingScore: street.parking,
            visibility,
            noiseTolerance,
            streetTraffic: street.traffic,
            streetCompetition: street.competition,
            nightIndex: street.night,
            risks: risks.map(copy),
            riskLevel: risks.reduce((max, risk) => Math.max(max, risk.level), 0),
            riskRepairCost,
            suitableFor,
            upfrontCash,
            monthlyFixedOccupancyCost
          };
        }
        getListingsByStreet(streetId, count) {
          const amount = Math.max(
            1,
            Math.floor(Number(count) || DEFAULT_LISTINGS_PER_STREET)
          );
          const result = [];
          for (let i = 0; i < amount; i++) {
            const listing = this.generateListing(streetId, i);
            if (listing) {
              result.push(listing);
            }
          }
          return result;
        }
        getListingsByDistrict(districtId) {
          const streets = this.getStreets(districtId);
          const result = [];
          for (let i = 0; i < streets.length; i++) {
            const listings = this.getListingsByStreet(streets[i].id);
            for (let j = 0; j < listings.length; j++) {
              result.push(listings[j]);
            }
          }
          return result;
        }
        getAllListings() {
          const result = [];
          for (let i = 0; i < data.STREETS.length; i++) {
            const listings = this.getListingsByStreet(data.STREETS[i].id);
            for (let j = 0; j < listings.length; j++) {
              result.push(listings[j]);
            }
          }
          return result;
        }
        getListing(listingId) {
          const match = String(listingId || "").match(/^(.*)_P(\d+)$/);
          if (!match) {
            return null;
          }
          const streetId = match[1];
          const index = Number(match[2]) - 1;
          if (index < 0) {
            return null;
          }
          return this.generateListing(streetId, index);
        }
        searchListings(filters) {
          const f = filters || {};
          let source;
          if (f.streetId) {
            source = this.getListingsByStreet(f.streetId);
          } else if (f.districtId) {
            source = this.getListingsByDistrict(f.districtId);
          } else {
            source = this.getAllListings();
          }
          let result = source.filter((listing) => {
            if (f.minArea != null && listing.grossArea < Number(f.minArea)) {
              return false;
            }
            if (f.maxArea != null && listing.grossArea > Number(f.maxArea)) {
              return false;
            }
            if (f.maxMonthlyRent != null && listing.monthlyRent > Number(f.maxMonthlyRent)) {
              return false;
            }
            if (f.maxUpfrontCash != null && listing.upfrontCash > Number(f.maxUpfrontCash)) {
              return false;
            }
            if (f.propertyTypeId && listing.propertyTypeId !== f.propertyTypeId) {
              return false;
            }
            if (f.floor && listing.floor !== f.floor) {
              return false;
            }
            if (f.requireExhaust === true && !listing.exhaust) {
              return false;
            }
            if (f.requireGas === true && !listing.gas) {
              return false;
            }
            if (f.requireThreePhase === true && !listing.threePhase) {
              return false;
            }
            if (f.maxRiskLevel != null && listing.riskLevel > Number(f.maxRiskLevel)) {
              return false;
            }
            if (f.minVisibility != null && listing.visibility < Number(f.minVisibility)) {
              return false;
            }
            if (f.minSeats != null && listing.seatEstimate < Number(f.minSeats)) {
              return false;
            }
            return true;
          });
          const sortBy = f.sortBy || "upfrontCash";
          const sortDir = f.sortDir === "desc" ? -1 : 1;
          result = result.sort((a, b) => {
            const av = Number(a[sortBy]) || 0;
            const bv = Number(b[sortBy]) || 0;
            return (av - bv) * sortDir;
          });
          return result;
        }
        getMarketStats() {
          const all = this.getAllListings();
          const districtCounts = {};
          for (let i = 0; i < all.length; i++) {
            const id = all[i].districtId;
            districtCounts[id] = (districtCounts[id] || 0) + 1;
          }
          const averageRent = all.length ? Math.round(
            all.reduce((sum, item) => sum + item.monthlyRent, 0) / all.length
          ) : 0;
          const averageArea = all.length ? Math.round(
            all.reduce((sum, item) => sum + item.grossArea, 0) / all.length
          ) : 0;
          return {
            marketEpoch: this.marketEpoch,
            districtCount: Object.keys(data.DISTRICT_PROFILES).length,
            streetCount: data.STREETS.length,
            listingCount: all.length,
            averageMonthlyRent: averageRent,
            averageGrossArea: averageArea,
            districtCounts
          };
        }
      };
      module.exports = new PropertySystem();
    }
  });

  // src/property/propertyMarketData.js
  var require_propertyMarketData = __commonJS({
    "src/property/propertyMarketData.js"(exports, module) {
      "use strict";
      var CONFIG = {
        version: 1,
        // 每条街道拥有 18 个潜在商铺槽位。
        // 42 条街道 => 756 个潜在地址。
        potentialSlotsPerStreet: 18,
        // 实际挂牌量会动态浮动，并不会 756 套同时出售/出租。
        minActiveListingsPerStreet: 3,
        maxActiveListingsPerStreet: 12,
        // 历史记录上限，防止长期运行无限膨胀。
        maxHistoryItems: 600,
        // 市场事件同时存在数量限制。
        maxActiveEvents: 8
      };
      var TENANT_ARCHETYPES = [
        {
          id: "fast_food_beginner",
          name: "\u5C0F\u578B\u5FEB\u9910\u521B\u4E1A\u8005",
          budgetMin: 5e4,
          budgetMax: 18e4,
          areaMin: 35,
          areaMax: 120,
          preferred: ["street_shop", "community_shop", "village_shop"],
          requireExhaust: true,
          requireGas: false,
          priceSensitivity: 88,
          locationSensitivity: 62
        },
        {
          id: "drink_chain",
          name: "\u996E\u54C1\u8FDE\u9501\u62D3\u5E97\u7EC4",
          budgetMin: 1e5,
          budgetMax: 42e4,
          areaMin: 20,
          areaMax: 85,
          preferred: ["street_shop", "corner_shop", "mall_shop", "station_shop"],
          requireExhaust: false,
          requireGas: false,
          priceSensitivity: 52,
          locationSensitivity: 95
        },
        {
          id: "noodle_owner",
          name: "\u9762\u9986\u7ECF\u8425\u8005",
          budgetMin: 7e4,
          budgetMax: 26e4,
          areaMin: 40,
          areaMax: 130,
          preferred: ["street_shop", "community_shop", "market_shop", "village_shop"],
          requireExhaust: true,
          requireGas: true,
          priceSensitivity: 79,
          locationSensitivity: 70
        },
        {
          id: "bbq_team",
          name: "\u70E7\u70E4\u521B\u4E1A\u56E2\u961F",
          budgetMin: 13e4,
          budgetMax: 48e4,
          areaMin: 80,
          areaMax: 210,
          preferred: ["street_shop", "corner_shop", "detached", "duplex"],
          requireExhaust: true,
          requireGas: true,
          priceSensitivity: 68,
          locationSensitivity: 77
        },
        {
          id: "hotpot_chain",
          name: "\u706B\u9505\u54C1\u724C\u62D3\u5E97\u7EC4",
          budgetMin: 42e4,
          budgetMax: 15e5,
          areaMin: 160,
          areaMax: 520,
          preferred: ["detached", "corner_shop", "mall_shop", "duplex"],
          requireExhaust: true,
          requireGas: false,
          priceSensitivity: 35,
          locationSensitivity: 92
        },
        {
          id: "coffee_brand",
          name: "\u5496\u5561\u54C1\u724C\u62D3\u5E97\u7EC4",
          budgetMin: 18e4,
          budgetMax: 76e4,
          areaMin: 45,
          areaMax: 180,
          preferred: ["corner_shop", "mall_shop", "office_podium", "street_shop"],
          requireExhaust: false,
          requireGas: false,
          priceSensitivity: 44,
          locationSensitivity: 91
        },
        {
          id: "community_restaurant",
          name: "\u793E\u533A\u9910\u9986\u7ECF\u8425\u8005",
          budgetMin: 12e4,
          budgetMax: 52e4,
          areaMin: 80,
          areaMax: 240,
          preferred: ["community_shop", "street_shop", "duplex"],
          requireExhaust: true,
          requireGas: true,
          priceSensitivity: 75,
          locationSensitivity: 66
        },
        {
          id: "foodcourt_operator",
          name: "\u6863\u53E3\u7ECF\u8425\u8005",
          budgetMin: 3e4,
          budgetMax: 12e4,
          areaMin: 12,
          areaMax: 50,
          preferred: ["foodcourt_stall", "park_canteen", "market_shop"],
          requireExhaust: false,
          requireGas: false,
          priceSensitivity: 92,
          locationSensitivity: 58
        },
        {
          id: "premium_restaurant",
          name: "\u54C1\u8D28\u6B63\u9910\u56E2\u961F",
          budgetMin: 55e4,
          budgetMax: 22e5,
          areaMin: 180,
          areaMax: 520,
          preferred: ["detached", "mall_shop", "corner_shop", "office_podium"],
          requireExhaust: true,
          requireGas: true,
          priceSensitivity: 26,
          locationSensitivity: 96
        },
        {
          id: "delivery_kitchen",
          name: "\u5916\u5356\u53A8\u623F\u7ECF\u8425\u8005",
          budgetMin: 6e4,
          budgetMax: 26e4,
          areaMin: 35,
          areaMax: 130,
          preferred: [
            "village_shop",
            "community_shop",
            "park_canteen",
            "market_shop"
          ],
          requireExhaust: true,
          requireGas: false,
          priceSensitivity: 93,
          locationSensitivity: 48
        },
        {
          id: "bakery_chain",
          name: "\u70D8\u7119\u54C1\u724C\u62D3\u5E97\u7EC4",
          budgetMin: 15e4,
          budgetMax: 68e4,
          areaMin: 55,
          areaMax: 190,
          preferred: ["street_shop", "corner_shop", "mall_shop", "office_podium"],
          requireExhaust: true,
          requireGas: false,
          priceSensitivity: 50,
          locationSensitivity: 88
        },
        {
          id: "local_veteran",
          name: "\u672C\u5730\u9910\u996E\u8001\u5E97",
          budgetMin: 22e4,
          budgetMax: 98e4,
          areaMin: 90,
          areaMax: 330,
          preferred: ["street_shop", "corner_shop", "community_shop", "detached"],
          requireExhaust: true,
          requireGas: true,
          priceSensitivity: 56,
          locationSensitivity: 82
        }
      ];
      var BRAND_PREFIXES = [
        "\u8001\u57CE",
        "\u5357\u8857",
        "\u5B66\u5E9C",
        "\u79BE\u5473",
        "\u5C71\u6D77",
        "\u5C0F\u6EE1",
        "\u6625\u548C",
        "\u62FE\u5473",
        "\u708A\u70DF",
        "\u4E5D\u91CC",
        "\u4E1C\u5DF7",
        "\u767E\u5473",
        "\u9752\u79BE",
        "\u90BB\u91CC",
        "\u6C90\u5149",
        "\u5DF7\u53E3",
        "\u98DF\u5149",
        "\u4E00\u79BE",
        "\u4ECA\u5473",
        "\u798F\u6765"
      ];
      var BRAND_SUFFIXES = [
        "\u98DF\u5802",
        "\u5C0F\u9986",
        "\u9762\u9986",
        "\u996D\u5802",
        "\u9910\u5385",
        "\u53A8\u623F",
        "\u8336\u94FA",
        "\u5496\u5561",
        "\u70D8\u7119",
        "\u70E7\u70E4",
        "\u706B\u9505",
        "\u7B80\u9910",
        "\u98DF\u96C6",
        "\u5C0F\u53A8",
        "\u9910\u996E"
      ];
      var EVENT_TEMPLATES = [
        {
          id: "school_opening",
          name: "\u9AD8\u6821\u5F00\u5B66\u5B63",
          eligibleDistricts: ["university"],
          minDuration: 12,
          maxDuration: 24,
          weight: 18,
          trafficFactor: 1.18,
          rentPressure: 1.05,
          listingSupplyFactor: 0.92,
          npcDemandFactor: 1.24,
          description: "\u8FD4\u6821\u5BA2\u6D41\u660E\u663E\u589E\u52A0\uFF0C\u6821\u95E8\u4E0E\u5BBF\u820D\u533A\u94FA\u4F4D\u7ADE\u4E89\u5347\u6E29"
        },
        {
          id: "graduation",
          name: "\u6BD5\u4E1A\u5B63",
          eligibleDistricts: ["university"],
          minDuration: 8,
          maxDuration: 18,
          weight: 11,
          trafficFactor: 1.09,
          rentPressure: 0.98,
          listingSupplyFactor: 1.18,
          npcDemandFactor: 0.92,
          description: "\u90E8\u5206\u5B66\u751F\u7ECF\u8425\u9879\u76EE\u9000\u51FA\uFF0C\u8F6C\u8BA9\u94FA\u6E90\u9636\u6BB5\u6027\u589E\u52A0"
        },
        {
          id: "office_movein",
          name: "\u5927\u578B\u4F01\u4E1A\u96C6\u4E2D\u5165\u9A7B",
          eligibleDistricts: ["cbd", "hightech"],
          minDuration: 20,
          maxDuration: 55,
          weight: 8,
          trafficFactor: 1.13,
          rentPressure: 1.07,
          listingSupplyFactor: 0.94,
          npcDemandFactor: 1.18,
          description: "\u65B0\u589E\u529E\u516C\u4EBA\u53E3\u63A8\u9AD8\u5DE5\u4F5C\u65E5\u9910\u996E\u9700\u6C42"
        },
        {
          id: "roadwork",
          name: "\u9053\u8DEF\u65BD\u5DE5",
          eligibleDistricts: [
            "university",
            "cbd",
            "hightech",
            "oldtown",
            "village",
            "market",
            "industry"
          ],
          minDuration: 10,
          maxDuration: 45,
          weight: 10,
          trafficFactor: 0.71,
          rentPressure: 0.94,
          listingSupplyFactor: 1.13,
          npcDemandFactor: 0.76,
          description: "\u65BD\u5DE5\u5F71\u54CD\u81EA\u7136\u5BA2\u6D41\u4E0E\u95E8\u5E97\u53EF\u89C1\u5EA6\uFF0C\u90E8\u5206\u623F\u4E1C\u5F00\u59CB\u8BA9\u4EF7"
        },
        {
          id: "metro_open",
          name: "\u8F68\u9053\u4EA4\u901A\u65B0\u7AD9\u5F00\u901A",
          eligibleDistricts: ["cbd", "hightech", "oldtown"],
          minDuration: 35,
          maxDuration: 90,
          weight: 4,
          trafficFactor: 1.21,
          rentPressure: 1.11,
          listingSupplyFactor: 0.88,
          npcDemandFactor: 1.28,
          description: "\u7AD9\u70B9\u5468\u8FB9\u9884\u671F\u5347\u6E29\uFF0C\u4F18\u8D28\u94FA\u4F4D\u6302\u724C\u5468\u671F\u7F29\u77ED"
        },
        {
          id: "night_market",
          name: "\u591C\u95F4\u6D88\u8D39\u6D3B\u52A8",
          eligibleDistricts: ["university", "oldtown", "village"],
          minDuration: 5,
          maxDuration: 14,
          weight: 13,
          trafficFactor: 1.15,
          rentPressure: 1.02,
          listingSupplyFactor: 0.97,
          npcDemandFactor: 1.16,
          description: "\u591C\u95F4\u9910\u996E\u70ED\u5EA6\u4E0A\u5347\uFF0C\u70E7\u70E4\u5C0F\u5403\u7C7B\u7ECF\u8425\u8005\u79EF\u6781\u627E\u94FA"
        },
        {
          id: "fire_inspection",
          name: "\u9910\u996E\u6D88\u9632\u4E13\u9879\u68C0\u67E5",
          eligibleDistricts: [
            "university",
            "cbd",
            "hightech",
            "oldtown",
            "village",
            "market",
            "industry"
          ],
          minDuration: 7,
          maxDuration: 18,
          weight: 8,
          trafficFactor: 0.98,
          rentPressure: 0.97,
          listingSupplyFactor: 1.08,
          npcDemandFactor: 0.89,
          description: "\u786C\u4EF6\u6761\u4EF6\u4E0D\u8FBE\u6807\u7684\u8001\u94FA\u9000\u51FA\u6982\u7387\u589E\u52A0"
        },
        {
          id: "market_upgrade",
          name: "\u5E02\u573A\u6539\u9020\u5347\u7EA7",
          eligibleDistricts: ["market"],
          minDuration: 25,
          maxDuration: 70,
          weight: 7,
          trafficFactor: 0.82,
          rentPressure: 0.96,
          listingSupplyFactor: 1.2,
          npcDemandFactor: 0.77,
          description: "\u6539\u9020\u671F\u95F4\u5BA2\u6D41\u4E0B\u964D\uFF0C\u4F46\u6539\u9020\u5B8C\u6210\u540E\u7684\u9884\u671F\u6B63\u5728\u62AC\u5347"
        },
        {
          id: "factory_orders",
          name: "\u5DE5\u4E1A\u56ED\u8BA2\u5355\u65FA\u5B63",
          eligibleDistricts: ["industry"],
          minDuration: 15,
          maxDuration: 40,
          weight: 15,
          trafficFactor: 1.12,
          rentPressure: 1.03,
          listingSupplyFactor: 0.96,
          npcDemandFactor: 1.15,
          description: "\u52A0\u73ED\u4E0E\u8F6E\u73ED\u4EBA\u53E3\u589E\u52A0\uFF0C\u56ED\u533A\u9910\u996E\u521A\u9700\u4E0A\u5347"
        },
        {
          id: "factory_slowdown",
          name: "\u5DE5\u4E1A\u56ED\u8BA2\u5355\u56DE\u843D",
          eligibleDistricts: ["industry"],
          minDuration: 15,
          maxDuration: 45,
          weight: 9,
          trafficFactor: 0.83,
          rentPressure: 0.92,
          listingSupplyFactor: 1.17,
          npcDemandFactor: 0.78,
          description: "\u90E8\u5206\u9910\u996E\u7ECF\u8425\u8005\u6536\u7F29\uFF0C\u4F4E\u79DF\u91D1\u94FA\u6E90\u589E\u52A0"
        },
        {
          id: "tourism_week",
          name: "\u57CE\u5E02\u6587\u65C5\u6D3B\u52A8\u5468",
          eligibleDistricts: ["cbd", "oldtown", "market"],
          minDuration: 5,
          maxDuration: 10,
          weight: 9,
          trafficFactor: 1.17,
          rentPressure: 1.02,
          listingSupplyFactor: 0.98,
          npcDemandFactor: 1.12,
          description: "\u6E38\u5BA2\u6D41\u91CF\u589E\u52A0\uFF0C\u6838\u5FC3\u8857\u533A\u77ED\u671F\u70ED\u5EA6\u4E0A\u5347"
        },
        {
          id: "mall_opening",
          name: "\u65B0\u5546\u4E1A\u4F53\u5F00\u4E1A",
          eligibleDistricts: ["cbd", "hightech"],
          minDuration: 25,
          maxDuration: 70,
          weight: 5,
          trafficFactor: 1.08,
          rentPressure: 1.08,
          listingSupplyFactor: 1.06,
          npcDemandFactor: 1.2,
          description: "\u65B0\u5546\u4E1A\u4F53\u91CA\u653E\u4E00\u6279\u94FA\u4F4D\uFF0C\u540C\u65F6\u5438\u5F15\u54C1\u724C\u96C6\u4E2D\u8FDB\u573A"
        },
        {
          id: "rent_cooling",
          name: "\u5546\u4E1A\u79DF\u8D41\u5E02\u573A\u964D\u6E29",
          eligibleDistricts: [
            "university",
            "cbd",
            "hightech",
            "oldtown",
            "village",
            "market",
            "industry"
          ],
          minDuration: 25,
          maxDuration: 80,
          weight: 6,
          trafficFactor: 0.98,
          rentPressure: 0.91,
          listingSupplyFactor: 1.16,
          npcDemandFactor: 0.88,
          description: "\u7A7A\u7F6E\u5468\u671F\u62C9\u957F\uFF0C\u8BAE\u4EF7\u7A7A\u95F4\u589E\u52A0"
        },
        {
          id: "rent_heating",
          name: "\u5546\u4E1A\u79DF\u8D41\u5E02\u573A\u5347\u6E29",
          eligibleDistricts: [
            "university",
            "cbd",
            "hightech",
            "oldtown",
            "village",
            "market",
            "industry"
          ],
          minDuration: 20,
          maxDuration: 65,
          weight: 6,
          trafficFactor: 1.04,
          rentPressure: 1.09,
          listingSupplyFactor: 0.91,
          npcDemandFactor: 1.17,
          description: "\u4F18\u8D28\u94FA\u4F4D\u53BB\u5316\u52A0\u5FEB\uFF0C\u623F\u4E1C\u62A5\u4EF7\u8D8B\u5F3A"
        }
      ];
      module.exports = {
        CONFIG,
        TENANT_ARCHETYPES,
        BRAND_PREFIXES,
        BRAND_SUFFIXES,
        EVENT_TEMPLATES
      };
    }
  });

  // src/property/propertyMarketSystem.js
  var require_propertyMarketSystem = __commonJS({
    "src/property/propertyMarketSystem.js"(exports, module) {
      "use strict";
      var propertyData = require_propertyData();
      var propertySystem = require_propertySystem();
      var marketData = require_propertyMarketData();
      function clone(value) {
        return JSON.parse(JSON.stringify(value));
      }
      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }
      function roundTo(value, step) {
        return Math.round(value / step) * step;
      }
      function hashText(text) {
        let value = 2166136261;
        for (let i = 0; i < text.length; i++) {
          value ^= text.charCodeAt(i);
          value = Math.imul(value, 16777619);
        }
        return value >>> 0;
      }
      function compareNumbers(a, b) {
        return (Number(a) || 0) - (Number(b) || 0);
      }
      var PropertyMarketSystem = class {
        constructor() {
          this.reset();
        }
        reset(options) {
          const opts = options || {};
          this.state = {
            version: marketData.CONFIG.version,
            seed: Number(opts.seed) || 20260912,
            currentDay: Number(opts.currentDay) || 1,
            rngCounter: 0,
            initialized: false,
            listingState: {},
            activeEvents: [],
            externalModifiers: [],
            history: [],
            stats: {
              totalNewListings: 0,
              totalNpcRentals: 0,
              totalWithdrawals: 0,
              totalPriceCuts: 0,
              totalPriceRaises: 0
            }
          };
          return this.getState();
        }
        getState() {
          return clone(this.state);
        }
        exportState() {
          return this.getState();
        }
        importState(value) {
          if (!value || value.version !== marketData.CONFIG.version) {
            return false;
          }
          this.state = clone(value);
          return true;
        }
        random(label) {
          const text = this.state.seed + ":" + this.state.currentDay + ":" + this.state.rngCounter + ":" + String(label || "");
          this.state.rngCounter += 1;
          const h = hashText(text);
          let x = h + 2654435769 >>> 0;
          x ^= x << 13;
          x ^= x >>> 17;
          x ^= x << 5;
          return (x >>> 0) / 4294967295;
        }
        randomInt(min, max, label) {
          return min + Math.floor(this.random(label) * (max - min + 1));
        }
        pick(list, label) {
          if (!Array.isArray(list) || list.length === 0) {
            return null;
          }
          return list[this.randomInt(0, list.length - 1, label)];
        }
        pushHistory(item) {
          this.state.history.push({
            day: this.state.currentDay,
            ...clone(item)
          });
          const max = marketData.CONFIG.maxHistoryItems;
          if (this.state.history.length > max) {
            this.state.history.splice(0, this.state.history.length - max);
          }
        }
        getHistory(limit) {
          const amount = Math.max(1, Number(limit) || 50);
          return this.state.history.slice(-amount).map(clone);
        }
        makeTenantName(label) {
          const prefix = this.pick(marketData.BRAND_PREFIXES, label + ":prefix");
          const suffix = this.pick(marketData.BRAND_SUFFIXES, label + ":suffix");
          return prefix + suffix;
        }
        getStreet(streetId) {
          return propertyData.STREETS.find((item) => item.id === streetId) || null;
        }
        getDistrict(districtId) {
          return propertyData.DISTRICT_PROFILES[districtId] || null;
        }
        getBaseListing(streetId, slot) {
          return propertySystem.generateListing(streetId, slot);
        }
        getListingKey(streetId, slot) {
          return streetId + ":S" + String(slot + 1).padStart(2, "0");
        }
        getEventModifiersFor(street) {
          let trafficFactor = 1;
          let rentPressure = 1;
          let listingSupplyFactor = 1;
          let npcDemandFactor = 1;
          const all = this.state.activeEvents.concat(this.state.externalModifiers);
          for (let i = 0; i < all.length; i++) {
            const event = all[i];
            const applies = !event.streetId && !event.districtId || event.streetId === street.id || event.districtId === street.districtId;
            if (!applies) {
              continue;
            }
            trafficFactor *= Number(event.trafficFactor) || 1;
            rentPressure *= Number(event.rentPressure) || 1;
            listingSupplyFactor *= Number(event.listingSupplyFactor) || 1;
            npcDemandFactor *= Number(event.npcDemandFactor) || 1;
          }
          return {
            trafficFactor: clamp(trafficFactor, 0.45, 1.75),
            rentPressure: clamp(rentPressure, 0.7, 1.45),
            listingSupplyFactor: clamp(listingSupplyFactor, 0.55, 1.75),
            npcDemandFactor: clamp(npcDemandFactor, 0.5, 1.8)
          };
        }
        calculateStreetHeat(street) {
          const modifiers = this.getEventModifiersFor(street);
          const raw = street.traffic * 0.31 + street.night * 0.15 + street.delivery * 0.12 + street.parking * 0.07 + street.office * 0.1 + street.resident * 0.08 + street.student * 0.09 + street.worker * 0.08;
          return clamp(Math.round(raw * modifiers.trafficFactor), 0, 100);
        }
        calculateTargetActiveCount(street) {
          const district = this.getDistrict(street.districtId);
          const modifiers = this.getEventModifiersFor(street);
          const vacancyComponent = district.vacancyRate * 42;
          const supplyComponent = district.newListingRate * 24;
          const competitionReduction = street.competition / 100 * 1.7;
          const raw = 2.4 + vacancyComponent + supplyComponent - competitionReduction;
          return clamp(
            Math.round(raw * modifiers.listingSupplyFactor),
            marketData.CONFIG.minActiveListingsPerStreet,
            marketData.CONFIG.maxActiveListingsPerStreet
          );
        }
        createListingState(street, slot, reason) {
          const base = this.getBaseListing(street.id, slot);
          if (!base) {
            return null;
          }
          const key = this.getListingKey(street.id, slot);
          const modifiers = this.getEventModifiersFor(street);
          const initialPremium = 0.94 + this.random(key + ":premium") * 0.16;
          const askingMonthlyRent = roundTo(
            base.monthlyRent * initialPremium * modifiers.rentPressure,
            100
          );
          const transferFactor = base.transferFee > 0 ? 0.84 + this.random(key + ":transfer") * 0.28 : 0;
          const askingTransferFee = base.transferFee > 0 ? roundTo(base.transferFee * transferFactor, 500) : 0;
          const state = {
            key,
            streetId: street.id,
            districtId: street.districtId,
            slot,
            baseListingId: base.id,
            status: "active",
            listedDay: this.state.currentDay,
            daysOnMarket: 0,
            askingMonthlyRent,
            askingTransferFee,
            initialAskingMonthlyRent: askingMonthlyRent,
            initialAskingTransferFee: askingTransferFee,
            watchers: 0,
            competingTenants: [],
            lastPriceChangeDay: this.state.currentDay,
            priceChangeCount: 0,
            sourceReason: reason || "market_turnover",
            rentedBy: null,
            closedDay: null,
            closedReason: null
          };
          this.state.listingState[key] = state;
          this.state.stats.totalNewListings += 1;
          this.pushHistory({
            type: "listing_added",
            listingKey: key,
            districtId: street.districtId,
            streetId: street.id,
            askingMonthlyRent,
            reason: state.sourceReason
          });
          return state;
        }
        deactivateListing(item, reason, tenant) {
          item.status = reason === "npc_rented" ? "rented" : "inactive";
          item.closedDay = this.state.currentDay;
          item.closedReason = reason;
          if (tenant) {
            item.rentedBy = clone(tenant);
          }
          if (reason === "npc_rented") {
            this.state.stats.totalNpcRentals += 1;
          } else {
            this.state.stats.totalWithdrawals += 1;
          }
          this.pushHistory({
            type: reason,
            listingKey: item.key,
            districtId: item.districtId,
            streetId: item.streetId,
            renter: tenant ? tenant.name : null
          });
        }
        getSlotCooldownDays(item) {
          if (!item || item.closedDay == null) {
            return 0;
          }
          if (item.closedReason === "npc_rented") {
            return 90;
          }
          return 24;
        }
        isSlotAvailableForRelist(streetId, slot) {
          const key = this.getListingKey(streetId, slot);
          const old = this.state.listingState[key];
          if (!old) {
            return true;
          }
          if (old.status === "active") {
            return false;
          }
          const cooldown = this.getSlotCooldownDays(old);
          return this.state.currentDay - (old.closedDay || this.state.currentDay) >= cooldown;
        }
        ensureStreetDepth(street) {
          const calculatedTarget = this.calculateTargetActiveCount(street);
          const target = Math.min(
            calculatedTarget,
            marketData.CONFIG.minActiveListingsPerStreet + 1
          );
          const active = Object.values(this.state.listingState).filter(
            (item) => item.streetId === street.id && item.status === "active"
          );
          if (active.length >= target) {
            return;
          }
          const usedSlots = new Set(active.map((item) => item.slot));
          const candidates = [];
          for (let slot = 0; slot < marketData.CONFIG.potentialSlotsPerStreet; slot++) {
            if (!usedSlots.has(slot) && this.isSlotAvailableForRelist(street.id, slot)) {
              candidates.push(slot);
            }
          }
          while (active.length < target && candidates.length > 0) {
            const pickIndex = this.randomInt(
              0,
              candidates.length - 1,
              street.id + ":depth"
            );
            const slot = candidates.splice(pickIndex, 1)[0];
            const created = this.createListingState(street, slot, "market_supply");
            if (created) {
              active.push(created);
            }
          }
        }
        initialize(options) {
          const opts = options || {};
          if (opts.seed != null) {
            this.state.seed = Number(opts.seed) || this.state.seed;
          }
          if (opts.currentDay != null) {
            this.state.currentDay = Math.max(
              1,
              Math.floor(Number(opts.currentDay) || 1)
            );
          }
          for (let i = 0; i < propertyData.STREETS.length; i++) {
            this.ensureStreetDepth(propertyData.STREETS[i]);
          }
          this.state.initialized = true;
          return this.getMarketOverview();
        }
        cleanupExpiredEvents() {
          this.state.activeEvents = this.state.activeEvents.filter(
            (event) => event.endDay >= this.state.currentDay
          );
          this.state.externalModifiers = this.state.externalModifiers.filter(
            (event) => event.endDay == null || event.endDay >= this.state.currentDay
          );
        }
        maybeCreateEvent() {
          if (this.state.activeEvents.length >= marketData.CONFIG.maxActiveEvents) {
            return null;
          }
          if (this.random("event_roll") > 0.075) {
            return null;
          }
          const pool = marketData.EVENT_TEMPLATES;
          const weighted = [];
          for (let i = 0; i < pool.length; i++) {
            const count = Math.max(1, Math.round(pool[i].weight / 2));
            for (let j = 0; j < count; j++) {
              weighted.push(pool[i]);
            }
          }
          const template = this.pick(weighted, "event_template");
          if (!template) {
            return null;
          }
          const districtId = this.pick(template.eligibleDistricts, "event_district");
          const duration = this.randomInt(
            template.minDuration,
            template.maxDuration,
            "event_duration"
          );
          const event = {
            id: template.id + "_" + this.state.currentDay + "_" + this.state.rngCounter,
            templateId: template.id,
            name: template.name,
            districtId,
            streetId: null,
            startDay: this.state.currentDay,
            endDay: this.state.currentDay + duration - 1,
            trafficFactor: template.trafficFactor,
            rentPressure: template.rentPressure,
            listingSupplyFactor: template.listingSupplyFactor,
            npcDemandFactor: template.npcDemandFactor,
            description: template.description
          };
          this.state.activeEvents.push(event);
          this.pushHistory({
            type: "market_event_started",
            eventId: event.id,
            name: event.name,
            districtId: event.districtId,
            endDay: event.endDay
          });
          return clone(event);
        }
        addExternalModifier(modifier) {
          if (!modifier || !modifier.id) {
            return false;
          }
          const item = {
            id: String(modifier.id),
            name: String(modifier.name || modifier.id),
            districtId: modifier.districtId || null,
            streetId: modifier.streetId || null,
            startDay: this.state.currentDay,
            endDay: modifier.endDay == null ? null : Number(modifier.endDay),
            trafficFactor: Number(modifier.trafficFactor) || 1,
            rentPressure: Number(modifier.rentPressure) || 1,
            listingSupplyFactor: Number(modifier.listingSupplyFactor) || 1,
            npcDemandFactor: Number(modifier.npcDemandFactor) || 1,
            description: String(modifier.description || "")
          };
          this.state.externalModifiers = this.state.externalModifiers.filter(
            (old) => old.id !== item.id
          );
          this.state.externalModifiers.push(item);
          this.pushHistory({
            type: "external_modifier_added",
            modifierId: item.id,
            districtId: item.districtId,
            streetId: item.streetId
          });
          return true;
        }
        removeExternalModifier(id) {
          const before = this.state.externalModifiers.length;
          this.state.externalModifiers = this.state.externalModifiers.filter(
            (item) => item.id !== id
          );
          return before !== this.state.externalModifiers.length;
        }
        buildTenantForListing(listing, item) {
          const candidatePool = marketData.TENANT_ARCHETYPES.filter((type) => {
            if (listing.grossArea < type.areaMin || listing.grossArea > type.areaMax) {
              return false;
            }
            if (type.requireExhaust && !listing.exhaust) {
              return false;
            }
            if (type.requireGas && !listing.gas) {
              return false;
            }
            return true;
          });
          const archetype = this.pick(
            candidatePool.length ? candidatePool : marketData.TENANT_ARCHETYPES,
            item.key + ":tenant"
          );
          if (!archetype) {
            return null;
          }
          const budget = roundTo(
            archetype.budgetMin + this.random(item.key + ":budget") * (archetype.budgetMax - archetype.budgetMin),
            1e3
          );
          return {
            id: "npc_" + hashText(
              item.key + ":" + this.state.currentDay + ":" + archetype.id
            ).toString(36),
            name: this.makeTenantName(item.key + ":brand"),
            archetypeId: archetype.id,
            archetypeName: archetype.name,
            budget,
            priceSensitivity: archetype.priceSensitivity,
            locationSensitivity: archetype.locationSensitivity
          };
        }
        calculateAttractiveness(listing, item, street) {
          const heat = this.calculateStreetHeat(street);
          const baseRent = Math.max(1, listing.monthlyRent);
          const priceRatio = item.askingMonthlyRent / baseRent;
          const hardware = (listing.exhaust ? 12 : 0) + (listing.gas ? 7 : 0) + (listing.threePhase ? 6 : 0) + (listing.drainage ? 5 : 0) + (listing.fireSprinkler ? 4 : 0);
          const sizeFit = listing.grossArea >= 40 && listing.grossArea <= 220 ? 9 : 4;
          const raw = heat * 0.36 + listing.visibility * 0.22 + listing.riderAccess * 0.08 + listing.parkingScore * 0.06 + hardware + sizeFit - Math.max(0, (priceRatio - 1) * 55) - listing.riskLevel * 4;
          return clamp(Math.round(raw), 0, 100);
        }
        updateListing(item) {
          if (item.status !== "active") {
            return;
          }
          const street = this.getStreet(item.streetId);
          if (!street) {
            return;
          }
          const base = this.getBaseListing(item.streetId, item.slot);
          if (!base) {
            return;
          }
          const modifiers = this.getEventModifiersFor(street);
          item.daysOnMarket = this.state.currentDay - item.listedDay;
          const attractiveness = this.calculateAttractiveness(base, item, street);
          const expectedWatchers = clamp(
            Math.round(
              attractiveness / 25 + this.random(item.key + ":watchers") * 2 - 1.2
            ),
            0,
            8
          );
          item.watchers = expectedWatchers;
          const targetCompetitors = clamp(
            Math.round(attractiveness / 38 * modifiers.npcDemandFactor),
            0,
            3
          );
          while (item.competingTenants.length < targetCompetitors) {
            const tenant = this.buildTenantForListing(base, item);
            if (!tenant) {
              break;
            }
            if (!item.competingTenants.some((old) => old.id === tenant.id)) {
              item.competingTenants.push(tenant);
            } else {
              break;
            }
          }
          if (item.competingTenants.length > targetCompetitors) {
            item.competingTenants = item.competingTenants.slice(0, targetCompetitors);
          }
          const priceRatio = item.askingMonthlyRent / Math.max(1, base.monthlyRent);
          const rentChance = clamp(
            15e-4 + attractiveness * 19e-5 + item.watchers * 16e-4 + item.competingTenants.length * 45e-4 - Math.max(0, priceRatio - 1) * 0.028,
            1e-3,
            0.075
          ) * modifiers.npcDemandFactor;
          if (item.competingTenants.length > 0 && this.random(item.key + ":rent") < rentChance) {
            const tenant = this.pick(item.competingTenants, item.key + ":winner");
            this.deactivateListing(item, "npc_rented", tenant);
            return;
          }
          const withdrawChance = item.daysOnMarket > 120 ? 0.045 : item.daysOnMarket > 75 ? 0.022 : item.daysOnMarket > 40 ? 9e-3 : 2e-3;
          if (this.random(item.key + ":withdraw") < withdrawChance) {
            this.deactivateListing(item, "owner_withdrawn", null);
            return;
          }
          const daysSincePriceChange = this.state.currentDay - item.lastPriceChangeDay;
          if (daysSincePriceChange >= 7) {
            let change = 0;
            if (item.daysOnMarket >= 60 && item.watchers <= 2) {
              change = -(0.035 + this.random(item.key + ":cut60") * 0.055);
            } else if (item.daysOnMarket >= 30 && item.watchers <= 2) {
              change = -(0.02 + this.random(item.key + ":cut30") * 0.035);
            } else if (item.daysOnMarket >= 14 && item.watchers <= 1) {
              change = -(0.01 + this.random(item.key + ":cut14") * 0.025);
            } else if (item.watchers >= 6 && attractiveness >= 78 && item.daysOnMarket <= 18) {
              change = 0.01 + this.random(item.key + ":raise") * 0.025;
            }
            if (change !== 0) {
              const oldRent = item.askingMonthlyRent;
              item.askingMonthlyRent = roundTo(
                Math.max(
                  base.monthlyRent * 0.72,
                  item.askingMonthlyRent * (1 + change)
                ),
                100
              );
              item.lastPriceChangeDay = this.state.currentDay;
              item.priceChangeCount += 1;
              if (item.askingMonthlyRent < oldRent) {
                this.state.stats.totalPriceCuts += 1;
              } else {
                this.state.stats.totalPriceRaises += 1;
              }
              this.pushHistory({
                type: item.askingMonthlyRent < oldRent ? "price_cut" : "price_raise",
                listingKey: item.key,
                streetId: item.streetId,
                oldRent,
                newRent: item.askingMonthlyRent
              });
            }
          }
        }
        maybeAddOrganicListing(street) {
          const active = Object.values(this.state.listingState).filter(
            (item) => item.streetId === street.id && item.status === "active"
          );
          const target = this.calculateTargetActiveCount(street);
          if (active.length >= marketData.CONFIG.maxActiveListingsPerStreet) {
            return null;
          }
          const district = this.getDistrict(street.districtId);
          const modifiers = this.getEventModifiersFor(street);
          const deficit = Math.max(0, target - active.length);
          const chance = clamp(
            0.012 + district.newListingRate * 0.08 + deficit * 0.025,
            0.01,
            0.22
          ) * modifiers.listingSupplyFactor;
          if (this.random(street.id + ":new_listing") > chance) {
            return null;
          }
          const occupied = new Set(active.map((item) => item.slot));
          const candidates = [];
          for (let slot2 = 0; slot2 < marketData.CONFIG.potentialSlotsPerStreet; slot2++) {
            if (!occupied.has(slot2) && this.isSlotAvailableForRelist(street.id, slot2)) {
              candidates.push(slot2);
            }
          }
          if (candidates.length === 0) {
            return null;
          }
          const slot = this.pick(candidates, street.id + ":slot");
          return this.createListingState(street, slot, "organic_new_listing");
        }
        tickDay(context) {
          if (!this.state.initialized) {
            this.initialize();
          }
          this.state.currentDay += 1;
          this.state.rngCounter = 0;
          this.cleanupExpiredEvents();
          this.maybeCreateEvent();
          const listingValues = Object.values(this.state.listingState);
          for (let i = 0; i < listingValues.length; i++) {
            this.updateListing(listingValues[i]);
          }
          for (let i = 0; i < propertyData.STREETS.length; i++) {
            const street = propertyData.STREETS[i];
            this.maybeAddOrganicListing(street);
            this.ensureStreetDepth(street);
          }
          if (context && Array.isArray(context.modifiers)) {
            for (let i = 0; i < context.modifiers.length; i++) {
              this.addExternalModifier(context.modifiers[i]);
            }
          }
          return this.getMarketOverview();
        }
        advanceDays(days, context) {
          const amount = Math.max(0, Math.floor(Number(days) || 0));
          let result = this.getMarketOverview();
          for (let i = 0; i < amount; i++) {
            result = this.tickDay(context);
          }
          return result;
        }
        getLiveListings(filters) {
          const f = filters || {};
          const result = [];
          const states = Object.values(this.state.listingState);
          for (let i = 0; i < states.length; i++) {
            const item = states[i];
            if (item.status !== "active") {
              continue;
            }
            if (f.districtId && item.districtId !== f.districtId) {
              continue;
            }
            if (f.streetId && item.streetId !== f.streetId) {
              continue;
            }
            const base = this.getBaseListing(item.streetId, item.slot);
            if (!base) {
              continue;
            }
            const merged = {
              ...base,
              marketKey: item.key,
              askingMonthlyRent: item.askingMonthlyRent,
              askingTransferFee: item.askingTransferFee,
              daysOnMarket: item.daysOnMarket,
              watchers: item.watchers,
              competingTenants: clone(item.competingTenants),
              marketStatus: item.status,
              listedDay: item.listedDay,
              priceChangeCount: item.priceChangeCount,
              priceChangeRate: Number(
                ((item.askingMonthlyRent - item.initialAskingMonthlyRent) / Math.max(1, item.initialAskingMonthlyRent)).toFixed(4)
              )
            };
            if (f.minArea != null && merged.grossArea < Number(f.minArea)) {
              continue;
            }
            if (f.maxArea != null && merged.grossArea > Number(f.maxArea)) {
              continue;
            }
            if (f.maxMonthlyRent != null && merged.askingMonthlyRent > Number(f.maxMonthlyRent)) {
              continue;
            }
            if (f.floor && merged.floor !== f.floor) {
              continue;
            }
            if (f.propertyTypeId && merged.propertyTypeId !== f.propertyTypeId) {
              continue;
            }
            if (f.requireExhaust === true && !merged.exhaust) {
              continue;
            }
            if (f.requireGas === true && !merged.gas) {
              continue;
            }
            if (f.maxRiskLevel != null && merged.riskLevel > Number(f.maxRiskLevel)) {
              continue;
            }
            result.push(merged);
          }
          const sortBy = f.sortBy || "askingMonthlyRent";
          const dir = f.sortDir === "desc" ? -1 : 1;
          result.sort((a, b) => compareNumbers(a[sortBy], b[sortBy]) * dir);
          return result;
        }
        getStreetSummary(streetId) {
          const street = this.getStreet(streetId);
          if (!street) {
            return null;
          }
          const listings = this.getLiveListings({
            streetId
          });
          const avgRent = listings.length ? Math.round(
            listings.reduce((sum, item) => sum + item.askingMonthlyRent, 0) / listings.length
          ) : 0;
          const avgDays = listings.length ? Math.round(
            listings.reduce((sum, item) => sum + item.daysOnMarket, 0) / listings.length
          ) : 0;
          const competition = listings.reduce(
            (sum, item) => sum + item.competingTenants.length,
            0
          );
          return {
            streetId,
            name: street.name,
            districtId: street.districtId,
            marketHeat: this.calculateStreetHeat(street),
            activeListingCount: listings.length,
            averageAskingRent: avgRent,
            averageDaysOnMarket: avgDays,
            competingTenantCount: competition,
            activeEventCount: this.state.activeEvents.filter(
              (event) => event.districtId === street.districtId || event.streetId === street.id
            ).length
          };
        }
        getDistrictSummary(districtId) {
          const streets = propertyData.STREETS.filter(
            (street) => street.districtId === districtId
          );
          const listings = this.getLiveListings({
            districtId
          });
          const summaries = streets.map((street) => this.getStreetSummary(street.id));
          return {
            districtId,
            activeListingCount: listings.length,
            averageAskingRent: listings.length ? Math.round(
              listings.reduce((sum, item) => sum + item.askingMonthlyRent, 0) / listings.length
            ) : 0,
            averageDaysOnMarket: listings.length ? Math.round(
              listings.reduce((sum, item) => sum + item.daysOnMarket, 0) / listings.length
            ) : 0,
            hottestStreet: summaries.slice().sort((a, b) => b.marketHeat - a.marketHeat)[0] || null,
            streetSummaries: summaries
          };
        }
        getMarketOverview() {
          const live = this.getLiveListings();
          const districtIds = Object.keys(propertyData.DISTRICT_PROFILES);
          const districtSummaries = districtIds.map(
            (id) => this.getDistrictSummary(id)
          );
          return {
            currentDay: this.state.currentDay,
            potentialPropertyCount: propertyData.STREETS.length * marketData.CONFIG.potentialSlotsPerStreet,
            activeListingCount: live.length,
            activeEventCount: this.state.activeEvents.length,
            activeEvents: clone(this.state.activeEvents),
            stats: clone(this.state.stats),
            districtSummaries
          };
        }
      };
      module.exports = new PropertyMarketSystem();
    }
  });

  // src/core/simulationSystem.js
  var require_simulationSystem = __commonJS({
    "src/core/simulationSystem.js"(exports, module) {
      "use strict";
      var gameState = require_gameState();
      var simulationConfig = require_simulationConfig();
      var citySystem = require_citySystem();
      var propertyMarketSystem = require_propertyMarketSystem();
      var propertySystem = require_propertySystem();
      var DISTRICT_IDS = [
        "university",
        "cbd",
        "hightech",
        "oldtown",
        "village",
        "market",
        "industry"
      ];
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(
            max,
            value
          )
        );
      }
      function hashFloat(text) {
        let h = 2166136261;
        const source = String(
          text
        );
        for (let i = 0; i < source.length; i++) {
          h ^= source.charCodeAt(i);
          h = Math.imul(
            h,
            16777619
          );
        }
        return (h >>> 0) % 1e5 / 1e5;
      }
      var SimulationSystem = class {
        isLeapYear(year) {
          return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
        }
        getDayOrdinal(time) {
          const y = Math.max(
            1,
            Number(
              time.year
            ) || 1
          );
          const m = clamp(
            Number(
              time.month
            ) || 1,
            1,
            12
          );
          const d = Math.max(
            1,
            Number(
              time.day
            ) || 1
          );
          const y0 = y - 1;
          let days = y0 * 365 + Math.floor(
            y0 / 4
          ) - Math.floor(
            y0 / 100
          ) + Math.floor(
            y0 / 400
          );
          const monthDays = [
            31,
            this.isLeapYear(
              y
            ) ? 29 : 28,
            31,
            30,
            31,
            30,
            31,
            31,
            30,
            31,
            30,
            31
          ];
          for (let i = 0; i < m - 1; i++) {
            days += monthDays[i];
          }
          return days + d;
        }
        getSeason(month) {
          const value = Number(
            month
          ) || 1;
          if (value >= 3 && value <= 5) {
            return "spring";
          }
          if (value >= 6 && value <= 8) {
            return "summer";
          }
          if (value >= 9 && value <= 11) {
            return "autumn";
          }
          return "winter";
        }
        getSeed() {
          const simulation = gameState.getSimulation();
          if (simulation.seed == null) {
            const world = gameState.getWorld();
            const time = gameState.getTime();
            const raw = (world.currentCityId || "city") + ":" + (world.cityName || "unnamed") + ":" + time.year + ":" + time.month + ":" + time.day;
            simulation.seed = Math.floor(
              hashFloat(
                raw
              ) * 2147483646
            ) + 1;
          }
          return simulation.seed;
        }
        chooseWeather(dayOrdinal) {
          const time = gameState.getTime();
          const season = this.getSeason(
            time.month
          );
          const profile = simulationConfig.weather.profiles[season];
          const roll = hashFloat(
            this.getSeed() + ":weather:" + dayOrdinal
          );
          let cumulative = 0;
          let weather = profile[profile.length - 1][0];
          for (let i = 0; i < profile.length; i++) {
            cumulative += profile[i][1];
            if (roll <= cumulative) {
              weather = profile[i][0];
              break;
            }
          }
          const base = simulationConfig.weather.seasonalBaseTemperature[season];
          const noise = (hashFloat(
            this.getSeed() + ":temp:" + dayOrdinal
          ) * 2 - 1) * simulationConfig.weather.temperatureNoise;
          let temperature = base + noise;
          if (weather === "hot") {
            temperature += simulationConfig.weather.temperatureNoise * 0.75;
          }
          if (weather === "cold") {
            temperature -= simulationConfig.weather.temperatureNoise;
          }
          if (weather === "rain" || weather === "heavyRain") {
            temperature -= simulationConfig.weather.temperatureNoise * 0.25;
          }
          return {
            weather,
            temperature: Math.round(
              temperature
            ),
            season
          };
        }
        updateWeather(dayOrdinal) {
          const result = this.chooseWeather(
            dayOrdinal
          );
          gameState.setWeather(
            result.weather,
            result.temperature
          );
          const simulation = gameState.getSimulation();
          simulation.weatherHistory.unshift({
            day: dayOrdinal,
            weather: result.weather,
            temperature: result.temperature
          });
          simulation.weatherHistory = simulation.weatherHistory.slice(
            0,
            30
          );
          return result;
        }
        getMarketSummaries() {
          const result = {};
          for (let i = 0; i < DISTRICT_IDS.length; i++) {
            const id = DISTRICT_IDS[i];
            result[id] = propertyMarketSystem.getDistrictSummary(
              id
            );
          }
          return result;
        }
        getMarketEvents() {
          const state = propertyMarketSystem.getState();
          const active = Array.isArray(
            state.activeEvents
          ) ? state.activeEvents : [];
          const external = Array.isArray(
            state.externalModifiers
          ) ? state.externalModifiers : [];
          return active.concat(
            external
          ).map(
            (event) => {
              if (event.districtId || !event.streetId) {
                return event;
              }
              const street = propertySystem.getStreet(
                event.streetId
              );
              return street ? {
                ...event,
                districtId: street.districtId
              } : event;
            }
          );
        }
        pushNews(item) {
          if (!item || !item.key || !item.title) {
            return false;
          }
          const simulation = gameState.getSimulation();
          const existingIndex = simulation.newsFeed.findIndex(
            (entry) => entry.key === item.key
          );
          if (existingIndex >= 0) {
            simulation.newsFeed.splice(
              existingIndex,
              1
            );
          }
          simulation.newsFeed.unshift({
            key: item.key,
            title: item.title,
            detail: item.detail || "",
            severity: item.severity || "info",
            districtId: item.districtId || null,
            day: item.day || this.getDayOrdinal(
              gameState.getTime()
            )
          });
          simulation.newsFeed = simulation.newsFeed.slice(
            0,
            simulationConfig.news.maxItems
          );
          return true;
        }
        buildDailyNews(dayOrdinal, weatherResult, districtSnapshot, events) {
          const weatherLabels = {
            sunny: "\u6674",
            cloudy: "\u591A\u4E91",
            rain: "\u5C0F\u96E8",
            heavyRain: "\u66B4\u96E8",
            hot: "\u9AD8\u6E29",
            cold: "\u964D\u6E29"
          };
          this.pushNews({
            key: "weather:" + dayOrdinal,
            title: "\u4ECA\u65E5\u5929\u6C14 " + (weatherLabels[weatherResult.weather] || weatherResult.weather) + " " + weatherResult.temperature + "\u2103",
            detail: "\u5929\u6C14\u5DF2\u8BA1\u5165\u5404\u5546\u5708\u9910\u996E\u9700\u6C42",
            severity: weatherResult.weather === "heavyRain" || weatherResult.weather === "hot" ? "warning" : "info",
            day: dayOrdinal
          });
          const currentEvents = Array.isArray(
            events
          ) ? events : [];
          for (let i = 0; i < currentEvents.length; i++) {
            const event = currentEvents[i];
            const district = event.districtId ? citySystem.getDistrict(
              event.districtId
            ) : null;
            this.pushNews({
              key: "event:" + event.id,
              title: event.name,
              detail: (district ? district.name + "\uFF5C" : "") + event.description,
              severity: Number(
                event.trafficFactor
              ) < 1 || Number(
                event.npcDemandFactor
              ) < 1 ? "warning" : "good",
              districtId: event.districtId || null,
              day: dayOrdinal
            });
          }
          let biggest = null;
          const ids = Object.keys(
            districtSnapshot || {}
          );
          for (let i = 0; i < ids.length; i++) {
            const district = districtSnapshot[ids[i]];
            const score = Math.abs(
              district.demandDeltaRatio
            ) + Math.abs(
              district.populationDelta
            ) / Math.max(
              1,
              district.residentPopulation
            );
            if (!biggest || score > biggest.score) {
              biggest = {
                score,
                district
              };
            }
          }
          if (biggest) {
            const district = biggest.district;
            const demandPct = Math.round(
              district.demandDeltaRatio * 100
            );
            const populationDelta = Math.round(
              district.populationDelta
            );
            this.pushNews({
              key: "district:" + dayOrdinal + ":" + district.id,
              title: district.name + "\u7ECF\u8425\u52A8\u6001",
              detail: "\u6D3B\u8DC3\u4EBA\u53E3" + (populationDelta >= 0 ? "+" : "") + populationDelta + "\uFF5C\u65E5\u9700\u6C42" + (demandPct >= 0 ? "+" : "") + demandPct + "%\uFF5C\u9910\u996E\u5E97" + district.restaurantCount + "\u5BB6",
              severity: demandPct >= 0 ? "good" : "warning",
              districtId: district.id,
              day: dayOrdinal
            });
          }
        }
        processDay(dayOrdinal) {
          const marketState = propertyMarketSystem.getState();
          if (!marketState.initialized) {
            propertyMarketSystem.reset({
              seed: this.getSeed(),
              currentDay: dayOrdinal
            });
            propertyMarketSystem.initialize({
              currentDay: dayOrdinal
            });
          } else if (marketState.currentDay < dayOrdinal) {
            propertyMarketSystem.advanceDays(
              dayOrdinal - marketState.currentDay
            );
          }
          const weather = this.updateWeather(
            dayOrdinal
          );
          const marketSummaries = this.getMarketSummaries();
          const events = this.getMarketEvents();
          const snapshot = citySystem.applyDailySimulation({
            dayOrdinal,
            dayOfWeek: dayOrdinal % 7,
            marketSummaries,
            events,
            weather: weather.weather,
            temperature: weather.temperature
          });
          const simulation = gameState.getSimulation();
          simulation.lastDailySnapshot = snapshot;
          simulation.lastProcessedDay = dayOrdinal;
          this.buildDailyNews(
            dayOrdinal,
            weather,
            snapshot,
            events
          );
          return snapshot;
        }
        initialize() {
          const simulation = gameState.getSimulation();
          citySystem.ensureAllDistrictStates();
          const day = this.getDayOrdinal(
            gameState.getTime()
          );
          if (!simulation.initialized) {
            this.getSeed();
            this.processDay(
              day
            );
            simulation.initialized = true;
          } else {
            const market = propertyMarketSystem.getState();
            if (!market.initialized) {
              propertyMarketSystem.reset({
                seed: this.getSeed(),
                currentDay: day
              });
              propertyMarketSystem.initialize({
                currentDay: day
              });
            }
            if (simulation.lastProcessedDay == null) {
              simulation.lastProcessedDay = day;
            }
            if (gameState.getWorld().weather == null) {
              this.updateWeather(
                day
              );
            }
          }
          return true;
        }
        update(advancedMinutes) {
          if (!Number(
            advancedMinutes
          )) {
            return false;
          }
          this.initialize();
          const simulation = gameState.getSimulation();
          const currentDay = this.getDayOrdinal(
            gameState.getTime()
          );
          let changed = false;
          while (simulation.lastProcessedDay < currentDay) {
            this.processDay(
              simulation.lastProcessedDay + 1
            );
            changed = true;
          }
          return changed;
        }
        getNewsFeed() {
          this.initialize();
          return gameState.getSimulation().newsFeed.slice();
        }
        getBulletin() {
          const feed = this.getNewsFeed();
          if (feed.length === 0) {
            const district = citySystem.getCurrentDistrict();
            return {
              title: district ? district.name + "\u5E02\u573A\u8FD0\u884C\u5E73\u7A33" : "\u57CE\u5E02\u8FD0\u884C\u5E73\u7A33",
              detail: "\u4EBA\u53E3\u3001\u9700\u6C42\u3001\u79DF\u91D1\u548CNPC\u7ECF\u8425\u72B6\u6001\u6301\u7EED\u8054\u52A8",
              severity: "info"
            };
          }
          const time = gameState.getTime();
          const rotationHours = Math.max(
            1,
            simulationConfig.news.rotateEveryGameHours
          );
          const index = Math.floor(
            (time.hour + time.minute / 60) / rotationHours
          ) % feed.length;
          return feed[index];
        }
        getGoalState() {
          const business = gameState.getBusiness();
          if (!business.hasShop) {
            return {
              title: "\u5F00\u8BBE\u9996\u5E97",
              detail: "\u9009\u5740 \u2192 \u770B\u94FA \u2192 \u8C08\u5224 \u2192 \u7B7E\u7EA6",
              completed: false
            };
          }
          const current = business.shops.find(
            (shop) => shop.id === business.currentShopId
          ) || business.shops[0];
          return {
            title: current && current.name ? "\u7ECF\u8425 " + current.name : "\u7ECF\u8425\u9996\u5E97",
            detail: "\u8BA9\u95E8\u5E97\u7A33\u5B9A\u76C8\u5229\u5E76\u79EF\u7D2F\u54C1\u724C\u58F0\u671B",
            completed: false
          };
        }
      };
      var simulationSystem = new SimulationSystem();
      module.exports = simulationSystem;
    }
  });

  // src/renovation/renovationConfig.js
  var require_renovationConfig = __commonJS({
    "src/renovation/renovationConfig.js"(exports, module) {
      "use strict";
      module.exports = {
        // Furniture footprint includes basic chair pull-out + service clearance.
        tableFootprint: {
          2: 4.8,
          4: 7.6,
          6: 10.4,
          8: 13.2
        },
        aisleModes: {
          compact: {
            id: "compact",
            name: "\u7D27\u51D1",
            areaFactor: 0.9,
            comfort: 0.84,
            serviceEfficiency: 1.06
          },
          standard: {
            id: "standard",
            name: "\u6807\u51C6",
            areaFactor: 1,
            comfort: 1,
            serviceEfficiency: 1
          },
          spacious: {
            id: "spacious",
            name: "\u5BBD\u677E",
            areaFactor: 1.15,
            comfort: 1.1,
            serviceEfficiency: 0.96
          }
        },
        hallStyles: [
          { id: "simple", name: "\u7B80\u7EA6", costFactor: 0.88, appeal: 0.95, maintenance: 0.9 },
          { id: "wood", name: "\u539F\u6728", costFactor: 1, appeal: 1.03, maintenance: 0.98 },
          { id: "modern_cn", name: "\u73B0\u4EE3\u4E2D\u5F0F", costFactor: 1.18, appeal: 1.1, maintenance: 1.06 },
          { id: "industrial", name: "\u5DE5\u4E1A\u98CE", costFactor: 1.06, appeal: 1.04, maintenance: 0.94 },
          { id: "retro", name: "\u590D\u53E4\u5E02\u4E95", costFactor: 1.12, appeal: 1.08, maintenance: 1.04 },
          { id: "premium", name: "\u54C1\u8D28\u5546\u52A1", costFactor: 1.36, appeal: 1.18, maintenance: 1.16 }
        ],
        privateRoomStyles: [
          { id: "plain", name: "\u5B9E\u7528\u578B", costPerSqm: 620, appeal: 0.96 },
          { id: "wood", name: "\u539F\u6728\u96C5\u95F4", costPerSqm: 880, appeal: 1.05 },
          { id: "chinese", name: "\u4E2D\u5F0F\u96C5\u95F4", costPerSqm: 1180, appeal: 1.12 },
          { id: "modern", name: "\u73B0\u4EE3\u5305\u53A2", costPerSqm: 1080, appeal: 1.1 },
          { id: "premium", name: "\u5546\u52A1\u5305\u53A2", costPerSqm: 1580, appeal: 1.2 }
        ],
        materialGrades: [
          { id: "budget", name: "\u7ECF\u6D4E", costFactor: 0.82, quality: 0.88, durability: 0.85 },
          { id: "standard", name: "\u6807\u51C6", costFactor: 1, quality: 1, durability: 1 },
          { id: "good", name: "\u54C1\u8D28", costFactor: 1.22, quality: 1.1, durability: 1.12 },
          { id: "premium", name: "\u9AD8\u6863", costFactor: 1.48, quality: 1.18, durability: 1.2 }
        ],
        lightingLevels: [
          { id: "basic", name: "\u57FA\u7840\u7167\u660E", costPerSqm: 55, appeal: 0.96 },
          { id: "warm", name: "\u6696\u5149\u6C1B\u56F4", costPerSqm: 88, appeal: 1.04 },
          { id: "layered", name: "\u5206\u5C42\u706F\u5149", costPerSqm: 125, appeal: 1.1 },
          { id: "premium", name: "\u8BBE\u8BA1\u706F\u5149", costPerSqm: 188, appeal: 1.16 }
        ],
        privateRoomSeatOptions: [4, 6, 8, 10, 12],
        zoneRules: {
          minKitchenRatio: 0.18,
          maxKitchenRatio: 0.42,
          minStorageRatio: 0.04,
          maxStorageRatio: 0.18,
          minServiceRatio: 0.08,
          maxServiceRatio: 0.2
        },
        baseConstructionCostPerSqm: 520,
        templateRules: {
          maxTemplates: 30,
          defaultNamePrefix: "\u88C5\u4FEE\u6A21\u677F"
        },
        nameRules: {
          shopMaxLength: 12,
          roomMaxLength: 10,
          templateMaxLength: 14
        },
        contractorNameParts: {
          prefix: ["\u57CE\u5EFA", "\u5320\u9020", "\u79BE\u6728", "\u9F0E\u76DB", "\u9752\u79BE", "\u8FDC\u666F", "\u4E07\u5BB6", "\u7B51\u5473"],
          suffix: ["\u88C5\u9970\u5DE5\u7A0B", "\u9910\u996E\u7A7A\u95F4", "\u5EFA\u8BBE\u8BBE\u8BA1", "\u5DE5\u7A0B\u670D\u52A1"]
        }
      };
    }
  });

  // src/renovation/renovationSystem.js
  var require_renovationSystem = __commonJS({
    "src/renovation/renovationSystem.js"(exports, module) {
      "use strict";
      var gameState = require_gameState();
      var simulationSystem = require_simulationSystem();
      var config = require_renovationConfig();
      function clone(value) {
        return JSON.parse(
          JSON.stringify(value)
        );
      }
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(max, value)
        );
      }
      function hashFloat(text) {
        let h = 2166136261;
        const source = String(text);
        for (let i = 0; i < source.length; i++) {
          h ^= source.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return (h >>> 0) % 1e5 / 1e5;
      }
      var RenovationSystem = class {
        constructor() {
          this.history = {};
        }
        getHistory(shopId) {
          if (!this.history[shopId]) {
            this.history[shopId] = {
              undo: [],
              redo: []
            };
          }
          return this.history[shopId];
        }
        getShop(shopId) {
          const business = gameState.getBusiness();
          return business.shops.find(
            (item) => item.id === shopId
          ) || null;
        }
        getStore() {
          return gameState.getRenovations();
        }
        getMaxFloors(shop) {
          const raw = String(
            shop.floor || ""
          );
          if (raw.indexOf("1-3") >= 0) {
            return 3;
          }
          if (raw.indexOf("1-2") >= 0) {
            return 2;
          }
          return 1;
        }
        createFloor(index, area) {
          const diningArea = area * 0.56;
          const table4 = Math.max(
            1,
            Math.floor(
              diningArea / 16
            )
          );
          return {
            index,
            name: "\u7B2C" + (index + 1) + "\u5C42",
            area: Number(
              area.toFixed(1)
            ),
            kitchenRatio: index === 0 ? 0.27 : 0.18,
            storageRatio: 0.08,
            serviceRatio: 0.11,
            aisleMode: "standard",
            tables: {
              2: 2,
              4: table4,
              6: 0,
              8: 0
            },
            privateRooms: []
          };
        }
        ensurePlan(shopId) {
          const shop = this.getShop(shopId);
          if (!shop) {
            return null;
          }
          const store = this.getStore();
          if (!store[shopId]) {
            const maxFloors = this.getMaxFloors(shop);
            const usable = Math.max(
              1,
              Number(
                shop.usableArea || shop.grossArea || 60
              )
            );
            const perFloor = usable / maxFloors;
            const floors = [];
            for (let i = 0; i < maxFloors; i++) {
              floors.push(
                this.createFloor(
                  i,
                  perFloor
                )
              );
            }
            store[shopId] = {
              shopId,
              status: "draft",
              activeFloor: 0,
              hallStyle: "simple",
              materialGrade: "budget",
              lightingLevel: "basic",
              floors,
              selectedContractorId: null,
              construction: null
            };
          }
          return clone(
            store[shopId]
          );
        }
        mutatePlan(shopId, callback, options) {
          this.ensurePlan(shopId);
          const plan = this.getStore()[shopId];
          const opts = options || {};
          if (!opts.skipHistory && plan.status !== "constructing" && plan.status !== "completed") {
            const history = this.getHistory(
              shopId
            );
            history.undo.push(
              clone(
                plan
              )
            );
            if (history.undo.length > 20) {
              history.undo.shift();
            }
            history.redo = [];
          }
          callback(plan);
          return clone(plan);
        }
        canUndo(shopId) {
          return this.getHistory(
            shopId
          ).undo.length > 0;
        }
        canRedo(shopId) {
          return this.getHistory(
            shopId
          ).redo.length > 0;
        }
        undo(shopId) {
          const store = this.getStore();
          const current = store[shopId];
          if (!current || current.status === "constructing" || current.status === "completed") {
            return null;
          }
          const history = this.getHistory(
            shopId
          );
          const previous = history.undo.pop();
          if (!previous) {
            return null;
          }
          history.redo.push(
            clone(
              current
            )
          );
          store[shopId] = clone(
            previous
          );
          return clone(
            store[shopId]
          );
        }
        redo(shopId) {
          const store = this.getStore();
          const current = store[shopId];
          if (!current || current.status === "constructing" || current.status === "completed") {
            return null;
          }
          const history = this.getHistory(
            shopId
          );
          const next = history.redo.pop();
          if (!next) {
            return null;
          }
          history.undo.push(
            clone(
              current
            )
          );
          store[shopId] = clone(
            next
          );
          return clone(
            store[shopId]
          );
        }
        setActiveFloor(shopId, index) {
          return this.mutatePlan(
            shopId,
            (plan) => {
              plan.activeFloor = clamp(
                Math.floor(index),
                0,
                plan.floors.length - 1
              );
            }
          );
        }
        adjustZone(shopId, floorIndex, key, delta) {
          const rules = config.zoneRules;
          const range = {
            kitchenRatio: [
              rules.minKitchenRatio,
              rules.maxKitchenRatio
            ],
            storageRatio: [
              rules.minStorageRatio,
              rules.maxStorageRatio
            ],
            serviceRatio: [
              rules.minServiceRatio,
              rules.maxServiceRatio
            ]
          }[key];
          if (!range) {
            return null;
          }
          return this.mutatePlan(
            shopId,
            (plan) => {
              const floor = plan.floors[clamp(
                floorIndex,
                0,
                plan.floors.length - 1
              )];
              floor[key] = Number(
                clamp(
                  floor[key] + delta,
                  range[0],
                  range[1]
                ).toFixed(2)
              );
            }
          );
        }
        cycleAisle(shopId, floorIndex) {
          const ids = Object.keys(
            config.aisleModes
          );
          return this.mutatePlan(
            shopId,
            (plan) => {
              const floor = plan.floors[floorIndex];
              const current = ids.indexOf(
                floor.aisleMode
              );
              floor.aisleMode = ids[(current + 1) % ids.length];
            }
          );
        }
        adjustTable(shopId, floorIndex, seats, delta) {
          const key = String(seats);
          if (!config.tableFootprint[key]) {
            return null;
          }
          return this.mutatePlan(
            shopId,
            (plan) => {
              const floor = plan.floors[floorIndex];
              floor.tables[key] = Math.max(
                0,
                Math.min(
                  40,
                  (floor.tables[key] || 0) + delta
                )
              );
            }
          );
        }
        addPrivateRoom(shopId, floorIndex) {
          return this.mutatePlan(
            shopId,
            (plan) => {
              const floor = plan.floors[floorIndex];
              if (floor.privateRooms.length >= 8) {
                return;
              }
              const id = "room_" + Date.now() % 1e6 + "_" + floor.privateRooms.length;
              floor.privateRooms.push({
                id,
                name: "\u5305\u53A2" + (floor.privateRooms.length + 1),
                seats: 6,
                style: "wood"
              });
            }
          );
        }
        removePrivateRoom(shopId, floorIndex, roomId) {
          return this.mutatePlan(
            shopId,
            (plan) => {
              const floor = plan.floors[floorIndex];
              floor.privateRooms = floor.privateRooms.filter(
                (item) => item.id !== roomId
              );
            }
          );
        }
        cycleRoomSeats(shopId, floorIndex, roomId) {
          const options = config.privateRoomSeatOptions;
          return this.mutatePlan(
            shopId,
            (plan) => {
              const room = plan.floors[floorIndex].privateRooms.find(
                (item) => item.id === roomId
              );
              if (!room) {
                return;
              }
              const current = options.indexOf(
                room.seats
              );
              room.seats = options[(current + 1) % options.length];
            }
          );
        }
        cycleRoomStyle(shopId, floorIndex, roomId) {
          const styles = config.privateRoomStyles;
          return this.mutatePlan(
            shopId,
            (plan) => {
              const room = plan.floors[floorIndex].privateRooms.find(
                (item) => item.id === roomId
              );
              if (!room) {
                return;
              }
              const current = styles.findIndex(
                (item) => item.id === room.style
              );
              room.style = styles[(current + 1) % styles.length].id;
            }
          );
        }
        cycleGlobal(shopId, key) {
          const source = key === "hallStyle" ? config.hallStyles : key === "materialGrade" ? config.materialGrades : config.lightingLevels;
          return this.mutatePlan(
            shopId,
            (plan) => {
              const current = source.findIndex(
                (item) => item.id === plan[key]
              );
              plan[key] = source[(current + 1) % source.length].id;
            }
          );
        }
        getById(list, id) {
          return list.find(
            (item) => item.id === id
          ) || list[0];
        }
        getMetrics(shopId) {
          const shop = this.getShop(shopId);
          const plan = this.ensurePlan(shopId);
          if (!shop || !plan) {
            return null;
          }
          const hallStyle = this.getById(
            config.hallStyles,
            plan.hallStyle
          );
          const material = this.getById(
            config.materialGrades,
            plan.materialGrade
          );
          const lighting = this.getById(
            config.lightingLevels,
            plan.lightingLevel
          );
          let totalSeats = 0;
          let totalDiningArea = 0;
          let totalFurnitureArea = 0;
          let privateRoomArea = 0;
          let privateRoomSeats = 0;
          let roomAppeal = 0;
          let roomCount = 0;
          let kitchenArea = 0;
          let storageArea = 0;
          let serviceArea = 0;
          let comfortScore = 0;
          let serviceScore = 0;
          let invalidFloorCount = 0;
          const floorMetrics = [];
          for (let i = 0; i < plan.floors.length; i++) {
            const floor = plan.floors[i];
            const aisle = config.aisleModes[floor.aisleMode];
            const zoneRatio = floor.kitchenRatio + floor.storageRatio + floor.serviceRatio;
            const diningArea = Math.max(
              0,
              floor.area * (1 - zoneRatio)
            );
            let tableArea = 0;
            let tableSeats = 0;
            Object.keys(
              floor.tables
            ).forEach(
              (key) => {
                const count = floor.tables[key];
                tableArea += count * config.tableFootprint[key] * aisle.areaFactor;
                tableSeats += count * Number(key);
              }
            );
            let roomArea = 0;
            let roomSeats = 0;
            let floorRoomAppeal = 0;
            for (let j = 0; j < floor.privateRooms.length; j++) {
              const room = floor.privateRooms[j];
              const style = this.getById(
                config.privateRoomStyles,
                room.style
              );
              const area = 7 + room.seats * 1.55;
              roomArea += area;
              roomSeats += room.seats;
              floorRoomAppeal += style.appeal;
            }
            const used = tableArea + roomArea;
            const remaining = diningArea - used;
            const crowding = diningArea > 0 ? used / diningArea : 99;
            const valid = remaining >= -0.01 && zoneRatio < 0.78;
            if (!valid) {
              invalidFloorCount += 1;
            }
            floorMetrics.push({
              ...floor,
              diningArea: Number(
                diningArea.toFixed(1)
              ),
              tableArea: Number(
                tableArea.toFixed(1)
              ),
              privateRoomArea: Number(
                roomArea.toFixed(1)
              ),
              remainingArea: Number(
                remaining.toFixed(1)
              ),
              seats: tableSeats + roomSeats,
              crowding,
              valid
            });
            totalSeats += tableSeats + roomSeats;
            totalDiningArea += diningArea;
            totalFurnitureArea += tableArea;
            privateRoomArea += roomArea;
            privateRoomSeats += roomSeats;
            roomAppeal += floorRoomAppeal;
            roomCount += floor.privateRooms.length;
            kitchenArea += floor.area * floor.kitchenRatio;
            storageArea += floor.area * floor.storageRatio;
            serviceArea += floor.area * floor.serviceRatio;
            comfortScore += aisle.comfort;
            serviceScore += aisle.serviceEfficiency;
          }
          const totalArea = plan.floors.reduce(
            (sum, item) => sum + item.area,
            0
          );
          const furnitureCost = plan.floors.reduce(
            (sum, floor) => {
              return sum + Object.keys(
                floor.tables
              ).reduce(
                (inner, key) => inner + floor.tables[key] * (420 + Number(key) * 165),
                0
              );
            },
            0
          );
          let roomCost = 0;
          for (let i = 0; i < plan.floors.length; i++) {
            const floor = plan.floors[i];
            for (let j = 0; j < floor.privateRooms.length; j++) {
              const room = floor.privateRooms[j];
              const style = this.getById(
                config.privateRoomStyles,
                room.style
              );
              const area = 7 + room.seats * 1.55;
              roomCost += area * style.costPerSqm;
            }
          }
          const constructionBase = totalArea * config.baseConstructionCostPerSqm * hallStyle.costFactor * material.costFactor;
          const lightingCost = totalArea * lighting.costPerSqm;
          const kitchenComplexity = kitchenArea * (210 + totalSeats * 1.8);
          const totalCost = Math.round(
            constructionBase + lightingCost + furnitureCost + roomCost + kitchenComplexity
          );
          const averageComfort = comfortScore / Math.max(
            1,
            plan.floors.length
          );
          const averageService = serviceScore / Math.max(
            1,
            plan.floors.length
          );
          const kitchenLoad = totalSeats / Math.max(
            1,
            kitchenArea * 2.65
          );
          const comfort = clamp(
            averageComfort * material.quality * lighting.appeal * (1 - Math.max(
              0,
              (totalFurnitureArea + privateRoomArea) / Math.max(
                1,
                totalDiningArea
              ) - 0.78
            ) * 0.8),
            0.35,
            1.35
          );
          const appeal = clamp(
            hallStyle.appeal * lighting.appeal * material.quality * (roomCount ? roomAppeal / roomCount : 1),
            0.55,
            1.55
          );
          const operationalEfficiency = clamp(
            averageService * (1 - Math.max(
              0,
              kitchenLoad - 1
            ) * 0.32) * (1 + storageArea / Math.max(
              1,
              totalArea
            ) * 0.22),
            0.45,
            1.35
          );
          const buildDays = Math.max(
            5,
            Math.round(
              Math.sqrt(
                totalArea
              ) * 1.4 * hallStyle.costFactor + roomCount * 1.8 + plan.floors.length * 2
            )
          );
          return {
            shopId,
            plan,
            floors: floorMetrics,
            totalArea: Number(
              totalArea.toFixed(1)
            ),
            totalSeats,
            privateRoomSeats,
            roomCount,
            kitchenArea: Number(
              kitchenArea.toFixed(1)
            ),
            storageArea: Number(
              storageArea.toFixed(1)
            ),
            serviceArea: Number(
              serviceArea.toFixed(1)
            ),
            totalDiningArea: Number(
              totalDiningArea.toFixed(1)
            ),
            invalidFloorCount,
            valid: invalidFloorCount === 0 && kitchenLoad <= 1.28,
            kitchenLoad,
            comfort,
            appeal,
            operationalEfficiency,
            totalCost,
            buildDays
          };
        }
        getContractorQuotes(shopId) {
          const metrics = this.getMetrics(
            shopId
          );
          if (!metrics) {
            return [];
          }
          const seed = gameState.getSimulation().seed || 1;
          const quotes = [];
          for (let i = 0; i < 3; i++) {
            const r1 = hashFloat(
              shopId + ":contractor:" + seed + ":" + i
            );
            const r2 = hashFloat(
              shopId + ":contractor2:" + seed + ":" + i
            );
            const prefix = config.contractorNameParts.prefix[Math.floor(
              r1 * config.contractorNameParts.prefix.length
            ) % config.contractorNameParts.prefix.length];
            const suffix = config.contractorNameParts.suffix[Math.floor(
              r2 * config.contractorNameParts.suffix.length
            ) % config.contractorNameParts.suffix.length];
            const priceFactor = 0.88 + r1 * 0.3;
            const speedFactor = 0.84 + r2 * 0.3;
            const reliability = Math.round(
              68 + (r1 * 0.45 + r2 * 0.55) * 29
            );
            quotes.push({
              id: "contractor_" + i,
              name: prefix + suffix,
              price: Math.round(
                metrics.totalCost * priceFactor
              ),
              days: Math.max(
                4,
                Math.round(
                  metrics.buildDays * speedFactor
                )
              ),
              reliability,
              quality: Math.round(
                65 + r2 * 32
              )
            });
          }
          return quotes.sort(
            (a, b) => a.price - b.price
          );
        }
        selectContractor(shopId, contractorId) {
          const quotes = this.getContractorQuotes(
            shopId
          );
          const found = quotes.find(
            (item) => item.id === contractorId
          );
          if (!found) {
            return null;
          }
          return this.mutatePlan(
            shopId,
            (plan) => {
              plan.selectedContractorId = contractorId;
            }
          );
        }
        startConstruction(shopId) {
          const shop = this.getShop(
            shopId
          );
          const metrics = this.getMetrics(
            shopId
          );
          if (!shop || !metrics) {
            return {
              ok: false,
              message: "\u95E8\u5E97\u4E0D\u5B58\u5728"
            };
          }
          if (!metrics.valid) {
            return {
              ok: false,
              message: "\u5F53\u524D\u5E03\u5C40\u5B58\u5728\u9762\u79EF\u6216\u540E\u53A8\u627F\u8F7D\u95EE\u9898"
            };
          }
          const plan = this.getStore()[shopId];
          const quotes = this.getContractorQuotes(
            shopId
          );
          const quote = quotes.find(
            (item) => item.id === plan.selectedContractorId
          ) || quotes[0];
          if (gameState.getPlayer().cash < quote.price) {
            return {
              ok: false,
              message: "\u88C5\u4FEE\u8D44\u91D1\u4E0D\u8DB3\uFF0C\u8FD8\u5DEE\xA5" + (quote.price - gameState.getPlayer().cash).toLocaleString()
            };
          }
          gameState.spendCash(
            quote.price
          );
          const currentDay = simulationSystem.getDayOrdinal(
            gameState.getTime()
          );
          plan.status = "constructing";
          plan.construction = {
            contractor: clone(quote),
            startDay: currentDay,
            finishDay: currentDay + quote.days,
            paid: quote.price,
            snapshot: clone(metrics)
          };
          shop.status = "renovating";
          shop.renovationCost = quote.price;
          shop.renovationFinishDay = plan.construction.finishDay;
          return {
            ok: true,
            quote: clone(quote),
            finishDay: plan.construction.finishDay
          };
        }
        updateShop(shopId) {
          const shop = this.getShop(
            shopId
          );
          const plan = this.ensurePlan(
            shopId
          );
          if (!shop || !plan || plan.status !== "constructing" || !plan.construction) {
            return false;
          }
          const currentDay = simulationSystem.getDayOrdinal(
            gameState.getTime()
          );
          if (currentDay < plan.construction.finishDay) {
            return false;
          }
          const stored = this.getStore()[shopId];
          stored.status = "completed";
          shop.status = "renovated_pending_license";
          shop.layoutMetrics = clone(
            stored.construction.snapshot
          );
          return true;
        }
      };
      module.exports = new RenovationSystem();
    }
  });

  // src/opening/openingConfig.js
  var require_openingConfig = __commonJS({
    "src/opening/openingConfig.js"(exports, module) {
      "use strict";
      module.exports = {
        equipment: [
          {
            id: "cooking",
            name: "\u70F9\u996A\u8BBE\u5907",
            iconKey: "visual_stove",
            basePrice: 13800,
            capacityPerUnit: 34,
            powerKw: 8,
            gasPreferred: true,
            installDays: 2
          },
          {
            id: "cold",
            name: "\u51B7\u85CF\u8BBE\u5907",
            iconKey: "visual_fridge",
            basePrice: 9800,
            capacityPerUnit: 52,
            powerKw: 2.6,
            gasPreferred: false,
            installDays: 1
          },
          {
            id: "prep",
            name: "\u5907\u9910\u64CD\u4F5C\u53F0",
            iconKey: "visual_register",
            basePrice: 4200,
            capacityPerUnit: 42,
            powerKw: 0.3,
            gasPreferred: false,
            installDays: 1
          },
          {
            id: "dishwash",
            name: "\u6D17\u6D88\u8BBE\u5907",
            iconKey: "visual_fridge",
            basePrice: 7600,
            capacityPerUnit: 46,
            powerKw: 5.5,
            gasPreferred: false,
            installDays: 2
          },
          {
            id: "pos",
            name: "\u6536\u94F6\u8BBE\u5907",
            iconKey: "visual_register",
            basePrice: 3200,
            capacityPerUnit: 85,
            powerKw: 0.5,
            gasPreferred: false,
            installDays: 1
          }
        ],
        qualityGrades: [
          {
            id: "budget",
            name: "\u7ECF\u6D4E",
            priceFactor: 0.82,
            reliability: 0.86,
            efficiency: 0.92
          },
          {
            id: "standard",
            name: "\u6807\u51C6",
            priceFactor: 1,
            reliability: 1,
            efficiency: 1
          },
          {
            id: "premium",
            name: "\u9AD8\u914D",
            priceFactor: 1.28,
            reliability: 1.12,
            efficiency: 1.09
          }
        ],
        permits: [
          {
            id: "business",
            name: "\u4E3B\u4F53\u767B\u8BB0",
            baseFee: 380,
            baseDays: 2
          },
          {
            id: "food",
            name: "\u98DF\u54C1\u7ECF\u8425\u8BB8\u53EF",
            baseFee: 680,
            baseDays: 5
          },
          {
            id: "fire",
            name: "\u6D88\u9632\u68C0\u67E5/\u5907\u6848",
            baseFee: 460,
            baseDays: 4
          },
          {
            id: "sign",
            name: "\u95E8\u5934\u62DB\u724C\u5907\u6848",
            baseFee: 160,
            baseDays: 2
          }
        ],
        roles: [
          {
            id: "manager",
            name: "\u5E97\u957F",
            baseWage: 7200,
            seatsPerWorker: 999
          },
          {
            id: "chef",
            name: "\u53A8\u5E08",
            baseWage: 6800,
            seatsPerWorker: 38
          },
          {
            id: "server",
            name: "\u670D\u52A1\u5458",
            baseWage: 4200,
            seatsPerWorker: 22
          },
          {
            id: "cashier",
            name: "\u6536\u94F6/\u524D\u53F0",
            baseWage: 4300,
            seatsPerWorker: 70
          }
        ],
        surnames: [
          "\u9648",
          "\u738B",
          "\u674E",
          "\u5F20",
          "\u5218",
          "\u5468",
          "\u8D75",
          "\u5B59",
          "\u9A6C",
          "\u6731",
          "\u80E1",
          "\u90ED",
          "\u4F55",
          "\u9AD8",
          "\u6797",
          "\u90D1",
          "\u6881",
          "\u8BB8",
          "\u5B8B",
          "\u8C22"
        ],
        givenNames: [
          "\u542F\u660E",
          "\u5A49\u5B81",
          "\u5FD7\u5F3A",
          "\u8FDC\u822A",
          "\u96C5\u7434",
          "\u56FD\u6881",
          "\u6668\u66E6",
          "\u96E8\u6850",
          "\u5609\u5B81",
          "\u535A\u6587",
          "\u6D69\u7136",
          "\u601D\u8FDC",
          "\u5B50\u6DB5",
          "\u660E\u8F69",
          "\u82E5\u6EAA",
          "\u4FCA\u6770",
          "\u96EA\u6674",
          "\u4F73\u6021",
          "\u6587\u6D9B",
          "\u6653\u5CF0"
        ]
      };
    }
  });

  // src/opening/openingPrepSystem.js
  var require_openingPrepSystem = __commonJS({
    "src/opening/openingPrepSystem.js"(exports, module) {
      "use strict";
      var gameState = require_gameState();
      var simulationSystem = require_simulationSystem();
      var renovationSystem = require_renovationSystem();
      var config = require_openingConfig();
      function clone(value) {
        return JSON.parse(
          JSON.stringify(value)
        );
      }
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(
            max,
            value
          )
        );
      }
      function hashFloat(text) {
        let h = 2166136261;
        const source = String(text);
        for (let i = 0; i < source.length; i++) {
          h ^= source.charCodeAt(
            i
          );
          h = Math.imul(
            h,
            16777619
          );
        }
        return (h >>> 0) % 1e5 / 1e5;
      }
      function featureOkay(value) {
        if (value === void 0 || value === null) {
          return true;
        }
        if (typeof value === "boolean") {
          return value;
        }
        const text = String(value);
        return !(text.indexOf(
          "\u65E0"
        ) >= 0 || text.indexOf(
          "\u4E0D"
        ) >= 0 || text.indexOf(
          "\u5426"
        ) >= 0 || text.indexOf(
          "\u4E0D\u8DB3"
        ) >= 0);
      }
      var OpeningPrepSystem = class {
        getShop(shopId) {
          return gameState.getBusiness().shops.find(
            (item) => item.id === shopId
          ) || null;
        }
        getStore() {
          return gameState.getOpeningPrep();
        }
        getCurrentDay() {
          return simulationSystem.getDayOrdinal(
            gameState.getTime()
          );
        }
        getSeats(shopId) {
          const shop = this.getShop(
            shopId
          );
          if (!shop) {
            return 0;
          }
          const metrics = renovationSystem.getMetrics(
            shopId
          );
          if (metrics && Number.isFinite(
            Number(
              metrics.totalSeats
            )
          )) {
            return Math.max(
              1,
              Number(
                metrics.totalSeats
              )
            );
          }
          return Math.max(
            1,
            Number(
              shop.seatEstimate
            ) || 30
          );
        }
        ensureEquipment(shopId) {
          const prep = this.getStore();
          if (!prep.equipment[shopId]) {
            const seats = this.getSeats(
              shopId
            );
            const items = {};
            for (const item of config.equipment) {
              items[item.id] = {
                id: item.id,
                quantity: Math.max(
                  1,
                  Math.ceil(
                    seats / item.capacityPerUnit
                  )
                ),
                grade: "standard"
              };
            }
            prep.equipment[shopId] = {
              status: "planning",
              items,
              orderDay: null,
              deliveryDay: null,
              paid: 0
            };
          }
          return prep.equipment[shopId];
        }
        getEquipmentState(shopId) {
          return clone(
            this.ensureEquipment(
              shopId
            )
          );
        }
        getEquipmentQuote(shopId) {
          const shop = this.getShop(
            shopId
          );
          if (!shop) {
            return null;
          }
          const state = this.ensureEquipment(
            shopId
          );
          const day = this.getCurrentDay();
          const marketFactor = 0.94 + hashFloat(
            shopId + ":equipment-market:" + day
          ) * 0.14;
          const lines = [];
          let total = 0;
          let totalPower = 0;
          let cookingCapacity = 0;
          let serviceCapacity = Infinity;
          let maxInstallDays = 1;
          for (const item of config.equipment) {
            const plan = state.items[item.id];
            const grade = config.qualityGrades.find(
              (entry) => entry.id === plan.grade
            ) || config.qualityGrades[1];
            const price = Math.round(
              item.basePrice * plan.quantity * grade.priceFactor * marketFactor
            );
            const capacity2 = item.capacityPerUnit * plan.quantity * grade.efficiency;
            const power = item.powerKw * plan.quantity;
            total += price;
            totalPower += power;
            maxInstallDays = Math.max(
              maxInstallDays,
              item.installDays
            );
            if (item.id === "cooking") {
              cookingCapacity = capacity2;
            } else {
              serviceCapacity = Math.min(
                serviceCapacity,
                capacity2
              );
            }
            lines.push({
              ...item,
              quantity: plan.quantity,
              grade: grade.id,
              gradeName: grade.name,
              price,
              capacity: Math.round(
                capacity2
              ),
              powerKw: Number(
                power.toFixed(
                  1
                )
              ),
              reliability: grade.reliability
            });
          }
          if (serviceCapacity === Infinity) {
            serviceCapacity = 0;
          }
          const seats = this.getSeats(
            shopId
          );
          const capacity = Math.min(
            cookingCapacity,
            serviceCapacity
          );
          const capacityRatio = capacity / Math.max(
            1,
            seats
          );
          const electricLimit = Number(
            shop.electricCapacityKw
          );
          const issues = [];
          let infrastructureUpgradeCost = 0;
          if (Number.isFinite(
            electricLimit
          ) && electricLimit > 0 && totalPower > electricLimit) {
            infrastructureUpgradeCost = Math.round(
              (totalPower - electricLimit) * 850
            );
          }
          const shortage = Math.max(
            0,
            1 - capacityRatio
          );
          const marketDelay = Math.floor(
            hashFloat(
              shopId + ":equipment-delay:" + day
            ) * 3
          );
          return {
            shopId,
            lines,
            total: total + infrastructureUpgradeCost,
            equipmentCost: total,
            infrastructureUpgradeCost,
            totalPowerKw: Number(
              totalPower.toFixed(
                1
              )
            ),
            seats,
            capacity: Math.round(
              capacity
            ),
            capacityRatio,
            shortage,
            issues,
            valid: capacityRatio >= 0.9,
            installDays: maxInstallDays + marketDelay,
            marketFactor
          };
        }
        adjustEquipment(shopId, itemId, delta) {
          const state = this.ensureEquipment(
            shopId
          );
          if (state.status !== "planning") {
            return false;
          }
          const item = state.items[itemId];
          if (!item) {
            return false;
          }
          item.quantity = clamp(
            item.quantity + delta,
            0,
            20
          );
          return true;
        }
        cycleEquipmentGrade(shopId, itemId) {
          const state = this.ensureEquipment(
            shopId
          );
          if (state.status !== "planning") {
            return false;
          }
          const item = state.items[itemId];
          if (!item) {
            return false;
          }
          const ids = config.qualityGrades.map(
            (entry) => entry.id
          );
          const current = ids.indexOf(
            item.grade
          );
          item.grade = ids[(current + 1) % ids.length];
          return true;
        }
        orderEquipment(shopId) {
          const state = this.ensureEquipment(
            shopId
          );
          if (state.status !== "planning") {
            return {
              ok: false,
              message: "\u8BBE\u5907\u8BA2\u5355\u5DF2\u7ECF\u63D0\u4EA4"
            };
          }
          const quote = this.getEquipmentQuote(
            shopId
          );
          if (!quote) {
            return {
              ok: false,
              message: "\u95E8\u5E97\u4E0D\u5B58\u5728"
            };
          }
          if (!quote.valid) {
            return {
              ok: false,
              message: quote.issues[0] || "\u5F53\u524D\u8BBE\u5907\u914D\u7F6E\u65E0\u6CD5\u6EE1\u8DB3\u8425\u4E1A\u9700\u6C42"
            };
          }
          if (!gameState.spendCash(
            quote.total
          )) {
            return {
              ok: false,
              message: "\u8BBE\u5907\u91C7\u8D2D\u8D44\u91D1\u4E0D\u8DB3"
            };
          }
          const day = this.getCurrentDay();
          state.status = "ordered";
          state.orderDay = day;
          state.deliveryDay = day + quote.installDays;
          state.paid = quote.total;
          state.quote = clone(
            quote
          );
          return {
            ok: true,
            deliveryDay: state.deliveryDay,
            total: quote.total
          };
        }
        updateEquipment(shopId) {
          const state = this.ensureEquipment(
            shopId
          );
          if (state.status !== "ordered") {
            return false;
          }
          if (this.getCurrentDay() < state.deliveryDay) {
            return false;
          }
          state.status = "installed";
          return true;
        }
        getPermitState(shopId) {
          const prep = this.getStore();
          if (!prep.permits[shopId]) {
            const items = {};
            for (const permit of config.permits) {
              items[permit.id] = {
                id: permit.id,
                status: "not_applied",
                appliedDay: null,
                finishDay: null,
                paid: 0,
                issue: null
              };
            }
            prep.permits[shopId] = {
              items,
              remediated: {}
            };
          }
          return prep.permits[shopId];
        }
        getPermitRequirements(shopId, permitId) {
          const shop = this.getShop(
            shopId
          );
          const equipment = this.ensureEquipment(
            shopId
          );
          const permitState = this.getPermitState(
            shopId
          );
          const renovation = renovationSystem.ensurePlan(
            shopId
          );
          const reasons = [];
          if (permitId === "food") {
            if (!renovation || renovation.status !== "completed") {
              reasons.push(
                "\u88C5\u4FEE\u5C1A\u672A\u5B8C\u6210"
              );
            }
            if (equipment.status !== "installed") {
              reasons.push(
                "\u4E3B\u8981\u8BBE\u5907\u5C1A\u672A\u5B89\u88C5"
              );
            }
            if (shop && !featureOkay(
              shop.greaseTrap
            ) && !permitState.remediated.food) {
              reasons.push(
                "\u9694\u6CB9\u8BBE\u65BD\u9700\u6574\u6539"
              );
            }
          }
          if (permitId === "fire") {
            if (!renovation || renovation.status !== "completed") {
              reasons.push(
                "\u88C5\u4FEE\u5C1A\u672A\u5B8C\u6210"
              );
            }
            if (shop && !featureOkay(
              shop.fireSprinkler
            ) && !permitState.remediated.fire) {
              reasons.push(
                "\u6D88\u9632\u55B7\u6DCB\u9700\u6574\u6539"
              );
            }
          }
          return {
            ready: reasons.length === 0,
            reasons
          };
        }
        getPermitOverview(shopId) {
          const shop = this.getShop(
            shopId
          );
          if (!shop) {
            return null;
          }
          const state = this.getPermitState(
            shopId
          );
          const day = this.getCurrentDay();
          const rows = [];
          for (const permit of config.permits) {
            const item = state.items[permit.id];
            const req = this.getPermitRequirements(
              shopId,
              permit.id
            );
            const volatility = 0.92 + hashFloat(
              shopId + ":permit:" + permit.id + ":" + day
            ) * 0.22;
            const fee = Math.round(
              permit.baseFee * volatility
            );
            const days = Math.max(
              1,
              Math.round(
                permit.baseDays * (0.85 + volatility * 0.18)
              )
            );
            const remediableReason = req.reasons.find(
              (reason) => reason.indexOf(
                "\u6574\u6539"
              ) >= 0
            ) || null;
            const remediationCost = Math.round(
              (permit.id === "fire" ? 6800 : permit.id === "food" ? 4200 : 1800) * (0.88 + hashFloat(
                shopId + ":remediation:" + permit.id + ":" + day
              ) * 0.28)
            );
            rows.push({
              ...permit,
              fee,
              days,
              ready: req.ready,
              reasons: req.reasons,
              status: item.status,
              finishDay: item.finishDay,
              issue: item.issue,
              remediable: !!remediableReason || item.status === "needs_fix",
              remediationCost
            });
          }
          return {
            shopId,
            rows,
            approved: rows.filter(
              (item) => item.status === "approved"
            ).length,
            total: rows.length
          };
        }
        applyPermit(shopId, permitId) {
          const state = this.getPermitState(
            shopId
          );
          const item = state.items[permitId];
          if (!item) {
            return {
              ok: false,
              message: "\u8BC1\u7167\u9879\u76EE\u4E0D\u5B58\u5728"
            };
          }
          if (item.status === "applying" || item.status === "approved") {
            return {
              ok: false,
              message: "\u8BE5\u9879\u76EE\u5DF2\u63D0\u4EA4"
            };
          }
          const overview = this.getPermitOverview(
            shopId
          );
          const row = overview.rows.find(
            (permit) => permit.id === permitId
          );
          if (!row.ready) {
            return {
              ok: false,
              message: row.reasons[0] || "\u5F53\u524D\u6761\u4EF6\u4E0D\u6EE1\u8DB3"
            };
          }
          if (!gameState.spendCash(
            row.fee
          )) {
            return {
              ok: false,
              message: "\u529E\u7406\u8D39\u7528\u4E0D\u8DB3"
            };
          }
          const day = this.getCurrentDay();
          item.status = "applying";
          item.appliedDay = day;
          item.finishDay = day + row.days;
          item.paid += row.fee;
          item.issue = null;
          return {
            ok: true,
            finishDay: item.finishDay,
            fee: row.fee
          };
        }
        remediatePermit(shopId, permitId) {
          const state = this.getPermitState(
            shopId
          );
          const item = state.items[permitId];
          if (!item) {
            return {
              ok: false,
              message: "\u8BC1\u7167\u9879\u76EE\u4E0D\u5B58\u5728"
            };
          }
          const overview = this.getPermitOverview(
            shopId
          );
          const row = overview.rows.find(
            (entry) => entry.id === permitId
          );
          if (!row || !row.remediable) {
            return {
              ok: false,
              message: "\u5F53\u524D\u6CA1\u6709\u53EF\u6267\u884C\u7684\u6574\u6539\u9879\u76EE"
            };
          }
          if (!gameState.spendCash(
            row.remediationCost
          )) {
            return {
              ok: false,
              message: "\u6574\u6539\u8D44\u91D1\u4E0D\u8DB3"
            };
          }
          state.remediated[permitId] = true;
          item.status = "not_applied";
          item.issue = null;
          item.finishDay = null;
          return {
            ok: true,
            cost: row.remediationCost
          };
        }
        updatePermits(shopId) {
          const shop = this.getShop(
            shopId
          );
          if (!shop) {
            return false;
          }
          const state = this.getPermitState(
            shopId
          );
          const day = this.getCurrentDay();
          let changed = false;
          for (const permit of config.permits) {
            const item = state.items[permit.id];
            if (item.status !== "applying" || day < item.finishDay) {
              continue;
            }
            const req = this.getPermitRequirements(
              shopId,
              permit.id
            );
            if (!req.ready) {
              item.status = "needs_fix";
              item.issue = req.reasons[0];
              changed = true;
              continue;
            }
            const inspection = hashFloat(
              shopId + ":inspection:" + permit.id + ":" + item.appliedDay
            );
            const failRisk = permit.id === "food" ? 0.1 : permit.id === "fire" ? 0.08 : 0.035;
            if (inspection < failRisk) {
              item.status = "needs_fix";
              item.issue = permit.id === "food" ? "\u73B0\u573A\u536B\u751F\u7EC6\u8282\u9700\u8865\u5145\u6574\u6539" : permit.id === "fire" ? "\u6D88\u9632\u6807\u8BC6\u4E0E\u901A\u9053\u7EC6\u8282\u9700\u8865\u5145" : "\u8D44\u6599\u5B58\u5728\u7F3A\u9879";
            } else {
              item.status = "approved";
              item.issue = null;
            }
            changed = true;
          }
          return changed;
        }
        getStaffState(shopId) {
          const prep = this.getStore();
          if (!prep.staffing[shopId]) {
            prep.staffing[shopId] = {
              hired: [],
              candidateDay: null,
              candidates: []
            };
          }
          return prep.staffing[shopId];
        }
        getRequiredStaff(shopId) {
          const seats = this.getSeats(
            shopId
          );
          const result = {};
          for (const role of config.roles) {
            result[role.id] = role.id === "manager" ? 1 : Math.max(
              1,
              Math.ceil(
                seats / role.seatsPerWorker
              )
            );
          }
          return result;
        }
        generateCandidate(shopId, role, index, day) {
          const seed = gameState.getSimulation().seed || 1;
          const base = shopId + ":" + role.id + ":" + day + ":" + index + ":" + seed;
          const r1 = hashFloat(
            base + ":a"
          );
          const r2 = hashFloat(
            base + ":b"
          );
          const r3 = hashFloat(
            base + ":c"
          );
          const surname = config.surnames[Math.floor(
            r1 * config.surnames.length
          ) % config.surnames.length];
          const given = config.givenNames[Math.floor(
            r2 * config.givenNames.length
          ) % config.givenNames.length];
          const skill = Math.round(
            48 + r1 * 48
          );
          const stability = Math.round(
            45 + r2 * 52
          );
          const experience = Math.round(
            r3 * 10
          );
          const wage = Math.round(
            role.baseWage * (0.84 + skill / 250 + experience / 100) / 100
          ) * 100;
          return {
            id: "candidate_" + role.id + "_" + day + "_" + index,
            roleId: role.id,
            roleName: role.name,
            name: surname + given,
            age: 20 + Math.floor(
              r3 * 25
            ),
            skill,
            stability,
            experience,
            wage,
            score: Math.round(
              skill * 0.55 + stability * 0.3 + Math.min(
                100,
                experience * 10
              ) * 0.15
            )
          };
        }
        refreshCandidates(shopId) {
          const state = this.getStaffState(
            shopId
          );
          const day = this.getCurrentDay();
          if (state.candidateDay === day && state.candidates.length) {
            return;
          }
          const candidates = [];
          for (const role of config.roles) {
            for (let i = 0; i < 3; i++) {
              candidates.push(
                this.generateCandidate(
                  shopId,
                  role,
                  i,
                  day
                )
              );
            }
          }
          state.candidateDay = day;
          state.candidates = candidates;
        }
        getStaffOverview(shopId) {
          this.refreshCandidates(
            shopId
          );
          const state = this.getStaffState(
            shopId
          );
          const required = this.getRequiredStaff(
            shopId
          );
          const current = {};
          for (const role of config.roles) {
            current[role.id] = state.hired.filter(
              (staff) => staff.roleId === role.id
            ).length;
          }
          let requiredTotal = 0;
          let currentTotal = 0;
          for (const role of config.roles) {
            requiredTotal += required[role.id];
            currentTotal += Math.min(
              required[role.id],
              current[role.id]
            );
          }
          const payroll = state.hired.reduce(
            (total, staff) => total + staff.wage,
            0
          );
          return {
            required,
            current,
            hired: clone(
              state.hired
            ),
            candidates: clone(
              state.candidates
            ),
            payroll,
            coverage: currentTotal / Math.max(
              1,
              requiredTotal
            )
          };
        }
        hireCandidate(shopId, candidateId) {
          this.refreshCandidates(
            shopId
          );
          const state = this.getStaffState(
            shopId
          );
          const candidate = state.candidates.find(
            (item) => item.id === candidateId
          );
          if (!candidate) {
            return {
              ok: false,
              message: "\u5019\u9009\u4EBA\u5DF2\u5931\u6548"
            };
          }
          const signOnCost = Math.round(
            candidate.wage * 0.18
          );
          if (!gameState.spendCash(
            signOnCost
          )) {
            return {
              ok: false,
              message: "\u62DB\u8058\u5165\u804C\u6210\u672C\u4E0D\u8DB3"
            };
          }
          state.hired.push({
            id: "staff_" + candidate.id,
            ...clone(
              candidate
            ),
            hiredDay: this.getCurrentDay(),
            signOnCost
          });
          state.candidates = state.candidates.filter(
            (item) => item.id !== candidateId
          );
          return {
            ok: true,
            staff: clone(
              state.hired[state.hired.length - 1]
            ),
            signOnCost
          };
        }
        dismissStaff(shopId, staffId) {
          const state = this.getStaffState(
            shopId
          );
          const index = state.hired.findIndex(
            (item) => item.id === staffId
          );
          if (index < 0) {
            return false;
          }
          state.hired.splice(
            index,
            1
          );
          return true;
        }
        getReadiness(shopId) {
          this.updateEquipment(
            shopId
          );
          this.updatePermits(
            shopId
          );
          const renovation = renovationSystem.ensurePlan(
            shopId
          );
          const equipment = this.ensureEquipment(
            shopId
          );
          const permits = this.getPermitOverview(
            shopId
          );
          const staffing = this.getStaffOverview(
            shopId
          );
          const renovationReady = !!renovation && renovation.status === "completed";
          const equipmentReady = equipment.status === "installed";
          const permitsReady = permits.approved === permits.total;
          const staffingReady = staffing.coverage >= 0.9;
          const score = (renovationReady ? 25 : 0) + (equipmentReady ? 25 : 0) + (permitsReady ? 25 : 0) + Math.round(
            clamp(
              staffing.coverage,
              0,
              1
            ) * 25
          );
          const ready = renovationReady && equipmentReady && permitsReady && staffingReady;
          const shop = this.getShop(
            shopId
          );
          if (shop && ready && shop.status !== "open") {
            shop.status = "ready_for_trial";
          }
          return {
            renovationReady,
            equipmentReady,
            permitsReady,
            staffingReady,
            score,
            ready,
            equipment,
            permits,
            staffing
          };
        }
        startTrialOpening(shopId) {
          const shop = this.getShop(
            shopId
          );
          if (!shop) {
            return {
              ok: false,
              message: "\u95E8\u5E97\u4E0D\u5B58\u5728"
            };
          }
          const readiness = this.getReadiness(
            shopId
          );
          if (!readiness.ready) {
            return {
              ok: false,
              message: "\u88C5\u4FEE\u3001\u8BBE\u5907\u3001\u8BC1\u7167\u548C\u57FA\u7840\u73ED\u7EC4\u5C1A\u672A\u5168\u90E8\u5B8C\u6210"
            };
          }
          shop.status = "open";
          shop.trialOpenedDay = this.getCurrentDay();
          return {
            ok: true,
            day: shop.trialOpenedDay
          };
        }
        updateShop(shopId) {
          this.updateEquipment(
            shopId
          );
          this.updatePermits(
            shopId
          );
          return this.getReadiness(
            shopId
          );
        }
      };
      module.exports = new OpeningPrepSystem();
    }
  });

  // src/ui/textInput.js
  var require_textInput = __commonJS({
    "src/ui/textInput.js"(exports, module) {
      "use strict";
      var runtime = globalThis.GameRuntime || {};
      var api = runtime.api || {};
      function requestRender() {
        if (runtime && typeof runtime.requestRender === "function") {
          runtime.requestRender();
        }
      }
      function normalize(value, maxLength) {
        return String(
          value == null ? "" : value
        ).replace(
          /\s+/g,
          " "
        ).trim().slice(
          0,
          Math.max(
            1,
            Number(
              maxLength
            ) || 12
          )
        );
      }
      function promptFallback(options, done) {
        if (typeof globalThis.prompt === "function") {
          const result = globalThis.prompt(
            options.title || "\u8BF7\u8F93\u5165\u540D\u79F0",
            options.value || ""
          );
          done(
            result == null ? null : normalize(
              result,
              options.maxLength
            )
          );
          requestRender();
          return;
        }
        if (api && typeof api.showToast === "function") {
          api.showToast({
            title: "\u5F53\u524D\u73AF\u5883\u6682\u4E0D\u652F\u6301\u6587\u5B57\u8F93\u5165",
            icon: "none"
          });
        }
        done(
          null
        );
      }
      function requestText(options) {
        const opts = options || {};
        return new Promise(
          (resolve) => {
            let settled = false;
            const finish = (value) => {
              if (settled) {
                return;
              }
              settled = true;
              resolve(
                value
              );
              requestRender();
            };
            if (api && typeof api.showModal === "function") {
              try {
                api.showModal({
                  title: opts.title || "\u7F16\u8F91\u540D\u79F0",
                  content: opts.value || "",
                  editable: true,
                  placeholderText: opts.placeholder || "\u8BF7\u8F93\u5165\u540D\u79F0",
                  confirmText: "\u4FDD\u5B58",
                  cancelText: "\u53D6\u6D88",
                  success: (result) => {
                    if (!result || !result.confirm) {
                      finish(
                        null
                      );
                      return;
                    }
                    const raw = result.content != null ? result.content : result.inputValue != null ? result.inputValue : result.value != null ? result.value : "";
                    const text = normalize(
                      raw,
                      opts.maxLength
                    );
                    if (text) {
                      finish(
                        text
                      );
                    } else {
                      promptFallback(
                        opts,
                        finish
                      );
                    }
                  },
                  fail: () => {
                    promptFallback(
                      opts,
                      finish
                    );
                  }
                });
                return;
              } catch (error) {
                promptFallback(
                  opts,
                  finish
                );
                return;
              }
            }
            promptFallback(
              opts,
              finish
            );
          }
        );
      }
      module.exports = {
        requestText,
        requestRender
      };
    }
  });

  // src/property/propertyIconAtlas.js
  var require_propertyIconAtlas = __commonJS({
    "src/property/propertyIconAtlas.js"(exports, module) {
      "use strict";
      module.exports = {
        image: "assets/images/ui/property_icons_01.png",
        cellSize: 96,
        width: 576,
        height: 576,
        icons: {
          rent: {
            x: 0,
            y: 0,
            w: 96,
            h: 96
          },
          area: {
            x: 96,
            y: 0,
            w: 96,
            h: 96
          },
          floor: {
            x: 192,
            y: 0,
            w: 96,
            h: 96
          },
          layout: {
            x: 288,
            y: 0,
            w: 96,
            h: 96
          },
          frontage: {
            x: 384,
            y: 0,
            w: 96,
            h: 96
          },
          depth: {
            x: 480,
            y: 0,
            w: 96,
            h: 96
          },
          exhaust: {
            x: 0,
            y: 96,
            w: 96,
            h: 96
          },
          gas: {
            x: 96,
            y: 96,
            w: 96,
            h: 96
          },
          power: {
            x: 192,
            y: 96,
            w: 96,
            h: 96
          },
          drainage: {
            x: 288,
            y: 96,
            w: 96,
            h: 96
          },
          grease: {
            x: 384,
            y: 96,
            w: 96,
            h: 96
          },
          fire: {
            x: 480,
            y: 96,
            w: 96,
            h: 96
          },
          toilet: {
            x: 0,
            y: 192,
            w: 96,
            h: 96
          },
          parking: {
            x: 96,
            y: 192,
            w: 96,
            h: 96
          },
          rider: {
            x: 192,
            y: 192,
            w: 96,
            h: 96
          },
          visibility: {
            x: 288,
            y: 192,
            w: 96,
            h: 96
          },
          warning: {
            x: 384,
            y: 192,
            w: 96,
            h: 96
          },
          competitor: {
            x: 480,
            y: 192,
            w: 96,
            h: 96
          },
          new: {
            x: 0,
            y: 288,
            w: 96,
            h: 96
          },
          price_down: {
            x: 96,
            y: 288,
            w: 96,
            h: 96
          },
          hot: {
            x: 192,
            y: 288,
            w: 96,
            h: 96
          },
          filter: {
            x: 288,
            y: 288,
            w: 96,
            h: 96
          },
          sort: {
            x: 384,
            y: 288,
            w: 96,
            h: 96
          },
          event: {
            x: 480,
            y: 288,
            w: 96,
            h: 96
          },
          broker: {
            x: 0,
            y: 384,
            w: 96,
            h: 96
          },
          landlord: {
            x: 96,
            y: 384,
            w: 96,
            h: 96
          },
          lease: {
            x: 192,
            y: 384,
            w: 96,
            h: 96
          }
        }
      };
    }
  });

  // src/property/propertyDealConfig.js
  var require_propertyDealConfig = __commonJS({
    "src/property/propertyDealConfig.js"(exports, module) {
      "use strict";
      module.exports = {
        visitModes: {
          quick: {
            id: "quick",
            name: "\u5FEB\u901F\u770B\u94FA",
            baseHours: 1,
            baseCost: 0,
            revealCount: 3,
            accuracy: 0.72,
            description: "\u770B\u95E8\u9762\u3001\u5BA2\u6D41\u548C\u57FA\u7840\u786C\u4EF6\uFF0C\u8017\u65F6\u77ED\u4F46\u5BB9\u6613\u6F0F\u6389\u9690\u60A3"
          },
          standard: {
            id: "standard",
            name: "\u6807\u51C6\u52D8\u5BDF",
            baseHours: 3,
            baseCost: 300,
            revealCount: 6,
            accuracy: 0.9,
            description: "\u6838\u9A8C\u6392\u70DF\u3001\u71C3\u6C14\u3001\u7535\u529B\u3001\u6392\u6C34\u3001\u6D88\u9632\u548C\u7ECF\u8425\u9650\u5236"
          },
          deep: {
            id: "deep",
            name: "\u6DF1\u5EA6\u52D8\u5BDF",
            baseHours: 6,
            baseCost: 900,
            revealCount: 9,
            accuracy: 0.98,
            description: "\u8FDE\u540C\u4EA7\u6743\u3001\u5386\u53F2\u6574\u6539\u3001\u8BBE\u5907\u72B6\u6001\u548C\u9690\u85CF\u6210\u672C\u4E00\u8D77\u6838\u9A8C"
          }
        },
        inspectionItems: [
          {
            id: "exhaust",
            label: "\u6392\u70DF\u6761\u4EF6",
            source: "exhaust",
            positiveText: "\u6392\u70DF\u8DEF\u5F84\u53EF\u7528",
            negativeText: "\u6392\u70DF\u6761\u4EF6\u4E0D\u8DB3"
          },
          {
            id: "gas",
            label: "\u71C3\u6C14\u6761\u4EF6",
            source: "gas",
            positiveText: "\u71C3\u6C14\u63A5\u5165\u53EF\u7528",
            negativeText: "\u71C3\u6C14\u63A5\u5165\u53D7\u9650"
          },
          {
            id: "power",
            label: "\u7535\u529B\u5BB9\u91CF",
            source: "threePhase",
            positiveText: "\u4E09\u76F8\u7535\u6761\u4EF6\u6EE1\u8DB3",
            negativeText: "\u7535\u529B\u6761\u4EF6\u9700\u6539\u9020"
          },
          {
            id: "drainage",
            label: "\u6392\u6C34\u6761\u4EF6",
            source: "drainage",
            positiveText: "\u6392\u6C34\u6EE1\u8DB3\u9910\u996E\u4F7F\u7528",
            negativeText: "\u6392\u6C34\u5B58\u5728\u6574\u6539\u9700\u6C42"
          },
          {
            id: "grease",
            label: "\u9694\u6CB9\u8BBE\u65BD",
            source: "greaseTrap",
            positiveText: "\u9694\u6CB9\u8BBE\u65BD\u53EF\u7528",
            negativeText: "\u9700\u8865\u505A\u9694\u6CB9\u8BBE\u65BD"
          },
          {
            id: "fire",
            label: "\u6D88\u9632\u6761\u4EF6",
            source: "fireSprinkler",
            positiveText: "\u73B0\u6709\u6D88\u9632\u6761\u4EF6\u8F83\u5B8C\u6574",
            negativeText: "\u6D88\u9632\u6761\u4EF6\u9700\u6574\u6539"
          },
          {
            id: "visibility",
            label: "\u95E8\u9762\u53EF\u89C1\u5EA6",
            source: "visibility",
            threshold: 62,
            positiveText: "\u95E8\u9762\u53EF\u89C1\u5EA6\u826F\u597D",
            negativeText: "\u5B9E\u9645\u53EF\u89C1\u5EA6\u4E00\u822C"
          },
          {
            id: "loading",
            label: "\u5378\u8D27\u6761\u4EF6",
            source: "loadingAccess",
            threshold: 55,
            positiveText: "\u5378\u8D27\u52A8\u7EBF\u8F83\u987A\u7545",
            negativeText: "\u9AD8\u5CF0\u671F\u5378\u8D27\u8F83\u56F0\u96BE"
          },
          {
            id: "risk",
            label: "\u5386\u53F2\u9690\u60A3",
            source: "riskLevel",
            inverseThreshold: 1,
            positiveText: "\u672A\u53D1\u73B0\u9AD8\u7B49\u7EA7\u5386\u53F2\u9690\u60A3",
            negativeText: "\u5B58\u5728\u9700\u8981\u91CD\u70B9\u6838\u9A8C\u7684\u5386\u53F2\u98CE\u9669"
          }
        ],
        negotiation: {
          maxRounds: 4,
          actionHoursPerRound: 1,
          // 让价幅度只是基础范围，最终会被市场与人物变量修正。
          rentRequestRange: [0.035, 0.14],
          transferRequestRange: [0.06, 0.28],
          freeRentExtraRange: [3, 28],
          depositReductionChanceBase: 0.18,
          minimumAcceptanceScore: 0.5
        },
        opportunityRisk: {
          basePerHour: 25e-4,
          competitorWeight: 0.016,
          watcherWeight: 3e-3,
          hotMarketWeight: 0.045,
          inspectionProtection: 0.65
        }
      };
    }
  });

  // src/property/propertyVisitSystem.js
  var require_propertyVisitSystem = __commonJS({
    "src/property/propertyVisitSystem.js"(exports, module) {
      "use strict";
      var gameState = require_gameState();
      var timeSystem = require_timeSystem();
      var simulationSystem = require_simulationSystem();
      var propertyMarketSystem = require_propertyMarketSystem();
      var propertyData = require_propertyData();
      var dealConfig = require_propertyDealConfig();
      function clone(value) {
        return JSON.parse(
          JSON.stringify(value)
        );
      }
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(
            max,
            value
          )
        );
      }
      function hashFloat(text) {
        let h = 2166136261;
        const source = String(
          text
        );
        for (let i = 0; i < source.length; i++) {
          h ^= source.charCodeAt(
            i
          );
          h = Math.imul(
            h,
            16777619
          );
        }
        return (h >>> 0) % 1e5 / 1e5;
      }
      var PropertyVisitSystem = class {
        getStore() {
          return gameState.getPropertyProcess().visits;
        }
        getLiveListing(marketKey) {
          return propertyMarketSystem.getLiveListings({}).find(
            (item) => item.marketKey === marketKey
          ) || null;
        }
        getVisit(marketKey) {
          const item = this.getStore()[marketKey];
          return item ? clone(
            item
          ) : null;
        }
        getMode(modeId) {
          return dealConfig.visitModes[modeId] || dealConfig.visitModes.standard;
        }
        getBrokerReliability(listing) {
          const broker = propertyData.BROKERS.find(
            (item) => item.id === listing.brokerId
          );
          return broker ? broker.reliability : 70;
        }
        getDynamicVisitQuote(marketKey, modeId) {
          const listing = this.getLiveListing(
            marketKey
          );
          if (!listing) {
            return null;
          }
          const mode = this.getMode(
            modeId
          );
          const street = propertyMarketSystem.getStreetSummary(
            listing.streetId
          );
          const competition = Array.isArray(
            listing.competingTenants
          ) ? listing.competingTenants.length : 0;
          const heat = street ? Number(
            street.marketHeat
          ) || 50 : 50;
          const delayPressure = clamp(
            competition * 0.09 + Number(
              listing.watchers
            ) * 0.018 + Math.max(
              0,
              heat - 50
            ) / 250,
            0,
            0.75
          );
          const hours = Math.max(
            1,
            Math.round(
              mode.baseHours * (1 + delayPressure * 0.35)
            )
          );
          const cost = Math.max(
            0,
            Math.round(
              mode.baseCost * (1 + Math.max(
                0,
                listing.grossArea - 120
              ) / 700 + delayPressure * 0.25)
            )
          );
          return {
            modeId: mode.id,
            name: mode.name,
            description: mode.description,
            hours,
            cost,
            accuracy: mode.accuracy,
            revealCount: mode.revealCount,
            opportunityPressure: delayPressure
          };
        }
        getOpportunityLossRisk(listing, hours, modeId) {
          const street = propertyMarketSystem.getStreetSummary(
            listing.streetId
          );
          const heat = street ? Number(
            street.marketHeat
          ) || 50 : 50;
          const competitors = Array.isArray(
            listing.competingTenants
          ) ? listing.competingTenants.length : 0;
          const watchers = Number(
            listing.watchers
          ) || 0;
          const cfg = dealConfig.opportunityRisk;
          const hot = Math.max(
            0,
            (heat - 55) / 45
          );
          let risk = Number(
            hours
          ) * cfg.basePerHour + competitors * cfg.competitorWeight + watchers * cfg.watcherWeight + hot * cfg.hotMarketWeight;
          if (modeId === "deep") {
            risk *= cfg.inspectionProtection;
          }
          return clamp(
            risk,
            0,
            0.68
          );
        }
        markLostToNpc(listing, reason) {
          const state = propertyMarketSystem.exportState();
          const item = state.listingState[listing.marketKey];
          if (!item || item.status !== "active") {
            return false;
          }
          item.status = "rented";
          item.closedDay = state.currentDay;
          item.closedReason = "npc_rented";
          item.playerDelayReason = reason || "player_delay";
          if (Array.isArray(
            listing.competingTenants
          ) && listing.competingTenants.length) {
            item.rentedBy = clone(
              listing.competingTenants[0]
            );
          }
          state.stats.totalNpcRentals += 1;
          state.history.unshift({
            type: "npc_rented",
            listingKey: item.key,
            districtId: item.districtId,
            streetId: item.streetId,
            reason: item.playerDelayReason,
            renter: item.rentedBy ? item.rentedBy.name : null
          });
          propertyMarketSystem.importState(
            state
          );
          return true;
        }
        verifyValue(listing, rule) {
          const raw = listing[rule.source];
          if (rule.threshold != null) {
            return Number(
              raw
            ) >= rule.threshold;
          }
          if (rule.inverseThreshold != null) {
            return Number(
              raw
            ) <= rule.inverseThreshold;
          }
          return !!raw;
        }
        buildInspection(listing, quote) {
          const brokerReliability = this.getBrokerReliability(
            listing
          );
          const report = [];
          const rules = dealConfig.inspectionItems;
          const revealCount = Math.min(
            rules.length,
            quote.revealCount
          );
          for (let i = 0; i < revealCount; i++) {
            const rule = rules[i];
            const actualPositive = this.verifyValue(
              listing,
              rule
            );
            const claimRoll = hashFloat(
              listing.marketKey + ":claim:" + rule.id
            );
            const brokerMistakeChance = clamp(
              (100 - brokerReliability) / 100 * 0.42 + listing.riskLevel * 0.035,
              0.02,
              0.38
            );
            const claimedPositive = claimRoll < brokerMistakeChance ? !actualPositive : actualPositive;
            const verificationRoll = hashFloat(
              listing.marketKey + ":verify:" + quote.modeId + ":" + rule.id + ":" + gameState.getSimulation().seed
            );
            const verified = verificationRoll <= quote.accuracy;
            const finalPositive = verified ? actualPositive : claimedPositive;
            report.push({
              id: rule.id,
              label: rule.label,
              claimedPositive,
              actualPositive,
              verified,
              resultPositive: finalPositive,
              contradicted: verified && claimedPositive !== actualPositive,
              text: finalPositive ? rule.positiveText : rule.negativeText
            });
          }
          const contradicted = report.filter(
            (item) => item.contradicted
          ).length;
          const negative = report.filter(
            (item) => !item.resultPositive
          ).length;
          const repairEstimate = Math.round(
            (Number(
              listing.riskRepairCost
            ) || 0) * (0.55 + negative * 0.11 + contradicted * 0.09)
          );
          return {
            brokerReliability,
            items: report,
            contradictedCount: contradicted,
            negativeCount: negative,
            repairEstimate
          };
        }
        inspect(marketKey, modeId) {
          const listing = this.getLiveListing(
            marketKey
          );
          if (!listing) {
            return {
              ok: false,
              code: "listing_unavailable",
              message: "\u623F\u6E90\u5DF2\u7ECF\u4E0D\u5728\u5E02\u573A\u4E0A"
            };
          }
          const quote = this.getDynamicVisitQuote(
            marketKey,
            modeId
          );
          if (!quote) {
            return {
              ok: false,
              code: "quote_failed",
              message: "\u6682\u65F6\u65E0\u6CD5\u751F\u6210\u770B\u94FA\u65B9\u6848"
            };
          }
          if (gameState.getPlayer().cash < quote.cost) {
            return {
              ok: false,
              code: "insufficient_cash",
              message: "\u5F53\u524D\u8D44\u91D1\u4E0D\u8DB3\u4EE5\u5B8C\u6210\u8FD9\u6B21\u52D8\u5BDF"
            };
          }
          if (quote.cost > 0) {
            gameState.spendCash(
              quote.cost
            );
          }
          const beforeDay = simulationSystem.getDayOrdinal(
            gameState.getTime()
          );
          timeSystem.addHours(
            quote.hours
          );
          simulationSystem.update(
            quote.hours * 60
          );
          const afterDay = simulationSystem.getDayOrdinal(
            gameState.getTime()
          );
          const stillLive = this.getLiveListing(
            marketKey
          );
          if (!stillLive) {
            return {
              ok: false,
              code: "lost_during_visit",
              message: "\u770B\u94FA\u671F\u95F4\u623F\u6E90\u5DF2\u88AB\u5176\u4ED6\u7ECF\u8425\u8005\u62FF\u4E0B",
              hours: quote.hours,
              cost: quote.cost,
              dayChanged: afterDay !== beforeDay
            };
          }
          const lossRisk = this.getOpportunityLossRisk(
            stillLive,
            quote.hours,
            quote.modeId
          );
          const lossRoll = hashFloat(
            marketKey + ":visit_loss:" + afterDay + ":" + quote.modeId + ":" + gameState.getSimulation().seed
          );
          if (stillLive.competingTenants && stillLive.competingTenants.length > 0 && lossRoll < lossRisk) {
            this.markLostToNpc(
              stillLive,
              "player_visit_delay"
            );
            return {
              ok: false,
              code: "lost_to_competitor",
              message: "\u4F60\u52D8\u5BDF\u65F6\u53E6\u4E00\u4F4D\u7ADE\u4E89\u8005\u5148\u7B7E\u4E0B\u4E86\u8FD9\u5957\u94FA",
              hours: quote.hours,
              cost: quote.cost,
              lossRisk
            };
          }
          const inspection = this.buildInspection(
            stillLive,
            quote
          );
          const result = {
            ok: true,
            marketKey,
            address: stillLive.address,
            modeId: quote.modeId,
            modeName: quote.name,
            hours: quote.hours,
            cost: quote.cost,
            accuracy: quote.accuracy,
            completedDay: afterDay,
            completedHour: gameState.getTime().hour,
            brokerReliability: inspection.brokerReliability,
            items: inspection.items,
            contradictedCount: inspection.contradictedCount,
            negativeCount: inspection.negativeCount,
            repairEstimate: inspection.repairEstimate,
            lossRisk
          };
          this.getStore()[marketKey] = clone(
            result
          );
          return clone(
            result
          );
        }
      };
      module.exports = new PropertyVisitSystem();
    }
  });

  // src/property/propertyNegotiationSystem.js
  var require_propertyNegotiationSystem = __commonJS({
    "src/property/propertyNegotiationSystem.js"(exports, module) {
      "use strict";
      var gameState = require_gameState();
      var timeSystem = require_timeSystem();
      var simulationSystem = require_simulationSystem();
      var propertyMarketSystem = require_propertyMarketSystem();
      var propertyVisitSystem = require_propertyVisitSystem();
      var dealConfig = require_propertyDealConfig();
      function clone(value) {
        return JSON.parse(
          JSON.stringify(value)
        );
      }
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(
            max,
            value
          )
        );
      }
      function hashFloat(text) {
        let h = 2166136261;
        const source = String(
          text
        );
        for (let i = 0; i < source.length; i++) {
          h ^= source.charCodeAt(
            i
          );
          h = Math.imul(
            h,
            16777619
          );
        }
        return (h >>> 0) % 1e5 / 1e5;
      }
      var PropertyNegotiationSystem = class {
        constructor() {
          this.installOwnershipGuard();
        }
        installOwnershipGuard() {
          if (propertyMarketSystem.__playerOwnershipGuardInstalled) {
            return;
          }
          const original = propertyMarketSystem.isSlotAvailableForRelist.bind(
            propertyMarketSystem
          );
          propertyMarketSystem.isSlotAvailableForRelist = function(streetId, slot) {
            const key = this.getListingKey(
              streetId,
              slot
            );
            const leases = gameState.getPropertyProcess().leases;
            if (leases[key]) {
              return false;
            }
            return original(
              streetId,
              slot
            );
          };
          propertyMarketSystem.__playerOwnershipGuardInstalled = true;
        }
        getStore() {
          return gameState.getPropertyProcess().negotiations;
        }
        getLeaseStore() {
          return gameState.getPropertyProcess().leases;
        }
        getLiveListing(marketKey) {
          return propertyMarketSystem.getLiveListings({}).find(
            (item) => item.marketKey === marketKey
          ) || null;
        }
        getSession(marketKey) {
          const item = this.getStore()[marketKey];
          return item ? clone(
            item
          ) : null;
        }
        calculateBrokerFee(listing, monthlyRent) {
          const asking = Math.max(
            1,
            Number(
              listing.askingMonthlyRent
            ) || 1
          );
          const baseFee = Math.max(
            0,
            Number(
              listing.brokerFee
            ) || 0
          );
          return Math.round(
            baseFee * (monthlyRent / asking)
          );
        }
        calculateUpfront(listing, terms) {
          const rent = Math.max(
            0,
            Number(
              terms.monthlyRent
            ) || 0
          );
          const depositMonths = Math.max(
            0,
            Number(
              terms.depositMonths
            ) || 0
          );
          const paymentMonths = Math.max(
            1,
            Number(
              terms.paymentMonths
            ) || 1
          );
          const transferFee = Math.max(
            0,
            Number(
              terms.transferFee
            ) || 0
          );
          const brokerFee = this.calculateBrokerFee(
            listing,
            rent
          );
          return {
            deposit: Math.round(
              rent * depositMonths
            ),
            rentAdvance: Math.round(
              rent * paymentMonths
            ),
            transferFee: Math.round(
              transferFee
            ),
            brokerFee,
            total: Math.round(
              rent * (depositMonths + paymentMonths) + transferFee + brokerFee
            )
          };
        }
        getMarketPressure(listing) {
          const summary = propertyMarketSystem.getStreetSummary(
            listing.streetId
          );
          const heat = summary ? Number(
            summary.marketHeat
          ) || 50 : 50;
          const competitorCount = Array.isArray(
            listing.competingTenants
          ) ? listing.competingTenants.length : 0;
          const watchers = Number(
            listing.watchers
          ) || 0;
          return clamp(
            (heat - 50) / 50 * 0.34 + competitorCount * 0.12 + watchers * 0.018,
            -0.25,
            0.85
          );
        }
        getNegotiationPower(listing, visit) {
          const landlord = clamp(
            Number(
              listing.landlordNegotiation
            ) / 100,
            0,
            1
          );
          const agePower = clamp(
            Number(
              listing.daysOnMarket
            ) / 75,
            0,
            0.55
          );
          const riskPower = clamp(
            Number(
              listing.riskLevel
            ) * 0.07 + (visit ? visit.negativeCount * 0.035 : 0),
            0,
            0.35
          );
          const contradictionPower = visit ? visit.contradictedCount * 0.045 : 0;
          const marketPressure = this.getMarketPressure(
            listing
          );
          return clamp(
            0.22 + landlord * 0.32 + agePower + riskPower + contradictionPower - marketPressure * 0.4,
            0.08,
            0.92
          );
        }
        buildInitialTerms(listing) {
          return {
            monthlyRent: Math.round(
              listing.askingMonthlyRent
            ),
            transferFee: Math.round(
              listing.askingTransferFee
            ),
            freeRentDays: Math.max(
              0,
              Math.round(
                listing.freeRentDays
              )
            ),
            depositMonths: Math.max(
              0,
              Math.round(
                listing.depositMonths
              )
            ),
            paymentMonths: Math.max(
              1,
              Math.round(
                listing.paymentMonths || 1
              )
            ),
            leaseYears: Math.max(
              1,
              Math.round(
                listing.leaseYears
              )
            ),
            annualIncrease: Number(
              listing.annualIncrease
            ) || 0
          };
        }
        start(marketKey) {
          const listing = this.getLiveListing(
            marketKey
          );
          if (!listing) {
            return {
              ok: false,
              code: "listing_unavailable",
              message: "\u8FD9\u5957\u94FA\u5DF2\u7ECF\u4E0D\u5728\u5E02\u573A\u4E0A"
            };
          }
          const visit = propertyVisitSystem.getVisit(
            marketKey
          );
          if (!visit) {
            return {
              ok: false,
              code: "visit_required",
              message: "\u81F3\u5C11\u5B8C\u6210\u4E00\u6B21\u5B9E\u5730\u770B\u94FA\u540E\u518D\u8C08\u5224"
            };
          }
          let session = this.getStore()[marketKey];
          if (!session || session.status === "expired") {
            const power = this.getNegotiationPower(
              listing,
              visit
            );
            const terms = this.buildInitialTerms(
              listing
            );
            session = {
              marketKey,
              address: listing.address,
              status: "active",
              round: 0,
              maxRounds: dealConfig.negotiation.maxRounds,
              negotiationPower: power,
              marketPressure: this.getMarketPressure(
                listing
              ),
              landlordAttitude: power >= 0.68 ? "\u613F\u610F\u8C08" : power >= 0.42 ? "\u8C28\u614E" : "\u5F3A\u786C",
              originalTerms: clone(
                terms
              ),
              currentTerms: clone(
                terms
              ),
              lastFocus: null,
              lastMessage: "\u623F\u4E1C\u5148\u6309\u5F53\u524D\u6302\u724C\u6761\u4EF6\u62A5\u4EF7",
              startedDay: simulationSystem.getDayOrdinal(
                gameState.getTime()
              )
            };
            this.getStore()[marketKey] = clone(
              session
            );
          }
          return {
            ok: true,
            session: clone(
              session
            )
          };
        }
        getFocusRequest(session, listing, focus) {
          const cfg = dealConfig.negotiation;
          const power = session.negotiationPower;
          const rangeValue = (range, salt) => {
            const roll = hashFloat(
              listing.marketKey + ":" + session.round + ":" + focus + ":" + salt + ":" + gameState.getSimulation().seed
            );
            return range[0] + (range[1] - range[0]) * clamp(
              power * 0.65 + roll * 0.35,
              0,
              1
            );
          };
          const current = session.currentTerms;
          const proposed = clone(
            current
          );
          if (focus === "rent") {
            const cut = rangeValue(
              cfg.rentRequestRange,
              "rent"
            );
            proposed.monthlyRent = Math.max(
              1,
              Math.round(
                session.originalTerms.monthlyRent * (1 - cut)
              )
            );
          } else if (focus === "transfer") {
            const cut = rangeValue(
              cfg.transferRequestRange,
              "transfer"
            );
            proposed.transferFee = Math.max(
              0,
              Math.round(
                session.originalTerms.transferFee * (1 - cut)
              )
            );
          } else if (focus === "freeRent") {
            const range = cfg.freeRentExtraRange;
            const roll = hashFloat(
              listing.marketKey + ":free:" + session.round + ":" + gameState.getSimulation().seed
            );
            proposed.freeRentDays = Math.round(
              session.originalTerms.freeRentDays + range[0] + (range[1] - range[0]) * clamp(
                power * 0.7 + roll * 0.3,
                0,
                1
              )
            );
          } else {
            const rentCut = rangeValue(
              cfg.rentRequestRange,
              "balanced_rent"
            ) * 0.58;
            const transferCut = rangeValue(
              cfg.transferRequestRange,
              "balanced_transfer"
            ) * 0.52;
            proposed.monthlyRent = Math.max(
              1,
              Math.round(
                session.originalTerms.monthlyRent * (1 - rentCut)
              )
            );
            proposed.transferFee = Math.max(
              0,
              Math.round(
                session.originalTerms.transferFee * (1 - transferCut)
              )
            );
            proposed.freeRentDays = Math.round(
              session.originalTerms.freeRentDays + dealConfig.negotiation.freeRentExtraRange[0] * 0.6 + power * 7
            );
          }
          return proposed;
        }
        calculateAcceptance(session, listing, requested, focus) {
          const original = session.originalTerms;
          const rentAsk = (original.monthlyRent - requested.monthlyRent) / Math.max(
            1,
            original.monthlyRent
          );
          const transferAsk = original.transferFee > 0 ? (original.transferFee - requested.transferFee) / original.transferFee : 0;
          const freeAsk = Math.max(
            0,
            requested.freeRentDays - original.freeRentDays
          ) / 30;
          const demandCost = rentAsk * 0.5 + transferAsk * 0.28 + freeAsk * 0.22;
          const focusBonus = focus === "balanced" ? 0.05 : 0;
          const roundBonus = session.round * 0.045;
          const roll = (hashFloat(
            listing.marketKey + ":accept:" + session.round + ":" + focus + ":" + gameState.getSimulation().seed
          ) - 0.5) * 0.16;
          return clamp(
            session.negotiationPower + focusBonus + roundBonus + roll - demandCost - session.marketPressure * 0.18,
            0,
            1
          );
        }
        buildCounterOffer(session, requested, acceptance) {
          const current = session.currentTerms;
          const give = clamp(
            0.24 + session.negotiationPower * 0.38 + acceptance * 0.22,
            0.18,
            0.78
          );
          return {
            ...current,
            monthlyRent: Math.round(
              current.monthlyRent + (requested.monthlyRent - current.monthlyRent) * give
            ),
            transferFee: Math.max(
              0,
              Math.round(
                current.transferFee + (requested.transferFee - current.transferFee) * give
              )
            ),
            freeRentDays: Math.round(
              current.freeRentDays + (requested.freeRentDays - current.freeRentDays) * give
            )
          };
        }
        maybeLoseOpportunity(listing, session) {
          const visit = propertyVisitSystem.getVisit(
            listing.marketKey
          );
          const baseRisk = propertyVisitSystem.getOpportunityLossRisk(
            listing,
            dealConfig.negotiation.actionHoursPerRound,
            visit ? visit.modeId : "quick"
          );
          const risk = clamp(
            baseRisk * (0.42 + session.round * 0.11),
            0,
            0.38
          );
          const roll = hashFloat(
            listing.marketKey + ":negotiation_loss:" + session.round + ":" + simulationSystem.getDayOrdinal(
              gameState.getTime()
            ) + ":" + gameState.getSimulation().seed
          );
          if (listing.competingTenants && listing.competingTenants.length > 0 && roll < risk) {
            propertyVisitSystem.markLostToNpc(
              listing,
              "player_negotiation_delay"
            );
            return true;
          }
          return false;
        }
        negotiate(marketKey, focus) {
          const start = this.start(
            marketKey
          );
          if (!start.ok) {
            return start;
          }
          const listing = this.getLiveListing(
            marketKey
          );
          if (!listing) {
            return {
              ok: false,
              code: "listing_unavailable",
              message: "\u623F\u6E90\u5DF2\u7ECF\u88AB\u5176\u4ED6\u7ECF\u8425\u8005\u62FF\u4E0B"
            };
          }
          const session = this.getStore()[marketKey];
          if (session.round >= session.maxRounds) {
            return {
              ok: false,
              code: "round_limit",
              message: "\u623F\u4E1C\u4E0D\u613F\u7EE7\u7EED\u62C9\u626F\uFF0C\u5F53\u524D\u6761\u4EF6\u5DF2\u7ECF\u662F\u6700\u7EC8\u62A5\u4EF7",
              session: clone(
                session
              )
            };
          }
          timeSystem.addHours(
            dealConfig.negotiation.actionHoursPerRound
          );
          simulationSystem.update(
            dealConfig.negotiation.actionHoursPerRound * 60
          );
          session.round += 1;
          const currentListing = this.getLiveListing(
            marketKey
          );
          if (!currentListing) {
            session.status = "expired";
            session.lastMessage = "\u8C08\u5224\u671F\u95F4\u623F\u6E90\u5DF2\u7ECF\u9000\u51FA\u5E02\u573A";
            return {
              ok: false,
              code: "lost_during_negotiation",
              message: session.lastMessage
            };
          }
          if (this.maybeLoseOpportunity(
            currentListing,
            session
          )) {
            session.status = "expired";
            session.lastMessage = "\u53E6\u4E00\u4F4D\u7ADE\u4E89\u8005\u63D0\u9AD8\u6761\u4EF6\uFF0C\u623F\u4E1C\u5DF2\u7ECF\u548C\u5BF9\u65B9\u7B7E\u7EA6";
            return {
              ok: false,
              code: "lost_to_competitor",
              message: session.lastMessage
            };
          }
          const chosenFocus = [
            "rent",
            "transfer",
            "freeRent",
            "balanced"
          ].indexOf(
            focus
          ) >= 0 ? focus : "balanced";
          const requested = this.getFocusRequest(
            session,
            currentListing,
            chosenFocus
          );
          const acceptance = this.calculateAcceptance(
            session,
            currentListing,
            requested,
            chosenFocus
          );
          const threshold = dealConfig.negotiation.minimumAcceptanceScore;
          const accepted = acceptance >= threshold;
          if (accepted) {
            session.currentTerms = requested;
            session.lastMessage = "\u623F\u4E1C\u63A5\u53D7\u4E86\u8FD9\u8F6E\u6761\u4EF6";
          } else {
            session.currentTerms = this.buildCounterOffer(
              session,
              requested,
              acceptance
            );
            session.lastMessage = acceptance >= threshold - 0.15 ? "\u623F\u4E1C\u6CA1\u6709\u5168\u7B54\u5E94\uFF0C\u4F46\u7EE7\u7EED\u8BA9\u4E86\u4E00\u6B65" : "\u623F\u4E1C\u6001\u5EA6\u8F83\u5F3A\u786C\uFF0C\u53EA\u505A\u4E86\u6709\u9650\u8C03\u6574";
          }
          session.lastFocus = chosenFocus;
          session.landlordAttitude = acceptance >= 0.68 ? "\u677E\u52A8" : acceptance >= 0.46 ? "\u89C2\u671B" : "\u5F3A\u786C";
          session.lastAcceptance = acceptance;
          this.getStore()[marketKey] = clone(
            session
          );
          return {
            ok: true,
            accepted,
            session: clone(
              session
            ),
            requested: clone(
              requested
            ),
            upfront: this.calculateUpfront(
              currentListing,
              session.currentTerms
            )
          };
        }
        markPlayerLeased(listing, shopId) {
          const state = propertyMarketSystem.exportState();
          const item = state.listingState[listing.marketKey];
          if (!item || item.status !== "active") {
            return false;
          }
          item.status = "rented";
          item.closedDay = state.currentDay;
          item.closedReason = "player_leased";
          item.playerShopId = shopId;
          item.rentedBy = {
            id: "player",
            name: "\u73A9\u5BB6\u7ECF\u8425\u4E3B\u4F53"
          };
          state.history.unshift({
            type: "player_leased",
            day: state.currentDay,
            listingKey: listing.marketKey,
            districtId: listing.districtId,
            streetId: listing.streetId,
            address: listing.address,
            shopId
          });
          propertyMarketSystem.importState(
            state
          );
          return true;
        }
        signLease(marketKey) {
          const start = this.start(
            marketKey
          );
          if (!start.ok) {
            return start;
          }
          const listing = this.getLiveListing(
            marketKey
          );
          if (!listing) {
            return {
              ok: false,
              code: "listing_unavailable",
              message: "\u623F\u6E90\u5DF2\u7ECF\u9000\u51FA\u5E02\u573A\uFF0C\u65E0\u6CD5\u7B7E\u7EA6"
            };
          }
          const session = this.getStore()[marketKey];
          const terms = session.currentTerms;
          const upfront = this.calculateUpfront(
            listing,
            terms
          );
          if (gameState.getPlayer().cash < upfront.total) {
            return {
              ok: false,
              code: "insufficient_cash",
              message: "\u7B7E\u7EA6\u8D44\u91D1\u4E0D\u8DB3\uFF0C\u8FD8\u5DEE\xA5" + (upfront.total - gameState.getPlayer().cash).toLocaleString(),
              upfront
            };
          }
          const day = simulationSystem.getDayOrdinal(
            gameState.getTime()
          );
          const shopId = "shop_" + marketKey.replace(
            /[^a-zA-Z0-9]+/g,
            "_"
          ) + "_" + day;
          if (!this.markPlayerLeased(
            listing,
            shopId
          )) {
            return {
              ok: false,
              code: "listing_changed",
              message: "\u7B7E\u7EA6\u524D\u623F\u6E90\u72B6\u6001\u53D1\u751F\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u786E\u8BA4"
            };
          }
          gameState.spendCash(
            upfront.total
          );
          const shop = {
            id: shopId,
            name: listing.address,
            propertyMarketKey: marketKey,
            districtId: listing.districtId,
            streetId: listing.streetId,
            address: listing.address,
            status: "leased_pending_renovation",
            signedDay: day,
            grossArea: listing.grossArea,
            usableArea: listing.usableArea,
            seatEstimate: listing.seatEstimate,
            propertyTypeName: listing.propertyTypeName,
            layoutTypeName: listing.layoutTypeName,
            floor: listing.floor,
            frontage: listing.frontage,
            depth: listing.depth,
            ceilingHeight: listing.ceilingHeight,
            exhaust: listing.exhaust,
            gas: listing.gas,
            threePhase: listing.threePhase,
            drainage: listing.drainage,
            greaseTrap: listing.greaseTrap,
            fireSprinkler: listing.fireSprinkler,
            electricCapacityKw: listing.electricCapacityKw,
            monthlyRent: terms.monthlyRent,
            transferFee: terms.transferFee,
            freeRentDays: terms.freeRentDays,
            depositMonths: terms.depositMonths,
            paymentMonths: terms.paymentMonths,
            leaseYears: terms.leaseYears,
            annualIncrease: terms.annualIncrease,
            brokerFee: upfront.brokerFee,
            upfrontPaid: upfront.total,
            landlordName: listing.landlordName,
            brokerName: listing.brokerName,
            renovationEstimate: listing.renovationEstimate,
            riskRepairCost: listing.riskRepairCost
          };
          gameState.addShop(
            shop
          );
          session.status = "signed";
          session.signedDay = day;
          session.upfront = upfront;
          this.getStore()[marketKey] = clone(
            session
          );
          this.getLeaseStore()[marketKey] = {
            shopId,
            day,
            terms: clone(
              terms
            ),
            upfront: clone(
              upfront
            )
          };
          return {
            ok: true,
            shop: clone(
              shop
            ),
            terms: clone(
              terms
            ),
            upfront: clone(
              upfront
            ),
            message: "\u7B7E\u7EA6\u5B8C\u6210\uFF0C\u95E8\u5E97\u8FDB\u5165\u5F85\u88C5\u4FEE\u72B6\u6001"
          };
        }
      };
      module.exports = new PropertyNegotiationSystem();
    }
  });

  // src/scenes/shopScene.js
  var require_shopScene = __commonJS({
    "src/scenes/shopScene.js"(exports, module) {
      "use strict";
      var runtime = globalThis.GameRuntime;
      if (!runtime) {
        throw new Error(
          "ShopScene\uFF1AGameRuntime \u672A\u521D\u59CB\u5316"
        );
      }
      var api = runtime.api || {};
      var gameState = require_gameState();
      var sceneManager = require_sceneManager();
      var citySystem = require_citySystem();
      var resourceManager = require_resourceManager();
      var propertyData = require_propertyData();
      var propertySystem = require_propertySystem();
      var propertyMarketSystem = require_propertyMarketSystem();
      var propertyIconAtlas = require_propertyIconAtlas();
      var propertyVisitSystem = require_propertyVisitSystem();
      var propertyNegotiationSystem = require_propertyNegotiationSystem();
      var DESIGN_W = 390;
      var COLORS = {
        navy: "#12384D",
        navy2: "#0A2A3B",
        paper: "#F4EBDD",
        panel: "#FFF9EF",
        panel2: "#F8F0E4",
        text: "#24323A",
        muted: "#718087",
        gold: "#E4AA48",
        orange: "#D9853E",
        red: "#BF584A",
        green: "#4B9567",
        blue: "#4C86A6",
        line: "#DED1C1",
        white: "#FFFFFF"
      };
      var DISTRICT_IDS = [
        "university",
        "cbd",
        "hightech",
        "oldtown",
        "village",
        "market",
        "industry"
      ];
      var AREA_PRESETS = [
        {
          name: "\u4E0D\u9650\u9762\u79EF",
          min: null,
          max: null
        },
        {
          name: "50\u33A1\u4EE5\u4E0B",
          min: null,
          max: 50
        },
        {
          name: "50\u2014100\u33A1",
          min: 50,
          max: 100
        },
        {
          name: "100\u2014200\u33A1",
          min: 100,
          max: 200
        },
        {
          name: "200\u2014350\u33A1",
          min: 200,
          max: 350
        },
        {
          name: "350\u33A1\u4EE5\u4E0A",
          min: 350,
          max: null
        }
      ];
      var RENT_PRESETS = [
        {
          name: "\u4E0D\u9650\u6708\u79DF",
          max: null
        },
        {
          name: "\xA55,000\u5185",
          max: 5e3
        },
        {
          name: "\xA58,000\u5185",
          max: 8e3
        },
        {
          name: "\xA512,000\u5185",
          max: 12e3
        },
        {
          name: "\xA520,000\u5185",
          max: 2e4
        },
        {
          name: "\xA535,000\u5185",
          max: 35e3
        }
      ];
      var UPFRONT_PRESETS = [
        {
          name: "\u4E0D\u9650\u5165\u573A\u8D44\u91D1",
          max: null
        },
        {
          name: "\xA510\u4E07\u5185",
          max: 1e5
        },
        {
          name: "\xA520\u4E07\u5185",
          max: 2e5
        },
        {
          name: "\xA535\u4E07\u5185",
          max: 35e4
        },
        {
          name: "\xA560\u4E07\u5185",
          max: 6e5
        },
        {
          name: "\xA5100\u4E07\u5185",
          max: 1e6
        }
      ];
      var FLOOR_OPTIONS = [
        "\u4E0D\u9650\u697C\u5C42",
        "1\u5C42",
        "B1",
        "2\u5C42",
        "3\u5C42",
        "1-2\u5C42",
        "1-3\u5C42"
      ];
      var PROPERTY_TYPE_OPTIONS = [
        null,
        "street_shop",
        "corner_shop",
        "community_shop",
        "mall_shop",
        "foodcourt_stall",
        "office_podium",
        "market_shop",
        "village_shop",
        "detached",
        "duplex",
        "station_shop",
        "park_canteen"
      ];
      var LAYOUT_OPTIONS = [
        null,
        "single_bay",
        "double_bay",
        "long_narrow",
        "front_back",
        "corner_l",
        "through_shop",
        "duplex_layout",
        "high_ceiling",
        "mall_rect",
        "stall"
      ];
      var RISK_OPTIONS = [
        {
          name: "\u4E0D\u9650\u98CE\u9669",
          max: null
        },
        {
          name: "\u4EC50\u7EA7",
          max: 0
        },
        {
          name: "\u6700\u9AD81\u7EA7",
          max: 1
        },
        {
          name: "\u6700\u9AD82\u7EA7",
          max: 2
        }
      ];
      var SORT_MODES = [
        {
          name: "\u79DF\u91D1\u6700\u4F4E",
          key: "askingMonthlyRent",
          dir: "asc"
        },
        {
          name: "\u9762\u79EF\u6700\u5C0F",
          key: "grossArea",
          dir: "asc"
        },
        {
          name: "\u5173\u6CE8\u6700\u591A",
          key: "watchers",
          dir: "desc"
        },
        {
          name: "\u7ADE\u4E89\u6700\u591A",
          key: "competitorCount",
          dir: "desc"
        },
        {
          name: "\u6302\u724C\u6700\u4E45",
          key: "daysOnMarket",
          dir: "desc"
        },
        {
          name: "\u53EF\u89C1\u5EA6\u6700\u9AD8",
          key: "visibility",
          dir: "desc"
        },
        {
          name: "\u5165\u573A\u8D44\u91D1\u6700\u4F4E",
          key: "liveUpfrontCash",
          dir: "asc"
        }
      ];
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(
            max,
            value
          )
        );
      }
      function money(value) {
        const n = Math.max(
          0,
          Math.round(
            Number(
              value
            ) || 0
          )
        );
        return "\xA5" + n.toLocaleString();
      }
      function percent(value) {
        return Math.round(
          Number(
            value
          ) * 100
        ) + "%";
      }
      function hashText(text) {
        let value = 2166136261;
        const source = String(
          text || ""
        );
        for (let i = 0; i < source.length; i++) {
          value ^= source.charCodeAt(i);
          value = Math.imul(
            value,
            16777619
          );
        }
        return value >>> 0;
      }
      function isLeapYear(year) {
        return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
      }
      function dayOrdinal(time) {
        const y = Math.max(
          1,
          Math.floor(
            Number(
              time.year
            ) || 1
          )
        );
        const m = clamp(
          Math.floor(
            Number(
              time.month
            ) || 1
          ),
          1,
          12
        );
        const d = Math.max(
          1,
          Math.floor(
            Number(
              time.day
            ) || 1
          )
        );
        const y0 = y - 1;
        let days = y0 * 365 + Math.floor(
          y0 / 4
        ) - Math.floor(
          y0 / 100
        ) + Math.floor(
          y0 / 400
        );
        const monthDays = [
          31,
          isLeapYear(
            y
          ) ? 29 : 28,
          31,
          30,
          31,
          30,
          31,
          31,
          30,
          31,
          30,
          31
        ];
        for (let i = 0; i < m - 1; i++) {
          days += monthDays[i];
        }
        return days + d;
      }
      var ShopScene = class {
        constructor() {
          this.id = "shop";
          this.mode = "browse";
          this.detailPage = 0;
          this.page = 0;
          this.pageSize = 3;
          this.districtId = "university";
          this.streetId = null;
          this.selectedListingKey = null;
          this.visitModeId = "standard";
          this.lastVisitResult = null;
          this.lastNegotiationResult = null;
          this.lastSyncOrdinal = null;
          this.cachedListings = [];
          this.cachedDistrictSummary = null;
          this.cachedMarketOverview = null;
          this.localButtons = [];
          this.viewH = 780;
          this.navH = 64;
          this.contentBottom = 716;
          this.filters = {
            areaIndex: 0,
            rentIndex: 0,
            upfrontIndex: 0,
            floorIndex: 0,
            propertyTypeIndex: 0,
            layoutIndex: 0,
            requireExhaust: false,
            requireGas: false,
            requireThreePhase: false,
            riskIndex: 0
          };
          this.sortIndex = 0;
        }
        getLayout() {
          let width = DESIGN_W;
          let height = 780;
          if (api && typeof api.getSystemInfoSync === "function") {
            const info = api.getSystemInfoSync();
            const screenW = Math.max(
              1,
              Number(
                info.windowWidth
              ) || DESIGN_W
            );
            const screenH = Math.max(
              1,
              Number(
                info.windowHeight
              ) || 780
            );
            const scale = screenW / DESIGN_W;
            width = DESIGN_W;
            height = screenH / scale;
          }
          this.viewH = height;
          this.navH = height < 740 ? 60 : 64;
          this.contentBottom = height - this.navH;
          return {
            width,
            height,
            navH: this.navH,
            contentBottom: this.contentBottom
          };
        }
        showToast(text) {
          if (api && typeof api.showToast === "function") {
            api.showToast({
              title: String(
                text
              ),
              icon: "none"
            });
          }
        }
        resetViewState() {
          this.mode = "browse";
          this.detailPage = 0;
          this.page = 0;
          this.streetId = null;
          this.selectedListingKey = null;
          this.visitModeId = "standard";
          this.lastVisitResult = null;
          this.lastNegotiationResult = null;
        }
        enter(payload) {
          const data = payload || {};
          const requested = data.districtId || gameState.getWorld().currentDistrictId || "university";
          if (DISTRICT_IDS.indexOf(
            requested
          ) !== -1) {
            this.districtId = requested;
          }
          citySystem.setCurrentDistrict(
            this.districtId
          );
          this.resetViewState();
          this.syncMarket(
            true
          );
          this.refreshData();
        }
        exit() {
          this.localButtons = [];
        }
        update() {
          const ordinal = dayOrdinal(
            gameState.getTime()
          );
          if (ordinal !== this.lastSyncOrdinal) {
            this.syncMarket(
              false
            );
            this.refreshData();
          }
        }
        syncMarket(force) {
          const ordinal = dayOrdinal(
            gameState.getTime()
          );
          const state = propertyMarketSystem.getState();
          if (!state.initialized) {
            const world = gameState.getWorld();
            const seed = hashText(
              String(
                world.currentCityId
              ) + ":" + gameState.getCityName()
            );
            propertyMarketSystem.reset({
              seed: seed || 20260912,
              currentDay: ordinal
            });
            propertyMarketSystem.initialize({
              currentDay: ordinal
            });
          } else if (ordinal > state.currentDay) {
            propertyMarketSystem.advanceDays(
              ordinal - state.currentDay
            );
          } else if (ordinal < state.currentDay) {
            const world = gameState.getWorld();
            propertyMarketSystem.reset({
              seed: hashText(
                String(
                  world.currentCityId
                ) + ":" + gameState.getCityName()
              ),
              currentDay: ordinal
            });
            propertyMarketSystem.initialize({
              currentDay: ordinal
            });
          }
          this.lastSyncOrdinal = ordinal;
          return force || true;
        }
        getPropertyTypeName(id) {
          if (!id) {
            return "\u4E0D\u9650\u94FA\u578B";
          }
          const item = propertyData.PROPERTY_TYPES.find(
            (type) => type.id === id
          );
          return item ? item.name : "\u4E0D\u9650\u94FA\u578B";
        }
        getLayoutName(id) {
          if (!id) {
            return "\u4E0D\u9650\u6237\u578B";
          }
          const item = propertyData.LAYOUT_TYPES.find(
            (layout) => layout.id === id
          );
          return item ? item.name : "\u4E0D\u9650\u6237\u578B";
        }
        makeLiveListing(item) {
          const depositPaymentCount = (Number(
            item.depositMonths
          ) || 0) + (Number(
            item.paymentMonths
          ) || 1);
          const liveUpfrontCash = Math.max(
            0,
            Math.round(
              (Number(
                item.upfrontCash
              ) || 0) + ((Number(
                item.askingMonthlyRent
              ) || 0) - (Number(
                item.monthlyRent
              ) || 0)) * depositPaymentCount + ((Number(
                item.askingTransferFee
              ) || 0) - (Number(
                item.transferFee
              ) || 0))
            )
          );
          return {
            ...item,
            competitorCount: Array.isArray(
              item.competingTenants
            ) ? item.competingTenants.length : 0,
            liveUpfrontCash
          };
        }
        refreshData() {
          this.cachedDistrictSummary = propertyMarketSystem.getDistrictSummary(
            this.districtId
          );
          this.cachedMarketOverview = propertyMarketSystem.getMarketOverview();
          let list = propertyMarketSystem.getLiveListings({
            districtId: this.districtId,
            streetId: this.streetId || void 0
          }).map(
            (item) => this.makeLiveListing(
              item
            )
          );
          const area = AREA_PRESETS[this.filters.areaIndex];
          const rent = RENT_PRESETS[this.filters.rentIndex];
          const upfront = UPFRONT_PRESETS[this.filters.upfrontIndex];
          const floor = FLOOR_OPTIONS[this.filters.floorIndex];
          const typeId = PROPERTY_TYPE_OPTIONS[this.filters.propertyTypeIndex];
          const layoutId = LAYOUT_OPTIONS[this.filters.layoutIndex];
          const risk = RISK_OPTIONS[this.filters.riskIndex];
          list = list.filter(
            (item) => {
              if (area.min != null && item.grossArea < area.min) {
                return false;
              }
              if (area.max != null && item.grossArea > area.max) {
                return false;
              }
              if (rent.max != null && item.askingMonthlyRent > rent.max) {
                return false;
              }
              if (upfront.max != null && item.liveUpfrontCash > upfront.max) {
                return false;
              }
              if (floor !== "\u4E0D\u9650\u697C\u5C42" && item.floor !== floor) {
                return false;
              }
              if (typeId && item.propertyTypeId !== typeId) {
                return false;
              }
              if (layoutId && item.layoutTypeId !== layoutId) {
                return false;
              }
              if (this.filters.requireExhaust && !item.exhaust) {
                return false;
              }
              if (this.filters.requireGas && !item.gas) {
                return false;
              }
              if (this.filters.requireThreePhase && !item.threePhase) {
                return false;
              }
              if (risk.max != null && item.riskLevel > risk.max) {
                return false;
              }
              return true;
            }
          );
          const sort = SORT_MODES[this.sortIndex];
          list.sort(
            (a, b) => {
              const av = Number(
                a[sort.key]
              ) || 0;
              const bv = Number(
                b[sort.key]
              ) || 0;
              return sort.dir === "desc" ? bv - av : av - bv;
            }
          );
          this.cachedListings = list;
          const maxPage = Math.max(
            0,
            Math.ceil(
              list.length / this.pageSize
            ) - 1
          );
          this.page = clamp(
            this.page,
            0,
            maxPage
          );
        }
        getSelectedListing() {
          if (!this.selectedListingKey) {
            return null;
          }
          const live = propertyMarketSystem.getLiveListings({
            districtId: this.districtId
          }).find(
            (item) => item.marketKey === this.selectedListingKey
          );
          return live ? this.makeLiveListing(
            live
          ) : null;
        }
        getDistrictName(districtId) {
          const profile = propertySystem.getDistrictProfile(
            districtId
          );
          return profile ? profile.name : districtId;
        }
        getStreetName(streetId) {
          if (!streetId) {
            return "\u5168\u90E8\u8857\u9053";
          }
          const street = propertySystem.getStreet(
            streetId
          );
          return street ? street.name : "\u5168\u90E8\u8857\u9053";
        }
        clearButtons() {
          this.localButtons = [];
        }
        addButton(id, x, y, w, h) {
          this.localButtons.push({
            id,
            x,
            y,
            w,
            h
          });
        }
        hitButton(x, y) {
          for (let i = this.localButtons.length - 1; i >= 0; i--) {
            const button = this.localButtons[i];
            if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
              return button;
            }
          }
          return null;
        }
        roundedPath(ctx2, x, y, w, h, r) {
          const radius = Math.min(
            r,
            w / 2,
            h / 2
          );
          ctx2.beginPath();
          ctx2.moveTo(
            x + radius,
            y
          );
          ctx2.arcTo(
            x + w,
            y,
            x + w,
            y + h,
            radius
          );
          ctx2.arcTo(
            x + w,
            y + h,
            x,
            y + h,
            radius
          );
          ctx2.arcTo(
            x,
            y + h,
            x,
            y,
            radius
          );
          ctx2.arcTo(
            x,
            y,
            x + w,
            y,
            radius
          );
          ctx2.closePath();
        }
        roundedRect(ctx2, x, y, w, h, r, fill, stroke, width) {
          this.roundedPath(
            ctx2,
            x,
            y,
            w,
            h,
            r
          );
          if (fill) {
            ctx2.fillStyle = fill;
            ctx2.fill();
          }
          if (stroke) {
            ctx2.strokeStyle = stroke;
            ctx2.lineWidth = width || 1;
            ctx2.stroke();
          }
        }
        text(ctx2, text, x, y, size, color, weight, align) {
          ctx2.fillStyle = color || COLORS.text;
          const readableSize = Math.max(
            7.3,
            Number(
              size
            ) || 7.3
          );
          ctx2.font = (weight || "500") + " " + readableSize + "px sans-serif";
          ctx2.textAlign = align || "left";
          ctx2.textBaseline = "middle";
          ctx2.fillText(
            String(
              text
            ),
            x,
            y
          );
        }
        drawIcon(ctx2, name, x, y, size, fallback) {
          const image = resourceManager.getImage(
            "property_icons_01"
          );
          const region = propertyIconAtlas.icons[name];
          if (image && region) {
            ctx2.drawImage(
              image,
              region.x,
              region.y,
              region.w,
              region.h,
              x,
              y,
              size,
              size
            );
            return;
          }
          this.roundedRect(
            ctx2,
            x,
            y,
            size,
            size,
            Math.max(
              4,
              size * 0.23
            ),
            "#EEE2D3"
          );
          this.text(
            ctx2,
            fallback || "\xB7",
            x + size / 2,
            y + size / 2,
            Math.max(
              8,
              size * 0.42
            ),
            COLORS.navy,
            "700",
            "center"
          );
        }
        drawHeader(ctx2, title, subtitle, backId) {
          const h = 66;
          ctx2.fillStyle = COLORS.navy2;
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            h
          );
          if (backId) {
            this.roundedRect(
              ctx2,
              10,
              13,
              46,
              34,
              10,
              "rgba(255,255,255,0.10)",
              "rgba(255,255,255,0.15)"
            );
            this.text(
              ctx2,
              "\u2039",
              33,
              30,
              22,
              COLORS.white,
              "700",
              "center"
            );
            this.addButton(
              backId,
              6,
              8,
              54,
              44
            );
          }
          const textX = backId ? 69 : 15;
          this.text(
            ctx2,
            title,
            textX,
            22,
            17,
            COLORS.white,
            "700"
          );
          this.text(
            ctx2,
            subtitle || "",
            textX,
            45,
            8,
            "rgba(255,255,255,0.70)",
            "500"
          );
          this.text(
            ctx2,
            money(
              gameState.getPlayer().cash
            ),
            377,
            22,
            12,
            "#FFE8AE",
            "700",
            "right"
          );
          const time = gameState.getTime();
          this.text(
            ctx2,
            "\u7B2C" + time.year + "\u5E74 " + time.month + "\u6708" + time.day + "\u65E5",
            377,
            44,
            7,
            "#D8E5EB",
            "500",
            "right"
          );
        }
        drawDistrictTabs(ctx2, y) {
          const gap = 4;
          const x = 8;
          const w = (DESIGN_W - 16 - gap * 6) / 7;
          for (let i = 0; i < DISTRICT_IDS.length; i++) {
            const id = DISTRICT_IDS[i];
            const selected = id === this.districtId;
            this.roundedRect(
              ctx2,
              x + i * (w + gap),
              y,
              w,
              32,
              9,
              selected ? COLORS.gold : "#E9DFD1",
              selected ? "#D39431" : "#D6C8B8"
            );
            this.text(
              ctx2,
              this.getDistrictName(
                id
              ).replace(
                "\u5546\u4E1A\u4E2D\u5FC3",
                "\u5546\u4E2D\u5FC3"
              ),
              x + i * (w + gap) + w / 2,
              y + 16,
              7,
              selected ? "#26343B" : COLORS.text,
              selected ? "700" : "600",
              "center"
            );
            this.addButton(
              "district:" + id,
              x + i * (w + gap),
              y,
              w,
              32
            );
          }
        }
        drawStreetTabs(ctx2, y) {
          const streets = propertySystem.getStreets(
            this.districtId
          );
          const items = [
            {
              id: null,
              name: "\u5168\u90E8"
            },
            ...streets.map(
              (item) => ({
                id: item.id,
                name: item.name
              })
            )
          ];
          const gap = 4;
          const x = 8;
          const w = (DESIGN_W - 16 - gap * 6) / 7;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const selected = (item.id || null) === (this.streetId || null);
            this.roundedRect(
              ctx2,
              x + i * (w + gap),
              y,
              w,
              28,
              8,
              selected ? "#DDEBF2" : "#F8F2E8",
              selected ? "#8DB6C9" : "#DACFC0"
            );
            this.text(
              ctx2,
              item.name.replace(
                "\u5927\u9053",
                "\u5927\u9053"
              ),
              x + i * (w + gap) + w / 2,
              y + 14,
              6.5,
              selected ? COLORS.navy : COLORS.muted,
              selected ? "700" : "600",
              "center"
            );
            this.addButton(
              "street:" + (item.id || "all"),
              x + i * (w + gap),
              y,
              w,
              28
            );
          }
        }
        drawSummary(ctx2, y) {
          const summary = this.cachedDistrictSummary;
          if (!summary) {
            return;
          }
          this.roundedRect(
            ctx2,
            8,
            y,
            374,
            61,
            13,
            COLORS.panel,
            COLORS.line
          );
          const metrics = [
            [
              "\u6302\u724C",
              summary.activeListingCount + "\u5957",
              COLORS.navy
            ],
            [
              "\u5747\u79DF",
              money(
                summary.averageAskingRent
              ),
              COLORS.red
            ],
            [
              "\u5747\u6302",
              summary.averageDaysOnMarket + "\u5929",
              COLORS.blue
            ],
            [
              "\u6700\u70ED",
              summary.hottestStreet ? summary.hottestStreet.name : "--",
              COLORS.orange
            ]
          ];
          for (let i = 0; i < metrics.length; i++) {
            const x = 18 + i * 92;
            this.text(
              ctx2,
              metrics[i][0],
              x,
              y + 17,
              7,
              COLORS.muted,
              "600"
            );
            this.text(
              ctx2,
              metrics[i][1],
              x,
              y + 39,
              10,
              metrics[i][2],
              "700"
            );
          }
        }
        getDistrictEvents() {
          const overview = this.cachedMarketOverview;
          if (!overview || !Array.isArray(
            overview.activeEvents
          )) {
            return [];
          }
          return overview.activeEvents.filter(
            (event) => event.districtId === this.districtId || event.streetId && propertySystem.getStreet(
              event.streetId
            ) && propertySystem.getStreet(
              event.streetId
            ).districtId === this.districtId
          );
        }
        drawEventBar(ctx2, y) {
          const events = this.getDistrictEvents();
          this.roundedRect(
            ctx2,
            8,
            y,
            374,
            36,
            11,
            events.length ? "#FFF0D6" : "#F1EBE2",
            events.length ? "#E4B564" : "#D8CDC0"
          );
          this.drawIcon(
            ctx2,
            "event",
            14,
            y + 7,
            22,
            "\u4E8B"
          );
          if (events.length) {
            const first = events[0];
            this.text(
              ctx2,
              first.name,
              44,
              y + 13,
              8,
              COLORS.text,
              "700"
            );
            this.text(
              ctx2,
              "\u5269\u4F59 " + Math.max(
                0,
                first.endDay - (this.cachedMarketOverview.currentDay || first.startDay) + 1
              ) + " \u5929",
              44,
              y + 27,
              6.5,
              COLORS.orange,
              "600"
            );
            this.text(
              ctx2,
              events.length > 1 ? "+" + (events.length - 1) + "\u4E2A\u4E8B\u4EF6 \u203A" : "\u67E5\u770B\u5F71\u54CD \u203A",
              370,
              y + 18,
              7,
              COLORS.navy,
              "700",
              "right"
            );
          } else {
            this.text(
              ctx2,
              "\u5F53\u524D\u5546\u5708\u6682\u65E0\u5927\u578B\u5E02\u573A\u4E8B\u4EF6",
              44,
              y + 18,
              8,
              COLORS.muted,
              "600"
            );
          }
          this.addButton(
            "events",
            8,
            y,
            374,
            36
          );
        }
        drawToolbar(ctx2, y) {
          const activeFilters = this.countActiveFilters();
          this.roundedRect(
            ctx2,
            8,
            y,
            118,
            34,
            10,
            activeFilters ? "#E7F0E8" : "#F8F2E8",
            activeFilters ? "#93BE9D" : "#D6C9B9"
          );
          this.drawIcon(
            ctx2,
            "filter",
            14,
            y + 7,
            20,
            "\u7B5B"
          );
          this.text(
            ctx2,
            "\u7B5B\u9009" + (activeFilters ? " " + activeFilters : ""),
            43,
            y + 17,
            8,
            COLORS.text,
            "700"
          );
          this.addButton(
            "filter",
            8,
            y,
            118,
            34
          );
          this.roundedRect(
            ctx2,
            132,
            y,
            154,
            34,
            10,
            "#F8F2E8",
            "#D6C9B9"
          );
          this.drawIcon(
            ctx2,
            "sort",
            139,
            y + 7,
            20,
            "\u5E8F"
          );
          this.text(
            ctx2,
            SORT_MODES[this.sortIndex].name,
            168,
            y + 17,
            8,
            COLORS.text,
            "700"
          );
          this.text(
            ctx2,
            "\u203A",
            277,
            y + 17,
            13,
            COLORS.muted,
            "700",
            "center"
          );
          this.addButton(
            "sort",
            132,
            y,
            154,
            34
          );
          this.roundedRect(
            ctx2,
            292,
            y,
            90,
            34,
            10,
            COLORS.navy,
            "#244A60"
          );
          this.text(
            ctx2,
            this.cachedListings.length + "\u5957",
            337,
            y + 17,
            9,
            COLORS.white,
            "700",
            "center"
          );
        }
        countActiveFilters() {
          let count = 0;
          [
            "areaIndex",
            "rentIndex",
            "upfrontIndex",
            "floorIndex",
            "propertyTypeIndex",
            "layoutIndex",
            "riskIndex"
          ].forEach(
            (key) => {
              if (this.filters[key] > 0) {
                count++;
              }
            }
          );
          if (this.filters.requireExhaust) {
            count++;
          }
          if (this.filters.requireGas) {
            count++;
          }
          if (this.filters.requireThreePhase) {
            count++;
          }
          return count;
        }
        drawBadge(ctx2, text, x, y, fill, color) {
          const w = Math.max(
            32,
            text.length * 7 + 12
          );
          this.roundedRect(
            ctx2,
            x,
            y,
            w,
            18,
            6,
            fill
          );
          this.text(
            ctx2,
            text,
            x + w / 2,
            y + 9,
            6.5,
            color,
            "700",
            "center"
          );
          return w;
        }
        drawHardwareMini(ctx2, item, x, y) {
          const hardware = [
            [
              "exhaust",
              item.exhaust,
              "\u70DF"
            ],
            [
              "gas",
              item.gas,
              "\u6C14"
            ],
            [
              "power",
              item.threePhase,
              "\u7535"
            ]
          ];
          for (let i = 0; i < hardware.length; i++) {
            this.drawIcon(
              ctx2,
              hardware[i][0],
              x + i * 27,
              y,
              20,
              hardware[i][2]
            );
            if (!hardware[i][1]) {
              ctx2.save();
              ctx2.strokeStyle = COLORS.red;
              ctx2.lineWidth = 2;
              ctx2.beginPath();
              ctx2.moveTo(
                x + i * 27 + 3,
                y + 3
              );
              ctx2.lineTo(
                x + i * 27 + 17,
                y + 17
              );
              ctx2.stroke();
              ctx2.restore();
            }
          }
        }
        drawListingCard(ctx2, item, x, y, w, h) {
          const hot = item.watchers >= 4 || item.competitorCount >= 2;
          const isNew = item.daysOnMarket <= 3;
          const isCut = item.priceChangeRate < -0.01;
          this.roundedRect(
            ctx2,
            x,
            y,
            w,
            h,
            13,
            COLORS.panel,
            "#D7CABC"
          );
          let badgeX = x + 12;
          if (isNew) {
            badgeX += this.drawBadge(
              ctx2,
              "\u65B0\u4E0A\u67B6",
              badgeX,
              y + 9,
              "#E4F0E8",
              COLORS.green
            ) + 5;
          }
          if (isCut) {
            badgeX += this.drawBadge(
              ctx2,
              "\u5DF2\u964D\u4EF7",
              badgeX,
              y + 9,
              "#E7F2EA",
              COLORS.green
            ) + 5;
          }
          if (hot) {
            this.drawBadge(
              ctx2,
              "\u591A\u4EBA\u5173\u6CE8",
              badgeX,
              y + 9,
              "#FFF0DD",
              COLORS.orange
            );
          }
          this.text(
            ctx2,
            item.address,
            x + 12,
            y + 40,
            12,
            COLORS.text,
            "700"
          );
          this.text(
            ctx2,
            item.propertyTypeName + " \xB7 " + item.layoutTypeName + " \xB7 " + item.floor,
            x + 12,
            y + 58,
            7,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            money(
              item.askingMonthlyRent
            ),
            x + w - 12,
            y + 39,
            14,
            COLORS.red,
            "700",
            "right"
          );
          this.text(
            ctx2,
            "/\u6708",
            x + w - 12,
            y + 57,
            6.5,
            COLORS.muted,
            "500",
            "right"
          );
          this.drawIcon(
            ctx2,
            "area",
            x + 12,
            y + 69,
            20,
            "\u9762"
          );
          this.text(
            ctx2,
            item.grossArea + "\u33A1",
            x + 37,
            y + 79,
            8,
            COLORS.text,
            "700"
          );
          this.drawIcon(
            ctx2,
            "frontage",
            x + 77,
            y + 69,
            20,
            "\u5BBD"
          );
          this.text(
            ctx2,
            item.frontage + "m",
            x + 102,
            y + 79,
            8,
            COLORS.text,
            "700"
          );
          this.drawHardwareMini(
            ctx2,
            item,
            x + 145,
            y + 69
          );
          this.drawIcon(
            ctx2,
            "competitor",
            x + 235,
            y + 69,
            20,
            "\u7ADE"
          );
          this.text(
            ctx2,
            item.competitorCount + "\u4EBA",
            x + 260,
            y + 79,
            8,
            item.competitorCount > 0 ? COLORS.orange : COLORS.muted,
            "700"
          );
          this.text(
            ctx2,
            "\u6302\u724C " + item.daysOnMarket + "\u5929 \xB7 \u5173\u6CE8 " + item.watchers + " \xB7 \u5165\u573A\u7EA6 " + money(
              item.liveUpfrontCash
            ),
            x + 12,
            y + h - 17,
            7,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            "\u8BE6\u60C5 \u203A",
            x + w - 12,
            y + h - 17,
            8,
            COLORS.navy,
            "700",
            "right"
          );
          this.addButton(
            "listing:" + item.marketKey,
            x,
            y,
            w,
            h
          );
        }
        drawPager(ctx2, y) {
          const totalPages = Math.max(
            1,
            Math.ceil(
              this.cachedListings.length / this.pageSize
            )
          );
          this.roundedRect(
            ctx2,
            8,
            y,
            76,
            34,
            10,
            this.page > 0 ? "#E7EDF0" : "#EEE9E1",
            "#D2C8BB"
          );
          this.text(
            ctx2,
            "\u2039 \u4E0A\u4E00\u9875",
            46,
            y + 17,
            8,
            this.page > 0 ? COLORS.navy : "#AAA198",
            "700",
            "center"
          );
          this.addButton(
            "page:prev",
            8,
            y,
            76,
            34
          );
          this.text(
            ctx2,
            this.page + 1 + " / " + totalPages,
            195,
            y + 17,
            8,
            COLORS.muted,
            "700",
            "center"
          );
          this.roundedRect(
            ctx2,
            306,
            y,
            76,
            34,
            10,
            this.page < totalPages - 1 ? "#E7EDF0" : "#EEE9E1",
            "#D2C8BB"
          );
          this.text(
            ctx2,
            "\u4E0B\u4E00\u9875 \u203A",
            344,
            y + 17,
            8,
            this.page < totalPages - 1 ? COLORS.navy : "#AAA198",
            "700",
            "center"
          );
          this.addButton(
            "page:next",
            306,
            y,
            76,
            34
          );
        }
        renderBrowse(ctx2) {
          this.drawHeader(
            ctx2,
            this.getDistrictName(
              this.districtId
            ) + " \xB7 \u623F\u6E90\u5E02\u573A",
            "\u8FD9\u91CC\u53EA\u8D1F\u8D23\u627E\u94FA\uFF1B\u5DF2\u7B7E\u7EA6\u95E8\u5E97\u56DE\u201C\u95E8\u5E97\u201D\u9875\u9762\u7BA1\u7406",
            "market:back"
          );
          this.drawDistrictTabs(
            ctx2,
            75
          );
          this.drawStreetTabs(
            ctx2,
            113
          );
          this.drawSummary(
            ctx2,
            149
          );
          this.drawEventBar(
            ctx2,
            218
          );
          this.drawToolbar(
            ctx2,
            262
          );
          const listTop = 305;
          const availableH = this.contentBottom - listTop - 45;
          const cardGap = 7;
          const cardH = clamp(
            Math.floor(
              (availableH - cardGap * 2) / 3
            ),
            100,
            121
          );
          const start = this.page * this.pageSize;
          const visible = this.cachedListings.slice(
            start,
            start + this.pageSize
          );
          if (visible.length === 0) {
            this.roundedRect(
              ctx2,
              8,
              listTop,
              374,
              Math.min(
                170,
                availableH
              ),
              14,
              COLORS.panel,
              COLORS.line
            );
            this.drawIcon(
              ctx2,
              "filter",
              170,
              listTop + 27,
              50,
              "\u7B5B"
            );
            this.text(
              ctx2,
              "\u6CA1\u6709\u7B26\u5408\u5F53\u524D\u6761\u4EF6\u7684\u6302\u724C",
              195,
              listTop + 97,
              12,
              COLORS.text,
              "700",
              "center"
            );
            this.text(
              ctx2,
              "\u53EF\u4EE5\u653E\u5BBD\u7B5B\u9009\uFF0C\u6216\u7B49\u5F85\u65B0\u7684\u623F\u6E90\u8FDB\u5165\u5E02\u573A",
              195,
              listTop + 124,
              8,
              COLORS.muted,
              "500",
              "center"
            );
          } else {
            for (let i = 0; i < visible.length; i++) {
              this.drawListingCard(
                ctx2,
                visible[i],
                8,
                listTop + i * (cardH + cardGap),
                374,
                cardH
              );
            }
          }
          this.drawPager(
            ctx2,
            this.contentBottom - 39
          );
        }
        drawFilterRow(ctx2, id, icon, label, value, y) {
          this.roundedRect(
            ctx2,
            12,
            y,
            366,
            43,
            11,
            COLORS.panel,
            COLORS.line
          );
          this.drawIcon(
            ctx2,
            icon,
            19,
            y + 9,
            25,
            label.slice(
              0,
              1
            )
          );
          this.text(
            ctx2,
            label,
            55,
            y + 14,
            7,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            value,
            55,
            y + 30,
            9,
            COLORS.text,
            "700"
          );
          this.text(
            ctx2,
            "\u70B9\u51FB\u5207\u6362 \u203A",
            365,
            y + 22,
            7,
            COLORS.navy,
            "700",
            "right"
          );
          this.addButton(
            id,
            12,
            y,
            366,
            43
          );
        }
        renderFilters(ctx2) {
          this.drawHeader(
            ctx2,
            "\u7B5B\u9009\u623F\u6E90",
            "\u7B5B\u9009\u4E0D\u4F1A\u51BB\u7ED3\u5E02\u573A\uFF0C\u65F6\u95F4\u63A8\u8FDB\u540E\u7ED3\u679C\u4ECD\u4F1A\u53D8\u5316",
            "filter:back"
          );
          let y = 77;
          const rows = [
            [
              "filter:area",
              "area",
              "\u9762\u79EF",
              AREA_PRESETS[this.filters.areaIndex].name
            ],
            [
              "filter:rent",
              "rent",
              "\u6708\u79DF\u4E0A\u9650",
              RENT_PRESETS[this.filters.rentIndex].name
            ],
            [
              "filter:upfront",
              "lease",
              "\u7B7E\u7EA6\u524D\u8D44\u91D1",
              UPFRONT_PRESETS[this.filters.upfrontIndex].name
            ],
            [
              "filter:floor",
              "floor",
              "\u697C\u5C42",
              FLOOR_OPTIONS[this.filters.floorIndex]
            ],
            [
              "filter:type",
              "frontage",
              "\u94FA\u578B",
              this.getPropertyTypeName(
                PROPERTY_TYPE_OPTIONS[this.filters.propertyTypeIndex]
              )
            ],
            [
              "filter:layout",
              "layout",
              "\u6237\u578B",
              this.getLayoutName(
                LAYOUT_OPTIONS[this.filters.layoutIndex]
              )
            ],
            [
              "filter:risk",
              "warning",
              "\u6700\u5927\u98CE\u9669",
              RISK_OPTIONS[this.filters.riskIndex].name
            ]
          ];
          for (let i = 0; i < rows.length; i++) {
            this.drawFilterRow(
              ctx2,
              rows[i][0],
              rows[i][1],
              rows[i][2],
              rows[i][3],
              y
            );
            y += 48;
          }
          const toggles = [
            [
              "filter:exhaust",
              "exhaust",
              "\u5FC5\u987B\u53EF\u6392\u70DF",
              this.filters.requireExhaust
            ],
            [
              "filter:gas",
              "gas",
              "\u5FC5\u987B\u6709\u71C3\u6C14",
              this.filters.requireGas
            ],
            [
              "filter:power",
              "power",
              "\u5FC5\u987B\u6709\u4E09\u76F8\u7535",
              this.filters.requireThreePhase
            ]
          ];
          const toggleY = y + 2;
          const w = 118;
          for (let i = 0; i < toggles.length; i++) {
            const x = 12 + i * 126;
            const on = toggles[i][3];
            this.roundedRect(
              ctx2,
              x,
              toggleY,
              w,
              48,
              11,
              on ? "#E4F1E8" : COLORS.panel,
              on ? "#8DB89B" : COLORS.line
            );
            this.drawIcon(
              ctx2,
              toggles[i][1],
              x + 8,
              toggleY + 11,
              25,
              "\u2713"
            );
            this.text(
              ctx2,
              toggles[i][2],
              x + 39,
              toggleY + 18,
              7,
              COLORS.text,
              "700"
            );
            this.text(
              ctx2,
              on ? "\u5DF2\u8981\u6C42" : "\u4E0D\u9650",
              x + 39,
              toggleY + 34,
              6.5,
              on ? COLORS.green : COLORS.muted,
              "600"
            );
            this.addButton(
              toggles[i][0],
              x,
              toggleY,
              w,
              48
            );
          }
          const actionY = Math.min(
            this.contentBottom - 50,
            toggleY + 61
          );
          this.roundedRect(
            ctx2,
            12,
            actionY,
            112,
            38,
            11,
            "#ECE5DB",
            "#D4C8BA"
          );
          this.text(
            ctx2,
            "\u91CD\u7F6E\u7B5B\u9009",
            68,
            actionY + 19,
            8,
            COLORS.muted,
            "700",
            "center"
          );
          this.addButton(
            "filter:reset",
            12,
            actionY,
            112,
            38
          );
          this.roundedRect(
            ctx2,
            136,
            actionY,
            242,
            38,
            11,
            COLORS.gold,
            "#D49434"
          );
          this.text(
            ctx2,
            "\u67E5\u770B " + this.cachedListings.length + " \u5957\u6302\u724C",
            257,
            actionY + 19,
            9,
            "#29343A",
            "700",
            "center"
          );
          this.addButton(
            "filter:apply",
            136,
            actionY,
            242,
            38
          );
        }
        renderEvents(ctx2) {
          this.drawHeader(
            ctx2,
            "\u5546\u5708\u5E02\u573A\u4E8B\u4EF6",
            this.getDistrictName(
              this.districtId
            ) + " \xB7 \u4E8B\u4EF6\u4F1A\u771F\u5B9E\u6539\u53D8\u5BA2\u6D41\u3001\u79DF\u91D1\u548C\u627E\u94FA\u7ADE\u4E89",
            "events:back"
          );
          const events = this.getDistrictEvents();
          if (events.length === 0) {
            this.roundedRect(
              ctx2,
              12,
              87,
              366,
              160,
              15,
              COLORS.panel,
              COLORS.line
            );
            this.drawIcon(
              ctx2,
              "event",
              167,
              112,
              56,
              "\u4E8B"
            );
            this.text(
              ctx2,
              "\u5F53\u524D\u6CA1\u6709\u5927\u578B\u4E8B\u4EF6",
              195,
              190,
              12,
              COLORS.text,
              "700",
              "center"
            );
            this.text(
              ctx2,
              "\u5E02\u573A\u4ECD\u4F1A\u56E0NPC\u79DF\u8D41\u3001\u6302\u724C\u5468\u671F\u548C\u623F\u4E1C\u884C\u4E3A\u53D8\u5316",
              195,
              218,
              7.5,
              COLORS.muted,
              "500",
              "center"
            );
            return;
          }
          for (let i = 0; i < events.length && i < 6; i++) {
            const event = events[i];
            const y = 80 + i * 92;
            this.roundedRect(
              ctx2,
              12,
              y,
              366,
              82,
              13,
              COLORS.panel,
              "#E3C58A"
            );
            this.drawIcon(
              ctx2,
              "event",
              22,
              y + 14,
              31,
              "\u4E8B"
            );
            this.text(
              ctx2,
              event.name,
              63,
              y + 22,
              11,
              COLORS.text,
              "700"
            );
            this.text(
              ctx2,
              event.description,
              63,
              y + 43,
              6.7,
              COLORS.muted,
              "500"
            );
            this.text(
              ctx2,
              "\u5BA2\u6D41\xD7" + event.trafficFactor.toFixed(
                2
              ) + "  \u79DF\u91D1\u538B\u529B\xD7" + event.rentPressure.toFixed(
                2
              ) + "  NPC\u9700\u6C42\xD7" + event.npcDemandFactor.toFixed(
                2
              ),
              63,
              y + 63,
              6.5,
              COLORS.orange,
              "700"
            );
            this.text(
              ctx2,
              "\u81F3\u7B2C" + event.endDay + "\u5929",
              365,
              y + 22,
              6.5,
              COLORS.muted,
              "600",
              "right"
            );
          }
        }
        drawDetailMetric(ctx2, icon, label, value, x, y, w) {
          this.roundedRect(
            ctx2,
            x,
            y,
            w,
            48,
            10,
            COLORS.panel2
          );
          this.drawIcon(
            ctx2,
            icon,
            x + 7,
            y + 12,
            24,
            label.slice(
              0,
              1
            )
          );
          this.text(
            ctx2,
            label,
            x + 38,
            y + 14,
            6.5,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            value,
            x + 38,
            y + 33,
            9,
            COLORS.text,
            "700"
          );
        }
        drawBoolCell(ctx2, icon, label, value, x, y) {
          const w = 57;
          this.roundedRect(
            ctx2,
            x,
            y,
            w,
            50,
            10,
            value ? "#E9F2EB" : "#F2E7E3",
            value ? "#A1C2AA" : "#D7B1A8"
          );
          this.drawIcon(
            ctx2,
            icon,
            x + 17,
            y + 5,
            24,
            label.slice(
              0,
              1
            )
          );
          this.text(
            ctx2,
            label,
            x + w / 2,
            y + 37,
            6,
            value ? COLORS.green : COLORS.red,
            "700",
            "center"
          );
          this.text(
            ctx2,
            value ? "\u2713" : "\xD7",
            x + 47,
            y + 12,
            8,
            value ? COLORS.green : COLORS.red,
            "700",
            "center"
          );
        }
        renderDetailPageOne(ctx2, item) {
          const y0 = 76;
          this.roundedRect(
            ctx2,
            10,
            y0,
            370,
            90,
            14,
            COLORS.panel,
            COLORS.line
          );
          this.text(
            ctx2,
            item.address,
            22,
            y0 + 20,
            14,
            COLORS.text,
            "700"
          );
          this.text(
            ctx2,
            item.propertyTypeName + " \xB7 " + item.layoutTypeName + " \xB7 " + item.floor,
            22,
            y0 + 43,
            7.5,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            money(
              item.askingMonthlyRent
            ) + "/\u6708",
            366,
            y0 + 23,
            16,
            COLORS.red,
            "700",
            "right"
          );
          this.text(
            ctx2,
            "\u7B7E\u7EA6\u524D\u7EA6 " + money(
              item.liveUpfrontCash
            ),
            366,
            y0 + 49,
            7.5,
            COLORS.orange,
            "700",
            "right"
          );
          this.text(
            ctx2,
            "\u6302\u724C " + item.daysOnMarket + "\u5929 \xB7 \u5173\u6CE8 " + item.watchers + " \xB7 " + item.competitorCount + "\u4E2A\u7ADE\u4E89\u8005",
            22,
            y0 + 70,
            7,
            COLORS.muted,
            "600"
          );
          const gridY = 176;
          const metricW = 116;
          this.drawDetailMetric(
            ctx2,
            "area",
            "\u5EFA\u7B51\u9762\u79EF",
            item.grossArea + "\u33A1",
            10,
            gridY,
            metricW
          );
          this.drawDetailMetric(
            ctx2,
            "layout",
            "\u53EF\u7528\u9762\u79EF",
            item.usableArea + "\u33A1",
            137,
            gridY,
            metricW
          );
          this.drawDetailMetric(
            ctx2,
            "floor",
            "\u4F30\u7B97\u5EA7\u4F4D",
            item.seatEstimate + "\u5E2D",
            264,
            gridY,
            metricW
          );
          this.drawDetailMetric(
            ctx2,
            "frontage",
            "\u95E8\u9762\u5BBD",
            item.frontage + "m",
            10,
            gridY + 57,
            metricW
          );
          this.drawDetailMetric(
            ctx2,
            "depth",
            "\u8FDB\u6DF1",
            item.depth + "m",
            137,
            gridY + 57,
            metricW
          );
          this.drawDetailMetric(
            ctx2,
            "layout",
            "\u5C42\u9AD8",
            item.ceilingHeight + "m",
            264,
            gridY + 57,
            metricW
          );
          this.roundedRect(
            ctx2,
            10,
            gridY + 119,
            370,
            77,
            13,
            COLORS.panel,
            COLORS.line
          );
          this.text(
            ctx2,
            "\u9910\u996E\u786C\u4EF6\u6761\u4EF6",
            22,
            gridY + 136,
            8,
            COLORS.muted,
            "700"
          );
          const boolY = gridY + 145;
          const bools = [
            [
              "exhaust",
              "\u6392\u70DF",
              item.exhaust
            ],
            [
              "gas",
              "\u71C3\u6C14",
              item.gas
            ],
            [
              "power",
              "\u4E09\u76F8\u7535",
              item.threePhase
            ],
            [
              "drainage",
              "\u6392\u6C34",
              item.drainage
            ],
            [
              "grease",
              "\u9694\u6CB9",
              item.greaseTrap
            ],
            [
              "fire",
              "\u6D88\u9632",
              item.fireSprinkler
            ]
          ];
          for (let i = 0; i < bools.length; i++) {
            this.drawBoolCell(
              ctx2,
              bools[i][0],
              bools[i][1],
              bools[i][2],
              16 + i * 61,
              boolY
            );
          }
          const utilityY = gridY + 207;
          this.roundedRect(
            ctx2,
            10,
            utilityY,
            370,
            90,
            13,
            COLORS.panel,
            COLORS.line
          );
          this.text(
            ctx2,
            "\u540E\u53A8\u4E0E\u7ECF\u8425\u80FD\u529B",
            22,
            utilityY + 17,
            8,
            COLORS.muted,
            "700"
          );
          const line1 = "\u5EFA\u8BAE\u53A8\u623F " + item.kitchenSuggestedArea + "\u33A1 \xB7 \u5802\u98DF " + item.diningSuggestedArea + "\u33A1 \xB7 \u7535\u5BB9\u91CF " + item.electricCapacityKw + "kW";
          const line2 = "\u53EF\u89C1\u5EA6 " + item.visibility + " \xB7 \u505C\u8F66 " + item.parkingScore + " \xB7 \u9A91\u624B\u4FBF\u5229 " + item.riderAccess + " \xB7 \u5378\u8D27 " + item.loadingAccess;
          const line3 = "\u6C34\u538B " + item.waterPressure + " \xB7 \u591C\u95F4\u5BB9\u5FCD " + item.noiseTolerance + " \xB7 \u72EC\u7ACB\u536B\u751F\u95F4 " + (item.independentToilet ? "\u6709" : "\u65E0");
          this.text(
            ctx2,
            line1,
            22,
            utilityY + 39,
            7,
            COLORS.text,
            "600"
          );
          this.text(
            ctx2,
            line2,
            22,
            utilityY + 60,
            7,
            COLORS.text,
            "600"
          );
          this.text(
            ctx2,
            line3,
            22,
            utilityY + 78,
            7,
            COLORS.text,
            "600"
          );
        }
        renderDetailPageTwo(ctx2, item) {
          const y0 = 77;
          this.roundedRect(
            ctx2,
            10,
            y0,
            370,
            151,
            14,
            COLORS.panel,
            COLORS.line
          );
          this.text(
            ctx2,
            "\u79DF\u7EA6\u4E0E\u5165\u573A\u6210\u672C",
            22,
            y0 + 20,
            11,
            COLORS.text,
            "700"
          );
          const rows = [
            [
              "\u5F53\u524D\u6708\u79DF",
              money(
                item.askingMonthlyRent
              )
            ],
            [
              "\u7269\u4E1A\u8D39",
              money(
                item.propertyFee
              ) + "/\u6708"
            ],
            [
              "\u62BC\u91D1/\u4ED8\u6B3E",
              item.depositMonths + "\u4E2A\u6708\u62BC\u91D1 \xB7 " + item.paymentCycleName
            ],
            [
              "\u514D\u79DF\u671F/\u79DF\u671F",
              item.freeRentDays + "\u5929 \xB7 " + item.leaseYears + "\u5E74"
            ],
            [
              "\u5E74\u9012\u589E",
              percent(
                item.annualIncrease
              )
            ],
            [
              "\u8F6C\u8BA9\u8D39",
              money(
                item.askingTransferFee
              )
            ],
            [
              "\u88C5\u4FEE\u72B6\u6001",
              item.renovationLevel + " \xB7 \u9884\u8BA1" + money(
                item.renovationEstimate
              )
            ]
          ];
          for (let i = 0; i < rows.length; i++) {
            const col = i % 2;
            const row = Math.floor(
              i / 2
            );
            const x = 22 + col * 180;
            const y = y0 + 46 + row * 27;
            this.text(
              ctx2,
              rows[i][0],
              x,
              y,
              6.5,
              COLORS.muted,
              "600"
            );
            this.text(
              ctx2,
              rows[i][1],
              x + 58,
              y,
              7.3,
              COLORS.text,
              "700"
            );
          }
          const peopleY = 239;
          this.roundedRect(
            ctx2,
            10,
            peopleY,
            370,
            96,
            14,
            COLORS.panel,
            COLORS.line
          );
          this.drawIcon(
            ctx2,
            "landlord",
            21,
            peopleY + 13,
            30,
            "\u4E1C"
          );
          this.text(
            ctx2,
            "\u623F\u4E1C",
            61,
            peopleY + 18,
            7,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            item.landlordName,
            61,
            peopleY + 38,
            10,
            COLORS.text,
            "700"
          );
          this.text(
            ctx2,
            "\u8BAE\u4EF7\u5EA6 " + item.landlordNegotiation + " \xB7 \u7EED\u79DF\u98CE\u9669 " + item.landlordRenewalRisk,
            61,
            peopleY + 59,
            7,
            COLORS.muted,
            "600"
          );
          this.drawIcon(
            ctx2,
            "broker",
            207,
            peopleY + 13,
            30,
            "\u4E2D"
          );
          this.text(
            ctx2,
            "\u4E2D\u4ECB",
            247,
            peopleY + 18,
            7,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            item.brokerName,
            247,
            peopleY + 38,
            10,
            COLORS.text,
            "700"
          );
          this.text(
            ctx2,
            item.brokerAgency,
            247,
            peopleY + 59,
            6.5,
            COLORS.muted,
            "600"
          );
          const riskY = 346;
          this.roundedRect(
            ctx2,
            10,
            riskY,
            370,
            111,
            14,
            COLORS.panel,
            item.riskLevel > 1 ? "#D8A79D" : COLORS.line
          );
          this.drawIcon(
            ctx2,
            "warning",
            20,
            riskY + 12,
            29,
            "\u9669"
          );
          this.text(
            ctx2,
            "\u98CE\u9669\u4E0E\u5386\u53F2",
            59,
            riskY + 20,
            10,
            COLORS.text,
            "700"
          );
          this.text(
            ctx2,
            "\u524D\u4E1A\u6001\uFF1A" + item.previousBusiness + " \xB7 \u7A7A\u7F6E" + item.vacantMonths + "\u4E2A\u6708 \xB7 " + item.vacancyReason,
            22,
            riskY + 49,
            7,
            COLORS.muted,
            "600"
          );
          const risks = Array.isArray(
            item.risks
          ) ? item.risks : [];
          this.text(
            ctx2,
            risks.length ? risks.map(
              (risk) => risk.name
            ).join(
              " / "
            ) : "\u672A\u53D1\u73B0\u660E\u786E\u786C\u4F24",
            22,
            riskY + 72,
            7.2,
            item.riskLevel > 1 ? COLORS.red : COLORS.green,
            "700"
          );
          this.text(
            ctx2,
            "\u9884\u8BA1\u6574\u6539 " + money(
              item.riskRepairCost
            ) + " \xB7 \u98CE\u9669\u7B49\u7EA7 " + item.riskLevel,
            22,
            riskY + 94,
            7,
            COLORS.muted,
            "600"
          );
          const competitionY = 468;
          this.roundedRect(
            ctx2,
            10,
            competitionY,
            370,
            112,
            14,
            COLORS.panel,
            COLORS.line
          );
          this.drawIcon(
            ctx2,
            "competitor",
            20,
            competitionY + 12,
            29,
            "\u7ADE"
          );
          this.text(
            ctx2,
            "\u5F53\u524D\u627E\u94FA\u7ADE\u4E89",
            59,
            competitionY + 20,
            10,
            COLORS.text,
            "700"
          );
          this.text(
            ctx2,
            "\u5173\u6CE8 " + item.watchers + " \xB7 \u6B63\u5F0F\u7ADE\u4E89\u8005 " + item.competitorCount,
            356,
            competitionY + 20,
            7,
            COLORS.orange,
            "700",
            "right"
          );
          const tenants = Array.isArray(
            item.competingTenants
          ) ? item.competingTenants : [];
          for (let i = 0; i < Math.min(
            tenants.length,
            3
          ); i++) {
            const tenant = tenants[i];
            this.text(
              ctx2,
              "\u2022 " + tenant.name + "\uFF5C" + tenant.archetypeName + "\uFF5C\u9884\u7B97 " + money(
                tenant.budget
              ),
              23,
              competitionY + 48 + i * 19,
              6.8,
              COLORS.text,
              "600"
            );
          }
          if (tenants.length === 0) {
            this.text(
              ctx2,
              "\u5F53\u524D\u6CA1\u6709\u660E\u786E\u7ADE\u4E89\u8005\uFF0C\u4F46\u5E02\u573A\u4ECD\u53EF\u80FD\u968F\u65F6\u95F4\u65B0\u589ENPC",
              23,
              competitionY + 57,
              7,
              COLORS.muted,
              "600"
            );
          }
          this.text(
            ctx2,
            "\u9002\u5408\uFF1A" + (item.suitableFor.length ? item.suitableFor.join(
              " / "
            ) : "\u9700\u81EA\u884C\u8BC4\u4F30"),
            22,
            competitionY + 94,
            7,
            COLORS.green,
            "700"
          );
        }
        renderDetail(ctx2) {
          const item = this.getSelectedListing();
          if (!item) {
            this.mode = "browse";
            this.refreshData();
            this.renderBrowse(
              ctx2
            );
            return;
          }
          this.drawHeader(
            ctx2,
            "\u623F\u6E90\u8BE6\u60C5",
            item.address + " \xB7 \u5B9E\u65F6\u6302\u724C\u6570\u636E",
            "detail:back"
          );
          if (this.detailPage === 0) {
            this.renderDetailPageOne(
              ctx2,
              item
            );
          } else {
            this.renderDetailPageTwo(
              ctx2,
              item
            );
          }
          const actionY = this.contentBottom - 48;
          this.roundedRect(
            ctx2,
            10,
            actionY,
            86,
            38,
            11,
            "#E9E2D8",
            "#D3C6B7"
          );
          this.text(
            ctx2,
            this.detailPage === 0 ? "\u79DF\u7EA6/\u98CE\u9669 \u203A" : "\u2039 \u94FA\u9762\u6761\u4EF6",
            53,
            actionY + 19,
            7.5,
            COLORS.navy,
            "700",
            "center"
          );
          this.addButton(
            "detail:page",
            10,
            actionY,
            86,
            38
          );
          this.roundedRect(
            ctx2,
            105,
            actionY,
            126,
            38,
            11,
            COLORS.navy,
            "#244A60"
          );
          this.text(
            ctx2,
            "\u8054\u7CFB\u4E2D\u4ECB",
            168,
            actionY + 19,
            8,
            COLORS.white,
            "700",
            "center"
          );
          this.addButton(
            "detail:broker",
            105,
            actionY,
            126,
            38
          );
          this.roundedRect(
            ctx2,
            240,
            actionY,
            140,
            38,
            11,
            COLORS.gold,
            "#D49434"
          );
          const visit = propertyVisitSystem.getVisit(
            item.marketKey
          );
          this.text(
            ctx2,
            visit ? "\u67E5\u770B\u52D8\u5BDF\u62A5\u544A" : "\u9884\u7EA6\u5B9E\u5730\u770B\u94FA",
            310,
            actionY + 19,
            8,
            "#26343B",
            "700",
            "center"
          );
          this.addButton(
            "detail:visit",
            240,
            actionY,
            140,
            38
          );
        }
        drawVisitOption(ctx2, modeId, y) {
          const quote = propertyVisitSystem.getDynamicVisitQuote(
            this.selectedListingKey,
            modeId
          );
          if (!quote) {
            return;
          }
          const selected = this.visitModeId === modeId;
          this.roundedRect(
            ctx2,
            12,
            y,
            366,
            78,
            13,
            selected ? "#FFF0D6" : COLORS.panel,
            selected ? "#E2AE52" : COLORS.line,
            selected ? 1.5 : 1
          );
          this.text(
            ctx2,
            quote.name,
            24,
            y + 20,
            11,
            COLORS.text,
            "700"
          );
          this.text(
            ctx2,
            quote.description,
            24,
            y + 41,
            6.8,
            COLORS.muted,
            "500"
          );
          this.text(
            ctx2,
            "\u9884\u8BA1 " + quote.hours + "\u5C0F\u65F6 \xB7 " + money(
              quote.cost
            ) + " \xB7 \u6838\u9A8C\u7387 " + Math.round(
              quote.accuracy * 100
            ) + "%",
            24,
            y + 61,
            7.2,
            selected ? COLORS.orange : COLORS.navy,
            "700"
          );
          this.text(
            ctx2,
            selected ? "\u5DF2\u9009\u62E9" : "\u9009\u62E9 \u203A",
            363,
            y + 20,
            7.5,
            selected ? COLORS.orange : COLORS.navy,
            "700",
            "right"
          );
          this.addButton(
            "visit:mode:" + modeId,
            12,
            y,
            366,
            78
          );
        }
        renderVisitReport(ctx2, visit) {
          this.roundedRect(
            ctx2,
            12,
            78,
            366,
            83,
            13,
            COLORS.panel,
            COLORS.line
          );
          this.text(
            ctx2,
            visit.modeName + " \xB7 \u5DF2\u5B8C\u6210",
            24,
            99,
            12,
            COLORS.text,
            "700"
          );
          this.text(
            ctx2,
            "\u8017\u65F6 " + visit.hours + "\u5C0F\u65F6 \xB7 \u6210\u672C " + money(
              visit.cost
            ) + " \xB7 \u4E2D\u4ECB\u53EF\u9760\u5EA6 " + visit.brokerReliability,
            24,
            122,
            7.2,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            "\u53D1\u73B0 " + visit.negativeCount + " \u9879\u9700\u5173\u6CE8 \xB7 " + visit.contradictedCount + " \u9879\u4E0E\u4E2D\u4ECB\u53E3\u5F84\u4E0D\u4E00\u81F4 \xB7 \u6574\u6539\u7EA6 " + money(
              visit.repairEstimate
            ),
            24,
            145,
            7.2,
            visit.negativeCount > 0 ? COLORS.orange : COLORS.green,
            "700"
          );
          const items = Array.isArray(
            visit.items
          ) ? visit.items : [];
          const top = 174;
          const rowH = 39;
          for (let i = 0; i < Math.min(
            items.length,
            9
          ); i++) {
            const item = items[i];
            const y = top + i * rowH;
            const bad = !item.resultPositive;
            this.roundedRect(
              ctx2,
              12,
              y,
              366,
              33,
              9,
              bad ? "#F7E9E5" : "#EAF3EC",
              bad ? "#DCB6AD" : "#B3CFBA"
            );
            this.text(
              ctx2,
              item.label,
              23,
              y + 10,
              7,
              COLORS.muted,
              "600"
            );
            this.text(
              ctx2,
              item.text,
              23,
              y + 23,
              7.5,
              bad ? COLORS.red : COLORS.green,
              "700"
            );
            this.text(
              ctx2,
              item.contradicted ? "\u53E3\u5F84\u4E0D\u7B26" : item.verified ? "\u5DF2\u6838\u9A8C" : "\u4F4E\u7F6E\u4FE1",
              365,
              y + 17,
              6.5,
              item.contradicted ? COLORS.red : COLORS.muted,
              "700",
              "right"
            );
          }
          const actionY = this.contentBottom - 48;
          this.roundedRect(
            ctx2,
            12,
            actionY,
            110,
            38,
            11,
            "#E9E2D8",
            "#D3C6B7"
          );
          this.text(
            ctx2,
            "\u8FD4\u56DE\u623F\u6E90",
            67,
            actionY + 19,
            8,
            COLORS.navy,
            "700",
            "center"
          );
          this.addButton(
            "visit:back",
            12,
            actionY,
            110,
            38
          );
          this.roundedRect(
            ctx2,
            132,
            actionY,
            246,
            38,
            11,
            COLORS.gold,
            "#D49434"
          );
          this.text(
            ctx2,
            "\u5E26\u7740\u62A5\u544A\u8FDB\u5165\u8C08\u5224",
            255,
            actionY + 19,
            9,
            "#26343B",
            "700",
            "center"
          );
          this.addButton(
            "visit:negotiate",
            132,
            actionY,
            246,
            38
          );
        }
        renderVisit(ctx2) {
          const item = this.getSelectedListing();
          const visit = propertyVisitSystem.getVisit(
            this.selectedListingKey
          );
          if (!item && !visit) {
            this.mode = "browse";
            this.selectedListingKey = null;
            this.refreshData();
            this.renderBrowse(
              ctx2
            );
            return;
          }
          this.drawHeader(
            ctx2,
            visit ? "\u52D8\u5BDF\u62A5\u544A" : "\u9884\u7EA6\u5B9E\u5730\u770B\u94FA",
            visit ? visit.address + " \xB7 \u5DF2\u6838\u9A8C\u4FE1\u606F\u4F18\u5148\u4E8E\u4E2D\u4ECB\u53E3\u5F84" : item.address + " \xB7 \u65F6\u95F4\u4F1A\u7EE7\u7EED\u63A8\u8FDB\uFF0CNPC\u4E0D\u4F1A\u7B49\u4F60",
            "visit:back"
          );
          if (visit) {
            this.renderVisitReport(
              ctx2,
              visit
            );
            return;
          }
          this.roundedRect(
            ctx2,
            12,
            78,
            366,
            55,
            12,
            "#FFF0D6",
            "#E3BD77"
          );
          this.text(
            ctx2,
            "\u770B\u94FA\u4E0D\u662F\u6682\u505C\u83DC\u5355",
            24,
            95,
            8,
            COLORS.orange,
            "700"
          );
          this.text(
            ctx2,
            "\u8017\u65F6\u8D8A\u957F\u6838\u9A8C\u8D8A\u5145\u5206\uFF0C\u4F46\u70ED\u95E8\u94FA\u53EF\u80FD\u88AB\u7ADE\u4E89\u8005\u63D0\u524D\u62FF\u4E0B\u3002",
            24,
            116,
            7,
            COLORS.text,
            "600"
          );
          this.drawVisitOption(
            ctx2,
            "quick",
            146
          );
          this.drawVisitOption(
            ctx2,
            "standard",
            233
          );
          this.drawVisitOption(
            ctx2,
            "deep",
            320
          );
          const quote = propertyVisitSystem.getDynamicVisitQuote(
            this.selectedListingKey,
            this.visitModeId
          );
          const actionY = this.contentBottom - 48;
          this.roundedRect(
            ctx2,
            12,
            actionY,
            110,
            38,
            11,
            "#E9E2D8",
            "#D3C6B7"
          );
          this.text(
            ctx2,
            "\u8FD4\u56DE\u623F\u6E90",
            67,
            actionY + 19,
            8,
            COLORS.navy,
            "700",
            "center"
          );
          this.addButton(
            "visit:back",
            12,
            actionY,
            110,
            38
          );
          this.roundedRect(
            ctx2,
            132,
            actionY,
            246,
            38,
            11,
            COLORS.gold,
            "#D49434"
          );
          this.text(
            ctx2,
            quote ? "\u5F00\u59CB " + quote.name + " \xB7 " + money(
              quote.cost
            ) : "\u5F00\u59CB\u770B\u94FA",
            255,
            actionY + 19,
            9,
            "#26343B",
            "700",
            "center"
          );
          this.addButton(
            "visit:start",
            132,
            actionY,
            246,
            38
          );
        }
        drawTermRow(ctx2, label, original, current, y) {
          this.text(
            ctx2,
            label,
            24,
            y,
            7,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            original,
            157,
            y,
            7.3,
            COLORS.muted,
            "600",
            "right"
          );
          this.text(
            ctx2,
            current,
            365,
            y,
            8.5,
            COLORS.text,
            "700",
            "right"
          );
        }
        renderNegotiation(ctx2) {
          const item = this.getSelectedListing();
          if (!item) {
            this.showToast(
              "\u623F\u6E90\u5DF2\u7ECF\u9000\u51FA\u5E02\u573A"
            );
            this.mode = "browse";
            this.selectedListingKey = null;
            this.refreshData();
            this.renderBrowse(
              ctx2
            );
            return;
          }
          const started = propertyNegotiationSystem.start(
            item.marketKey
          );
          if (!started.ok) {
            this.showToast(
              started.message
            );
            this.mode = "visit";
            this.renderVisit(
              ctx2
            );
            return;
          }
          const session = propertyNegotiationSystem.getSession(
            item.marketKey
          );
          const terms = session.currentTerms;
          const original = session.originalTerms;
          const upfront = propertyNegotiationSystem.calculateUpfront(
            item,
            terms
          );
          this.drawHeader(
            ctx2,
            "\u79DF\u7EA6\u8C08\u5224",
            item.address + " \xB7 \u7B2C" + session.round + "/" + session.maxRounds + "\u8F6E",
            "negotiation:back"
          );
          this.roundedRect(
            ctx2,
            12,
            78,
            366,
            72,
            13,
            COLORS.panel,
            COLORS.line
          );
          this.text(
            ctx2,
            "\u623F\u4E1C\u6001\u5EA6\uFF1A" + session.landlordAttitude,
            24,
            99,
            10,
            COLORS.text,
            "700"
          );
          this.text(
            ctx2,
            session.lastMessage,
            24,
            123,
            7.3,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            "\u7B7E\u7EA6\u524D\u9884\u8BA1 " + money(
              upfront.total
            ),
            365,
            99,
            10,
            COLORS.red,
            "700",
            "right"
          );
          this.text(
            ctx2,
            "\u73B0\u91D1 " + money(
              gameState.getPlayer().cash
            ),
            365,
            124,
            7,
            COLORS.muted,
            "600",
            "right"
          );
          this.roundedRect(
            ctx2,
            12,
            162,
            366,
            171,
            13,
            COLORS.panel,
            COLORS.line
          );
          this.text(
            ctx2,
            "\u6302\u724C\u6761\u4EF6",
            157,
            181,
            7,
            COLORS.muted,
            "700",
            "right"
          );
          this.text(
            ctx2,
            "\u5F53\u524D\u8C08\u5224\u6761\u4EF6",
            365,
            181,
            7,
            COLORS.navy,
            "700",
            "right"
          );
          this.drawTermRow(
            ctx2,
            "\u6708\u79DF",
            money(
              original.monthlyRent
            ),
            money(
              terms.monthlyRent
            ),
            207
          );
          this.drawTermRow(
            ctx2,
            "\u8F6C\u8BA9\u8D39",
            money(
              original.transferFee
            ),
            money(
              terms.transferFee
            ),
            234
          );
          this.drawTermRow(
            ctx2,
            "\u514D\u79DF\u671F",
            original.freeRentDays + "\u5929",
            terms.freeRentDays + "\u5929",
            261
          );
          this.drawTermRow(
            ctx2,
            "\u62BC\u4ED8",
            original.depositMonths + "\u62BC / " + original.paymentMonths + "\u4ED8",
            terms.depositMonths + "\u62BC / " + terms.paymentMonths + "\u4ED8",
            288
          );
          this.drawTermRow(
            ctx2,
            "\u79DF\u671F/\u9012\u589E",
            original.leaseYears + "\u5E74 / " + percent(
              original.annualIncrease
            ),
            terms.leaseYears + "\u5E74 / " + percent(
              terms.annualIncrease
            ),
            315
          );
          this.text(
            ctx2,
            "\u8C08\u5224\u65B9\u5411",
            18,
            354,
            8,
            COLORS.muted,
            "700"
          );
          const focuses = [
            [
              "rent",
              "\u538B\u6708\u79DF",
              "\u957F\u671F\u56FA\u5B9A\u6210\u672C"
            ],
            [
              "transfer",
              "\u538B\u8F6C\u8BA9\u8D39",
              "\u964D\u4F4E\u524D\u671F\u73B0\u91D1"
            ],
            [
              "freeRent",
              "\u4E89\u514D\u79DF\u671F",
              "\u7F13\u51B2\u88C5\u4FEE\u5F00\u4E1A"
            ],
            [
              "balanced",
              "\u7EFC\u5408\u8C08\u5224",
              "\u591A\u9879\u5C0F\u5E45\u4E89\u53D6"
            ]
          ];
          for (let i = 0; i < focuses.length; i++) {
            const col = i % 2;
            const row = Math.floor(
              i / 2
            );
            const x = 12 + col * 184;
            const y = 371 + row * 72;
            this.roundedRect(
              ctx2,
              x,
              y,
              174,
              62,
              11,
              COLORS.panel,
              "#D7CABC"
            );
            this.text(
              ctx2,
              focuses[i][1],
              x + 12,
              y + 20,
              9,
              COLORS.text,
              "700"
            );
            this.text(
              ctx2,
              focuses[i][2],
              x + 12,
              y + 42,
              6.7,
              COLORS.muted,
              "600"
            );
            this.text(
              ctx2,
              "\u8C08 \u203A",
              x + 160,
              y + 20,
              7.5,
              COLORS.orange,
              "700",
              "right"
            );
            this.addButton(
              "negotiate:" + focuses[i][0],
              x,
              y,
              174,
              62
            );
          }
          const infoY = 526;
          this.roundedRect(
            ctx2,
            12,
            infoY,
            366,
            49,
            11,
            "#EEF2F1",
            "#CCD8D5"
          );
          this.text(
            ctx2,
            "\u8C08\u5224\u4F1A\u6D88\u8017\u6E38\u620F\u65F6\u95F4\uFF1B\u7ADE\u4E89\u8005\u3001\u6302\u724C\u70ED\u5EA6\u548C\u623F\u4E1C\u6027\u683C\u4F1A\u5F71\u54CD\u7ED3\u679C\u3002",
            24,
            infoY + 17,
            7,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            "\u6700\u591A " + session.maxRounds + " \u8F6E\uFF0C\u4EFB\u4F55\u65F6\u5019\u90FD\u53EF\u4EE5\u6309\u5F53\u524D\u6761\u4EF6\u7B7E\u7EA6\u3002",
            24,
            infoY + 34,
            7,
            COLORS.navy,
            "700"
          );
          const actionY = this.contentBottom - 48;
          this.roundedRect(
            ctx2,
            12,
            actionY,
            110,
            38,
            11,
            "#E9E2D8",
            "#D3C6B7"
          );
          this.text(
            ctx2,
            "\u8FD4\u56DE\u62A5\u544A",
            67,
            actionY + 19,
            8,
            COLORS.navy,
            "700",
            "center"
          );
          this.addButton(
            "negotiation:back",
            12,
            actionY,
            110,
            38
          );
          const enough = gameState.getPlayer().cash >= upfront.total;
          this.roundedRect(
            ctx2,
            132,
            actionY,
            246,
            38,
            11,
            enough ? COLORS.gold : "#D9D1C5",
            enough ? "#D49434" : "#C4BAAD"
          );
          this.text(
            ctx2,
            enough ? "\u6309\u5F53\u524D\u6761\u4EF6\u7B7E\u7EA6 \xB7 " + money(
              upfront.total
            ) : "\u8D44\u91D1\u4E0D\u8DB3 \xB7 \u9700" + money(
              upfront.total
            ),
            255,
            actionY + 19,
            8.5,
            enough ? "#26343B" : COLORS.muted,
            "700",
            "center"
          );
          this.addButton(
            "negotiation:sign",
            132,
            actionY,
            246,
            38
          );
        }
        render(ctx2) {
          if (!ctx2) {
            return;
          }
          this.getLayout();
          this.clearButtons();
          ctx2.save();
          ctx2.fillStyle = COLORS.paper;
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            this.viewH
          );
          if (this.mode === "filter") {
            this.renderFilters(
              ctx2
            );
          } else if (this.mode === "detail") {
            this.renderDetail(
              ctx2
            );
          } else if (this.mode === "visit") {
            this.renderVisit(
              ctx2
            );
          } else if (this.mode === "negotiation") {
            this.renderNegotiation(
              ctx2
            );
          } else if (this.mode === "events") {
            this.renderEvents(
              ctx2
            );
          } else {
            this.renderBrowse(
              ctx2
            );
          }
          ctx2.restore();
        }
        cycle(key, max) {
          this.filters[key] = (this.filters[key] + 1) % max;
          this.page = 0;
          this.refreshData();
        }
        resetFilters() {
          this.filters = {
            areaIndex: 0,
            rentIndex: 0,
            upfrontIndex: 0,
            floorIndex: 0,
            propertyTypeIndex: 0,
            layoutIndex: 0,
            requireExhaust: false,
            requireGas: false,
            requireThreePhase: false,
            riskIndex: 0
          };
          this.page = 0;
          this.refreshData();
        }
        handleTap(x, y, target) {
          const local = this.hitButton(
            x,
            y
          );
          if (!local) {
            return false;
          }
          const id = local.id;
          if (id === "market:back") {
            sceneManager.switchTo(
              "district",
              {
                districtId: this.districtId
              }
            );
            return true;
          }
          if (id.indexOf(
            "district:"
          ) === 0) {
            this.districtId = id.split(
              ":"
            )[1];
            this.streetId = null;
            this.page = 0;
            citySystem.setCurrentDistrict(
              this.districtId
            );
            this.refreshData();
            return true;
          }
          if (id.indexOf(
            "street:"
          ) === 0) {
            const value = id.split(
              ":"
            )[1];
            this.streetId = value === "all" ? null : value;
            this.page = 0;
            this.refreshData();
            return true;
          }
          if (id === "filter") {
            this.mode = "filter";
            return true;
          }
          if (id === "sort") {
            this.sortIndex = (this.sortIndex + 1) % SORT_MODES.length;
            this.page = 0;
            this.refreshData();
            return true;
          }
          if (id === "events") {
            this.mode = "events";
            return true;
          }
          if (id === "events:back") {
            this.mode = "browse";
            return true;
          }
          if (id === "page:prev") {
            this.page = Math.max(
              0,
              this.page - 1
            );
            return true;
          }
          if (id === "page:next") {
            const maxPage = Math.max(
              0,
              Math.ceil(
                this.cachedListings.length / this.pageSize
              ) - 1
            );
            this.page = Math.min(
              maxPage,
              this.page + 1
            );
            return true;
          }
          if (id.indexOf(
            "listing:"
          ) === 0) {
            this.selectedListingKey = id.slice(
              "listing:".length
            );
            this.detailPage = 0;
            this.mode = "detail";
            return true;
          }
          if (id === "detail:back") {
            this.mode = "browse";
            this.selectedListingKey = null;
            this.refreshData();
            return true;
          }
          if (id === "detail:page") {
            this.detailPage = this.detailPage === 0 ? 1 : 0;
            return true;
          }
          if (id === "detail:broker") {
            const item = this.getSelectedListing();
            if (item) {
              const visit = propertyVisitSystem.getVisit(
                item.marketKey
              );
              this.showToast(
                visit ? item.brokerName + "\uFF1A\u53EF\u5E26\u52D8\u5BDF\u62A5\u544A\u7EE7\u7EED\u8C08\u6761\u4EF6" : item.brokerName + "\uFF1A\u5EFA\u8BAE\u5148\u7EA6\u65F6\u95F4\u5B9E\u5730\u6838\u9A8C"
              );
            }
            return true;
          }
          if (id === "detail:visit") {
            const item = this.getSelectedListing();
            if (item) {
              this.mode = "visit";
              this.lastVisitResult = null;
            }
            return true;
          }
          if (id === "visit:back") {
            this.mode = "detail";
            this.refreshData();
            return true;
          }
          if (id.indexOf(
            "visit:mode:"
          ) === 0) {
            this.visitModeId = id.slice(
              "visit:mode:".length
            );
            return true;
          }
          if (id === "visit:start") {
            const result = propertyVisitSystem.inspect(
              this.selectedListingKey,
              this.visitModeId
            );
            this.lastVisitResult = result;
            if (!result.ok) {
              this.showToast(
                result.message
              );
              if (result.code === "lost_to_competitor" || result.code === "lost_during_visit" || result.code === "listing_unavailable") {
                this.mode = "browse";
                this.selectedListingKey = null;
                this.syncMarket(
                  true
                );
                this.refreshData();
              }
            }
            return true;
          }
          if (id === "visit:negotiate") {
            const started = propertyNegotiationSystem.start(
              this.selectedListingKey
            );
            if (!started.ok) {
              this.showToast(
                started.message
              );
              return true;
            }
            this.mode = "negotiation";
            return true;
          }
          if (id === "negotiation:back") {
            this.mode = "visit";
            return true;
          }
          if (id.indexOf(
            "negotiate:"
          ) === 0) {
            const focus = id.slice(
              "negotiate:".length
            );
            const result = propertyNegotiationSystem.negotiate(
              this.selectedListingKey,
              focus
            );
            this.lastNegotiationResult = result;
            if (!result.ok) {
              this.showToast(
                result.message
              );
              if (result.code === "lost_to_competitor" || result.code === "lost_during_negotiation" || result.code === "listing_unavailable") {
                this.mode = "browse";
                this.selectedListingKey = null;
                this.syncMarket(
                  true
                );
                this.refreshData();
              }
            } else {
              this.showToast(
                result.session.lastMessage
              );
            }
            return true;
          }
          if (id === "negotiation:sign") {
            const result = propertyNegotiationSystem.signLease(
              this.selectedListingKey
            );
            if (!result.ok) {
              this.showToast(
                result.message
              );
              return true;
            }
            this.showToast(
              result.message
            );
            this.selectedListingKey = null;
            this.syncMarket(
              true
            );
            this.refreshData();
            sceneManager.switchTo(
              "shop",
              {
                shopId: result.shop.id
              }
            );
            return true;
          }
          if (id === "filter:back" || id === "filter:apply") {
            this.mode = "browse";
            this.page = 0;
            this.refreshData();
            return true;
          }
          if (id === "filter:reset") {
            this.resetFilters();
            return true;
          }
          if (id === "filter:area") {
            this.cycle(
              "areaIndex",
              AREA_PRESETS.length
            );
            return true;
          }
          if (id === "filter:rent") {
            this.cycle(
              "rentIndex",
              RENT_PRESETS.length
            );
            return true;
          }
          if (id === "filter:upfront") {
            this.cycle(
              "upfrontIndex",
              UPFRONT_PRESETS.length
            );
            return true;
          }
          if (id === "filter:floor") {
            this.cycle(
              "floorIndex",
              FLOOR_OPTIONS.length
            );
            return true;
          }
          if (id === "filter:type") {
            this.cycle(
              "propertyTypeIndex",
              PROPERTY_TYPE_OPTIONS.length
            );
            return true;
          }
          if (id === "filter:layout") {
            this.cycle(
              "layoutIndex",
              LAYOUT_OPTIONS.length
            );
            return true;
          }
          if (id === "filter:risk") {
            this.cycle(
              "riskIndex",
              RISK_OPTIONS.length
            );
            return true;
          }
          if (id === "filter:exhaust") {
            this.filters.requireExhaust = !this.filters.requireExhaust;
            this.page = 0;
            this.refreshData();
            return true;
          }
          if (id === "filter:gas") {
            this.filters.requireGas = !this.filters.requireGas;
            this.page = 0;
            this.refreshData();
            return true;
          }
          if (id === "filter:power") {
            this.filters.requireThreePhase = !this.filters.requireThreePhase;
            this.page = 0;
            this.refreshData();
            return true;
          }
          return false;
        }
      };
      module.exports = new ShopScene();
    }
  });

  // src/finance/openingFinanceSystem.js
  var require_openingFinanceSystem = __commonJS({
    "src/finance/openingFinanceSystem.js"(exports, module) {
      "use strict";
      var gameState = require_gameState();
      var renovationSystem = require_renovationSystem();
      var openingPrepSystem = require_openingPrepSystem();
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(
            max,
            value
          )
        );
      }
      function hashFloat(text) {
        let h = 2166136261;
        const source = String(text);
        for (let i = 0; i < source.length; i++) {
          h ^= source.charCodeAt(i);
          h = Math.imul(
            h,
            16777619
          );
        }
        return (h >>> 0) % 1e5 / 1e5;
      }
      var OpeningFinanceSystem = class {
        getShop(shopId) {
          return gameState.getBusiness().shops.find(
            (item) => item.id === shopId
          ) || null;
        }
        getLoanStore() {
          return gameState.getFinance().openingLoans;
        }
        getExistingLoan(shopId) {
          return this.getLoanStore()[shopId] || null;
        }
        getCreditLimit(shopId) {
          const shop = this.getShop(
            shopId
          );
          if (!shop) {
            return 0;
          }
          const area = Math.max(
            20,
            Number(
              shop.usableArea || shop.grossArea || 60
            )
          );
          const rent = Math.max(
            0,
            Number(
              shop.monthlyRent
            ) || 0
          );
          return Math.round(
            clamp(
              area * 900 + rent * 3,
              3e4,
              16e4
            )
          );
        }
        estimateOpeningNeed(shopId) {
          const shop = this.getShop(
            shopId
          );
          if (!shop) {
            return null;
          }
          const renovation = renovationSystem.getMetrics(
            shopId
          );
          const equipment = openingPrepSystem.getEquipmentQuote(
            shopId
          );
          const renovationCost = renovation ? renovation.totalCost : Math.round(
            (Number(
              shop.usableArea
            ) || 60) * 520
          );
          const equipmentCost = equipment ? equipment.total : 18e3;
          const reserve = Math.max(
            5e3,
            Math.round(
              (Number(
                shop.monthlyRent
              ) || 0) * 0.75
            )
          );
          const totalNeed = renovationCost + equipmentCost + reserve;
          const cash = gameState.getPlayer().cash;
          const gap = Math.max(
            0,
            totalNeed - cash
          );
          return {
            renovationCost,
            equipmentCost,
            reserve,
            totalNeed,
            cash,
            gap
          };
        }
        getOffer(shopId) {
          const shop = this.getShop(
            shopId
          );
          if (!shop) {
            return null;
          }
          const existing = this.getExistingLoan(
            shopId
          );
          if (existing) {
            return {
              existing: true,
              loan: existing
            };
          }
          const need = this.estimateOpeningNeed(
            shopId
          );
          const creditLimit = this.getCreditLimit(
            shopId
          );
          const seed = gameState.getSimulation().seed || 1;
          const rate = Number(
            (0.085 + hashFloat(
              shopId + ":credit:" + seed
            ) * 0.035).toFixed(
              3
            )
          );
          const suggested = Math.min(
            creditLimit,
            Math.max(
              0,
              need.gap + 5e3
            )
          );
          const principal = suggested > 0 ? Math.max(
            1e4,
            Math.ceil(
              suggested / 5e3
            ) * 5e3
          ) : 0;
          const termMonths = principal > 8e4 ? 24 : 18;
          const totalInterest = Math.round(
            principal * rate * (termMonths / 12)
          );
          const monthlyPayment = principal > 0 ? Math.ceil(
            (principal + totalInterest) / termMonths
          ) : 0;
          return {
            existing: false,
            shopId,
            creditLimit,
            principal: Math.min(
              principal,
              creditLimit
            ),
            rate,
            termMonths,
            totalInterest,
            monthlyPayment,
            need,
            available: principal > 0
          };
        }
        acceptOffer(shopId) {
          const existing = this.getExistingLoan(
            shopId
          );
          if (existing) {
            return {
              ok: false,
              message: "\u8BE5\u95E8\u5E97\u5DF2\u6709\u5F00\u5E97\u5468\u8F6C\u91D1"
            };
          }
          const offer = this.getOffer(
            shopId
          );
          if (!offer || !offer.available || offer.principal <= 0) {
            return {
              ok: false,
              message: "\u5F53\u524D\u8D44\u91D1\u5145\u8DB3\uFF0C\u65E0\u9700\u7533\u8BF7\u5468\u8F6C\u91D1"
            };
          }
          const loan = {
            shopId,
            principal: offer.principal,
            outstanding: offer.principal + offer.totalInterest,
            annualRate: offer.rate,
            termMonths: offer.termMonths,
            monthlyPayment: offer.monthlyPayment,
            status: "grace_before_opening",
            paidMonths: 0
          };
          this.getLoanStore()[shopId] = loan;
          gameState.addCash(
            offer.principal
          );
          return {
            ok: true,
            loan: JSON.parse(
              JSON.stringify(
                loan
              )
            )
          };
        }
        getRecoveryStatus(shopId) {
          const need = this.estimateOpeningNeed(
            shopId
          );
          const offer = this.getOffer(
            shopId
          );
          if (!need) {
            return null;
          }
          const canRecover = need.gap <= 0 || !!(offer && (offer.existing || offer.principal >= need.gap));
          return {
            ...need,
            canRecover,
            offer
          };
        }
      };
      module.exports = new OpeningFinanceSystem();
    }
  });

  // src/ui/customizationSystem.js
  var require_customizationSystem = __commonJS({
    "src/ui/customizationSystem.js"(exports, module) {
      "use strict";
      var gameState = require_gameState();
      var renovationSystem = require_renovationSystem();
      var renovationConfig = require_renovationConfig();
      function clone(value) {
        return JSON.parse(
          JSON.stringify(value)
        );
      }
      function cleanName(value, fallback, maxLength) {
        const text = String(
          value == null ? "" : value
        ).replace(
          /\s+/g,
          " "
        ).trim();
        const finalText = text || String(
          fallback || ""
        ).trim();
        return finalText.slice(
          0,
          Math.max(
            1,
            Number(
              maxLength
            ) || 12
          )
        );
      }
      var CustomizationSystem = class {
        getShop(shopId) {
          return renovationSystem.getShop(
            shopId
          );
        }
        renameShop(shopId, name) {
          const shop = this.getShop(
            shopId
          );
          if (!shop) {
            return {
              ok: false,
              message: "\u95E8\u5E97\u4E0D\u5B58\u5728"
            };
          }
          const next = cleanName(
            name,
            shop.name || shop.address || "\u6211\u7684\u9152\u697C",
            renovationConfig.nameRules.shopMaxLength
          );
          shop.name = next;
          return {
            ok: true,
            name: next
          };
        }
        renameRoom(shopId, roomId, name) {
          const plan = renovationSystem.ensurePlan(
            shopId
          );
          if (!plan) {
            return {
              ok: false,
              message: "\u88C5\u4FEE\u65B9\u6848\u4E0D\u5B58\u5728"
            };
          }
          const store = gameState.getRenovations();
          const livePlan = store[shopId];
          let room = null;
          for (let i = 0; i < livePlan.floors.length; i++) {
            room = livePlan.floors[i].privateRooms.find(
              (item) => item.id === roomId
            );
            if (room) {
              break;
            }
          }
          if (!room) {
            return {
              ok: false,
              message: "\u5305\u53A2\u4E0D\u5B58\u5728"
            };
          }
          room.name = cleanName(
            name,
            room.name || "\u5305\u53A2",
            renovationConfig.nameRules.roomMaxLength
          );
          return {
            ok: true,
            name: room.name
          };
        }
        getTemplateList() {
          return clone(
            gameState.getRenovationTemplates()
          );
        }
        buildTemplate(shopId, name) {
          const metrics = renovationSystem.getMetrics(
            shopId
          );
          if (!metrics) {
            return null;
          }
          const plan = metrics.plan;
          return {
            id: "tpl_" + Date.now().toString(
              36
            ),
            name: cleanName(
              name,
              renovationConfig.templateRules.defaultNamePrefix,
              renovationConfig.nameRules.templateMaxLength
            ),
            sourceShopId: shopId,
            sourceArea: metrics.totalArea,
            sourceFloorCount: plan.floors.length,
            hallStyle: plan.hallStyle,
            materialGrade: plan.materialGrade,
            lightingLevel: plan.lightingLevel,
            floors: plan.floors.map(
              (floor) => {
                const area = Math.max(
                  1,
                  Number(
                    floor.area
                  ) || 1
                );
                const tableDensity = {};
                Object.keys(
                  floor.tables
                ).forEach(
                  (key) => {
                    tableDensity[key] = (floor.tables[key] || 0) / area;
                  }
                );
                return {
                  kitchenRatio: floor.kitchenRatio,
                  storageRatio: floor.storageRatio,
                  serviceRatio: floor.serviceRatio,
                  aisleMode: floor.aisleMode,
                  tableDensity,
                  privateRooms: floor.privateRooms.map(
                    (room) => ({
                      name: room.name || "",
                      seats: room.seats,
                      style: room.style
                    })
                  )
                };
              }
            )
          };
        }
        saveTemplate(shopId, name) {
          const list = gameState.getRenovationTemplates();
          if (list.length >= renovationConfig.templateRules.maxTemplates) {
            return {
              ok: false,
              message: "\u88C5\u4FEE\u6A21\u677F\u6570\u91CF\u5DF2\u8FBE\u5230\u4E0A\u9650"
            };
          }
          const template = this.buildTemplate(
            shopId,
            name
          );
          if (!template) {
            return {
              ok: false,
              message: "\u5F53\u524D\u6CA1\u6709\u53EF\u4FDD\u5B58\u7684\u88C5\u4FEE\u65B9\u6848"
            };
          }
          list.unshift(
            template
          );
          return {
            ok: true,
            template: clone(
              template
            )
          };
        }
        renameTemplate(templateId, name) {
          const list = gameState.getRenovationTemplates();
          const item = list.find(
            (template) => template.id === templateId
          );
          if (!item) {
            return {
              ok: false,
              message: "\u6A21\u677F\u4E0D\u5B58\u5728"
            };
          }
          item.name = cleanName(
            name,
            item.name,
            renovationConfig.nameRules.templateMaxLength
          );
          return {
            ok: true,
            name: item.name
          };
        }
        deleteTemplate(templateId) {
          const list = gameState.getRenovationTemplates();
          const index = list.findIndex(
            (item) => item.id === templateId
          );
          if (index < 0) {
            return {
              ok: false,
              message: "\u6A21\u677F\u4E0D\u5B58\u5728"
            };
          }
          list.splice(
            index,
            1
          );
          return {
            ok: true
          };
        }
        applyTemplate(shopId, templateId) {
          const templates = gameState.getRenovationTemplates();
          const template = templates.find(
            (item) => item.id === templateId
          );
          if (!template) {
            return {
              ok: false,
              message: "\u6A21\u677F\u4E0D\u5B58\u5728"
            };
          }
          renovationSystem.ensurePlan(
            shopId
          );
          const plan = gameState.getRenovations()[shopId];
          if (!plan) {
            return {
              ok: false,
              message: "\u5F53\u524D\u95E8\u5E97\u6CA1\u6709\u88C5\u4FEE\u65B9\u6848"
            };
          }
          if (plan.status !== "draft") {
            return {
              ok: false,
              message: "\u65BD\u5DE5\u5F00\u59CB\u540E\u4E0D\u80FD\u5957\u7528\u6A21\u677F"
            };
          }
          plan.hallStyle = template.hallStyle;
          plan.materialGrade = template.materialGrade;
          plan.lightingLevel = template.lightingLevel;
          for (let i = 0; i < plan.floors.length; i++) {
            const source = template.floors[Math.min(
              i,
              template.floors.length - 1
            )];
            const target = plan.floors[i];
            if (!source) {
              continue;
            }
            target.kitchenRatio = source.kitchenRatio;
            target.storageRatio = source.storageRatio;
            target.serviceRatio = source.serviceRatio;
            target.aisleMode = source.aisleMode;
            const area = Math.max(
              1,
              Number(
                target.area
              ) || 1
            );
            Object.keys(
              target.tables
            ).forEach(
              (key) => {
                const density = Number(
                  source.tableDensity[key]
                ) || 0;
                target.tables[key] = Math.max(
                  0,
                  Math.round(
                    density * area
                  )
                );
              }
            );
            const sourceRooms = Array.isArray(
              source.privateRooms
            ) ? source.privateRooms : [];
            const scale = area / Math.max(
              1,
              template.sourceArea / Math.max(
                1,
                template.sourceFloorCount
              )
            );
            const roomCount = Math.max(
              0,
              Math.min(
                8,
                Math.round(
                  sourceRooms.length * Math.min(
                    1.5,
                    Math.max(
                      0.55,
                      scale
                    )
                  )
                )
              )
            );
            target.privateRooms = [];
            for (let r = 0; r < roomCount; r++) {
              const sourceRoom = sourceRooms[Math.min(
                r,
                sourceRooms.length - 1
              )];
              if (!sourceRoom) {
                break;
              }
              target.privateRooms.push({
                id: "room_" + Date.now().toString(
                  36
                ) + "_" + i + "_" + r,
                name: cleanName(
                  sourceRoom.name,
                  "\u5305\u53A2" + (r + 1),
                  renovationConfig.nameRules.roomMaxLength
                ),
                seats: sourceRoom.seats,
                style: sourceRoom.style
              });
            }
          }
          plan.selectedContractorId = null;
          return {
            ok: true,
            template: clone(
              template
            ),
            metrics: renovationSystem.getMetrics(
              shopId
            )
          };
        }
      };
      module.exports = new CustomizationSystem();
    }
  });

  // src/ui/visualAssetSystem.js
  var require_visualAssetSystem = __commonJS({
    "src/ui/visualAssetSystem.js"(exports, module) {
      "use strict";
      var runtime = globalThis.GameRuntime || {};
      var resourceManager = require_resourceManager();
      var GROUPS = {
        store: [
          {
            key: "visual_storefront_hero",
            path: "assets/images/runtime/store/storefront_hero.webp"
          }
        ],
        district: [
          {
            key: "visual_district_banner",
            path: "assets/images/runtime/district/district_banner.webp"
          }
        ],
        renovation: [
          { key: "visual_table_2", path: "assets/images/split/renovation/table_2.png" },
          { key: "visual_table_4", path: "assets/images/split/renovation/table_4.png" },
          { key: "visual_table_6", path: "assets/images/split/renovation/table_6.png" },
          { key: "visual_table_8", path: "assets/images/split/renovation/table_8.png" },
          { key: "visual_register", path: "assets/images/split/renovation/cashier_counter.png" },
          { key: "visual_stove", path: "assets/images/split/renovation/stove.png" },
          { key: "visual_fridge", path: "assets/images/split/renovation/fridge.png" },
          { key: "visual_plant", path: "assets/images/split/renovation/plant_1.png" },
          { key: "visual_light", path: "assets/images/split/renovation/light_1.png" },
          { key: "visual_divider", path: "assets/images/split/renovation/screen_door.png" },
          { key: "visual_style_wood", path: "assets/images/split/renovation/style_wood.png" },
          { key: "visual_style_chinese", path: "assets/images/split/renovation/style_chinese.png" },
          { key: "visual_style_modern", path: "assets/images/split/renovation/style_modern.png" },
          { key: "visual_style_night", path: "assets/images/split/renovation/style_night.png" },
          { key: "visual_style_business", path: "assets/images/split/renovation/style_business.png" }
        ],
        premiumStore: [
          { key: "premium_store_hero", path: "assets/images/premium/store/store_hero.jpg" },
          { key: "premium_room_1", path: "assets/images/premium/store/room_1.jpg" },
          { key: "premium_room_2", path: "assets/images/premium/store/room_2.jpg" },
          { key: "premium_room_3", path: "assets/images/premium/store/room_3.jpg" },
          { key: "premium_advice_renovation", path: "assets/images/premium/store/advice_renovation.jpg" },
          { key: "premium_advice_permit", path: "assets/images/premium/store/advice_permit.jpg" },
          { key: "premium_advice_staff", path: "assets/images/premium/store/advice_staff.jpg" },
          { key: "premium_explore_banner", path: "assets/images/premium/store/explore_banner.jpg" }
        ],
        premiumDistrict: [
          { key: "premium_district_header", path: "assets/images/premium/district/header_city.jpg" },
          { key: "premium_avatar_1", path: "assets/images/premium/district/avatar_1.jpg" },
          { key: "premium_avatar_2", path: "assets/images/premium/district/avatar_2.jpg" },
          { key: "premium_avatar_3", path: "assets/images/premium/district/avatar_3.jpg" },
          { key: "premium_avatar_4", path: "assets/images/premium/district/avatar_4.jpg" },
          { key: "premium_demand_ambience", path: "assets/images/premium/district/demand_ambience.jpg" }
        ],
        premiumRenovation: [
          { key: "premium_reno_header", path: "assets/images/premium/renovation/header_interior.jpg" },
          { key: "premium_template_1", path: "assets/images/premium/renovation/template_1.jpg" },
          { key: "premium_template_2", path: "assets/images/premium/renovation/template_2.jpg" },
          { key: "premium_template_3", path: "assets/images/premium/renovation/template_3.jpg" },
          { key: "premium_table_2", path: "assets/images/premium/renovation/table2.jpg" },
          { key: "premium_table_4", path: "assets/images/premium/renovation/table4.jpg" },
          { key: "premium_table_6", path: "assets/images/premium/renovation/table6.jpg" },
          { key: "premium_table_8", path: "assets/images/premium/renovation/table8.jpg" },
          { key: "premium_floor_texture", path: "assets/images/premium/renovation/floor_texture.jpg" }
        ]
      };
      var loadingGroups = /* @__PURE__ */ new Map();
      function requestRender() {
        if (runtime && typeof runtime.requestRender === "function") {
          runtime.requestRender();
        }
      }
      function loadGroup(name) {
        if (!GROUPS[name]) {
          return Promise.resolve([]);
        }
        if (loadingGroups.has(name)) {
          return loadingGroups.get(name);
        }
        const promise = resourceManager.loadImages(
          GROUPS[name],
          "visual:" + name
        ).then(
          (images) => {
            requestRender();
            return images;
          }
        ).catch(
          (error) => {
            console.warn(
              "\u89C6\u89C9\u8D44\u6E90\u52A0\u8F7D\u5931\u8D25\uFF1A" + name,
              error
            );
            requestRender();
            return [];
          }
        ).finally(
          () => {
            loadingGroups.delete(name);
          }
        );
        loadingGroups.set(
          name,
          promise
        );
        return promise;
      }
      function get(key) {
        return resourceManager.getImage(key);
      }
      function releaseGroup(name) {
        resourceManager.releaseGroup(
          "visual:" + name
        );
      }
      module.exports = {
        GROUPS,
        loadGroup,
        get,
        releaseGroup
      };
    }
  });

  // src/ui/premiumUi.js
  var require_premiumUi = __commonJS({
    "src/ui/premiumUi.js"(exports, module) {
      "use strict";
      function roundedPath(ctx2, x, y, w, h, r) {
        const radius = Math.min(
          r,
          w / 2,
          h / 2
        );
        ctx2.beginPath();
        ctx2.moveTo(
          x + radius,
          y
        );
        ctx2.arcTo(
          x + w,
          y,
          x + w,
          y + h,
          radius
        );
        ctx2.arcTo(
          x + w,
          y + h,
          x,
          y + h,
          radius
        );
        ctx2.arcTo(
          x,
          y + h,
          x,
          y,
          radius
        );
        ctx2.arcTo(
          x,
          y,
          x + w,
          y,
          radius
        );
        ctx2.closePath();
      }
      function card(ctx2, x, y, w, h, options) {
        const opts = options || {};
        ctx2.save();
        if (opts.shadow !== false) {
          ctx2.shadowColor = opts.shadowColor || "rgba(38,49,57,0.12)";
          ctx2.shadowBlur = opts.shadowBlur || 9;
          ctx2.shadowOffsetY = opts.shadowOffsetY || 3;
        }
        roundedPath(
          ctx2,
          x,
          y,
          w,
          h,
          opts.radius || 14
        );
        ctx2.fillStyle = opts.fill || "rgba(255,252,246,0.96)";
        ctx2.fill();
        ctx2.shadowColor = "transparent";
        if (opts.stroke !== false) {
          ctx2.strokeStyle = opts.stroke || "rgba(204,188,166,0.72)";
          ctx2.lineWidth = opts.lineWidth || 1;
          ctx2.stroke();
        }
        ctx2.restore();
      }
      function text(ctx2, value, x, y, size, color, weight, align) {
        ctx2.fillStyle = color || "#153044";
        const readableSize = Math.max(
          7.3,
          Number(
            size
          ) || 7.3
        );
        ctx2.font = (weight || "500") + " " + readableSize + "px sans-serif";
        ctx2.textAlign = align || "left";
        ctx2.textBaseline = "middle";
        ctx2.fillText(
          String(
            value
          ),
          x,
          y
        );
      }
      function coverImage(ctx2, image, x, y, w, h, radius, overlay) {
        if (!image) {
          return false;
        }
        const iw = image.naturalWidth || image.width || 1;
        const ih = image.naturalHeight || image.height || 1;
        const boxRatio = w / Math.max(
          1,
          h
        );
        const imageRatio = iw / Math.max(
          1,
          ih
        );
        let sx = 0;
        let sy = 0;
        let sw = iw;
        let sh = ih;
        if (imageRatio > boxRatio) {
          sw = ih * boxRatio;
          sx = (iw - sw) / 2;
        } else {
          sh = iw / boxRatio;
          sy = (ih - sh) / 2;
        }
        ctx2.save();
        if (radius) {
          roundedPath(
            ctx2,
            x,
            y,
            w,
            h,
            radius
          );
          ctx2.clip();
        }
        ctx2.drawImage(
          image,
          sx,
          sy,
          sw,
          sh,
          x,
          y,
          w,
          h
        );
        if (overlay) {
          ctx2.fillStyle = overlay;
          ctx2.fillRect(
            x,
            y,
            w,
            h
          );
        }
        ctx2.restore();
        return true;
      }
      function containImage(ctx2, image, x, y, w, h, alpha) {
        if (!image) {
          return false;
        }
        const iw = image.naturalWidth || image.width || 1;
        const ih = image.naturalHeight || image.height || 1;
        const scale = Math.min(
          w / iw,
          h / ih
        );
        const dw = iw * scale;
        const dh = ih * scale;
        ctx2.save();
        ctx2.globalAlpha = alpha == null ? 1 : alpha;
        ctx2.drawImage(
          image,
          x + (w - dw) / 2,
          y + (h - dh) / 2,
          dw,
          dh
        );
        ctx2.restore();
        return true;
      }
      function pill(ctx2, label, x, y, w, h, fill, color, stroke) {
        card(
          ctx2,
          x,
          y,
          w,
          h,
          {
            radius: h / 2,
            fill,
            stroke: stroke || false,
            shadow: false
          }
        );
        text(
          ctx2,
          label,
          x + w / 2,
          y + h / 2,
          7,
          color || "#153044",
          "700",
          "center"
        );
      }
      module.exports = {
        roundedPath,
        card,
        text,
        coverImage,
        containImage,
        pill
      };
    }
  });

  // src/scenes/storeScene.js
  var require_storeScene = __commonJS({
    "src/scenes/storeScene.js"(exports, module) {
      "use strict";
      var runtime = globalThis.GameRuntime;
      if (!runtime) {
        throw new Error(
          "StoreScene\uFF1AGameRuntime \u672A\u521D\u59CB\u5316"
        );
      }
      var api = runtime.api || {};
      var gameState = require_gameState();
      var citySystem = require_citySystem();
      var simulationSystem = require_simulationSystem();
      var sceneManager = require_sceneManager();
      var renovationSystem = require_renovationSystem();
      var openingPrepSystem = require_openingPrepSystem();
      var openingFinanceSystem = require_openingFinanceSystem();
      var customizationSystem = require_customizationSystem();
      var textInput = require_textInput();
      var visualAssetSystem = require_visualAssetSystem();
      var ui = require_premiumUi();
      var DESIGN_W = 390;
      var COLORS = {
        navy: "#0A3A57",
        navyDeep: "#062A40",
        paper: "#F6EFE2",
        panel: "#FFFDF8",
        text: "#18374B",
        muted: "#708188",
        gold: "#F5B62D",
        orange: "#E57D22",
        red: "#D75349",
        green: "#2B9A69",
        blue: "#2E8FB7",
        white: "#FFFFFF"
      };
      function money(value) {
        return "\xA5" + Math.max(
          0,
          Math.round(
            Number(value) || 0
          )
        ).toLocaleString();
      }
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(
            max,
            value
          )
        );
      }
      var StoreScene = class {
        constructor() {
          this.id = "shop";
          this.viewH = 780;
          this.navH = 64;
          this.contentBottom = 716;
          this.buttons = [];
        }
        getLayout() {
          let height = 780;
          if (api && typeof api.getSystemInfoSync === "function") {
            const info = api.getSystemInfoSync();
            const w = Math.max(
              1,
              Number(
                info.windowWidth
              ) || DESIGN_W
            );
            const h = Math.max(
              1,
              Number(
                info.windowHeight
              ) || 780
            );
            height = h / (w / DESIGN_W);
          }
          this.viewH = height;
          this.navH = height < 740 ? 60 : 64;
          this.contentBottom = height - this.navH;
        }
        enter() {
          visualAssetSystem.loadGroup(
            "store"
          );
          visualAssetSystem.loadGroup(
            "premiumStore"
          );
          visualAssetSystem.loadGroup(
            "renovation"
          );
        }
        exit() {
          this.buttons = [];
        }
        update() {
          const shop = this.getCurrentShop();
          if (!shop) {
            return;
          }
          renovationSystem.updateShop(
            shop.id
          );
          openingPrepSystem.updateShop(
            shop.id
          );
        }
        addButton(id, x, y, w, h) {
          const hitW = Math.max(
            42,
            w
          );
          const hitH = Math.max(
            38,
            h
          );
          this.buttons.push({
            id,
            x: x - (hitW - w) / 2,
            y: y - (hitH - h) / 2,
            w: hitW,
            h: hitH
          });
        }
        hitButton(x, y) {
          for (let i = this.buttons.length - 1; i >= 0; i--) {
            const b = this.buttons[i];
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
              return b;
            }
          }
          return null;
        }
        getCurrentShop() {
          const business = gameState.getBusiness();
          if (!business.hasShop || !business.shops.length) {
            return null;
          }
          return business.shops.find(
            (item) => item.id === business.currentShopId
          ) || business.shops[0];
        }
        getRooms(shopId) {
          const plan = renovationSystem.ensurePlan(
            shopId
          );
          if (!plan) {
            return [];
          }
          const rooms = [];
          for (const floor of plan.floors) {
            for (const room of floor.privateRooms) {
              rooms.push(
                room
              );
            }
          }
          return rooms;
        }
        getScale() {
          return clamp(
            (this.contentBottom - 90) / 560,
            0.88,
            1.13
          );
        }
        drawHeader(ctx2, shop) {
          const h = 90;
          ui.coverImage(
            ctx2,
            visualAssetSystem.get(
              "premium_explore_banner"
            ),
            0,
            0,
            DESIGN_W,
            h,
            0,
            "rgba(4,31,48,0.50)"
          );
          ctx2.fillStyle = "rgba(4,35,54,0.44)";
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            h
          );
          ui.card(
            ctx2,
            8,
            13,
            39,
            39,
            {
              radius: 11,
              fill: "rgba(5,47,67,0.88)",
              stroke: "rgba(255,255,255,0.30)",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u2039",
            27.5,
            32.5,
            22,
            "#FFE59B",
            "800",
            "center"
          );
          this.addButton(
            "go-city",
            4,
            9,
            47,
            47
          );
          const cityName = gameState.getCityName() || "\u57CE\u5E02\u540D\u79F0";
          ui.text(
            ctx2,
            cityName,
            58,
            22,
            15,
            COLORS.white,
            "800"
          );
          ui.text(
            ctx2,
            "\u6253\u9020\u5C5E\u4E8E\u4F60\u7684\u7F8E\u98DF\u5E1D\u56FD",
            58,
            44,
            7,
            "#DAEAF0",
            "600"
          );
          ui.card(
            ctx2,
            285,
            11,
            96,
            43,
            {
              radius: 12,
              fill: "rgba(5,39,59,0.86)",
              stroke: "rgba(255,255,255,0.30)",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            money(
              gameState.getPlayer().cash
            ),
            333,
            26,
            11.4,
            "#FFF0A9",
            "800",
            "center"
          );
          ui.text(
            ctx2,
            "\u53EF\u7528\u8D44\u91D1",
            333,
            44,
            6.3,
            "#D9E9EE",
            "600",
            "center"
          );
          const bulletin = simulationSystem.getBulletin();
          ui.card(
            ctx2,
            8,
            61,
            374,
            23,
            {
              radius: 11,
              fill: "rgba(3,39,59,0.88)",
              stroke: "rgba(64,183,230,0.35)",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u{1F4E3} \u57CE\u5E02\u52A8\u6001",
            15,
            72.5,
            6.7,
            "#FFD46B",
            "800"
          );
          ui.text(
            ctx2,
            (bulletin.title + " \xB7 " + bulletin.detail).slice(
              0,
              42
            ),
            87,
            72.5,
            6.1,
            COLORS.white,
            "600"
          );
          if (shop) {
            const district = citySystem.getDistrict(
              shop.districtId
            );
            ui.text(
              ctx2,
              district ? district.name : "",
              374,
              72.5,
              5.8,
              "#D9E9EE",
              "600",
              "right"
            );
          }
        }
        drawStoreHero(ctx2, shop, readiness) {
          const sy = this.getScale();
          const y = 96;
          const h = 140 * sy;
          ui.card(
            ctx2,
            9,
            y,
            372,
            h,
            {
              radius: 17,
              fill: COLORS.panel
            }
          );
          ui.coverImage(
            ctx2,
            visualAssetSystem.get(
              "premium_store_hero"
            ) || visualAssetSystem.get(
              "visual_storefront_hero"
            ),
            211,
            y + 6,
            161,
            h - 12,
            13,
            null
          );
          const status = shop.status === "open" ? "\u8425\u4E1A\u4E2D" : readiness.ready ? "\u53EF\u8BD5\u8425\u4E1A" : shop.status === "renovating" ? "\u88C5\u4FEE\u4E2D" : readiness.renovationReady ? "\u5F00\u4E1A\u7B79\u5907" : "\u5DF2\u7B7E\u7EA6";
          ui.pill(
            ctx2,
            "\u2713 " + status,
            20,
            y + 13,
            72,
            24,
            "#FFF0C1",
            "#A9681F"
          );
          ui.text(
            ctx2,
            shop.name || "\u6211\u7684\u9152\u697C",
            20,
            y + 59,
            17,
            COLORS.text,
            "800"
          );
          ui.text(
            ctx2,
            "\u{1F4CD} " + shop.address,
            20,
            y + 85,
            7,
            COLORS.text,
            "600"
          );
          ui.text(
            ctx2,
            "\u4E00\u5EA7\u597D\u9152\u697C\uFF0C\u4ECE\u8FD9\u91CC\u5F00\u59CB\uFF01",
            21,
            y + 111,
            7.4,
            COLORS.orange,
            "700"
          );
          ui.card(
            ctx2,
            20,
            y + h - 32,
            80,
            24,
            {
              radius: 12,
              fill: "#FFF5D8",
              stroke: "#E8C36C",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u270E \u4FEE\u6539\u540D\u79F0",
            60,
            y + h - 20,
            6.6,
            COLORS.orange,
            "800",
            "center"
          );
          this.addButton(
            "shop:rename",
            16,
            y + h - 37,
            88,
            34
          );
          ui.card(
            ctx2,
            111,
            y + h - 32,
            80,
            24,
            {
              radius: 12,
              fill: "#FFFDF7",
              stroke: "#D8CCBE",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u2699 \u95E8\u5E97\u8BBE\u7F6E",
            151,
            y + h - 20,
            6.4,
            COLORS.navy,
            "800",
            "center"
          );
          this.addButton(
            "store:settings",
            107,
            y + h - 37,
            88,
            34
          );
        }
        drawRooms(ctx2, shop) {
          const sy = this.getScale();
          const y = 243 * sy - 90 * (sy - 1);
          const h = 102 * sy;
          const rooms = this.getRooms(
            shop.id
          );
          ui.card(
            ctx2,
            9,
            y,
            372,
            h,
            {
              radius: 15,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            "\u5305\u53A2\u540D\u79F0",
            20,
            y + 19,
            10.2,
            COLORS.text,
            "800"
          );
          ui.text(
            ctx2,
            "\u7CBE\u81F4\u5305\u53A2 \xB7 \u5BB4\u8BF7\u5BBE\u670B \xB7 \u540D\u79F0\u548C\u98CE\u683C\u53EF\u81EA\u5B9A\u4E49",
            83,
            y + 19,
            5.9,
            COLORS.muted,
            "500"
          );
          ui.card(
            ctx2,
            304,
            y + 8,
            65,
            23,
            {
              radius: 11,
              fill: "#FFF6E0",
              stroke: "#E4C477",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u7BA1\u7406\u5305\u53A2 \u203A",
            336.5,
            y + 19.5,
            6.1,
            COLORS.navy,
            "800",
            "center"
          );
          this.addButton(
            "room:manage",
            298,
            y + 4,
            78,
            31
          );
          const images = [
            "premium_room_1",
            "premium_room_2",
            "premium_room_3"
          ];
          const cardW = 82;
          const gap = 8;
          const cardY = y + 34;
          const cardH = h - 42;
          for (let i = 0; i < 4; i++) {
            const x = 18 + i * (cardW + gap);
            ui.card(
              ctx2,
              x,
              cardY,
              cardW,
              cardH,
              {
                radius: 8,
                fill: "#FBF7EF",
                stroke: "#DFD4C5",
                shadow: false
              }
            );
            if (i < 3 && rooms[i]) {
              ui.coverImage(
                ctx2,
                visualAssetSystem.get(
                  images[i]
                ),
                x + 2,
                cardY + 2,
                cardW - 4,
                Math.max(
                  33,
                  cardH - 20
                ),
                7,
                null
              );
              ui.text(
                ctx2,
                rooms[i].name || "\u5305\u53A2" + (i + 1),
                x + 5,
                cardY + cardH - 7,
                6,
                COLORS.text,
                "700"
              );
              ui.text(
                ctx2,
                "\u270E",
                x + cardW - 12,
                cardY + cardH - 7,
                6.3,
                COLORS.navy,
                "800",
                "center"
              );
              this.addButton(
                "room:rename:" + rooms[i].id,
                x + cardW - 25,
                cardY + cardH - 22,
                28,
                28
              );
            } else if (i === 3) {
              ui.text(
                ctx2,
                "+",
                x + cardW / 2,
                cardY + cardH * 0.42,
                16,
                "#A29180",
                "500",
                "center"
              );
              ui.text(
                ctx2,
                "\u6DFB\u52A0\u5305\u53A2",
                x + cardW / 2,
                cardY + cardH * 0.72,
                6.1,
                COLORS.navy,
                "700",
                "center"
              );
              this.addButton(
                "room:manage",
                x,
                cardY,
                cardW,
                cardH
              );
            } else {
              ui.text(
                ctx2,
                "\u5F85\u89C4\u5212",
                x + cardW / 2,
                cardY + cardH * 0.43,
                6.5,
                COLORS.muted,
                "700",
                "center"
              );
              ui.text(
                ctx2,
                "\u8FDB\u5165\u88C5\u4FEE\u6DFB\u52A0",
                x + cardW / 2,
                cardY + cardH * 0.7,
                5.3,
                COLORS.muted,
                "500",
                "center"
              );
              this.addButton(
                "room:manage",
                x,
                cardY,
                cardW,
                cardH
              );
            }
          }
        }
        drawProgress(ctx2, active) {
          const sy = this.getScale();
          const y = 352 * sy - 90 * (sy - 1);
          const h = 83 * sy;
          ui.card(
            ctx2,
            9,
            y,
            372,
            h,
            {
              radius: 15,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            "\u5F00\u5E97\u8FDB\u5EA6",
            20,
            y + 19,
            10.2,
            COLORS.text,
            "800"
          );
          ui.card(
            ctx2,
            306,
            y + 7,
            62,
            23,
            {
              radius: 11,
              fill: "#FFF6E0",
              stroke: "#E4C477",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u67E5\u770B\u8BE6\u60C5 \u203A",
            337,
            y + 18.5,
            5.9,
            COLORS.navy,
            "800",
            "center"
          );
          const labels = [
            "\u9009\u5740",
            "\u7B7E\u7EA6",
            "\u88C5\u4FEE",
            "\u8BC1\u7167",
            "\u62DB\u8058",
            "\u5F00\u4E1A"
          ];
          const startX = 37;
          const gap = 62;
          const lineY = y + h * 0.58;
          for (let i = 0; i < 6; i++) {
            const x = startX + i * gap;
            if (i < 5) {
              ctx2.fillStyle = i < active - 1 ? "#DDA52A" : "#D8D2C9";
              ctx2.fillRect(
                x + 13,
                lineY - 1,
                gap - 26,
                3
              );
            }
            const done = i < active - 1;
            const current = i === active - 1;
            ctx2.beginPath();
            ctx2.arc(
              x,
              lineY,
              11.5,
              0,
              Math.PI * 2
            );
            ctx2.fillStyle = done ? "#DDA52A" : current ? COLORS.gold : "#E7E2DA";
            ctx2.fill();
            ui.text(
              ctx2,
              done ? "\u2713" : String(
                i + 1
              ),
              x,
              lineY,
              7.4,
              done ? COLORS.white : COLORS.text,
              "800",
              "center"
            );
            ui.text(
              ctx2,
              labels[i],
              x,
              lineY + 23,
              6.4,
              COLORS.text,
              "700",
              "center"
            );
          }
        }
        drawAdvice(ctx2, shop, readiness) {
          const sy = this.getScale();
          const y = 442 * sy - 90 * (sy - 1);
          const h = 106 * sy;
          ui.card(
            ctx2,
            9,
            y,
            372,
            h,
            {
              radius: 15,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            "\u4E0B\u4E00\u6B65\u5EFA\u8BAE",
            20,
            y + 20,
            10.5,
            COLORS.text,
            "800"
          );
          ui.text(
            ctx2,
            "\u7A33\u624E\u7A33\u6253\uFF0C\u5F00\u597D\u6BCF\u4E00\u5BB6\u5E97\uFF01",
            368,
            y + 20,
            6.2,
            COLORS.orange,
            "700",
            "right"
          );
          const cards = [
            {
              id: readiness.ready && shop.status !== "open" ? "trial" : "renovation",
              key: "premium_advice_renovation",
              title: readiness.ready && shop.status !== "open" ? "\u5F00\u59CB\u8BD5\u8425\u4E1A" : "\u5F00\u59CB\u5E97\u9762\u88C5\u4FEE",
              sub: readiness.renovationReady ? "\u67E5\u770B\u5E76\u8C03\u6574\u5F53\u524D\u88C5\u4FEE\u65B9\u6848" : "\u9009\u62E9\u88C5\u4FEE\u98CE\u683C\uFF0C\u6253\u9020\u72EC\u7279\u4F53\u9A8C",
              action: readiness.ready && shop.status !== "open" ? "\u5F00\u4E1A" : "\u53BB\u88C5\u4FEE"
            },
            {
              id: "license",
              key: "premium_advice_permit",
              title: "\u529E\u7406\u8425\u4E1A\u8BC1\u7167",
              sub: readiness.permitsReady ? "\u8BC1\u7167\u5DF2\u9F50\uFF0C\u53EF\u67E5\u770B\u529E\u7406\u8BE6\u60C5" : "\u5B8C\u6210\u5404\u7C7B\u8BC1\u7167\u529E\u7406",
              action: "\u53BB\u529E\u8BC1\u7167"
            },
            {
              id: "staff",
              key: "premium_advice_staff",
              title: "\u62DB\u8058\u7ECF\u8425\u56E2\u961F",
              sub: readiness.staffingReady ? "\u57FA\u7840\u73ED\u7EC4\u5DF2\u9F50" : "\u7EC4\u5EFA\u4E13\u4E1A\u56E2\u961F\u51C6\u5907\u5F00\u4E1A",
              action: "\u53BB\u62DB\u8058"
            }
          ];
          const cardW = 113;
          for (let i = 0; i < 3; i++) {
            const item = cards[i];
            const x = 17 + i * 119;
            const top = y + 31;
            ui.card(
              ctx2,
              x,
              top,
              cardW,
              h - 38,
              {
                radius: 10,
                fill: "#FFF9EF",
                stroke: "#E2D8CB",
                shadow: false
              }
            );
            ui.coverImage(
              ctx2,
              visualAssetSystem.get(
                item.key
              ),
              x + 4,
              top + 4,
              44,
              h - 46,
              7,
              null
            );
            ui.text(
              ctx2,
              item.title,
              x + 52,
              top + 15,
              6.5,
              COLORS.text,
              "800"
            );
            ui.text(
              ctx2,
              item.sub,
              x + 52,
              top + 31,
              5.2,
              COLORS.muted,
              "500"
            );
            ui.card(
              ctx2,
              x + 51,
              top + h - 67,
              55,
              22,
              {
                radius: 11,
                fill: COLORS.gold,
                stroke: "#E1A31F",
                shadow: false
              }
            );
            ui.text(
              ctx2,
              item.action + " \u203A",
              x + 78.5,
              top + h - 56,
              5.7,
              COLORS.text,
              "800",
              "center"
            );
            this.addButton(
              "module:" + item.id,
              x,
              top,
              cardW,
              h - 38
            );
          }
        }
        drawExplore(ctx2) {
          const y = this.contentBottom - 66;
          ui.coverImage(
            ctx2,
            visualAssetSystem.get(
              "premium_explore_banner"
            ),
            10,
            y,
            370,
            57,
            13,
            "rgba(3,34,51,0.44)"
          );
          ui.text(
            ctx2,
            "\u63A2\u7D22\u66F4\u591A\u4F18\u8D28\u5546\u5708",
            66,
            y + 20,
            9.5,
            COLORS.white,
            "800"
          );
          ui.text(
            ctx2,
            "\u5BFB\u627E\u4E0B\u4E00\u4E2A\u9EC4\u91D1\u5730\u6BB5\uFF0C\u6269\u5C55\u4F60\u7684\u9910\u996E\u7248\u56FE",
            66,
            y + 38,
            5.9,
            "#E5F0F4",
            "600"
          );
          ui.card(
            ctx2,
            295,
            y + 13,
            68,
            31,
            {
              radius: 15,
              fill: COLORS.gold,
              stroke: "#E1A11D",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u53BB\u62D3\u5C55 \u203A",
            329,
            y + 28.5,
            6.7,
            COLORS.text,
            "800",
            "center"
          );
          this.addButton(
            "go-city",
            289,
            y + 7,
            80,
            43
          );
        }
        renderNoShop(ctx2) {
          this.drawHeader(
            ctx2,
            null
          );
          const available = this.contentBottom - 104;
          const heroH = Math.max(
            205,
            Math.min(
              292,
              available * 0.44
            )
          );
          ui.card(
            ctx2,
            10,
            99,
            370,
            heroH,
            {
              radius: 18,
              fill: COLORS.panel
            }
          );
          ui.coverImage(
            ctx2,
            visualAssetSystem.get(
              "premium_explore_banner"
            ),
            18,
            107,
            354,
            heroH * 0.55,
            14,
            "rgba(4,31,46,0.17)"
          );
          ui.text(
            ctx2,
            "\u8FD8\u6CA1\u6709\u81EA\u5DF1\u7684\u95E8\u5E97",
            28,
            126 + heroH * 0.55,
            15,
            COLORS.text,
            "800"
          );
          ui.text(
            ctx2,
            "\u4ECE\u5546\u5708\u3001\u623F\u6E90\u3001\u8C08\u5224\u5230\u88C5\u4FEE\uFF0C\u7B2C\u4E00\u5BB6\u5E97\u4ECE\u9009\u5740\u5F00\u59CB\u3002",
            28,
            151 + heroH * 0.55,
            7.1,
            COLORS.muted,
            "600"
          );
          ui.card(
            ctx2,
            27,
            168 + heroH * 0.55,
            335,
            38,
            {
              radius: 19,
              fill: COLORS.gold,
              stroke: "#DEA11F",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u53BB\u57CE\u5E02\u5730\u56FE\u9009\u62E9\u9EC4\u91D1\u5546\u5708  \u203A",
            194.5,
            187 + heroH * 0.55,
            8.2,
            COLORS.text,
            "800",
            "center"
          );
          this.addButton(
            "go-city",
            22,
            163 + heroH * 0.55,
            345,
            48
          );
          const processY = 112 + heroH;
          const processH = Math.max(
            118,
            this.contentBottom - processY - 12
          );
          ui.card(
            ctx2,
            10,
            processY,
            370,
            processH,
            {
              radius: 16,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            "\u5F00\u5E97\u6D41\u7A0B",
            22,
            processY + 23,
            10.5,
            COLORS.text,
            "800"
          );
          const steps = [
            [
              "1",
              "\u9009\u62E9\u5546\u5708",
              "\u5148\u770B\u4EBA\u53E3\u3001\u9700\u6C42\u3001\u5BA2\u5355\u548C\u7ADE\u4E89"
            ],
            [
              "2",
              "\u6311\u9009\u623F\u6E90",
              "\u5B9E\u5730\u770B\u94FA\uFF0C\u786E\u8BA4\u9762\u79EF\u3001\u6392\u70DF\u548C\u98CE\u9669"
            ],
            [
              "3",
              "\u8C08\u5224\u7B7E\u7EA6",
              "\u79DF\u91D1\u3001\u8F6C\u8BA9\u8D39\u3001\u514D\u79DF\u671F\u90FD\u80FD\u8C08"
            ],
            [
              "4",
              "\u88C5\u4FEE\u7B79\u5907",
              "\u5E03\u5C40\u3001\u8BBE\u5907\u3001\u8BC1\u7167\u3001\u62DB\u8058\u540E\u5F00\u4E1A"
            ]
          ];
          const rowH = Math.max(
            25,
            (processH - 38) / 4
          );
          for (let i = 0; i < 4; i++) {
            const cy = processY + 45 + i * rowH;
            ctx2.beginPath();
            ctx2.arc(
              36,
              cy,
              10,
              0,
              Math.PI * 2
            );
            ctx2.fillStyle = i === 0 ? COLORS.gold : "#E3DDD3";
            ctx2.fill();
            ui.text(
              ctx2,
              steps[i][0],
              36,
              cy,
              6.7,
              COLORS.text,
              "800",
              "center"
            );
            ui.text(
              ctx2,
              steps[i][1],
              56,
              cy - 5,
              7.5,
              COLORS.text,
              "800"
            );
            ui.text(
              ctx2,
              steps[i][2],
              56,
              cy + 10,
              5.9,
              COLORS.muted,
              "500"
            );
          }
        }
        renderShop(ctx2, shop) {
          this.drawHeader(
            ctx2,
            shop
          );
          const readiness = openingPrepSystem.getReadiness(
            shop.id
          );
          const finance = openingFinanceSystem.getRecoveryStatus(
            shop.id
          );
          this.drawStoreHero(
            ctx2,
            shop,
            readiness
          );
          this.drawRooms(
            ctx2,
            shop
          );
          let active = 2;
          if (readiness.renovationReady) {
            active = 4;
          } else if (shop.status === "renovating") {
            active = 3;
          }
          if (readiness.permitsReady) {
            active = 5;
          }
          if (readiness.ready) {
            active = 6;
          }
          this.drawProgress(
            ctx2,
            active
          );
          this.drawAdvice(
            ctx2,
            shop,
            readiness
          );
          if (finance && finance.gap > 0 && finance.offer && !finance.offer.existing) {
            const y = this.contentBottom - 103;
            ui.card(
              ctx2,
              20,
              y,
              176,
              30,
              {
                radius: 14,
                fill: "#FFF3D8",
                stroke: "#E6BF69",
                shadow: false
              }
            );
            ui.text(
              ctx2,
              "\u8D44\u91D1\u7F3A\u53E3 " + money(
                finance.gap
              ) + " \xB7 \u53EF\u7533\u8BF7\u5468\u8F6C\u91D1 \u203A",
              108,
              y + 15,
              6.1,
              COLORS.orange,
              "800",
              "center"
            );
            this.addButton(
              "module:finance",
              16,
              y - 4,
              184,
              38
            );
          }
          this.drawExplore(
            ctx2
          );
        }
        render(ctx2) {
          if (!ctx2) {
            return;
          }
          this.getLayout();
          this.buttons = [];
          ctx2.save();
          ctx2.fillStyle = COLORS.paper;
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            this.viewH
          );
          const shop = this.getCurrentShop();
          if (shop) {
            this.renderShop(
              ctx2,
              shop
            );
          } else {
            this.renderNoShop(
              ctx2
            );
          }
          ctx2.restore();
        }
        showToast(title) {
          if (api && typeof api.showToast === "function") {
            api.showToast({
              title,
              icon: "none"
            });
          }
        }
        handleTap(x, y) {
          const item = this.hitButton(
            x,
            y
          );
          if (!item) {
            return false;
          }
          if (item.id === "go-city") {
            sceneManager.switchTo(
              "city"
            );
            return true;
          }
          if (item.id === "store:settings") {
            const shop = this.getCurrentShop();
            if (!shop) {
              return true;
            }
            textInput.requestText({
              title: "\u95E8\u5E97\u8BBE\u7F6E \xB7 \u4FEE\u6539\u540D\u79F0",
              value: shop.name || "",
              placeholder: "\u8BF7\u8F93\u5165\u95E8\u5E97\u540D\u79F0",
              maxLength: 12
            }).then(
              (value) => {
                if (!value) {
                  return;
                }
                customizationSystem.renameShop(
                  shop.id,
                  value
                );
                textInput.requestRender();
              }
            );
            return true;
          }
          if (item.id === "shop:rename") {
            const shop = this.getCurrentShop();
            if (!shop) {
              return true;
            }
            textInput.requestText({
              title: "\u4FEE\u6539\u9152\u697C\u540D\u79F0",
              value: shop.name || "",
              placeholder: "\u8BF7\u8F93\u5165\u9152\u697C\u540D\u79F0",
              maxLength: 12
            }).then(
              (value) => {
                if (!value) {
                  return;
                }
                customizationSystem.renameShop(
                  shop.id,
                  value
                );
                textInput.requestRender();
              }
            );
            return true;
          }
          if (item.id === "room:manage") {
            const shop = this.getCurrentShop();
            if (shop) {
              sceneManager.switchTo(
                "renovation",
                {
                  shopId: shop.id,
                  page: "rooms"
                }
              );
            }
            return true;
          }
          if (item.id.indexOf(
            "room:rename:"
          ) === 0) {
            const shop = this.getCurrentShop();
            if (!shop) {
              return true;
            }
            const roomId = item.id.slice(
              "room:rename:".length
            );
            const room = this.getRooms(
              shop.id
            ).find(
              (roomItem) => roomItem.id === roomId
            );
            if (room) {
              textInput.requestText({
                title: "\u4FEE\u6539\u5305\u53A2\u540D\u79F0",
                value: room.name || "",
                placeholder: "\u4F8B\u5982\uFF1A\u7261\u4E39\u5385",
                maxLength: 12
              }).then(
                (value) => {
                  if (!value) {
                    return;
                  }
                  customizationSystem.renameRoom(
                    shop.id,
                    roomId,
                    value
                  );
                  textInput.requestRender();
                }
              );
            }
            return true;
          }
          if (item.id.indexOf(
            "module:"
          ) === 0) {
            const moduleId = item.id.split(
              ":"
            )[1];
            const shop = this.getCurrentShop();
            if (!shop) {
              return true;
            }
            const sceneMap = {
              renovation: "renovation",
              equipment: "equipment",
              license: "license",
              staff: "staff"
            };
            if (sceneMap[moduleId]) {
              sceneManager.switchTo(
                sceneMap[moduleId],
                {
                  shopId: shop.id
                }
              );
              return true;
            }
            if (moduleId === "trial") {
              const result = openingPrepSystem.startTrialOpening(
                shop.id
              );
              this.showToast(
                result.ok ? "\u8BD5\u8425\u4E1A\u5F00\u59CB\uFF01" : result.message
              );
              textInput.requestRender();
              return true;
            }
            if (moduleId === "finance") {
              const offer = openingFinanceSystem.getOffer(
                shop.id
              );
              const accept = () => {
                const result = openingFinanceSystem.acceptOffer(
                  shop.id
                );
                this.showToast(
                  result.ok ? "\u5DF2\u5230\u8D26 " + money(
                    result.loan.principal
                  ) : result.message
                );
                textInput.requestRender();
              };
              if (offer && offer.available && api && typeof api.showModal === "function") {
                api.showModal({
                  title: "\u5F00\u5E97\u5468\u8F6C\u91D1",
                  content: "\u53EF\u501F " + money(
                    offer.principal
                  ) + "\uFF0C\u671F\u9650 " + offer.termMonths + " \u4E2A\u6708\uFF0C\u9884\u8BA1\u6708\u8FD8 " + money(
                    offer.monthlyPayment
                  ) + "\u3002\u786E\u8BA4\u7533\u8BF7\uFF1F",
                  confirmText: "\u7533\u8BF7",
                  cancelText: "\u53D6\u6D88",
                  success: (result) => {
                    if (result && result.confirm) {
                      accept();
                    }
                  }
                });
              } else {
                accept();
              }
              return true;
            }
          }
          return false;
        }
      };
      module.exports = new StoreScene();
    }
  });

  // src/city/districtInsightSystem.js
  var require_districtInsightSystem = __commonJS({
    "src/city/districtInsightSystem.js"(exports, module) {
      "use strict";
      var citySystem = require_citySystem();
      var demandSystem = require_demandSystem();
      var propertyMarketSystem = require_propertyMarketSystem();
      var simulationConfig = require_simulationConfig();
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(
            max,
            value
          )
        );
      }
      var CUSTOMER_HINTS = {
        student: [
          "\u5FEB\u9910",
          "\u5C0F\u5403",
          "\u996E\u54C1"
        ],
        teacher: [
          "\u7B80\u9910",
          "\u5496\u5561",
          "\u54C1\u8D28\u9910"
        ],
        resident: [
          "\u5BB6\u5E38\u83DC",
          "\u65E9\u9910",
          "\u793E\u533A\u9910"
        ],
        elderly: [
          "\u65E9\u9910",
          "\u9762\u70B9",
          "\u5BB6\u5E38\u83DC"
        ],
        family: [
          "\u6B63\u9910",
          "\u706B\u9505",
          "\u4EB2\u5B50\u9910"
        ],
        office: [
          "\u5DE5\u4F5C\u9910",
          "\u5496\u5561",
          "\u8F7B\u98DF"
        ],
        business: [
          "\u5546\u52A1\u9910",
          "\u54C1\u8D28\u6B63\u9910",
          "\u5496\u5561"
        ],
        tourist: [
          "\u5730\u65B9\u7279\u8272",
          "\u5C0F\u5403",
          "\u4F34\u624B\u9910"
        ],
        vendor: [
          "\u65E9\u9910",
          "\u5FEB\u9910",
          "\u9762\u996D"
        ],
        worker: [
          "\u5FEB\u9910",
          "\u9762\u996D",
          "\u591C\u5BB5"
        ],
        tenant: [
          "\u5E73\u4EF7\u5FEB\u9910",
          "\u5916\u5356",
          "\u591C\u5BB5"
        ],
        driver: [
          "\u5FEB\u9910",
          "\u65E9\u9910",
          "\u4FBF\u6377\u9910"
        ],
        staff: [
          "\u5DE5\u4F5C\u9910",
          "\u7B80\u9910",
          "\u5916\u5356"
        ],
        tech: [
          "\u5496\u5561",
          "\u8F7B\u98DF",
          "\u54C1\u8D28\u5FEB\u9910"
        ]
      };
      var DistrictInsightSystem = class {
        getCompetitionLabel(saturation) {
          const bands = simulationConfig.city.competitionBands;
          if (saturation >= bands.extreme) {
            return "\u9AD8\u5EA6\u9971\u548C";
          }
          if (saturation >= bands.high) {
            return "\u7ADE\u4E89\u6FC0\u70C8";
          }
          if (saturation >= bands.medium) {
            return "\u7ADE\u4E89\u4E2D\u7B49";
          }
          return "\u7ADE\u4E89\u8F83\u4F4E";
        }
        getCustomerGroups(districtId) {
          const groups = demandSystem.getDemandByCustomerType(
            districtId
          );
          const total = Object.values(
            groups
          ).reduce(
            (sum, item) => sum + item.demand,
            0
          );
          return Object.values(
            groups
          ).map(
            (item) => ({
              ...item,
              share: total > 0 ? item.demand / total : 0
            })
          ).sort(
            (a, b) => b.share - a.share
          );
        }
        getMealProfile(district) {
          const entries = Object.keys(
            district.mealDemand || {}
          ).map(
            (key) => ({
              id: key,
              share: district.mealDemand[key] || 0
            })
          ).sort(
            (a, b) => b.share - a.share
          );
          return entries;
        }
        getDistrictEvents(districtId) {
          const state = propertyMarketSystem.getState();
          const active = Array.isArray(
            state.activeEvents
          ) ? state.activeEvents : [];
          const external = Array.isArray(
            state.externalModifiers
          ) ? state.externalModifiers : [];
          return active.concat(
            external
          ).filter(
            (event) => !event.districtId || event.districtId === districtId
          ).slice(
            0,
            5
          );
        }
        getBusinessHints(customerGroups) {
          const result = [];
          for (let i = 0; i < Math.min(
            3,
            customerGroups.length
          ); i++) {
            const hints = CUSTOMER_HINTS[customerGroups[i].typeId] || [];
            for (let j = 0; j < hints.length; j++) {
              if (result.indexOf(
                hints[j]
              ) === -1) {
                result.push(
                  hints[j]
                );
              }
              if (result.length >= 5) {
                return result;
              }
            }
          }
          return result;
        }
        getInsight(districtId) {
          const district = citySystem.getDistrict(
            districtId
          );
          if (!district) {
            return null;
          }
          const demand = demandSystem.getDemandBreakdown(
            districtId
          );
          const customerGroups = this.getCustomerGroups(
            districtId
          );
          const mealProfile = this.getMealProfile(
            district
          );
          const market = propertyMarketSystem.getDistrictSummary(
            districtId
          );
          const events = this.getDistrictEvents(
            districtId
          );
          const rentLevel = district.rentIndex >= 1.05 ? "\u504F\u9AD8" : district.rentIndex >= 0.78 ? "\u4E2D\u9AD8" : district.rentIndex >= 0.52 ? "\u4E2D\u7B49" : "\u8F83\u4F4E";
          const customerConcentration = customerGroups.length ? customerGroups[0].share : 0;
          const diversity = customerConcentration >= 0.68 ? "\u5BA2\u7FA4\u96C6\u4E2D" : customerConcentration >= 0.48 ? "\u4E3B\u529B\u660E\u663E" : "\u5BA2\u7FA4\u591A\u5143";
          return {
            id: district.id,
            name: district.name,
            population: district.population,
            residentPopulation: district.residentPopulation,
            populationDelta: district.populationDelta,
            currentDemand: demand ? demand.total : 0,
            dynamicDailyDemand: demand ? demand.dynamicDailyDemand : district.baseDemand,
            demandDeltaRatio: district.demandDeltaRatio,
            avgSpend: district.avgSpend,
            restaurantCount: district.restaurantCount,
            saturation: district.saturation,
            competitionLabel: this.getCompetitionLabel(
              district.saturation
            ),
            rentIndex: district.rentIndex,
            rentLevel,
            economyMomentum: district.economyMomentum,
            customerGroups,
            customerDiversity: diversity,
            mealProfile,
            peakMeal: mealProfile.length ? mealProfile[0].id : null,
            businessHints: this.getBusinessHints(
              customerGroups
            ),
            market: market ? {
              activeListingCount: market.activeListingCount,
              averageAskingRent: market.averageAskingRent,
              averageDaysOnMarket: market.averageDaysOnMarket,
              hottestStreet: market.hottestStreet
            } : null,
            events,
            eventTrafficFactor: district.eventTrafficFactor,
            eventDemandFactor: district.eventDemandFactor,
            trendScore: clamp(
              district.demandDeltaRatio * 2 + district.populationDelta / Math.max(
                1,
                district.residentPopulation
              ),
              -1,
              1
            )
          };
        }
      };
      module.exports = new DistrictInsightSystem();
    }
  });

  // src/scenes/districtScene.js
  var require_districtScene = __commonJS({
    "src/scenes/districtScene.js"(exports, module) {
      "use strict";
      var runtime = globalThis.GameRuntime;
      if (!runtime) {
        throw new Error(
          "DistrictScene\uFF1AGameRuntime \u672A\u521D\u59CB\u5316"
        );
      }
      var api = runtime.api || {};
      var gameState = require_gameState();
      var citySystem = require_citySystem();
      var districtInsightSystem = require_districtInsightSystem();
      var sceneManager = require_sceneManager();
      var visualAssetSystem = require_visualAssetSystem();
      var ui = require_premiumUi();
      var DESIGN_W = 390;
      var COLORS = {
        navy: "#0A3B59",
        navyDeep: "#062A40",
        paper: "#F6EFE2",
        panel: "#FFFDF8",
        text: "#18374B",
        muted: "#708188",
        gold: "#F5B62D",
        orange: "#E6762B",
        red: "#D85049",
        green: "#239B72",
        blue: "#3A9FC7",
        white: "#FFFFFF"
      };
      var MEAL_NAMES = {
        breakfast: "\u65E9\u9910",
        lunch: "\u5348\u9910",
        afternoon: "\u4E0B\u5348\u8336",
        dinner: "\u665A\u9910",
        night: "\u591C\u5BB5"
      };
      var MEAL_TIMES = {
        breakfast: "7:00-10:00",
        lunch: "11:00-14:00",
        afternoon: "14:00-17:00",
        dinner: "17:00-21:00",
        night: "21:00-24:00"
      };
      var CUSTOMER_NOTES = {
        \u767D\u9886: "\u5468\u8FB9\u5199\u5B57\u697C\uFF0C\u4E0A\u73ED\u65CF\u4E3A\u4E3B",
        \u5546\u52A1\u5BA2: "\u5546\u52A1\u6D3D\u8C08\u3001\u4F1A\u8BAE\u5BB4\u8BF7",
        \u6E38\u5BA2: "\u65C5\u6E38\u89C2\u5149\u3001\u4F11\u95F2\u6D88\u8D39",
        \u5B66\u751F: "\u5468\u8FB9\u9AD8\u6821\u3001\u5E74\u8F7B\u7FA4\u4F53",
        \u5C45\u6C11: "\u793E\u533A\u5BB6\u5EAD\u4E0E\u65E5\u5E38\u6D88\u8D39",
        \u5DE5\u4EBA: "\u56ED\u533A\u804C\u5DE5\u4E0E\u5DE5\u4F5C\u9910",
        \u5BB6\u5EAD: "\u5BB6\u5EAD\u805A\u9910\u4E0E\u5468\u672B\u6D88\u8D39"
      };
      function money(value) {
        return "\xA5" + Math.max(
          0,
          Math.round(
            Number(value) || 0
          )
        ).toLocaleString();
      }
      function pct(value) {
        const n = Number(value) || 0;
        return Math.round(
          n <= 1 ? n * 100 : n
        ) + "%";
      }
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(
            max,
            value
          )
        );
      }
      var DistrictScene = class {
        constructor() {
          this.id = "district";
          this.districtId = "university";
          this.viewH = 780;
          this.navH = 64;
          this.contentBottom = 716;
          this.buttons = [];
        }
        getLayout() {
          let height = 780;
          if (api && typeof api.getSystemInfoSync === "function") {
            const info = api.getSystemInfoSync();
            const w = Math.max(
              1,
              Number(
                info.windowWidth
              ) || DESIGN_W
            );
            const h = Math.max(
              1,
              Number(
                info.windowHeight
              ) || 780
            );
            height = h / (w / DESIGN_W);
          }
          this.viewH = height;
          this.navH = height < 740 ? 60 : 64;
          this.contentBottom = height - this.navH;
        }
        getScale() {
          return clamp(
            (this.contentBottom - 93) / 555,
            0.88,
            1.13
          );
        }
        enter(payload) {
          const data = payload || {};
          const requested = data.districtId || gameState.getWorld().currentDistrictId || "university";
          if (citySystem.getDistrict(
            requested
          )) {
            this.districtId = requested;
            citySystem.setCurrentDistrict(
              requested
            );
          }
          visualAssetSystem.loadGroup(
            "district"
          );
          visualAssetSystem.loadGroup(
            "premiumDistrict"
          );
        }
        exit() {
          this.buttons = [];
        }
        update() {
        }
        addButton(id, x, y, w, h) {
          const hitW = Math.max(
            42,
            w
          );
          const hitH = Math.max(
            38,
            h
          );
          this.buttons.push({
            id,
            x: x - (hitW - w) / 2,
            y: y - (hitH - h) / 2,
            w: hitW,
            h: hitH
          });
        }
        hitButton(x, y) {
          for (let i = this.buttons.length - 1; i >= 0; i--) {
            const b = this.buttons[i];
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
              return b;
            }
          }
          return null;
        }
        drawHeader(ctx2, insight) {
          ui.coverImage(
            ctx2,
            visualAssetSystem.get(
              "premium_district_header"
            ) || visualAssetSystem.get(
              "visual_district_banner"
            ),
            0,
            0,
            DESIGN_W,
            92,
            0,
            "rgba(3,33,50,0.43)"
          );
          ctx2.fillStyle = "rgba(4,35,54,0.33)";
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            92
          );
          ui.card(
            ctx2,
            8,
            14,
            39,
            39,
            {
              radius: 11,
              fill: "rgba(6,48,69,0.88)",
              stroke: "rgba(255,255,255,0.34)",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u2039",
            27.5,
            33.5,
            22,
            "#FFE69B",
            "800",
            "center"
          );
          this.addButton(
            "back",
            4,
            10,
            47,
            47
          );
          ui.text(
            ctx2,
            insight.name,
            58,
            23,
            16,
            COLORS.white,
            "800"
          );
          ui.text(
            ctx2,
            "\u{1F4CD} \u57CE\u5E02\u6838\u5FC3\u5546\u5708 \xB7 \u4EBA\u6C14\u65FA\u76DB \xB7 \u6F5C\u529B\u6301\u7EED\u53D8\u5316",
            58,
            48,
            6.6,
            "#DDEBF0",
            "600"
          );
          ui.card(
            ctx2,
            298,
            16,
            80,
            37,
            {
              radius: 18,
              fill: COLORS.gold,
              stroke: "#FFE29A",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u67E5\u770B\u623F\u6E90 \u203A",
            338,
            34.5,
            7.3,
            COLORS.text,
            "800",
            "center"
          );
          this.addButton(
            "market",
            291,
            9,
            94,
            51
          );
          ui.card(
            ctx2,
            7,
            64,
            376,
            24,
            {
              radius: 11,
              fill: "rgba(4,38,58,0.90)",
              stroke: "rgba(78,192,235,0.34)",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u{1F4E3} \u57CE\u5E02\u52A8\u6001",
            14,
            76,
            6.7,
            "#FFD264",
            "800"
          );
          const event = insight.events && insight.events[0];
          ui.text(
            ctx2,
            event ? event.name || "\u533A\u57DF\u5BA2\u6D41\u6301\u7EED\u4E0A\u5347" : "\u533A\u57DF\u5BA2\u6D41\u6301\u7EED\u53D8\u5316 \xB7 \u5546\u4E1A\u914D\u5957\u52A8\u6001\u8C03\u6574",
            86,
            76,
            6.1,
            COLORS.white,
            "600"
          );
        }
        drawMetrics(ctx2, insight) {
          const sy = this.getScale();
          const y = 96;
          const h = 82 * sy;
          const cards = [
            {
              label: "\u6D3B\u8DC3\u4EBA\u53E3",
              value: insight.population.toLocaleString(),
              trend: (insight.populationDelta >= 0 ? "\u2191 +" : "\u2193 ") + Math.abs(
                insight.populationDelta
              ).toLocaleString(),
              color: COLORS.blue,
              note: "\u5B9E\u65F6\u5BA2\u6D41\u4E0E\u5E38\u4F4F\u4EBA\u53E3\u8054\u52A8",
              icon: "\u{1F465}"
            },
            {
              label: "\u5F53\u524D\u9700\u6C42",
              value: insight.currentDemand.toLocaleString(),
              trend: (insight.demandDeltaRatio >= 0 ? "\u2191 +" : "\u2193 ") + Math.abs(
                Math.round(
                  insight.demandDeltaRatio * 100
                )
              ) + "%",
              color: COLORS.red,
              note: "\u9910\u996E\u9700\u6C42\u968F\u4E8B\u4EF6\u52A8\u6001\u53D8\u5316",
              icon: "\u25A5"
            },
            {
              label: "\u5E73\u5747\u5BA2\u5355",
              value: money(
                insight.avgSpend
              ),
              trend: insight.competitionLabel,
              color: COLORS.green,
              note: "\u6D88\u8D39\u6C34\u5E73\u4E0E\u5BA2\u7FA4\u5B9E\u65F6\u8054\u52A8",
              icon: "\u25CE"
            }
          ];
          const gap = 5;
          const w = (370 - gap * 2) / 3;
          for (let i = 0; i < 3; i++) {
            const item = cards[i];
            const x = 10 + i * (w + gap);
            ui.card(
              ctx2,
              x,
              y,
              w,
              h,
              {
                radius: 13,
                fill: COLORS.panel
              }
            );
            ui.text(
              ctx2,
              item.icon,
              x + 12,
              y + 18,
              12,
              item.color,
              "800"
            );
            ui.text(
              ctx2,
              item.label,
              x + 36,
              y + 17,
              7,
              COLORS.text,
              "800"
            );
            ui.text(
              ctx2,
              item.value,
              x + 11,
              y + 44,
              14,
              item.color,
              "800"
            );
            ui.text(
              ctx2,
              item.trend,
              x + 11,
              y + 61,
              6.3,
              item.color,
              "700"
            );
            if (h > 76) {
              ui.text(
                ctx2,
                item.note,
                x + 11,
                y + h - 8,
                5.1,
                COLORS.muted,
                "500"
              );
            }
          }
        }
        drawCustomers(ctx2, insight) {
          const sy = this.getScale();
          const y = 184 * sy - 82 * (sy - 1);
          const h = 130 * sy;
          ui.card(
            ctx2,
            10,
            y,
            370,
            h,
            {
              radius: 15,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            "\u6D88\u8D39\u4EBA\u7FA4\u7ED3\u6784",
            21,
            y + 20,
            10.5,
            COLORS.text,
            "800"
          );
          ui.text(
            ctx2,
            "\u591A\u5143\u5BA2\u7FA4 \xB7 \u5546\u673A\u6C47\u805A",
            362,
            y + 20,
            6.4,
            COLORS.orange,
            "700",
            "right"
          );
          const groups = insight.customerGroups.slice(
            0,
            4
          );
          const avatars = [
            "premium_avatar_1",
            "premium_avatar_2",
            "premium_avatar_3",
            "premium_avatar_4"
          ];
          const rowGap = Math.max(
            24,
            (h - 42) / 4
          );
          for (let i = 0; i < groups.length; i++) {
            const g = groups[i];
            const cy = y + 44 + i * rowGap;
            ui.coverImage(
              ctx2,
              visualAssetSystem.get(
                avatars[i]
              ),
              20,
              cy - 11,
              24,
              24,
              12,
              null
            );
            ui.text(
              ctx2,
              g.name,
              53,
              cy,
              7.7,
              COLORS.text,
              "800"
            );
            ui.text(
              ctx2,
              CUSTOMER_NOTES[g.name] || "\u6D88\u8D39\u504F\u597D\u968F\u5546\u5708\u52A8\u6001\u53D8\u5316",
              91,
              cy,
              5.6,
              COLORS.muted,
              "500"
            );
            const barX = 160;
            const barW = 120;
            ui.card(
              ctx2,
              barX,
              cy - 5,
              barW,
              10,
              {
                radius: 5,
                fill: "#ECE6DC",
                stroke: false,
                shadow: false
              }
            );
            ui.card(
              ctx2,
              barX,
              cy - 5,
              Math.max(
                8,
                barW * Math.min(
                  1,
                  g.share
                )
              ),
              10,
              {
                radius: 5,
                fill: i === 0 ? COLORS.gold : "#53A9CE",
                stroke: false,
                shadow: false
              }
            );
            ui.text(
              ctx2,
              pct(
                g.share
              ),
              318,
              cy,
              6.6,
              COLORS.text,
              "700",
              "right"
            );
            ui.text(
              ctx2,
              Math.round(
                g.demand
              ) + "\u4EBA",
              364,
              cy,
              6.6,
              COLORS.text,
              "800",
              "right"
            );
          }
        }
        drawMeals(ctx2, insight) {
          const sy = this.getScale();
          const y = 321 * sy - 82 * (sy - 1);
          const h = 113 * sy;
          ui.card(
            ctx2,
            10,
            y,
            370,
            h,
            {
              radius: 15,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            "\u65F6\u6BB5\u9700\u6C42\u7ED3\u6784",
            21,
            y + 20,
            10.5,
            COLORS.text,
            "800"
          );
          ui.text(
            ctx2,
            "\u5348\u9910\u4E0E\u665A\u9910\u901A\u5E38\u662F\u6838\u5FC3\u65F6\u6BB5",
            365,
            y + 20,
            6.2,
            COLORS.orange,
            "700",
            "right"
          );
          const meals = insight.mealProfile.slice(
            0,
            5
          );
          const max = Math.max(
            0.01,
            ...meals.map(
              (item) => item.share
            )
          );
          const baseY = y + h - 34;
          for (let i = 0; i < meals.length; i++) {
            const m = meals[i];
            const x = 25 + i * 72;
            const barH = 17 + Math.min(
              51,
              49 * (m.share / max)
            );
            ui.card(
              ctx2,
              x,
              baseY - barH,
              41,
              barH,
              {
                radius: 7,
                fill: i === 1 || i === 3 ? "#F17B39" : "#4BA8D0",
                stroke: false,
                shadow: false
              }
            );
            ui.text(
              ctx2,
              pct(
                m.share
              ),
              x + 20.5,
              baseY - barH - 8,
              6.8,
              i === 1 || i === 3 ? "#B94E21" : COLORS.text,
              "800",
              "center"
            );
            ui.text(
              ctx2,
              MEAL_NAMES[m.id] || m.id,
              x + 20.5,
              baseY + 9,
              6.5,
              COLORS.text,
              "800",
              "center"
            );
            ui.text(
              ctx2,
              MEAL_TIMES[m.id] || "",
              x + 20.5,
              baseY + 23,
              5,
              COLORS.muted,
              "500",
              "center"
            );
          }
        }
        drawMarket(ctx2, insight) {
          const sy = this.getScale();
          const y = 440 * sy - 82 * (sy - 1);
          const h = 76 * sy;
          ui.card(
            ctx2,
            10,
            y,
            370,
            h,
            {
              radius: 15,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            "\u7ECF\u8425\u73AF\u5883",
            21,
            y + 20,
            10.5,
            COLORS.text,
            "800"
          );
          const market = insight.market || {};
          const items = [
            [
              "\u9910\u996E\u5E97",
              insight.restaurantCount + "\u5BB6",
              COLORS.navy
            ],
            [
              "\u7ADE\u4E89\u5F3A\u5EA6",
              insight.competitionLabel,
              COLORS.red
            ],
            [
              "\u79DF\u91D1",
              insight.rentLevel + "\xB7" + insight.rentIndex.toFixed(
                2
              ),
              COLORS.navy
            ],
            [
              "\u6302\u724C\u623F\u6E90",
              (market.activeListingCount || 0) + "\u5957",
              COLORS.blue
            ],
            [
              "\u5546\u5708\u9971\u548C\u5EA6",
              insight.saturation + "%",
              insight.saturation >= 95 ? COLORS.red : COLORS.green
            ]
          ];
          for (let i = 0; i < items.length; i++) {
            const x = 21 + i * 71;
            ui.text(
              ctx2,
              items[i][0],
              x,
              y + 45,
              5.6,
              COLORS.muted,
              "600"
            );
            ui.text(
              ctx2,
              items[i][1],
              x,
              y + 62,
              7.1,
              items[i][2],
              "800"
            );
          }
        }
        drawFit(ctx2, insight) {
          const sy = this.getScale();
          const ctaH = 43;
          const h = 72 * sy;
          const ctaY = this.contentBottom - ctaH - 7;
          const y = ctaY - h - 7;
          ui.card(
            ctx2,
            10,
            y,
            370,
            h,
            {
              radius: 15,
              fill: "#FFF9E9",
              stroke: "#E9CB78"
            }
          );
          ui.text(
            ctx2,
            "\u7ECF\u8425\u9002\u914D",
            21,
            y + 18,
            9.4,
            COLORS.text,
            "800"
          );
          const hints = insight.businessHints.slice(
            0,
            5
          );
          for (let i = 0; i < hints.length; i++) {
            const x = 18 + i * 72;
            ui.pill(
              ctx2,
              hints[i],
              x,
              y + 29,
              66,
              22,
              "#FFF1CF",
              COLORS.text,
              "#E9C873"
            );
          }
          ui.text(
            ctx2,
            "\u5339\u914D\u7ED3\u679C\u4F1A\u968F\u5BA2\u7FA4\u3001\u7ADE\u4E89\u3001\u79DF\u91D1\u4E0E\u57CE\u5E02\u4E8B\u4EF6\u6301\u7EED\u53D8\u5316\u3002",
            22,
            y + h - 10,
            5.7,
            COLORS.muted,
            "600"
          );
          ui.card(
            ctx2,
            12,
            ctaY,
            113,
            35,
            {
              radius: 17,
              fill: "#FFFDF7",
              stroke: "#D5C9BA",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u2606 \u6536\u85CF\u5546\u5708",
            68.5,
            ctaY + 17.5,
            7.3,
            COLORS.navy,
            "800",
            "center"
          );
          ui.card(
            ctx2,
            133,
            ctaY,
            245,
            35,
            {
              radius: 17,
              fill: COLORS.gold,
              stroke: "#DE9F1E",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u{1F4CD} \u9009\u62E9\u8BE5\u5546\u5708\u5F00\u5E97  \u203A",
            255.5,
            ctaY + 17.5,
            8.1,
            COLORS.text,
            "800",
            "center"
          );
          this.addButton(
            "open-here",
            128,
            ctaY - 4,
            255,
            43
          );
        }
        render(ctx2) {
          if (!ctx2) {
            return;
          }
          this.getLayout();
          const insight = districtInsightSystem.getInsight(
            this.districtId
          );
          if (!insight) {
            sceneManager.switchTo(
              "city"
            );
            return;
          }
          this.buttons = [];
          ctx2.save();
          ctx2.fillStyle = COLORS.paper;
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            this.viewH
          );
          this.drawHeader(
            ctx2,
            insight
          );
          this.drawMetrics(
            ctx2,
            insight
          );
          this.drawCustomers(
            ctx2,
            insight
          );
          this.drawMeals(
            ctx2,
            insight
          );
          this.drawMarket(
            ctx2,
            insight
          );
          this.drawFit(
            ctx2,
            insight
          );
          ctx2.restore();
        }
        handleTap(x, y) {
          const item = this.hitButton(
            x,
            y
          );
          if (!item) {
            return false;
          }
          if (item.id === "back") {
            sceneManager.switchTo(
              "city"
            );
            return true;
          }
          if (item.id === "market" || item.id === "open-here") {
            sceneManager.switchTo(
              "propertyMarket",
              {
                districtId: this.districtId,
                source: "district"
              }
            );
            return true;
          }
          return false;
        }
      };
      module.exports = new DistrictScene();
    }
  });

  // src/scenes/renovationScene.js
  var require_renovationScene = __commonJS({
    "src/scenes/renovationScene.js"(exports, module) {
      "use strict";
      var runtime = globalThis.GameRuntime;
      if (!runtime) {
        throw new Error(
          "RenovationScene\uFF1AGameRuntime \u672A\u521D\u59CB\u5316"
        );
      }
      var api = runtime.api || {};
      var gameState = require_gameState();
      var sceneManager = require_sceneManager();
      var renovationSystem = require_renovationSystem();
      var renovationConfig = require_renovationConfig();
      var customizationSystem = require_customizationSystem();
      var textInput = require_textInput();
      var visualAssetSystem = require_visualAssetSystem();
      var ui = require_premiumUi();
      var DESIGN_W = 390;
      var COLORS = {
        navy: "#0A3A57",
        navyDeep: "#062A40",
        paper: "#F6EFE2",
        panel: "#FFFDF8",
        text: "#18374B",
        muted: "#708188",
        gold: "#F5B62D",
        orange: "#E57D22",
        red: "#D75349",
        green: "#2B9A69",
        blue: "#2E8FB7",
        white: "#FFFFFF"
      };
      function money(value) {
        return "\xA5" + Math.max(
          0,
          Math.round(
            Number(value) || 0
          )
        ).toLocaleString();
      }
      function clamp(value, min, max) {
        return Math.max(
          min,
          Math.min(
            max,
            value
          )
        );
      }
      var RenovationScene = class {
        constructor() {
          this.id = "renovation";
          this.shopId = null;
          this.page = "layout";
          this.viewH = 780;
          this.navH = 64;
          this.contentBottom = 716;
          this.buttons = [];
        }
        enter(payload) {
          const data = payload || {};
          if (data.shopId) {
            this.shopId = data.shopId;
          }
          const business = gameState.getBusiness();
          if (!this.shopId && business.currentShopId) {
            this.shopId = business.currentShopId;
          }
          renovationSystem.ensurePlan(
            this.shopId
          );
          this.page = [
            "layout",
            "rooms",
            "style",
            "templates"
          ].includes(
            data.page
          ) ? data.page : "layout";
          visualAssetSystem.loadGroup(
            "renovation"
          );
          visualAssetSystem.loadGroup(
            "premiumRenovation"
          );
        }
        exit() {
          this.buttons = [];
        }
        update() {
          if (this.shopId) {
            renovationSystem.updateShop(
              this.shopId
            );
          }
        }
        getLayout() {
          let height = 780;
          if (api && typeof api.getSystemInfoSync === "function") {
            const info = api.getSystemInfoSync();
            const w = Math.max(
              1,
              Number(
                info.windowWidth
              ) || DESIGN_W
            );
            const h = Math.max(
              1,
              Number(
                info.windowHeight
              ) || 780
            );
            height = h / (w / DESIGN_W);
          }
          this.viewH = height;
          this.navH = height < 740 ? 60 : 64;
          this.contentBottom = height - this.navH;
        }
        getScale() {
          return clamp(
            (this.contentBottom - 82) / 560,
            0.88,
            1.13
          );
        }
        showToast(title) {
          if (api && typeof api.showToast === "function") {
            api.showToast({
              title,
              icon: "none"
            });
          }
        }
        addButton(id, x, y, w, h) {
          const hitW = Math.max(
            42,
            w
          );
          const hitH = Math.max(
            38,
            h
          );
          this.buttons.push({
            id,
            x: x - (hitW - w) / 2,
            y: y - (hitH - h) / 2,
            w: hitW,
            h: hitH
          });
        }
        hitButton(x, y) {
          for (let i = this.buttons.length - 1; i >= 0; i--) {
            const b = this.buttons[i];
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
              return b;
            }
          }
          return null;
        }
        getShop() {
          const business = gameState.getBusiness();
          return business.shops.find(
            (item) => item.id === this.shopId
          ) || null;
        }
        getPlan() {
          return renovationSystem.ensurePlan(
            this.shopId
          );
        }
        getMetrics() {
          return renovationSystem.getMetrics(
            this.shopId
          );
        }
        getName(list, id) {
          const item = list.find(
            (value) => value.id === id
          );
          return item ? item.name : id;
        }
        drawVisual(ctx2, key, x, y, w, h, alpha) {
          const image = visualAssetSystem.get(
            key
          );
          if (!image) {
            return false;
          }
          ctx2.save();
          if (Number.isFinite(
            Number(
              alpha
            )
          )) {
            ctx2.globalAlpha = alpha;
          }
          ui.coverImage(
            ctx2,
            image,
            x,
            y,
            w,
            h,
            7,
            null
          );
          ctx2.restore();
          return true;
        }
        drawHeader(ctx2, shop) {
          ui.coverImage(
            ctx2,
            visualAssetSystem.get(
              "premium_reno_header"
            ),
            0,
            0,
            DESIGN_W,
            80,
            0,
            "rgba(3,31,47,0.40)"
          );
          ctx2.fillStyle = "rgba(4,34,50,0.34)";
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            80
          );
          ui.card(
            ctx2,
            8,
            13,
            38,
            38,
            {
              radius: 11,
              fill: "rgba(5,48,68,0.88)",
              stroke: "rgba(255,255,255,0.30)",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u2039",
            27,
            32,
            22,
            "#FFE59B",
            "800",
            "center"
          );
          this.addButton(
            "back",
            4,
            9,
            46,
            46
          );
          ui.text(
            ctx2,
            shop.name || "\u6211\u7684\u9152\u697C",
            56,
            20,
            15.5,
            COLORS.white,
            "800"
          );
          ui.text(
            ctx2,
            "\u{1F4CD} " + shop.address,
            56,
            42,
            6.7,
            "#DDEBF0",
            "600"
          );
          ui.text(
            ctx2,
            "\u7528\u5FC3\u6253\u9020\uFF0C\u8BA9\u7F8E\u5473\u66F4\u6709\u6E29\u5EA6\uFF01",
            56,
            62,
            6.6,
            "#FFE1A0",
            "600"
          );
          this.addButton(
            "shop:rename",
            52,
            8,
            186,
            57
          );
          ui.card(
            ctx2,
            296,
            10,
            86,
            29,
            {
              radius: 13,
              fill: COLORS.gold,
              stroke: "#FFE19A",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u{1F4BE} \u4FDD\u5B58\u6A21\u677F",
            339,
            24.5,
            6.6,
            COLORS.text,
            "800",
            "center"
          );
          this.addButton(
            "template:save",
            291,
            6,
            96,
            37
          );
          ui.card(
            ctx2,
            296,
            43,
            86,
            27,
            {
              radius: 12,
              fill: "#FFFDF7",
              stroke: "#D7CDBF",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u25A7 \u53E6\u5B58\u6A21\u677F",
            339,
            56.5,
            6.4,
            COLORS.navy,
            "800",
            "center"
          );
          this.addButton(
            "template:save-as",
            291,
            39,
            96,
            35
          );
        }
        drawTemplateStrip(ctx2) {
          const sy = this.getScale();
          const y = 84;
          const h = 95 * sy;
          ui.card(
            ctx2,
            8,
            y,
            374,
            h,
            {
              radius: 14,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            "\u88C5\u4FEE\u6A21\u677F",
            20,
            y + 19,
            10.4,
            COLORS.text,
            "800"
          );
          ui.text(
            ctx2,
            "\u9009\u62E9\u5FC3\u4EEA\u98CE\u683C\uFF0C\u6216\u4FDD\u5B58\u60A8\u7684\u4E13\u5C5E\u6A21\u677F",
            82,
            y + 19,
            5.9,
            COLORS.muted,
            "500"
          );
          ui.text(
            ctx2,
            "\u6A21\u677F\u7BA1\u7406 \u203A",
            370,
            y + 19,
            6,
            COLORS.navy,
            "700",
            "right"
          );
          this.addButton(
            "page:templates",
            305,
            y + 3,
            73,
            29
          );
          const templates = customizationSystem.getTemplateList();
          const keys = [
            "premium_template_1",
            "premium_template_2",
            "premium_template_3"
          ];
          const cardY = y + 28;
          const cardH = h - 36;
          for (let i = 0; i < 4; i++) {
            const x = 14 + i * 91;
            ui.card(
              ctx2,
              x,
              cardY,
              84,
              cardH,
              {
                radius: 9,
                fill: i === 0 ? "#FFF7DD" : "#FFF9F0",
                stroke: i === 0 ? "#E7B62B" : "#DED4C7",
                shadow: false
              }
            );
            if (i < 3) {
              this.drawVisual(
                ctx2,
                keys[i],
                x + 3,
                cardY + 3,
                78,
                Math.max(
                  33,
                  cardH - 19
                ),
                1
              );
              ui.text(
                ctx2,
                templates[i] ? templates[i].name : "\u88C5\u4FEE\u6A21\u677F" + String.fromCharCode(
                  65 + i
                ),
                x + 5,
                cardY + cardH - 7,
                5.8,
                COLORS.text,
                "700"
              );
              this.addButton(
                templates[i] ? "template:apply:" + templates[i].id : "page:templates",
                x,
                cardY,
                84,
                cardH
              );
            } else {
              ui.text(
                ctx2,
                "+",
                x + 42,
                cardY + cardH * 0.42,
                17,
                "#9B8F83",
                "500",
                "center"
              );
              ui.text(
                ctx2,
                "\u65B0\u5EFA\u6A21\u677F",
                x + 42,
                cardY + cardH * 0.72,
                6,
                COLORS.navy,
                "700",
                "center"
              );
              this.addButton(
                "template:save-as",
                x,
                cardY,
                84,
                cardH
              );
            }
          }
        }
        drawFloorPlan(ctx2, metrics, floor) {
          const sy = this.getScale();
          const y = 184 * sy - 80 * (sy - 1);
          const h = 256 * sy;
          ui.card(
            ctx2,
            8,
            y,
            374,
            h,
            {
              radius: 15,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            "\u9910\u5385\u5E73\u9762\u56FE",
            20,
            y + 19,
            10.5,
            COLORS.text,
            "800"
          );
          ui.text(
            ctx2,
            "\u8C03\u6574\u533A\u57DF\u4E0E\u5BB6\u5177\uFF0C\u6253\u9020\u7406\u60F3\u9910\u5385\u5E03\u5C40",
            84,
            y + 19,
            5.8,
            COLORS.muted,
            "500"
          );
          ui.text(
            ctx2,
            "\u21B6",
            271,
            y + 19,
            10,
            COLORS.navy,
            "800",
            "center"
          );
          ui.text(
            ctx2,
            "\u21B7",
            299,
            y + 19,
            10,
            COLORS.navy,
            "800",
            "center"
          );
          this.addButton(
            "history:undo",
            257,
            y + 4,
            29,
            29
          );
          this.addButton(
            "history:redo",
            285,
            y + 4,
            29,
            29
          );
          ui.card(
            ctx2,
            318,
            y + 6,
            55,
            26,
            {
              radius: 10,
              fill: "#FFF8E6",
              stroke: "#E5C56F",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u5168\u5C4F\u9884\u89C8",
            345.5,
            y + 19,
            5.8,
            COLORS.navy,
            "800",
            "center"
          );
          this.addButton(
            "preview",
            314,
            y + 2,
            63,
            34
          );
          const px = 15;
          const py = y + 37;
          const pw = 286;
          const ph = h - 45;
          ui.coverImage(
            ctx2,
            visualAssetSystem.get(
              "premium_floor_texture"
            ),
            px,
            py,
            pw,
            ph,
            9,
            "rgba(255,249,240,0.48)"
          );
          const serviceW = pw * 0.44;
          const roomW = pw * 0.3;
          ctx2.save();
          ctx2.beginPath();
          ctx2.roundRect(
            px,
            py,
            pw,
            ph,
            9
          );
          ctx2.clip();
          ctx2.fillStyle = "rgba(72,78,79,0.32)";
          ctx2.fillRect(
            px,
            py,
            serviceW,
            ph * 0.39
          );
          ctx2.fillStyle = "rgba(109,104,85,0.28)";
          ctx2.fillRect(
            px + serviceW,
            py,
            pw - serviceW - roomW,
            ph * 0.39
          );
          ctx2.fillStyle = "rgba(246,240,228,0.68)";
          ctx2.fillRect(
            px,
            py + ph * 0.39,
            pw - roomW,
            ph * 0.61
          );
          ctx2.fillStyle = "rgba(224,197,146,0.40)";
          ctx2.fillRect(
            px + pw - roomW,
            py,
            roomW,
            ph
          );
          ctx2.restore();
          ui.text(
            ctx2,
            "\u{1F468}\u200D\u{1F373} \u540E\u53A8",
            px + serviceW / 2,
            py + 17,
            7,
            COLORS.white,
            "800",
            "center"
          );
          ui.text(
            ctx2,
            "\u2B21 \u4ED3\u50A8",
            px + serviceW + (pw - serviceW - roomW) / 2,
            py + 17,
            7,
            COLORS.white,
            "800",
            "center"
          );
          ui.text(
            ctx2,
            "\u265F \u670D\u52A1\u533A",
            px + 45,
            py + ph * 0.56,
            6.5,
            COLORS.text,
            "700",
            "center"
          );
          ui.text(
            ctx2,
            "\u{1F374} \u5802\u98DF\u533A",
            px + 146,
            py + ph * 0.73,
            6.8,
            COLORS.text,
            "800",
            "center"
          );
          this.drawVisual(
            ctx2,
            "visual_stove",
            px + 11,
            py + 29,
            serviceW * 0.52,
            ph * 0.23,
            0.98
          );
          this.drawVisual(
            ctx2,
            "visual_fridge",
            px + serviceW * 0.6,
            py + 29,
            serviceW * 0.29,
            ph * 0.23,
            0.98
          );
          const rooms = floor.privateRooms.slice(
            0,
            3
          );
          for (let i = 0; i < 3; i++) {
            const ry = py + 6 + i * (ph / 3);
            ui.card(
              ctx2,
              px + pw - roomW + 5,
              ry,
              roomW - 10,
              ph / 3 - 10,
              {
                radius: 6,
                fill: "rgba(255,236,190,0.76)",
                stroke: "#D5A958",
                shadow: false
              }
            );
            ui.text(
              ctx2,
              rooms[i] ? rooms[i].name : "\u5305\u53A2\u540D\u79F0" + (i + 1),
              px + pw - roomW / 2,
              ry + 13,
              5.8,
              COLORS.text,
              "700",
              "center"
            );
            this.drawVisual(
              ctx2,
              "visual_table_8",
              px + pw - roomW / 2 - 20,
              ry + 20,
              40,
              Math.max(
                27,
                ph / 3 - 36
              ),
              0.98
            );
            if (rooms[i]) {
              this.addButton(
                "room:rename:" + rooms[i].id,
                px + pw - roomW + 5,
                ry,
                roomW - 10,
                ph / 3 - 10
              );
            }
          }
          const tableKeys = [
            "2",
            "4",
            "6",
            "8"
          ];
          let tableIndex = 0;
          for (let k = 0; k < tableKeys.length; k++) {
            const key = tableKeys[k];
            const count = Math.min(
              floor.tables[key] || 0,
              10
            );
            for (let i = 0; i < count; i++) {
              const col = tableIndex % 3;
              const row = Math.floor(
                tableIndex / 3
              );
              const tx = px + 91 + col * 47;
              const ty = py + ph * 0.45 + row * 39;
              if (ty > py + ph - 31) {
                break;
              }
              this.drawVisual(
                ctx2,
                "visual_table_" + key,
                tx,
                ty,
                key === "2" ? 27 : key === "4" ? 31 : key === "6" ? 34 : 37,
                26,
                0.98
              );
              tableIndex += 1;
            }
          }
          const toolbox = [
            [
              "style:hall",
              "\u{1F6CB}",
              "\u5927\u5385\u98CE\u683C"
            ],
            [
              "style:lighting",
              "\u{1F4A1}",
              "\u706F\u5149"
            ],
            [
              "style:material",
              "\u25B1",
              "\u6750\u6599"
            ],
            [
              "page:rooms",
              "\u{1F6AA}",
              "\u5305\u53A2"
            ],
            [
              "page:layout",
              "\u{1FA91}",
              "\u684C\u6905"
            ],
            [
              "floor:next",
              "\u25B0",
              "\u697C\u5C42 " + (metrics.plan.activeFloor + 1) + "F"
            ]
          ];
          const toolX = 307;
          const toolW = 67;
          const toolH = (ph - 25) / 6;
          for (let i = 0; i < toolbox.length; i++) {
            const ty = py + i * (toolH + 5);
            ui.card(
              ctx2,
              toolX,
              ty,
              toolW,
              toolH,
              {
                radius: 9,
                fill: "#FFF9EE",
                stroke: "#DCCFBE",
                shadow: false
              }
            );
            ui.text(
              ctx2,
              toolbox[i][1],
              toolX + 17,
              ty + toolH / 2,
              9.2,
              COLORS.navy,
              "800",
              "center"
            );
            ui.text(
              ctx2,
              toolbox[i][2],
              toolX + 45,
              ty + toolH / 2,
              5.4,
              COLORS.text,
              "700",
              "center"
            );
            this.addButton(
              toolbox[i][0],
              toolX,
              ty,
              toolW,
              toolH
            );
          }
        }
        drawTablePicker(ctx2, floor) {
          const sy = this.getScale();
          const y = 446 * sy - 80 * (sy - 1);
          const h = 112 * sy;
          ui.card(
            ctx2,
            8,
            y,
            203,
            h,
            {
              radius: 13,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            "\u9910\u684C\u7C7B\u578B",
            18,
            y + 18,
            9.5,
            COLORS.text,
            "800"
          );
          const keys = [
            "2",
            "4",
            "6",
            "8"
          ];
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const x = 15 + i * 48;
            this.drawVisual(
              ctx2,
              "visual_table_" + key,
              x,
              y + 28,
              40,
              Math.max(
                35,
                h - 67
              ),
              0.98
            );
            ui.text(
              ctx2,
              key + "\u4EBA\u684C",
              x + 20,
              y + h - 29,
              5.7,
              COLORS.text,
              "700",
              "center"
            );
            ui.text(
              ctx2,
              "\u2212  " + (floor.tables[key] || 0) + "  +",
              x + 20,
              y + h - 11,
              6,
              COLORS.navy,
              "800",
              "center"
            );
            this.addButton(
              "table:" + key + ":minus",
              x - 3,
              y + h - 25,
              20,
              27
            );
            this.addButton(
              "table:" + key + ":plus",
              x + 24,
              y + h - 25,
              20,
              27
            );
          }
        }
        drawMetrics(ctx2, metrics) {
          const sy = this.getScale();
          const y = 446 * sy - 80 * (sy - 1);
          const h = 112 * sy;
          ui.card(
            ctx2,
            218,
            y,
            164,
            h,
            {
              radius: 13,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            "\u88C5\u4FEE\u6570\u636E\u9884\u89C8",
            230,
            y + 18,
            9.2,
            COLORS.text,
            "800"
          );
          const items = [
            [
              "\u5EA7\u4F4D\u6570",
              metrics.totalSeats,
              COLORS.green
            ],
            [
              "\u9884\u7B97",
              money(
                metrics.totalCost
              ),
              COLORS.orange
            ],
            [
              "\u5DE5\u671F",
              metrics.buildDays + "\u5929",
              COLORS.red
            ],
            [
              "\u8212\u9002\u5EA6",
              Math.round(
                metrics.comfort * 100
              ),
              "#D94E6A"
            ],
            [
              "\u5438\u5F15\u529B",
              Math.round(
                metrics.appeal * 100
              ),
              "#DCA72B"
            ],
            [
              "\u8FD0\u8425\u6548\u7387",
              Math.round(
                metrics.operationalEfficiency * 100
              ),
              COLORS.blue
            ]
          ];
          for (let i = 0; i < items.length; i++) {
            const col = i % 3;
            const row = Math.floor(
              i / 3
            );
            const x = 226 + col * 52;
            const iy = y + 36 + row * ((h - 43) / 2);
            ui.text(
              ctx2,
              items[i][0],
              x,
              iy,
              5.4,
              COLORS.muted,
              "600"
            );
            ui.text(
              ctx2,
              String(
                items[i][1]
              ),
              x,
              iy + 17,
              7.4,
              items[i][2],
              "800"
            );
          }
        }
        drawFooter(ctx2, metrics) {
          const y = this.contentBottom - 43;
          ui.card(
            ctx2,
            10,
            y,
            94,
            34,
            {
              radius: 17,
              fill: "#FFFDF7",
              stroke: "#D8CABB",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u25C9 \u6548\u679C\u9884\u89C8",
            57,
            y + 17,
            7,
            COLORS.navy,
            "800",
            "center"
          );
          this.addButton(
            "preview",
            6,
            y - 4,
            102,
            42
          );
          ui.card(
            ctx2,
            112,
            y,
            268,
            34,
            {
              radius: 17,
              fill: metrics.valid ? COLORS.gold : "#D9D4CB",
              stroke: metrics.valid ? "#DB9F1F" : "#C4BCAF",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            metrics.valid ? "\u{1F528} \u786E\u8BA4\u65B9\u6848\u5E76\u5F00\u59CB\u65BD\u5DE5  \u203A" : "\u5F53\u524D\u5E03\u5C40\u5B58\u5728\u95EE\u9898\uFF0C\u6682\u4E0D\u80FD\u65BD\u5DE5",
            246,
            y + 17,
            8,
            metrics.valid ? COLORS.text : COLORS.muted,
            "800",
            "center"
          );
          if (metrics.valid) {
            this.addButton(
              "construction:start",
              106,
              y - 4,
              278,
              42
            );
          }
        }
        drawSecondaryHeader(ctx2, title, subtitle) {
          const sy = this.getScale();
          const y = 184 * sy - 80 * (sy - 1);
          ui.card(
            ctx2,
            8,
            y,
            374,
            41,
            {
              radius: 13,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            title,
            20,
            y + 14,
            10,
            COLORS.text,
            "800"
          );
          ui.text(
            ctx2,
            subtitle,
            20,
            y + 29,
            5.8,
            COLORS.muted,
            "500"
          );
          ui.card(
            ctx2,
            304,
            y + 8,
            65,
            25,
            {
              radius: 12,
              fill: "#FFF6E0",
              stroke: "#E4C477",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u8FD4\u56DE\u5E73\u9762\u56FE",
            336.5,
            y + 20.5,
            5.9,
            COLORS.navy,
            "800",
            "center"
          );
          this.addButton(
            "page:layout",
            298,
            y + 4,
            78,
            33
          );
          return y + 48;
        }
        renderRooms(ctx2, metrics, floor) {
          const y = this.drawSecondaryHeader(
            ctx2,
            "\u5305\u53A2\u7BA1\u7406",
            "\u6DFB\u52A0\u3001\u6539\u540D\u3001\u8C03\u6574\u4EBA\u6570\u548C\u98CE\u683C"
          );
          const bottom = this.contentBottom - 12;
          const available = bottom - y;
          const rooms = floor.privateRooms;
          const rowH = Math.max(
            56,
            Math.min(
              74,
              available / Math.max(
                1,
                Math.min(
                  rooms.length + 1,
                  6
                )
              )
            )
          );
          let drawY = y;
          for (let i = 0; i < Math.min(
            rooms.length,
            5
          ); i++) {
            const room = rooms[i];
            ui.card(
              ctx2,
              10,
              drawY,
              370,
              rowH - 6,
              {
                radius: 12,
                fill: "#FFF9EF",
                stroke: "#DDD2C3",
                shadow: false
              }
            );
            this.drawVisual(
              ctx2,
              "visual_table_8",
              19,
              drawY + 7,
              47,
              rowH - 20,
              0.98
            );
            ui.text(
              ctx2,
              room.name,
              76,
              drawY + 18,
              8.2,
              COLORS.text,
              "800"
            );
            ui.text(
              ctx2,
              room.seats + "\u4EBA \xB7 " + this.getName(
                renovationConfig.privateRoomStyles,
                room.style
              ),
              76,
              drawY + 38,
              6.2,
              COLORS.muted,
              "600"
            );
            const controls = [
              [
                "room:rename:" + room.id,
                "\u6539\u540D"
              ],
              [
                "room:seats:" + room.id,
                "\u4EBA\u6570"
              ],
              [
                "room:style:" + room.id,
                "\u98CE\u683C"
              ],
              [
                "room:remove:" + room.id,
                "\u5220\u9664"
              ]
            ];
            for (let j = 0; j < controls.length; j++) {
              const x = 196 + j * 43;
              ui.card(
                ctx2,
                x,
                drawY + 14,
                38,
                27,
                {
                  radius: 10,
                  fill: j === 3 ? "#FFF0EB" : "#FFF5D9",
                  stroke: j === 3 ? "#E8B1A8" : "#E1C16D",
                  shadow: false
                }
              );
              ui.text(
                ctx2,
                controls[j][1],
                x + 19,
                drawY + 27.5,
                5.7,
                j === 3 ? COLORS.red : COLORS.navy,
                "800",
                "center"
              );
              this.addButton(
                controls[j][0],
                x - 3,
                drawY + 10,
                44,
                35
              );
            }
            drawY += rowH;
          }
          if (rooms.length < 8 && drawY < bottom - 45) {
            ui.card(
              ctx2,
              10,
              drawY,
              370,
              39,
              {
                radius: 14,
                fill: "#FFF8E4",
                stroke: "#E8C874",
                shadow: false
              }
            );
            ui.text(
              ctx2,
              "+ \u6DFB\u52A0\u4E00\u4E2A\u65B0\u5305\u53A2",
              195,
              drawY + 19.5,
              7.4,
              COLORS.navy,
              "800",
              "center"
            );
            this.addButton(
              "room:add",
              6,
              drawY - 3,
              378,
              45
            );
          }
        }
        renderStyle(ctx2, metrics) {
          const y = this.drawSecondaryHeader(
            ctx2,
            "\u88C5\u4FEE\u98CE\u683C",
            "\u5927\u5385\u3001\u6750\u6599\u548C\u706F\u5149\u5747\u4F1A\u8054\u52A8\u6210\u672C\u4E0E\u5438\u5F15\u529B"
          );
          const plan = metrics.plan;
          const rows = [
            {
              id: "style:hall",
              label: "\u5927\u5385\u98CE\u683C",
              value: this.getName(
                renovationConfig.hallStyles,
                plan.hallStyle
              ),
              key: "premium_template_1"
            },
            {
              id: "style:material",
              label: "\u88C5\u4FEE\u6750\u6599",
              value: this.getName(
                renovationConfig.materialGrades,
                plan.materialGrade
              ),
              key: "premium_template_2"
            },
            {
              id: "style:lighting",
              label: "\u706F\u5149\u6C1B\u56F4",
              value: this.getName(
                renovationConfig.lightingLevels,
                plan.lightingLevel
              ),
              key: "premium_template_3"
            }
          ];
          let drawY = y;
          for (let i = 0; i < rows.length; i++) {
            const item = rows[i];
            ui.card(
              ctx2,
              10,
              drawY,
              370,
              82,
              {
                radius: 14,
                fill: COLORS.panel
              }
            );
            this.drawVisual(
              ctx2,
              item.key,
              18,
              drawY + 8,
              96,
              66,
              1
            );
            ui.text(
              ctx2,
              item.label,
              128,
              drawY + 24,
              8.5,
              COLORS.text,
              "800"
            );
            ui.text(
              ctx2,
              item.value,
              128,
              drawY + 50,
              7.5,
              COLORS.orange,
              "700"
            );
            ui.card(
              ctx2,
              292,
              drawY + 23,
              69,
              34,
              {
                radius: 16,
                fill: COLORS.gold,
                stroke: "#DDA11F",
                shadow: false
              }
            );
            ui.text(
              ctx2,
              "\u5207\u6362 \u203A",
              326.5,
              drawY + 40,
              6.7,
              COLORS.text,
              "800",
              "center"
            );
            this.addButton(
              item.id,
              286,
              drawY + 18,
              81,
              44
            );
            drawY += 90;
          }
        }
        renderTemplates(ctx2) {
          const y = this.drawSecondaryHeader(
            ctx2,
            "\u6A21\u677F\u7BA1\u7406",
            "\u4FDD\u5B58\u3001\u5957\u7528\u3001\u6539\u540D\u6216\u5220\u9664\u4F60\u7684\u88C5\u4FEE\u6A21\u677F"
          );
          const templates = customizationSystem.getTemplateList();
          let drawY = y;
          if (!templates.length) {
            ui.card(
              ctx2,
              10,
              drawY,
              370,
              96,
              {
                radius: 14,
                fill: COLORS.panel
              }
            );
            ui.text(
              ctx2,
              "\u6682\u65F6\u8FD8\u6CA1\u6709\u81EA\u5B9A\u4E49\u6A21\u677F",
              195,
              drawY + 31,
              9,
              COLORS.text,
              "800",
              "center"
            );
            ui.text(
              ctx2,
              "\u70B9\u51FB\u9876\u90E8\u201C\u4FDD\u5B58\u6A21\u677F\u201D\u5373\u53EF\u4FDD\u5B58\u5F53\u524D\u88C5\u4FEE\u65B9\u6848\u3002",
              195,
              drawY + 57,
              6.3,
              COLORS.muted,
              "600",
              "center"
            );
            return;
          }
          for (let i = 0; i < Math.min(
            templates.length,
            6
          ); i++) {
            const item = templates[i];
            ui.card(
              ctx2,
              10,
              drawY,
              370,
              57,
              {
                radius: 12,
                fill: "#FFF9EF",
                stroke: "#DDD2C3",
                shadow: false
              }
            );
            ui.text(
              ctx2,
              item.name,
              22,
              drawY + 19,
              8.1,
              COLORS.text,
              "800"
            );
            ui.text(
              ctx2,
              item.sourceFloorCount + "\u5C42 \xB7 \u539F\u9762\u79EF " + Math.round(
                item.sourceArea
              ) + "\u33A1",
              22,
              drawY + 38,
              5.8,
              COLORS.muted,
              "600"
            );
            const actions = [
              [
                "template:apply:" + item.id,
                "\u5957\u7528"
              ],
              [
                "template:rename:" + item.id,
                "\u6539\u540D"
              ],
              [
                "template:delete:" + item.id,
                "\u5220\u9664"
              ]
            ];
            for (let j = 0; j < actions.length; j++) {
              const x = 239 + j * 44;
              ui.card(
                ctx2,
                x,
                drawY + 14,
                39,
                28,
                {
                  radius: 10,
                  fill: j === 2 ? "#FFF0EB" : "#FFF5D9",
                  stroke: j === 2 ? "#E7B0A6" : "#E1C16D",
                  shadow: false
                }
              );
              ui.text(
                ctx2,
                actions[j][1],
                x + 19.5,
                drawY + 28,
                5.7,
                j === 2 ? COLORS.red : COLORS.navy,
                "800",
                "center"
              );
              this.addButton(
                actions[j][0],
                x - 3,
                drawY + 10,
                45,
                36
              );
            }
            drawY += 64;
          }
        }
        renderConstruction(ctx2, shop, plan) {
          this.drawHeader(
            ctx2,
            shop
          );
          const construction = plan.construction;
          ui.card(
            ctx2,
            15,
            120,
            360,
            258,
            {
              radius: 18,
              fill: COLORS.panel
            }
          );
          ui.text(
            ctx2,
            plan.status === "completed" ? "\u88C5\u4FEE\u5DF2\u7ECF\u5B8C\u5DE5" : "\u88C5\u4FEE\u65BD\u5DE5\u4E2D",
            195,
            157,
            18,
            COLORS.text,
            "800",
            "center"
          );
          ui.text(
            ctx2,
            construction ? construction.contractor.name : "\u65BD\u5DE5\u56E2\u961F",
            195,
            192,
            8.3,
            COLORS.orange,
            "700",
            "center"
          );
          ui.text(
            ctx2,
            construction ? "\u5DF2\u652F\u4ED8 " + money(
              construction.paid
            ) + " \xB7 \u9884\u8BA1 " + construction.contractor.days + " \u5929" : "",
            195,
            222,
            7,
            COLORS.muted,
            "600",
            "center"
          );
          ui.card(
            ctx2,
            45,
            256,
            300,
            12,
            {
              radius: 6,
              fill: "#E7E0D5",
              stroke: false,
              shadow: false
            }
          );
          ui.card(
            ctx2,
            45,
            256,
            plan.status === "completed" ? 300 : 168,
            12,
            {
              radius: 6,
              fill: COLORS.gold,
              stroke: false,
              shadow: false
            }
          );
          ui.text(
            ctx2,
            plan.status === "completed" ? "\u53EF\u4EE5\u8FD4\u56DE\u95E8\u5E97\u7EE7\u7EED\u7B79\u5907\u5F00\u4E1A" : "\u65BD\u5DE5\u671F\u95F4\u4ECD\u53EF\u67E5\u770B\u8FDB\u5EA6\uFF0C\u5B8C\u6210\u540E\u81EA\u52A8\u8FDB\u5165\u4E0B\u4E00\u9636\u6BB5",
            195,
            306,
            6.8,
            COLORS.muted,
            "600",
            "center"
          );
          ui.card(
            ctx2,
            69,
            330,
            252,
            36,
            {
              radius: 18,
              fill: COLORS.gold,
              stroke: "#DDA11F",
              shadow: false
            }
          );
          ui.text(
            ctx2,
            "\u8FD4\u56DE\u95E8\u5E97  \u203A",
            195,
            348,
            8,
            COLORS.text,
            "800",
            "center"
          );
          this.addButton(
            "back",
            63,
            325,
            264,
            46
          );
        }
        render(ctx2) {
          if (!ctx2) {
            return;
          }
          this.getLayout();
          this.buttons = [];
          const shop = this.getShop();
          if (!shop) {
            sceneManager.switchTo(
              "shop"
            );
            return;
          }
          renovationSystem.updateShop(
            shop.id
          );
          const metrics = this.getMetrics();
          if (!metrics) {
            return;
          }
          const plan = metrics.plan;
          ctx2.save();
          ctx2.fillStyle = COLORS.paper;
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            this.viewH
          );
          if (plan.status === "constructing" || plan.status === "completed") {
            this.renderConstruction(
              ctx2,
              shop,
              plan
            );
            ctx2.restore();
            return;
          }
          this.drawHeader(
            ctx2,
            shop
          );
          this.drawTemplateStrip(
            ctx2
          );
          const floor = metrics.floors[plan.activeFloor];
          if (this.page === "rooms") {
            this.renderRooms(
              ctx2,
              metrics,
              floor
            );
          } else if (this.page === "style") {
            this.renderStyle(
              ctx2,
              metrics
            );
          } else if (this.page === "templates") {
            this.renderTemplates(
              ctx2
            );
          } else {
            this.drawFloorPlan(
              ctx2,
              metrics,
              floor
            );
            this.drawTablePicker(
              ctx2,
              floor
            );
            this.drawMetrics(
              ctx2,
              metrics
            );
            this.drawFooter(
              ctx2,
              metrics
            );
          }
          ctx2.restore();
        }
        saveTemplate(mode) {
          const templates = customizationSystem.getTemplateList();
          textInput.requestText({
            title: mode === "save-as" ? "\u53E6\u5B58\u88C5\u4FEE\u6A21\u677F" : "\u4FDD\u5B58\u88C5\u4FEE\u6A21\u677F",
            value: renovationConfig.templateRules.defaultNamePrefix + (templates.length + 1),
            placeholder: "\u8BF7\u8F93\u5165\u6A21\u677F\u540D\u79F0",
            maxLength: renovationConfig.nameRules.templateMaxLength
          }).then(
            (value) => {
              if (!value) {
                return;
              }
              const result = customizationSystem.saveTemplate(
                this.shopId,
                value
              );
              this.showToast(
                result.ok ? "\u6A21\u677F\u5DF2\u4FDD\u5B58" : result.message
              );
              textInput.requestRender();
            }
          );
        }
        handleTap(x, y) {
          const item = this.hitButton(
            x,
            y
          );
          if (!item) {
            return false;
          }
          const id = item.id;
          if (id === "back") {
            sceneManager.switchTo(
              "shop"
            );
            return true;
          }
          if (id === "shop:rename") {
            const shop = this.getShop();
            if (!shop) {
              return true;
            }
            textInput.requestText({
              title: "\u4FEE\u6539\u9152\u697C\u540D\u79F0",
              value: shop.name || "",
              placeholder: "\u8BF7\u8F93\u5165\u9152\u697C\u540D\u79F0",
              maxLength: renovationConfig.nameRules.shopMaxLength
            }).then(
              (value) => {
                if (!value) {
                  return;
                }
                const result = customizationSystem.renameShop(
                  this.shopId,
                  value
                );
                this.showToast(
                  result.ok ? "\u9152\u697C\u540D\u79F0\u5DF2\u4FDD\u5B58" : result.message
                );
                textInput.requestRender();
              }
            );
            return true;
          }
          if (id === "template:save") {
            this.saveTemplate(
              "save"
            );
            return true;
          }
          if (id === "template:save-as") {
            this.saveTemplate(
              "save-as"
            );
            return true;
          }
          if (id === "history:undo") {
            this.showToast(
              renovationSystem.undo(
                this.shopId
              ) ? "\u5DF2\u64A4\u9500" : "\u6CA1\u6709\u53EF\u64A4\u9500\u64CD\u4F5C"
            );
            return true;
          }
          if (id === "history:redo") {
            this.showToast(
              renovationSystem.redo(
                this.shopId
              ) ? "\u5DF2\u91CD\u505A" : "\u6CA1\u6709\u53EF\u91CD\u505A\u64CD\u4F5C"
            );
            return true;
          }
          if (id === "preview") {
            const metrics = this.getMetrics();
            if (metrics) {
              this.showToast(
                "\u5EA7\u4F4D " + metrics.totalSeats + " \xB7 \u8212\u9002\u5EA6 " + Math.round(
                  metrics.comfort * 100
                ) + " \xB7 \u5438\u5F15\u529B " + Math.round(
                  metrics.appeal * 100
                )
              );
            }
            return true;
          }
          if (id === "floor:next") {
            const plan2 = this.getPlan();
            renovationSystem.setActiveFloor(
              this.shopId,
              (plan2.activeFloor + 1) % plan2.floors.length
            );
            return true;
          }
          if (id.indexOf(
            "page:"
          ) === 0) {
            this.page = id.split(":")[1];
            return true;
          }
          const plan = this.getPlan();
          const floorIndex = plan.activeFloor;
          if (id.indexOf(
            "table:"
          ) === 0) {
            const parts = id.split(":");
            renovationSystem.adjustTable(
              this.shopId,
              floorIndex,
              Number(
                parts[1]
              ),
              parts[2] === "plus" ? 1 : -1
            );
            return true;
          }
          if (id === "style:hall") {
            renovationSystem.cycleGlobal(
              this.shopId,
              "hallStyle"
            );
            this.page = "style";
            return true;
          }
          if (id === "style:material") {
            renovationSystem.cycleGlobal(
              this.shopId,
              "materialGrade"
            );
            this.page = "style";
            return true;
          }
          if (id === "style:lighting") {
            renovationSystem.cycleGlobal(
              this.shopId,
              "lightingLevel"
            );
            this.page = "style";
            return true;
          }
          if (id === "room:add") {
            renovationSystem.addPrivateRoom(
              this.shopId,
              floorIndex
            );
            return true;
          }
          if (id.indexOf(
            "room:rename:"
          ) === 0) {
            const roomId = id.slice(
              "room:rename:".length
            );
            const room = plan.floors[floorIndex].privateRooms.find(
              (value) => value.id === roomId
            );
            if (room) {
              textInput.requestText({
                title: "\u4FEE\u6539\u5305\u53A2\u540D\u79F0",
                value: room.name || "",
                placeholder: "\u4F8B\u5982\uFF1A\u7261\u4E39\u5385",
                maxLength: renovationConfig.nameRules.roomMaxLength
              }).then(
                (value) => {
                  if (!value) {
                    return;
                  }
                  const result = customizationSystem.renameRoom(
                    this.shopId,
                    roomId,
                    value
                  );
                  this.showToast(
                    result.ok ? "\u5305\u53A2\u540D\u79F0\u5DF2\u4FDD\u5B58" : result.message
                  );
                  textInput.requestRender();
                }
              );
            }
            return true;
          }
          if (id.indexOf(
            "room:seats:"
          ) === 0) {
            renovationSystem.cycleRoomSeats(
              this.shopId,
              floorIndex,
              id.slice(
                "room:seats:".length
              )
            );
            return true;
          }
          if (id.indexOf(
            "room:style:"
          ) === 0) {
            renovationSystem.cycleRoomStyle(
              this.shopId,
              floorIndex,
              id.slice(
                "room:style:".length
              )
            );
            return true;
          }
          if (id.indexOf(
            "room:remove:"
          ) === 0) {
            renovationSystem.removePrivateRoom(
              this.shopId,
              floorIndex,
              id.slice(
                "room:remove:".length
              )
            );
            return true;
          }
          if (id.indexOf(
            "template:apply:"
          ) === 0) {
            const result = customizationSystem.applyTemplate(
              this.shopId,
              id.slice(
                "template:apply:".length
              )
            );
            this.showToast(
              result.ok ? "\u6A21\u677F\u5DF2\u5957\u7528" : result.message
            );
            this.page = "layout";
            return true;
          }
          if (id.indexOf(
            "template:rename:"
          ) === 0) {
            const templateId = id.slice(
              "template:rename:".length
            );
            const item2 = customizationSystem.getTemplateList().find(
              (value) => value.id === templateId
            );
            if (item2) {
              textInput.requestText({
                title: "\u4FEE\u6539\u6A21\u677F\u540D\u79F0",
                value: item2.name,
                placeholder: "\u8BF7\u8F93\u5165\u6A21\u677F\u540D\u79F0",
                maxLength: renovationConfig.nameRules.templateMaxLength
              }).then(
                (value) => {
                  if (!value) {
                    return;
                  }
                  const result = customizationSystem.renameTemplate(
                    templateId,
                    value
                  );
                  this.showToast(
                    result.ok ? "\u6A21\u677F\u540D\u79F0\u5DF2\u4FDD\u5B58" : result.message
                  );
                  textInput.requestRender();
                }
              );
            }
            return true;
          }
          if (id.indexOf(
            "template:delete:"
          ) === 0) {
            const result = customizationSystem.deleteTemplate(
              id.slice(
                "template:delete:".length
              )
            );
            this.showToast(
              result.ok ? "\u6A21\u677F\u5DF2\u5220\u9664" : result.message
            );
            return true;
          }
          if (id === "construction:start") {
            const metrics = this.getMetrics();
            if (!metrics) {
              return true;
            }
            const quotes = renovationSystem.getContractorQuotes(
              this.shopId
            );
            const quote = quotes[0];
            const start = () => {
              if (quote) {
                renovationSystem.selectContractor(
                  this.shopId,
                  quote.id
                );
              }
              const result = renovationSystem.startConstruction(
                this.shopId
              );
              this.showToast(
                result.ok ? "\u65BD\u5DE5\u5DF2\u7ECF\u5F00\u59CB" : result.message
              );
              textInput.requestRender();
            };
            if (api && typeof api.showModal === "function" && quote) {
              api.showModal({
                title: "\u786E\u8BA4\u88C5\u4FEE\u65BD\u5DE5",
                content: quote.name + "\n\u62A5\u4EF7 " + money(
                  quote.price
                ) + " \xB7 \u5DE5\u671F " + quote.days + "\u5929 \xB7 \u53EF\u9760\u5EA6 " + quote.reliability + "\u3002\n\u786E\u8BA4\u5F00\u59CB\u65BD\u5DE5\uFF1F",
                confirmText: "\u5F00\u59CB\u65BD\u5DE5",
                cancelText: "\u518D\u8C03\u6574",
                success: (result) => {
                  if (result && result.confirm) {
                    start();
                  }
                }
              });
            } else {
              start();
            }
            return true;
          }
          return false;
        }
      };
      module.exports = new RenovationScene();
    }
  });

  // src/scenes/equipmentScene.js
  var require_equipmentScene = __commonJS({
    "src/scenes/equipmentScene.js"(exports, module) {
      "use strict";
      var runtime = globalThis.GameRuntime;
      if (!runtime) {
        throw new Error(
          "EquipmentScene\uFF1AGameRuntime \u672A\u521D\u59CB\u5316"
        );
      }
      var api = runtime.api || {};
      var gameState = require_gameState();
      var sceneManager = require_sceneManager();
      var openingPrepSystem = require_openingPrepSystem();
      var visualAssetSystem = require_visualAssetSystem();
      var DESIGN_W = 390;
      var COLORS = {
        navy: "#0A2A3B",
        paper: "#F4EBDD",
        panel: "#FFF9EF",
        text: "#24323A",
        muted: "#718087",
        gold: "#E4AA48",
        orange: "#D9853E",
        red: "#BF584A",
        green: "#4B9567",
        blue: "#4C86A6",
        line: "#DED1C1",
        white: "#FFFFFF"
      };
      function money(value) {
        return "\xA5" + Math.round(
          Number(value) || 0
        ).toLocaleString();
      }
      var EquipmentScene = class {
        constructor() {
          this.id = "equipment";
          this.shopId = null;
          this.buttons = [];
          this.viewH = 780;
          this.navH = 64;
          this.contentBottom = 716;
        }
        enter(payload) {
          const business = gameState.getBusiness();
          this.shopId = payload && payload.shopId || business.currentShopId;
          if (this.shopId) {
            openingPrepSystem.ensureEquipment(
              this.shopId
            );
            visualAssetSystem.loadGroup(
              "renovation"
            );
          }
        }
        update() {
          if (this.shopId) {
            openingPrepSystem.updateEquipment(
              this.shopId
            );
          }
        }
        exit() {
          this.buttons = [];
        }
        layout() {
          let h = 780;
          if (api && typeof api.getSystemInfoSync === "function") {
            const info = api.getSystemInfoSync();
            h = (Number(
              info.windowHeight
            ) || 780) / ((Number(
              info.windowWidth
            ) || 390) / 390);
          }
          this.viewH = h;
          this.navH = h < 740 ? 60 : 64;
          this.contentBottom = h - this.navH;
        }
        rounded(ctx2, x, y, w, h, r, fill, stroke) {
          const radius = Math.min(
            r,
            w / 2,
            h / 2
          );
          ctx2.beginPath();
          ctx2.moveTo(
            x + radius,
            y
          );
          ctx2.arcTo(
            x + w,
            y,
            x + w,
            y + h,
            radius
          );
          ctx2.arcTo(
            x + w,
            y + h,
            x,
            y + h,
            radius
          );
          ctx2.arcTo(
            x,
            y + h,
            x,
            y,
            radius
          );
          ctx2.arcTo(
            x,
            y,
            x + w,
            y,
            radius
          );
          ctx2.closePath();
          if (fill) {
            ctx2.fillStyle = fill;
            ctx2.fill();
          }
          if (stroke) {
            ctx2.strokeStyle = stroke;
            ctx2.stroke();
          }
        }
        text(ctx2, value, x, y, size, color, weight, align) {
          ctx2.fillStyle = color || COLORS.text;
          const readableSize = Math.max(
            7.3,
            Number(
              size
            ) || 7.3
          );
          ctx2.font = (weight || "500") + " " + readableSize + "px sans-serif";
          ctx2.textAlign = align || "left";
          ctx2.textBaseline = "middle";
          ctx2.fillText(
            String(value),
            x,
            y
          );
        }
        button(id, x, y, w, h) {
          const hitW = Math.max(
            40,
            w
          );
          const hitH = Math.max(
            36,
            h
          );
          this.buttons.push({
            id,
            x: x - (hitW - w) / 2,
            y: y - (hitH - h) / 2,
            w: hitW,
            h: hitH
          });
        }
        hit(x, y) {
          for (let i = this.buttons.length - 1; i >= 0; i--) {
            const b = this.buttons[i];
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
              return b;
            }
          }
          return null;
        }
        drawVisual(ctx2, key, x, y, w, h) {
          const image = visualAssetSystem.get(
            key
          );
          if (!image) {
            return;
          }
          const iw = image.naturalWidth || image.width || 1;
          const ih = image.naturalHeight || image.height || 1;
          const scale = Math.min(
            w / iw,
            h / ih
          );
          const dw = iw * scale;
          const dh = ih * scale;
          ctx2.drawImage(
            image,
            x + (w - dw) / 2,
            y + (h - dh) / 2,
            dw,
            dh
          );
        }
        render(ctx2) {
          if (!ctx2 || !this.shopId) {
            return;
          }
          this.layout();
          openingPrepSystem.updateEquipment(
            this.shopId
          );
          const shop = openingPrepSystem.getShop(
            this.shopId
          );
          const state = openingPrepSystem.getEquipmentState(
            this.shopId
          );
          const quote = openingPrepSystem.getEquipmentQuote(
            this.shopId
          );
          this.buttons = [];
          ctx2.save();
          ctx2.fillStyle = COLORS.paper;
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            this.viewH
          );
          ctx2.fillStyle = COLORS.navy;
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            68
          );
          this.text(
            ctx2,
            "\u2039",
            25,
            33,
            24,
            COLORS.white,
            "700",
            "center"
          );
          this.button(
            "back",
            4,
            8,
            44,
            48
          );
          this.text(
            ctx2,
            "\u8BBE\u5907\u91C7\u8D2D",
            58,
            22,
            17,
            COLORS.white,
            "700"
          );
          this.text(
            ctx2,
            shop.name + " \xB7 \u6570\u91CF\u3001\u6863\u6B21\u3001\u4EF7\u683C\u548C\u627F\u8F7D\u5B9E\u65F6\u8054\u52A8",
            58,
            47,
            7,
            "#D5E4EA",
            "500"
          );
          this.text(
            ctx2,
            money(
              gameState.getPlayer().cash
            ),
            374,
            23,
            12,
            "#FFE8AE",
            "700",
            "right"
          );
          this.rounded(
            ctx2,
            10,
            80,
            370,
            72,
            13,
            COLORS.panel,
            COLORS.line
          );
          this.text(
            ctx2,
            "\u91C7\u8D2D\u9884\u7B97",
            22,
            98,
            7,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            money(
              quote.total
            ),
            22,
            124,
            16,
            COLORS.red,
            "700"
          );
          this.text(
            ctx2,
            "\u627F\u8F7D " + quote.capacity + " / " + quote.seats + "\u5E2D",
            188,
            103,
            8,
            quote.capacityRatio >= 0.9 ? COLORS.green : COLORS.red,
            "700"
          );
          this.text(
            ctx2,
            "\u529F\u7387 " + quote.totalPowerKw + "kW \xB7 \u9884\u8BA1" + quote.installDays + "\u5929\u5230\u8D27\u5B89\u88C5" + (quote.infrastructureUpgradeCost > 0 ? " \xB7 \u542B\u7535\u529B\u589E\u5BB9" + money(
              quote.infrastructureUpgradeCost
            ) : ""),
            188,
            128,
            7,
            COLORS.muted,
            "600"
          );
          let y = 164;
          for (const line of quote.lines) {
            this.rounded(
              ctx2,
              10,
              y,
              370,
              78,
              12,
              COLORS.panel,
              COLORS.line
            );
            this.drawVisual(
              ctx2,
              line.iconKey,
              18,
              y + 9,
              58,
              58
            );
            this.text(
              ctx2,
              line.name,
              84,
              y + 20,
              9,
              COLORS.text,
              "700"
            );
            this.text(
              ctx2,
              line.gradeName + " \xB7 " + money(
                line.price
              ) + " \xB7 \u627F\u8F7D" + line.capacity,
              84,
              y + 43,
              6.8,
              COLORS.muted,
              "600"
            );
            if (state.status === "planning") {
              this.rounded(
                ctx2,
                266,
                y + 12,
                29,
                29,
                8,
                "#EEE6DC"
              );
              this.text(
                ctx2,
                "\u2212",
                280.5,
                y + 26.5,
                13,
                COLORS.navy,
                "700",
                "center"
              );
              this.button(
                "minus:" + line.id,
                262,
                y + 8,
                37,
                37
              );
              this.text(
                ctx2,
                line.quantity,
                316,
                y + 27,
                9,
                COLORS.text,
                "700",
                "center"
              );
              this.rounded(
                ctx2,
                340,
                y + 12,
                29,
                29,
                8,
                COLORS.gold
              );
              this.text(
                ctx2,
                "+",
                354.5,
                y + 26.5,
                12,
                COLORS.text,
                "700",
                "center"
              );
              this.button(
                "plus:" + line.id,
                336,
                y + 8,
                37,
                37
              );
              this.rounded(
                ctx2,
                265,
                y + 48,
                104,
                23,
                7,
                "#E8F0F2"
              );
              this.text(
                ctx2,
                "\u5207\u6362\u6863\u6B21 \u203A",
                317,
                y + 59.5,
                6.5,
                COLORS.blue,
                "700",
                "center"
              );
              this.button(
                "grade:" + line.id,
                261,
                y + 45,
                112,
                29
              );
            } else {
              this.text(
                ctx2,
                state.status === "installed" ? "\u5DF2\u5B89\u88C5" : "\u5DF2\u4E0B\u5355",
                358,
                y + 28,
                8,
                state.status === "installed" ? COLORS.green : COLORS.orange,
                "700",
                "right"
              );
            }
            y += 86;
          }
          const actionY = this.contentBottom - 50;
          this.rounded(
            ctx2,
            10,
            actionY,
            370,
            40,
            12,
            state.status === "planning" ? quote.valid ? COLORS.gold : "#DCD5CC" : COLORS.navy
          );
          let actionText = "\u786E\u8BA4\u91C7\u8D2D " + money(
            quote.total
          );
          if (state.status === "ordered") {
            actionText = "\u8BBE\u5907\u8FD0\u8F93\u5B89\u88C5\u4E2D \xB7 \u7B2C" + state.deliveryDay + "\u5929\u5B8C\u6210";
          } else if (state.status === "installed") {
            actionText = "\u8BBE\u5907\u5DF2\u5168\u90E8\u5B89\u88C5";
          } else if (!quote.valid) {
            actionText = quote.issues[0] || "\u8BBE\u5907\u914D\u7F6E\u4E0D\u8DB3";
          }
          this.text(
            ctx2,
            actionText,
            195,
            actionY + 20,
            8.5,
            state.status === "planning" ? COLORS.text : COLORS.white,
            "700",
            "center"
          );
          this.button(
            "order",
            10,
            actionY,
            370,
            40
          );
          ctx2.restore();
        }
        handleTap(x, y) {
          const item = this.hit(
            x,
            y
          );
          if (!item) {
            return false;
          }
          if (item.id === "back") {
            sceneManager.switchTo(
              "shop"
            );
            return true;
          }
          if (item.id.indexOf(
            "minus:"
          ) === 0) {
            openingPrepSystem.adjustEquipment(
              this.shopId,
              item.id.slice(
                6
              ),
              -1
            );
            return true;
          }
          if (item.id.indexOf(
            "plus:"
          ) === 0) {
            openingPrepSystem.adjustEquipment(
              this.shopId,
              item.id.slice(
                5
              ),
              1
            );
            return true;
          }
          if (item.id.indexOf(
            "grade:"
          ) === 0) {
            openingPrepSystem.cycleEquipmentGrade(
              this.shopId,
              item.id.slice(
                6
              )
            );
            return true;
          }
          if (item.id === "order") {
            const state = openingPrepSystem.getEquipmentState(
              this.shopId
            );
            if (state.status !== "planning") {
              return true;
            }
            const result = openingPrepSystem.orderEquipment(
              this.shopId
            );
            if (api && typeof api.showToast === "function") {
              api.showToast({
                title: result.ok ? "\u8BBE\u5907\u8BA2\u5355\u5DF2\u63D0\u4EA4" : result.message,
                icon: "none"
              });
            }
            return true;
          }
          return false;
        }
      };
      module.exports = new EquipmentScene();
    }
  });

  // src/scenes/licenseScene.js
  var require_licenseScene = __commonJS({
    "src/scenes/licenseScene.js"(exports, module) {
      "use strict";
      var runtime = globalThis.GameRuntime;
      if (!runtime) {
        throw new Error(
          "LicenseScene\uFF1AGameRuntime \u672A\u521D\u59CB\u5316"
        );
      }
      var api = runtime.api || {};
      var gameState = require_gameState();
      var sceneManager = require_sceneManager();
      var openingPrepSystem = require_openingPrepSystem();
      var DESIGN_W = 390;
      var COLORS = {
        navy: "#0A2A3B",
        paper: "#F4EBDD",
        panel: "#FFF9EF",
        text: "#24323A",
        muted: "#718087",
        gold: "#E4AA48",
        orange: "#D9853E",
        red: "#BF584A",
        green: "#4B9567",
        blue: "#4C86A6",
        line: "#DED1C1",
        white: "#FFFFFF"
      };
      function money(value) {
        return "\xA5" + Math.round(
          Number(value) || 0
        ).toLocaleString();
      }
      var LicenseScene = class {
        constructor() {
          this.id = "license";
          this.shopId = null;
          this.buttons = [];
          this.viewH = 780;
          this.navH = 64;
          this.contentBottom = 716;
        }
        enter(payload) {
          const business = gameState.getBusiness();
          this.shopId = payload && payload.shopId || business.currentShopId;
          if (this.shopId) {
            openingPrepSystem.getPermitState(
              this.shopId
            );
          }
        }
        update() {
          if (this.shopId) {
            openingPrepSystem.updatePermits(
              this.shopId
            );
          }
        }
        exit() {
          this.buttons = [];
        }
        getLayout() {
          let height = 780;
          if (api && typeof api.getSystemInfoSync === "function") {
            const info = api.getSystemInfoSync();
            const screenW = Math.max(
              1,
              Number(
                info.windowWidth
              ) || 390
            );
            height = Math.max(
              1,
              Number(
                info.windowHeight
              ) || 780
            ) / (screenW / 390);
          }
          this.viewH = height;
          this.navH = height < 740 ? 60 : 64;
          this.contentBottom = height - this.navH;
        }
        rounded(ctx2, x, y, w, h, r, fill, stroke) {
          const radius = Math.min(
            r,
            w / 2,
            h / 2
          );
          ctx2.beginPath();
          ctx2.moveTo(
            x + radius,
            y
          );
          ctx2.arcTo(
            x + w,
            y,
            x + w,
            y + h,
            radius
          );
          ctx2.arcTo(
            x + w,
            y + h,
            x,
            y + h,
            radius
          );
          ctx2.arcTo(
            x,
            y + h,
            x,
            y,
            radius
          );
          ctx2.arcTo(
            x,
            y,
            x + w,
            y,
            radius
          );
          ctx2.closePath();
          if (fill) {
            ctx2.fillStyle = fill;
            ctx2.fill();
          }
          if (stroke) {
            ctx2.strokeStyle = stroke;
            ctx2.stroke();
          }
        }
        text(ctx2, value, x, y, size, color, weight, align) {
          ctx2.fillStyle = color || COLORS.text;
          const readableSize = Math.max(
            7.3,
            Number(
              size
            ) || 7.3
          );
          ctx2.font = (weight || "500") + " " + readableSize + "px sans-serif";
          ctx2.textAlign = align || "left";
          ctx2.textBaseline = "middle";
          ctx2.fillText(
            String(value),
            x,
            y
          );
        }
        addButton(id, x, y, w, h) {
          const hitW = Math.max(
            40,
            w
          );
          const hitH = Math.max(
            36,
            h
          );
          this.buttons.push({
            id,
            x: x - (hitW - w) / 2,
            y: y - (hitH - h) / 2,
            w: hitW,
            h: hitH
          });
        }
        hit(x, y) {
          for (let i = this.buttons.length - 1; i >= 0; i--) {
            const item = this.buttons[i];
            if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) {
              return item;
            }
          }
          return null;
        }
        statusText(item) {
          if (item.status === "approved") {
            return "\u5DF2\u901A\u8FC7";
          }
          if (item.status === "applying") {
            return "\u5BA1\u6838\u4E2D";
          }
          if (item.status === "needs_fix") {
            return "\u9700\u6574\u6539";
          }
          return item.ready ? "\u53EF\u529E\u7406" : "\u6761\u4EF6\u4E0D\u8DB3";
        }
        statusColor(item) {
          if (item.status === "approved") {
            return COLORS.green;
          }
          if (item.status === "applying") {
            return COLORS.orange;
          }
          if (item.status === "needs_fix") {
            return COLORS.red;
          }
          return item.ready ? COLORS.blue : COLORS.muted;
        }
        render(ctx2) {
          if (!ctx2 || !this.shopId) {
            return;
          }
          this.getLayout();
          openingPrepSystem.updatePermits(
            this.shopId
          );
          const shop = openingPrepSystem.getShop(
            this.shopId
          );
          const overview = openingPrepSystem.getPermitOverview(
            this.shopId
          );
          this.buttons = [];
          ctx2.save();
          ctx2.fillStyle = COLORS.paper;
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            this.viewH
          );
          ctx2.fillStyle = COLORS.navy;
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            68
          );
          this.text(
            ctx2,
            "\u2039",
            24,
            33,
            24,
            COLORS.white,
            "700",
            "center"
          );
          this.addButton(
            "back",
            4,
            8,
            44,
            48
          );
          this.text(
            ctx2,
            "\u8BC1\u7167\u529E\u7406",
            58,
            22,
            17,
            COLORS.white,
            "700"
          );
          this.text(
            ctx2,
            shop.name + " \xB7 \u6761\u4EF6\u4E0D\u8DB3\u4F1A\u76F4\u63A5\u963B\u6B62\u63D0\u4EA4",
            58,
            47,
            7,
            "#D5E4EA",
            "500"
          );
          this.text(
            ctx2,
            overview.approved + "/" + overview.total + " \u5DF2\u5B8C\u6210",
            374,
            25,
            9,
            "#FFE8AE",
            "700",
            "right"
          );
          this.rounded(
            ctx2,
            10,
            80,
            370,
            67,
            13,
            COLORS.panel,
            COLORS.line
          );
          this.text(
            ctx2,
            "\u529E\u7406\u539F\u5219",
            22,
            99,
            8,
            COLORS.text,
            "700"
          );
          this.text(
            ctx2,
            "\u88C5\u4FEE\u3001\u8BBE\u5907\u3001\u6D88\u9632\u4E0E\u536B\u751F\u6761\u4EF6\u4F1A\u5B9E\u65F6\u5F71\u54CD\u662F\u5426\u53EF\u63D0\u4EA4\u3002",
            22,
            123,
            7,
            COLORS.muted,
            "500"
          );
          let y = 160;
          for (const row of overview.rows) {
            this.rounded(
              ctx2,
              10,
              y,
              370,
              88,
              12,
              COLORS.panel,
              COLORS.line
            );
            this.text(
              ctx2,
              row.name,
              22,
              y + 20,
              9,
              COLORS.text,
              "700"
            );
            this.text(
              ctx2,
              this.statusText(
                row
              ),
              360,
              y + 20,
              7.5,
              this.statusColor(
                row
              ),
              "700",
              "right"
            );
            let detail = money(
              row.fee
            ) + " \xB7 \u9884\u8BA1" + row.days + "\u5929";
            if (row.status === "applying") {
              detail = "\u5BA1\u6838\u4E2D \xB7 \u7B2C" + row.finishDay + "\u5929\u51FA\u7ED3\u679C";
            } else if (row.status === "needs_fix") {
              detail = row.issue || "\u9700\u8981\u6574\u6539";
            } else if (!row.ready && row.reasons.length) {
              detail = row.reasons[0];
            }
            this.text(
              ctx2,
              detail,
              22,
              y + 45,
              7,
              row.status === "needs_fix" ? COLORS.red : COLORS.muted,
              "600"
            );
            if (row.status === "not_applied" && row.ready) {
              this.rounded(
                ctx2,
                270,
                y + 55,
                92,
                25,
                8,
                COLORS.gold
              );
              this.text(
                ctx2,
                "\u63D0\u4EA4\u529E\u7406",
                316,
                y + 67.5,
                7,
                COLORS.text,
                "700",
                "center"
              );
              this.addButton(
                "apply:" + row.id,
                266,
                y + 51,
                100,
                33
              );
            } else if (row.remediable && (row.status === "needs_fix" || !row.ready)) {
              this.rounded(
                ctx2,
                258,
                y + 55,
                104,
                25,
                8,
                "#F7E4DF",
                "#D8B1A8"
              );
              this.text(
                ctx2,
                "\u6574\u6539 " + money(
                  row.remediationCost
                ),
                310,
                y + 67.5,
                6.5,
                COLORS.red,
                "700",
                "center"
              );
              this.addButton(
                "fix:" + row.id,
                254,
                y + 51,
                112,
                33
              );
            }
            y += 96;
          }
          const actionY = this.contentBottom - 49;
          this.rounded(
            ctx2,
            10,
            actionY,
            370,
            39,
            11,
            overview.approved === overview.total ? COLORS.green : COLORS.navy
          );
          this.text(
            ctx2,
            overview.approved === overview.total ? "\u8BC1\u7167\u5DF2\u5168\u90E8\u5B8C\u6210" : "\u8FD4\u56DE\u95E8\u5E97\u7EE7\u7EED\u7B79\u5907",
            195,
            actionY + 19.5,
            8.5,
            COLORS.white,
            "700",
            "center"
          );
          this.addButton(
            "back",
            10,
            actionY,
            370,
            39
          );
          ctx2.restore();
        }
        handleTap(x, y) {
          const item = this.hit(
            x,
            y
          );
          if (!item) {
            return false;
          }
          if (item.id === "back") {
            sceneManager.switchTo(
              "shop"
            );
            return true;
          }
          if (item.id.indexOf(
            "fix:"
          ) === 0) {
            const result = openingPrepSystem.remediatePermit(
              this.shopId,
              item.id.slice(
                4
              )
            );
            if (api && typeof api.showToast === "function") {
              api.showToast({
                title: result.ok ? "\u6574\u6539\u5DF2\u5B8C\u6210\uFF0C\u53EF\u91CD\u65B0\u529E\u7406" : result.message,
                icon: "none"
              });
            }
            return true;
          }
          if (item.id.indexOf(
            "apply:"
          ) === 0) {
            const result = openingPrepSystem.applyPermit(
              this.shopId,
              item.id.slice(
                6
              )
            );
            if (api && typeof api.showToast === "function") {
              api.showToast({
                title: result.ok ? "\u7533\u8BF7\u5DF2\u63D0\u4EA4" : result.message,
                icon: "none"
              });
            }
            return true;
          }
          return false;
        }
      };
      module.exports = new LicenseScene();
    }
  });

  // src/scenes/staffScene.js
  var require_staffScene = __commonJS({
    "src/scenes/staffScene.js"(exports, module) {
      "use strict";
      var runtime = globalThis.GameRuntime;
      if (!runtime) {
        throw new Error(
          "StaffScene\uFF1AGameRuntime \u672A\u521D\u59CB\u5316"
        );
      }
      var api = runtime.api || {};
      var gameState = require_gameState();
      var sceneManager = require_sceneManager();
      var openingPrepSystem = require_openingPrepSystem();
      var openingConfig = require_openingConfig();
      var DESIGN_W = 390;
      var COLORS = {
        navy: "#0A2A3B",
        paper: "#F4EBDD",
        panel: "#FFF9EF",
        text: "#24323A",
        muted: "#718087",
        gold: "#E4AA48",
        orange: "#D9853E",
        red: "#BF584A",
        green: "#4B9567",
        blue: "#4C86A6",
        line: "#DED1C1",
        white: "#FFFFFF"
      };
      function money(value) {
        return "\xA5" + Math.round(
          Number(value) || 0
        ).toLocaleString();
      }
      var StaffScene = class {
        constructor() {
          this.id = "staff";
          this.shopId = null;
          this.roleId = "manager";
          this.buttons = [];
          this.viewH = 780;
          this.navH = 64;
          this.contentBottom = 716;
        }
        enter(payload) {
          const business = gameState.getBusiness();
          this.shopId = payload && payload.shopId || business.currentShopId;
          this.roleId = "manager";
          if (this.shopId) {
            openingPrepSystem.refreshCandidates(
              this.shopId
            );
          }
        }
        update() {
        }
        exit() {
          this.buttons = [];
        }
        getLayout() {
          let height = 780;
          if (api && typeof api.getSystemInfoSync === "function") {
            const info = api.getSystemInfoSync();
            const screenW = Math.max(
              1,
              Number(
                info.windowWidth
              ) || 390
            );
            height = Math.max(
              1,
              Number(
                info.windowHeight
              ) || 780
            ) / (screenW / 390);
          }
          this.viewH = height;
          this.navH = height < 740 ? 60 : 64;
          this.contentBottom = height - this.navH;
        }
        rounded(ctx2, x, y, w, h, r, fill, stroke) {
          const radius = Math.min(
            r,
            w / 2,
            h / 2
          );
          ctx2.beginPath();
          ctx2.moveTo(
            x + radius,
            y
          );
          ctx2.arcTo(
            x + w,
            y,
            x + w,
            y + h,
            radius
          );
          ctx2.arcTo(
            x + w,
            y + h,
            x,
            y + h,
            radius
          );
          ctx2.arcTo(
            x,
            y + h,
            x,
            y,
            radius
          );
          ctx2.arcTo(
            x,
            y,
            x + w,
            y,
            radius
          );
          ctx2.closePath();
          if (fill) {
            ctx2.fillStyle = fill;
            ctx2.fill();
          }
          if (stroke) {
            ctx2.strokeStyle = stroke;
            ctx2.stroke();
          }
        }
        text(ctx2, value, x, y, size, color, weight, align) {
          ctx2.fillStyle = color || COLORS.text;
          const readableSize = Math.max(
            7.3,
            Number(
              size
            ) || 7.3
          );
          ctx2.font = (weight || "500") + " " + readableSize + "px sans-serif";
          ctx2.textAlign = align || "left";
          ctx2.textBaseline = "middle";
          ctx2.fillText(
            String(value),
            x,
            y
          );
        }
        addButton(id, x, y, w, h) {
          const hitW = Math.max(
            40,
            w
          );
          const hitH = Math.max(
            36,
            h
          );
          this.buttons.push({
            id,
            x: x - (hitW - w) / 2,
            y: y - (hitH - h) / 2,
            w: hitW,
            h: hitH
          });
        }
        hit(x, y) {
          for (let i = this.buttons.length - 1; i >= 0; i--) {
            const item = this.buttons[i];
            if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) {
              return item;
            }
          }
          return null;
        }
        render(ctx2) {
          if (!ctx2 || !this.shopId) {
            return;
          }
          this.getLayout();
          const shop = openingPrepSystem.getShop(
            this.shopId
          );
          const overview = openingPrepSystem.getStaffOverview(
            this.shopId
          );
          this.buttons = [];
          ctx2.save();
          ctx2.fillStyle = COLORS.paper;
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            this.viewH
          );
          ctx2.fillStyle = COLORS.navy;
          ctx2.fillRect(
            0,
            0,
            DESIGN_W,
            68
          );
          this.text(
            ctx2,
            "\u2039",
            24,
            33,
            24,
            COLORS.white,
            "700",
            "center"
          );
          this.addButton(
            "back",
            4,
            8,
            44,
            48
          );
          this.text(
            ctx2,
            "\u62DB\u8058\u56E2\u961F",
            58,
            22,
            17,
            COLORS.white,
            "700"
          );
          this.text(
            ctx2,
            shop.name + " \xB7 \u5019\u9009\u4EBA\u6BCF\u65E5\u5237\u65B0\uFF0C\u85AA\u8D44\u968F\u80FD\u529B\u53D8\u5316",
            58,
            47,
            7,
            "#D5E4EA",
            "500"
          );
          this.text(
            ctx2,
            money(
              overview.payroll
            ) + "/\u6708",
            374,
            25,
            10,
            "#FFE8AE",
            "700",
            "right"
          );
          this.rounded(
            ctx2,
            10,
            80,
            370,
            82,
            13,
            COLORS.panel,
            COLORS.line
          );
          this.text(
            ctx2,
            "\u4EBA\u5458\u8986\u76D6\u7387",
            22,
            99,
            7,
            COLORS.muted,
            "600"
          );
          this.text(
            ctx2,
            Math.round(
              overview.coverage * 100
            ) + "%",
            22,
            126,
            17,
            overview.coverage >= 0.9 ? COLORS.green : COLORS.orange,
            "700"
          );
          let summaryX = 112;
          for (const role of openingConfig.roles) {
            this.text(
              ctx2,
              role.name,
              summaryX,
              101,
              6.5,
              COLORS.muted,
              "600",
              "center"
            );
            this.text(
              ctx2,
              (overview.current[role.id] || 0) + "/" + overview.required[role.id],
              summaryX,
              128,
              9,
              (overview.current[role.id] || 0) >= overview.required[role.id] ? COLORS.green : COLORS.text,
              "700",
              "center"
            );
            summaryX += 65;
          }
          const tabsY = 176;
          const gap = 5;
          const tabW = (DESIGN_W - 20 - gap * 3) / 4;
          for (let i = 0; i < openingConfig.roles.length; i++) {
            const role = openingConfig.roles[i];
            const active = role.id === this.roleId;
            const x = 10 + i * (tabW + gap);
            this.rounded(
              ctx2,
              x,
              tabsY,
              tabW,
              33,
              9,
              active ? COLORS.gold : "#EAE1D5",
              "#D5C8B9"
            );
            this.text(
              ctx2,
              role.name,
              x + tabW / 2,
              tabsY + 16.5,
              7.2,
              active ? COLORS.text : COLORS.muted,
              "700",
              "center"
            );
            this.addButton(
              "role:" + role.id,
              x,
              tabsY,
              tabW,
              33
            );
          }
          const candidates = overview.candidates.filter(
            (item) => item.roleId === this.roleId
          ).sort(
            (a, b) => b.score - a.score
          );
          let y = 224;
          for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            this.rounded(
              ctx2,
              10,
              y,
              370,
              105,
              12,
              COLORS.panel,
              COLORS.line
            );
            this.rounded(
              ctx2,
              22,
              y + 14,
              49,
              49,
              25,
              i === 0 ? "#FFE4A4" : "#E5EEF1"
            );
            this.text(
              ctx2,
              candidate.name.slice(
                -1
              ),
              46.5,
              y + 38.5,
              15,
              COLORS.navy,
              "700",
              "center"
            );
            this.text(
              ctx2,
              candidate.name + " \xB7 " + candidate.age + "\u5C81",
              84,
              y + 20,
              9.5,
              COLORS.text,
              "700"
            );
            this.text(
              ctx2,
              candidate.experience + "\u5E74\u7ECF\u9A8C \xB7 \u6708\u85AA" + money(
                candidate.wage
              ),
              84,
              y + 43,
              7,
              COLORS.muted,
              "600"
            );
            this.text(
              ctx2,
              "\u6280\u80FD " + candidate.skill + " \xB7 \u7A33\u5B9A " + candidate.stability + " \xB7 \u7EFC\u5408 " + candidate.score,
              22,
              y + 76,
              7,
              i === 0 ? COLORS.orange : COLORS.blue,
              "700"
            );
            this.rounded(
              ctx2,
              286,
              y + 63,
              78,
              29,
              8,
              COLORS.gold
            );
            this.text(
              ctx2,
              "\u5F55\u7528",
              325,
              y + 77.5,
              7.5,
              COLORS.text,
              "700",
              "center"
            );
            this.addButton(
              "hire:" + candidate.id,
              282,
              y + 59,
              86,
              37
            );
            y += 114;
          }
          const actionY = this.contentBottom - 50;
          this.rounded(
            ctx2,
            10,
            actionY,
            370,
            40,
            11,
            overview.coverage >= 0.9 ? COLORS.green : COLORS.navy
          );
          this.text(
            ctx2,
            overview.coverage >= 0.9 ? "\u57FA\u672C\u73ED\u7EC4\u5DF2\u9F50\u5907" : "\u5019\u9009\u4EBA\u6B21\u65E5\u4F1A\u81EA\u52A8\u66F4\u65B0",
            195,
            actionY + 20,
            8.5,
            COLORS.white,
            "700",
            "center"
          );
          this.addButton(
            "back",
            10,
            actionY,
            370,
            40
          );
          ctx2.restore();
        }
        handleTap(x, y) {
          const item = this.hit(
            x,
            y
          );
          if (!item) {
            return false;
          }
          if (item.id === "back") {
            sceneManager.switchTo(
              "shop"
            );
            return true;
          }
          if (item.id.indexOf(
            "role:"
          ) === 0) {
            this.roleId = item.id.slice(
              5
            );
            return true;
          }
          if (item.id.indexOf(
            "hire:"
          ) === 0) {
            const result = openingPrepSystem.hireCandidate(
              this.shopId,
              item.id.slice(
                5
              )
            );
            if (api && typeof api.showToast === "function") {
              api.showToast({
                title: result.ok ? result.staff.name + " \u5DF2\u5165\u804C" : result.message,
                icon: "none"
              });
            }
            return true;
          }
          return false;
        }
      };
      module.exports = new StaffScene();
    }
  });

  // src/scenes/simpleScene.js
  var require_simpleScene = __commonJS({
    "src/scenes/simpleScene.js"(exports, module) {
      "use strict";
      var SimpleScene = class {
        constructor(options) {
          this.id = options.id;
          this.title = options.title;
          this.subtitle = options.subtitle || "";
          this.emptyText = options.emptyText || "\u529F\u80FD\u5F00\u53D1\u4E2D";
          this.background = options.background || "#F3EBDD";
          this.panel = options.panel || "#FFF8EE";
          this.text = options.text || "#2F211C";
          this.muted = options.muted || "#846E63";
          this.accent = options.accent || "#D18342";
        }
        enter(payload) {
          this.payload = payload || {};
        }
        exit() {
        }
        update(deltaTime) {
        }
        render(ctx2) {
          if (!ctx2) {
            return;
          }
          ctx2.save();
          ctx2.fillStyle = this.background;
          ctx2.fillRect(
            0,
            0,
            390,
            844
          );
          this.drawHeader(ctx2);
          this.drawContent(ctx2);
          ctx2.restore();
        }
        drawHeader(ctx2) {
          ctx2.fillStyle = "#4B2D24";
          ctx2.fillRect(
            0,
            0,
            390,
            88
          );
          this.drawText(
            ctx2,
            this.title,
            22,
            30,
            22,
            "#FFFDF9",
            "700"
          );
          if (this.subtitle) {
            this.drawText(
              ctx2,
              this.subtitle,
              22,
              61,
              12,
              "#EBD8CD",
              "500"
            );
          }
        }
        drawContent(ctx2) {
          this.roundedRect(
            ctx2,
            18,
            115,
            354,
            220,
            22,
            this.panel
          );
          this.drawText(
            ctx2,
            this.title,
            195,
            175,
            25,
            this.text,
            "700",
            "center"
          );
          this.drawText(
            ctx2,
            this.emptyText,
            195,
            220,
            14,
            this.muted,
            "500",
            "center"
          );
          this.roundedRect(
            ctx2,
            80,
            265,
            230,
            42,
            14,
            this.accent
          );
          this.drawText(
            ctx2,
            "\u7CFB\u7EDF\u5DF2\u63A5\u5165",
            195,
            286,
            14,
            "#FFFFFF",
            "700",
            "center"
          );
        }
        handleTap(x, y) {
          return false;
        }
        drawText(ctx2, text, x, y, size, color, weight, align) {
          ctx2.fillStyle = color || this.text;
          ctx2.font = (weight || "500") + " " + size + "px sans-serif";
          ctx2.textAlign = align || "left";
          ctx2.textBaseline = "middle";
          ctx2.fillText(
            text,
            x,
            y
          );
        }
        roundedRect(ctx2, x, y, w, h, r, fill) {
          const radius = Math.min(
            r,
            w / 2,
            h / 2
          );
          ctx2.beginPath();
          ctx2.moveTo(
            x + radius,
            y
          );
          ctx2.arcTo(
            x + w,
            y,
            x + w,
            y + h,
            radius
          );
          ctx2.arcTo(
            x + w,
            y + h,
            x,
            y + h,
            radius
          );
          ctx2.arcTo(
            x,
            y + h,
            x,
            y,
            radius
          );
          ctx2.arcTo(
            x,
            y,
            x + w,
            y,
            radius
          );
          ctx2.closePath();
          ctx2.fillStyle = fill;
          ctx2.fill();
        }
      };
      module.exports = SimpleScene;
    }
  });

  // src/scenes/researchScene.js
  var require_researchScene = __commonJS({
    "src/scenes/researchScene.js"(exports, module) {
      "use strict";
      var SimpleScene = require_simpleScene();
      var ResearchScene = class extends SimpleScene {
        constructor() {
          super({
            id: "research",
            title: "\u7814\u53D1",
            subtitle: "\u7814\u53D1\u83DC\u54C1\u3001\u6D4B\u8BD5\u914D\u65B9\u548C\u6253\u9020\u62DB\u724C\u83DC",
            emptyText: "\u6682\u65F6\u8FD8\u6CA1\u6709\u7814\u53D1\u4E2D\u7684\u83DC\u54C1"
          });
        }
        enter(payload) {
          super.enter(payload);
        }
        handleTap(x, y) {
          return false;
        }
      };
      var researchScene = new ResearchScene();
      module.exports = researchScene;
    }
  });

  // src/scenes/supplyScene.js
  var require_supplyScene = __commonJS({
    "src/scenes/supplyScene.js"(exports, module) {
      "use strict";
      var SimpleScene = require_simpleScene();
      var SupplyScene = class extends SimpleScene {
        constructor() {
          super({
            id: "supply",
            title: "\u4F9B\u5E94\u94FE",
            subtitle: "\u7BA1\u7406\u98DF\u6750\u91C7\u8D2D\u3001\u4F9B\u5E94\u5546\u548C\u5E93\u5B58",
            emptyText: "\u6682\u65F6\u8FD8\u6CA1\u6709\u4F9B\u5E94\u5546"
          });
        }
        enter(payload) {
          super.enter(payload);
        }
        handleTap(x, y) {
          return false;
        }
      };
      var supplyScene = new SupplyScene();
      module.exports = supplyScene;
    }
  });

  // src/scenes/businessScene.js
  var require_businessScene = __commonJS({
    "src/scenes/businessScene.js"(exports, module) {
      "use strict";
      var SimpleScene = require_simpleScene();
      var BusinessScene = class extends SimpleScene {
        constructor() {
          super({
            id: "business",
            title: "\u7ECF\u8425",
            subtitle: "\u67E5\u770B\u6536\u5165\u3001\u6210\u672C\u3001\u5BA2\u6D41\u548C\u7ECF\u8425\u8868\u73B0",
            emptyText: "\u5F53\u524D\u8FD8\u6CA1\u6709\u8425\u4E1A\u4E2D\u7684\u95E8\u5E97"
          });
        }
        enter(payload) {
          super.enter(payload);
        }
        handleTap(x, y) {
          return false;
        }
      };
      var businessScene = new BusinessScene();
      module.exports = businessScene;
    }
  });

  // src/main.js
  var require_main = __commonJS({
    "src/main.js"() {
      "use strict";
      var runtime = globalThis.GameRuntime;
      if (!runtime) {
        throw new Error("GameRuntime \u672A\u521D\u59CB\u5316");
      }
      var api = runtime.api || {};
      var canvas2 = runtime.canvas;
      var ctx2 = runtime.ctx;
      var gameState = require_gameState();
      var timeSystem = require_timeSystem();
      var sceneManager = require_sceneManager();
      var animationManager = require_animationManager();
      var resourceManager = require_resourceManager();
      var safeArea = require_safeArea();
      var citySystem = require_citySystem();
      var demandSystem = require_demandSystem();
      var simulationSystem = require_simulationSystem();
      var simulationConfig = require_simulationConfig();
      var openingPrepSystem = require_openingPrepSystem();
      var textInput = require_textInput();
      var propertyMarketScene = require_shopScene();
      var storeScene = require_storeScene();
      var districtScene = require_districtScene();
      var renovationScene = require_renovationScene();
      var equipmentScene = require_equipmentScene();
      var licenseScene = require_licenseScene();
      var staffScene = require_staffScene();
      var researchScene = require_researchScene();
      var supplyScene = require_supplyScene();
      var businessScene = require_businessScene();
      var VIEW_W = 390;
      var VIEW_H = 780;
      var TOP_H = 90;
      var NAV_H = 64;
      var SAFE_TOP = 0;
      var SAFE_BOTTOM = 0;
      var MAP_X = 0;
      var MAP_Y = 90;
      var MAP_W = 390;
      var MAP_H = 626;
      var CARD_X = 8;
      var CARD_Y = 580;
      var CARD_W = 374;
      var CARD_H = 126;
      var NAV_Y = 716;
      var scale = 1;
      var pixelRatio = 1;
      var lastFrameTime = null;
      var screenWidth = VIEW_W;
      var screenHeight = VIEW_H;
      var needsResize = true;
      var mapCache = null;
      var mapCacheHeight = 0;
      var buttons = [];
      var COLORS = {
        navy: "#0F344D",
        navy2: "#092638",
        white: "#FFFDF8",
        cream: "#F7F0E4",
        text: "#1D2B33",
        muted: "#667780",
        gold: "#F2B846",
        orange: "#E99B2F",
        blue: "#439CC9",
        danger: "#DA4C3E",
        green: "#34A66A",
        line: "rgba(255,255,255,0.20)"
      };
      var WEATHER_NAMES = {
        sunny: "\u6674",
        cloudy: "\u591A\u4E91",
        rain: "\u5C0F\u96E8",
        heavyRain: "\u66B4\u96E8",
        hot: "\u708E\u70ED",
        cold: "\u5BD2\u51B7"
      };
      var MEAL_NAMES = {
        breakfast: "\u65E9\u9910",
        lunch: "\u5348\u9910",
        afternoon: "\u4E0B\u5348",
        dinner: "\u665A\u9910",
        night: "\u591C\u5BB5"
      };
      var DISTRICT_LAYOUT = {
        university: {
          x: 0.23,
          y: 0.3
        },
        hightech: {
          x: 0.82,
          y: 0.32
        },
        cbd: {
          x: 0.52,
          y: 0.43
        },
        oldtown: {
          x: 0.17,
          y: 0.55
        },
        village: {
          x: 0.42,
          y: 0.6
        },
        market: {
          x: 0.25,
          y: 0.7
        },
        industry: {
          x: 0.86,
          y: 0.56
        }
      };
      var NAV_ITEMS = [
        {
          id: "city",
          name: "\u57CE\u5E02",
          icon: "city"
        },
        {
          id: "shop",
          name: "\u95E8\u5E97",
          icon: "shop"
        },
        {
          id: "traffic",
          name: "\u5BA2\u6D41",
          icon: "traffic"
        },
        {
          id: "research",
          name: "\u83DC\u5355",
          icon: "research"
        },
        {
          id: "supply",
          name: "\u4F9B\u5E94\u94FE",
          icon: "supply"
        },
        {
          id: "business",
          name: "\u6570\u636E",
          icon: "business"
        },
        {
          id: "system",
          name: "\u7CFB\u7EDF",
          icon: "system"
        }
      ];
      var selectedDistrictId = null;
      var trafficMode = false;
      var districtFx = {
        id: null,
        scale: 1,
        flash: 0
      };
      function getSystemInfo() {
        if (api && typeof api.getSystemInfoSync === "function") {
          return api.getSystemInfoSync();
        }
        return {
          windowWidth: VIEW_W,
          windowHeight: VIEW_H,
          pixelRatio: 1
        };
      }
      function updateLayout() {
        TOP_H = (VIEW_H < 740 ? 91 : 97) + SAFE_TOP;
        NAV_H = (VIEW_H < 740 ? 61 : 66) + SAFE_BOTTOM;
        MAP_X = 0;
        MAP_Y = TOP_H;
        MAP_W = VIEW_W;
        NAV_Y = VIEW_H - NAV_H;
        MAP_H = NAV_Y - MAP_Y;
        CARD_H = VIEW_H < 740 ? 126 : 144;
        CARD_X = 7;
        CARD_W = VIEW_W - 14;
        CARD_Y = NAV_Y - CARD_H - 7;
      }
      function resizeCanvas() {
        const info = getSystemInfo();
        screenWidth = Math.max(
          1,
          Number(
            info.windowWidth
          ) || VIEW_W
        );
        screenHeight = Math.max(
          1,
          Number(
            info.windowHeight
          ) || 780
        );
        pixelRatio = Math.min(
          3,
          Math.max(
            1,
            Number(
              info.pixelRatio
            ) || 1
          )
        );
        scale = screenWidth / VIEW_W;
        const safeInsets = safeArea.getLogicalInsets(
          info,
          scale
        );
        SAFE_TOP = safeInsets.top;
        SAFE_BOTTOM = safeInsets.bottom;
        VIEW_H = screenHeight / scale;
        updateLayout();
        const targetW = Math.max(
          1,
          Math.floor(
            screenWidth * pixelRatio
          )
        );
        const targetH = Math.max(
          1,
          Math.floor(
            screenHeight * pixelRatio
          )
        );
        if (canvas2.width !== targetW || canvas2.height !== targetH) {
          canvas2.width = targetW;
          canvas2.height = targetH;
        }
        ctx2.setTransform(
          pixelRatio * scale,
          0,
          0,
          pixelRatio * scale,
          0,
          0
        );
        needsResize = false;
        if (Math.abs(
          mapCacheHeight - MAP_H
        ) > 1) {
          mapCache = null;
          mapCacheHeight = MAP_H;
          buildMapCache();
        }
      }
      if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener(
          "resize",
          function() {
            needsResize = true;
          }
        );
        window.addEventListener(
          "orientationchange",
          function() {
            needsResize = true;
          }
        );
      }
      function roundedPath(target, x, y, w, h, r) {
        const radius = Math.min(
          r,
          w / 2,
          h / 2
        );
        target.beginPath();
        target.moveTo(
          x + radius,
          y
        );
        target.arcTo(
          x + w,
          y,
          x + w,
          y + h,
          radius
        );
        target.arcTo(
          x + w,
          y + h,
          x,
          y + h,
          radius
        );
        target.arcTo(
          x,
          y + h,
          x,
          y,
          radius
        );
        target.arcTo(
          x,
          y,
          x + w,
          y,
          radius
        );
        target.closePath();
      }
      function roundedRect(x, y, w, h, r, fill, stroke, lineWidth) {
        roundedPath(
          ctx2,
          x,
          y,
          w,
          h,
          r
        );
        if (fill) {
          ctx2.fillStyle = fill;
          ctx2.fill();
        }
        if (stroke) {
          ctx2.lineWidth = lineWidth || 1;
          ctx2.strokeStyle = stroke;
          ctx2.stroke();
        }
      }
      function drawText(text, x, y, size, color, weight, align) {
        ctx2.fillStyle = color || COLORS.text;
        const readableSize = Math.max(
          7.3,
          Number(
            size
          ) || 7.3
        );
        ctx2.font = (weight || "500") + " " + readableSize + "px sans-serif";
        ctx2.textAlign = align || "left";
        ctx2.textBaseline = "middle";
        ctx2.fillText(
          String(text),
          x,
          y
        );
      }
      function fitText(text, maxWidth, size, weight) {
        const value = String(
          text == null ? "" : text
        );
        if (!ctx2.measureText || !maxWidth) {
          return value;
        }
        const readableSize = Math.max(
          7.3,
          Number(
            size
          ) || 7.3
        );
        ctx2.font = (weight || "500") + " " + readableSize + "px sans-serif";
        if (ctx2.measureText(
          value
        ).width <= maxWidth) {
          return value;
        }
        let result = value;
        while (result.length > 1 && ctx2.measureText(
          result + "\u2026"
        ).width > maxWidth) {
          result = result.slice(
            0,
            -1
          );
        }
        return result + "\u2026";
      }
      function getBrandState(player) {
        const reputation = Math.max(
          0,
          Number(
            player && player.reputation
          ) || 0
        );
        const thresholds = [
          0,
          80,
          200,
          420,
          760,
          1200,
          1800,
          2600,
          3600,
          5e3
        ];
        let level = 1;
        for (let i = 1; i < thresholds.length; i++) {
          if (reputation >= thresholds[i]) {
            level = i + 1;
          }
        }
        const currentIndex = Math.min(
          level - 1,
          thresholds.length - 1
        );
        const current = thresholds[currentIndex];
        const next = thresholds[Math.min(
          currentIndex + 1,
          thresholds.length - 1
        )];
        const progress = next <= current ? 1 : Math.max(
          0,
          Math.min(
            1,
            (reputation - current) / (next - current)
          )
        );
        return {
          level,
          reputation,
          progress
        };
      }
      function drawCityBadge(cityName, x, y, size) {
        const image = resourceManager.getImage(
          "city_base_01"
        );
        roundedRect(
          x,
          y,
          size,
          size,
          10,
          "#FFFFFF",
          "#F6C64E",
          1.2
        );
        if (image) {
          ctx2.save();
          roundedPath(
            ctx2,
            x + 3,
            y + 3,
            size - 6,
            size - 6,
            8
          );
          ctx2.clip();
          drawImageFocus(
            ctx2,
            image,
            x + 3,
            y + 3,
            size - 6,
            size - 6,
            2.1,
            0.52,
            0.28
          );
          ctx2.restore();
        } else {
          drawText(
            String(
              cityName || "\u57CE"
            ).charAt(
              0
            ),
            x + size / 2,
            y + size / 2,
            15,
            "#0A3A57",
            "800",
            "center"
          );
        }
      }
      function drawWeatherGlyph(weather, x, y) {
        ctx2.save();
        const isRain = weather === "rain" || weather === "heavyRain";
        const isCloud = weather === "cloudy" || isRain;
        ctx2.fillStyle = "#FFD34D";
        ctx2.beginPath();
        ctx2.arc(
          x - 4,
          y - 3,
          5,
          0,
          Math.PI * 2
        );
        ctx2.fill();
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          ctx2.strokeStyle = "#FFD34D";
          ctx2.lineWidth = 1.4;
          ctx2.beginPath();
          ctx2.moveTo(
            x - 4 + Math.cos(
              a
            ) * 8,
            y - 3 + Math.sin(
              a
            ) * 8
          );
          ctx2.lineTo(
            x - 4 + Math.cos(
              a
            ) * 11,
            y - 3 + Math.sin(
              a
            ) * 11
          );
          ctx2.stroke();
        }
        if (isCloud) {
          ctx2.fillStyle = "#EAF4F8";
          ctx2.beginPath();
          ctx2.arc(
            x + 2,
            y + 1,
            6,
            Math.PI,
            0
          );
          ctx2.arc(
            x + 9,
            y,
            5,
            Math.PI,
            0
          );
          ctx2.arc(
            x + 6,
            y + 3,
            6,
            0,
            Math.PI
          );
          ctx2.closePath();
          ctx2.fill();
        }
        if (isRain) {
          ctx2.strokeStyle = "#7ED8FF";
          ctx2.lineWidth = 1.5;
          for (let i = 0; i < 3; i++) {
            ctx2.beginPath();
            ctx2.moveTo(
              x + i * 5,
              y + 8
            );
            ctx2.lineTo(
              x - 2 + i * 5,
              y + 12
            );
            ctx2.stroke();
          }
        }
        ctx2.restore();
      }
      function drawCashGlyph(x, y) {
        ctx2.save();
        roundedRect(
          x - 11,
          y - 6,
          22,
          12,
          2,
          "#58B766",
          "#DDF6B2",
          1
        );
        roundedRect(
          x - 8,
          y - 9,
          22,
          12,
          2,
          "#78C96C",
          "#E8F7B8",
          1
        );
        drawText(
          "\xA5",
          x + 3,
          y - 3,
          7.4,
          "#F7FFCE",
          "800",
          "center"
        );
        ctx2.restore();
      }
      function drawCrownGlyph(x, y) {
        ctx2.save();
        ctx2.fillStyle = "#FFD557";
        ctx2.strokeStyle = "#FFF0A8";
        ctx2.lineWidth = 1;
        ctx2.beginPath();
        ctx2.moveTo(
          x - 12,
          y + 6
        );
        ctx2.lineTo(
          x - 9,
          y - 7
        );
        ctx2.lineTo(
          x - 2,
          y
        );
        ctx2.lineTo(
          x + 3,
          y - 10
        );
        ctx2.lineTo(
          x + 9,
          y
        );
        ctx2.lineTo(
          x + 13,
          y - 7
        );
        ctx2.lineTo(
          x + 11,
          y + 6
        );
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
        ctx2.restore();
      }
      function getShopForDistrict(districtId) {
        const business = gameState.getBusiness();
        if (!business || !Array.isArray(
          business.shops
        )) {
          return [];
        }
        return business.shops.filter(
          (shop) => shop.districtId === districtId
        );
      }
      function getDistrictVisualMeta(district) {
        const descriptions = {
          university: "\u5B66\u751F\u7F8E\u98DF\u5929\u5802",
          hightech: "\u767D\u9886\u805A\u9910\u9996\u9009",
          cbd: "\u9AD8\u7AEF\u9910\u996E\u805A\u96C6\u5730",
          oldtown: "\u4F20\u7EDF\u7F8E\u98DF\u8857",
          village: "\u70DF\u706B\u6C14\u5341\u8DB3",
          market: "\u4F20\u7EDF\u5E02\u573A\u7115\u53D1\u65B0\u6D3B\u529B",
          industry: "\u5DE5\u4F5C\u9910\u9700\u6C42\u5927"
        };
        const shops = getShopForDistrict(
          district.id
        );
        const demandDelta = Number(
          district.demandDeltaRatio
        ) || 0;
        let badge = "";
        let badgeColor = "#D93E36";
        if (district.saturation >= 92) {
          badge = "\u7ADE\u4E89\u6FC0\u70C8";
        } else if (demandDelta >= 0.035) {
          badge = "\u9700\u6C42\u2191";
        } else if (district.rentIndex <= 0.52) {
          badge = "\u79DF\u91D1\u4F4E";
        } else if (Number(
          district.populationDelta
        ) > 20) {
          badge = "\u4EBA\u6C14\u9AD8";
        } else if (demandDelta <= -0.035) {
          badge = "\u9700\u6C42\u2193";
          badgeColor = "#447FAD";
        }
        return {
          subtitle: descriptions[district.id] || "\u9910\u996E\u6D88\u8D39\u6D3B\u8DC3",
          badge,
          badgeColor,
          myShopCount: shops.length
        };
      }
      function drawDistrictPictogram(districtId, x, y) {
        ctx2.save();
        ctx2.strokeStyle = "#FFFFFF";
        ctx2.fillStyle = "#FFFFFF";
        ctx2.lineWidth = 1.5;
        ctx2.lineCap = "round";
        ctx2.lineJoin = "round";
        if (districtId === "university") {
          ctx2.beginPath();
          ctx2.moveTo(
            x - 5,
            y - 6
          );
          ctx2.lineTo(
            x - 5,
            y + 6
          );
          ctx2.moveTo(
            x - 8,
            y - 6
          );
          ctx2.lineTo(
            x - 8,
            y - 1
          );
          ctx2.moveTo(
            x - 2,
            y - 6
          );
          ctx2.lineTo(
            x - 2,
            y - 1
          );
          ctx2.moveTo(
            x + 5,
            y - 6
          );
          ctx2.lineTo(
            x + 5,
            y + 6
          );
          ctx2.stroke();
        } else if (districtId === "hightech") {
          ctx2.strokeRect(
            x - 7,
            y - 6,
            14,
            10
          );
          ctx2.beginPath();
          ctx2.moveTo(
            x,
            y + 4
          );
          ctx2.lineTo(
            x,
            y + 8
          );
          ctx2.moveTo(
            x - 4,
            y + 8
          );
          ctx2.lineTo(
            x + 4,
            y + 8
          );
          ctx2.stroke();
        } else if (districtId === "cbd") {
          roundedRect(
            x - 5,
            y - 4,
            10,
            10,
            2,
            null,
            "#FFFFFF",
            1.5
          );
          ctx2.beginPath();
          ctx2.arc(
            x,
            y - 4,
            4,
            Math.PI,
            0
          );
          ctx2.stroke();
        } else if (districtId === "oldtown") {
          ctx2.beginPath();
          ctx2.moveTo(
            x - 7,
            y - 3
          );
          ctx2.lineTo(
            x,
            y - 8
          );
          ctx2.lineTo(
            x + 7,
            y - 3
          );
          ctx2.stroke();
          ctx2.strokeRect(
            x - 5,
            y - 3,
            10,
            10
          );
        } else if (districtId === "village") {
          ctx2.beginPath();
          ctx2.moveTo(
            x - 7,
            y
          );
          ctx2.lineTo(
            x,
            y - 7
          );
          ctx2.lineTo(
            x + 7,
            y
          );
          ctx2.stroke();
          ctx2.strokeRect(
            x - 5,
            y,
            10,
            7
          );
        } else if (districtId === "market") {
          ctx2.strokeRect(
            x - 7,
            y - 1,
            14,
            8
          );
          ctx2.beginPath();
          ctx2.moveTo(
            x - 8,
            y - 1
          );
          ctx2.lineTo(
            x - 5,
            y - 7
          );
          ctx2.lineTo(
            x + 5,
            y - 7
          );
          ctx2.lineTo(
            x + 8,
            y - 1
          );
          ctx2.stroke();
        } else {
          ctx2.strokeRect(
            x - 7,
            y - 1,
            14,
            8
          );
          ctx2.beginPath();
          ctx2.moveTo(
            x - 5,
            y - 1
          );
          ctx2.lineTo(
            x - 5,
            y - 7
          );
          ctx2.moveTo(
            x + 1,
            y - 1
          );
          ctx2.lineTo(
            x + 1,
            y - 9
          );
          ctx2.moveTo(
            x + 5,
            y - 1
          );
          ctx2.lineTo(
            x + 5,
            y - 5
          );
          ctx2.stroke();
        }
        ctx2.restore();
      }
      function getHomeGoalState() {
        const business = gameState.getBusiness();
        if (!business.hasShop || !Array.isArray(
          business.shops
        ) || business.shops.length === 0) {
          const process = business.propertyProcess || {
            visits: {},
            negotiations: {},
            leases: {}
          };
          const visitCount = Object.keys(
            process.visits || {}
          ).length;
          const negotiationCount = Object.keys(
            process.negotiations || {}
          ).length;
          let current2 = selectedDistrictId ? 1 : 0;
          if (visitCount > 0) {
            current2 = Math.max(
              current2,
              2
            );
          }
          if (negotiationCount > 0) {
            current2 = Math.max(
              current2,
              3
            );
          }
          return {
            title: "\u5F00\u8BBE\u9996\u5E97",
            steps: [
              "\u9009\u5740",
              "\u770B\u94FA",
              "\u8C08\u5224",
              "\u7B7E\u7EA6",
              "\u88C5\u4FEE"
            ],
            current: current2,
            completed: false
          };
        }
        const shop = business.shops.find(
          (item) => item.id === business.currentShopId
        ) || business.shops[0];
        const readiness = openingPrepSystem.getReadiness(
          shop.id
        );
        let current = 1;
        if (readiness.renovationReady) {
          current = 2;
        }
        if (readiness.permitsReady) {
          current = 3;
        }
        if (readiness.staffingReady) {
          current = 4;
        }
        if (readiness.ready || shop.status === "open") {
          current = 5;
        }
        return {
          title: shop.status === "open" ? "\u7A33\u5B9A\u7ECF\u8425" : "\u7B79\u5907\u9996\u5E97",
          steps: [
            "\u7B7E\u7EA6",
            "\u88C5\u4FEE",
            "\u8BC1\u7167",
            "\u62DB\u8058",
            "\u8425\u4E1A"
          ],
          current,
          completed: shop.status === "open"
        };
      }
      function drawGoalBar() {
        const goal = getHomeGoalState();
        const x = 8;
        const y = MAP_Y + 43;
        const w = VIEW_W - 16;
        const h = 30;
        roundedRect(
          x,
          y,
          w,
          h,
          15,
          "rgba(3,40,62,0.94)",
          "rgba(73,192,239,0.48)"
        );
        drawText(
          "\u25CE",
          x + 15,
          y + 15,
          13,
          "#FFD85C",
          "800",
          "center"
        );
        drawText(
          "\u5F53\u524D\u76EE\u6807\uFF1A",
          x + 29,
          y + 15,
          6.8,
          "#FFD85C",
          "800"
        );
        drawText(
          goal.title,
          x + 76,
          y + 15,
          7.1,
          "#FFFFFF",
          "800"
        );
        const startX = x + 150;
        const available = w - 185;
        const gap = available / Math.max(
          1,
          goal.steps.length - 1
        );
        for (let i = 0; i < goal.steps.length; i++) {
          const cx = startX + i * gap;
          const done = i < goal.current;
          const active = i === goal.current && !goal.completed;
          ctx2.beginPath();
          ctx2.arc(
            cx,
            y + 11,
            5.5,
            0,
            Math.PI * 2
          );
          ctx2.fillStyle = done ? "#F2C744" : active ? "#FFF8CF" : "rgba(225,239,244,0.18)";
          ctx2.fill();
          ctx2.strokeStyle = done || active ? "#FFE58B" : "#9DB8C5";
          ctx2.lineWidth = 1;
          ctx2.stroke();
          if (i < goal.steps.length - 1) {
            ctx2.strokeStyle = i < goal.current ? "#F2C744" : "rgba(178,205,218,0.48)";
            ctx2.lineWidth = 1.2;
            ctx2.beginPath();
            ctx2.moveTo(
              cx + 7,
              y + 11
            );
            ctx2.lineTo(
              cx + gap - 7,
              y + 11
            );
            ctx2.stroke();
          }
          drawText(
            goal.steps[i],
            cx,
            y + 24,
            5.2,
            done || active ? "#FFE595" : "#D7E6EC",
            done || active ? "800" : "600",
            "center"
          );
        }
        drawText(
          "\u{1F381}",
          x + w - 15,
          y + 15,
          10,
          "#FFE280",
          "700",
          "center"
        );
        addButton(
          "goal:current",
          x,
          y,
          w,
          h
        );
      }
      function selectBusiestDistrict() {
        const districts = getDistricts();
        let best = null;
        let bestDemand = -1;
        for (let i = 0; i < districts.length; i++) {
          const demand = demandSystem.getTotalDemand(
            districts[i].id
          );
          if (demand > bestDemand) {
            bestDemand = demand;
            best = districts[i];
          }
        }
        if (best) {
          selectedDistrictId = best.id;
          citySystem.setCurrentDistrict(
            best.id
          );
          startDistrictFx(
            best.id
          );
        }
        return best;
      }
      function drawTrafficOverlay() {
        if (!trafficMode) {
          return;
        }
        const districts = getDistricts();
        const demands = districts.map(
          (item) => demandSystem.getTotalDemand(
            item.id
          )
        );
        const maxDemand = Math.max(
          1,
          ...demands
        );
        for (let i = 0; i < districts.length; i++) {
          const district = districts[i];
          const point = getDistrictPoint(
            district.id
          );
          if (!point) {
            continue;
          }
          const ratio = demands[i] / maxDemand;
          const radius = 17 + ratio * 18;
          const glow = ctx2.createRadialGradient(
            point.x,
            point.y,
            2,
            point.x,
            point.y,
            radius
          );
          glow.addColorStop(
            0,
            ratio > 0.72 ? "rgba(255,167,47,0.42)" : "rgba(65,191,235,0.34)"
          );
          glow.addColorStop(
            1,
            "rgba(55,168,218,0)"
          );
          ctx2.fillStyle = glow;
          ctx2.beginPath();
          ctx2.arc(
            point.x,
            point.y,
            radius,
            0,
            Math.PI * 2
          );
          ctx2.fill();
          roundedRect(
            point.x - 22,
            point.y + 24,
            44,
            16,
            8,
            "rgba(5,50,72,0.88)",
            "rgba(255,224,122,0.45)"
          );
          drawText(
            String(
              demands[i]
            ),
            point.x,
            point.y + 32,
            5.8,
            "#FFF5C2",
            "800",
            "center"
          );
        }
        roundedRect(
          13,
          MAP_Y + 79,
          92,
          22,
          11,
          "rgba(4,45,67,0.90)",
          "rgba(255,218,96,0.56)"
        );
        drawText(
          "\u5BA2\u6D41\u70ED\u529B\u6A21\u5F0F",
          59,
          MAP_Y + 90,
          6.4,
          "#FFE084",
          "800",
          "center"
        );
      }
      function drawMetricSymbol(ctxLabel, x, y, color) {
        ctx2.save();
        ctx2.strokeStyle = color;
        ctx2.fillStyle = color;
        ctx2.lineWidth = 1.4;
        if (ctxLabel === "\u4EBA\u53E3") {
          ctx2.beginPath();
          ctx2.arc(
            x - 4,
            y - 3,
            3,
            0,
            Math.PI * 2
          );
          ctx2.arc(
            x + 4,
            y - 3,
            3,
            0,
            Math.PI * 2
          );
          ctx2.fill();
          ctx2.beginPath();
          ctx2.arc(
            x - 4,
            y + 5,
            5,
            Math.PI,
            0
          );
          ctx2.arc(
            x + 4,
            y + 5,
            5,
            Math.PI,
            0
          );
          ctx2.fill();
        } else if (ctxLabel === "\u9700\u6C42") {
          ctx2.fillRect(
            x - 7,
            y + 1,
            3,
            7
          );
          ctx2.fillRect(
            x - 1,
            y - 3,
            3,
            11
          );
          ctx2.fillRect(
            x + 5,
            y - 8,
            3,
            16
          );
        } else if (ctxLabel === "\u5BA2\u5355") {
          ctx2.beginPath();
          ctx2.ellipse(
            x,
            y - 5,
            7,
            3,
            0,
            0,
            Math.PI * 2
          );
          ctx2.stroke();
          ctx2.beginPath();
          ctx2.moveTo(
            x - 7,
            y - 5
          );
          ctx2.lineTo(
            x - 7,
            y + 6
          );
          ctx2.moveTo(
            x + 7,
            y - 5
          );
          ctx2.lineTo(
            x + 7,
            y + 6
          );
          ctx2.stroke();
          ctx2.beginPath();
          ctx2.ellipse(
            x,
            y + 6,
            7,
            3,
            0,
            0,
            Math.PI
          );
          ctx2.stroke();
        } else if (ctxLabel === "\u9910\u996E\u5E97") {
          ctx2.strokeRect(
            x - 7,
            y - 1,
            14,
            9
          );
          ctx2.beginPath();
          ctx2.moveTo(
            x - 8,
            y - 1
          );
          ctx2.lineTo(
            x - 5,
            y - 7
          );
          ctx2.lineTo(
            x + 5,
            y - 7
          );
          ctx2.lineTo(
            x + 8,
            y - 1
          );
          ctx2.stroke();
        } else if (ctxLabel === "\u9971\u548C\u5EA6") {
          ctx2.beginPath();
          ctx2.arc(
            x,
            y,
            7,
            0,
            Math.PI * 2
          );
          ctx2.stroke();
          ctx2.beginPath();
          ctx2.moveTo(
            x,
            y
          );
          ctx2.lineTo(
            x,
            y - 7
          );
          ctx2.lineTo(
            x + 6,
            y + 3
          );
          ctx2.closePath();
          ctx2.fill();
        } else {
          ctx2.beginPath();
          ctx2.moveTo(
            x - 7,
            y
          );
          ctx2.lineTo(
            x,
            y - 7
          );
          ctx2.lineTo(
            x + 7,
            y
          );
          ctx2.stroke();
          ctx2.strokeRect(
            x - 5,
            y,
            10,
            7
          );
        }
        ctx2.restore();
      }
      function drawDistrictThumb(districtId, x, y, w, h) {
        const image = resourceManager.getImage(
          "city_base_01"
        );
        const layout = DISTRICT_LAYOUT[districtId] || {
          x: 0.5,
          y: 0.5
        };
        ctx2.save();
        roundedPath(
          ctx2,
          x,
          y,
          w,
          h,
          11
        );
        ctx2.clip();
        if (image) {
          drawImageFocus(
            ctx2,
            image,
            x,
            y,
            w,
            h,
            2.6,
            Math.max(
              0.08,
              Math.min(
                0.92,
                layout.x
              )
            ),
            Math.max(
              0.08,
              Math.min(
                0.92,
                layout.y
              )
            )
          );
          const shade = ctx2.createLinearGradient(
            x,
            y,
            x,
            y + h
          );
          shade.addColorStop(
            0,
            "rgba(5,37,55,0.02)"
          );
          shade.addColorStop(
            1,
            "rgba(5,37,55,0.28)"
          );
          ctx2.fillStyle = shade;
          ctx2.fillRect(
            x,
            y,
            w,
            h
          );
        } else {
          ctx2.fillStyle = "#D9E8E7";
          ctx2.fillRect(
            x,
            y,
            w,
            h
          );
        }
        ctx2.restore();
        roundedRect(
          x,
          y,
          w,
          h,
          11,
          null,
          "rgba(8,48,67,0.18)",
          1
        );
      }
      function drawNavIcon(id, cx, cy, active) {
        const color = active ? "#173545" : "#E7F2F5";
        ctx2.save();
        ctx2.strokeStyle = color;
        ctx2.fillStyle = color;
        ctx2.lineWidth = 1.8;
        ctx2.lineCap = "round";
        ctx2.lineJoin = "round";
        if (id === "city") {
          ctx2.strokeRect(
            cx - 10,
            cy - 6,
            7,
            13
          );
          ctx2.strokeRect(
            cx - 1,
            cy - 10,
            8,
            17
          );
          ctx2.strokeRect(
            cx + 9,
            cy - 3,
            5,
            10
          );
          ctx2.fillRect(
            cx + 1,
            cy - 6,
            2,
            2
          );
          ctx2.fillRect(
            cx + 1,
            cy - 1,
            2,
            2
          );
        } else if (id === "shop") {
          ctx2.strokeRect(
            cx - 11,
            cy - 4,
            22,
            12
          );
          ctx2.beginPath();
          ctx2.moveTo(
            cx - 12,
            cy - 4
          );
          ctx2.lineTo(
            cx - 9,
            cy - 10
          );
          ctx2.lineTo(
            cx + 9,
            cy - 10
          );
          ctx2.lineTo(
            cx + 12,
            cy - 4
          );
          ctx2.stroke();
          for (let i = -6; i <= 6; i += 6) {
            ctx2.beginPath();
            ctx2.moveTo(
              cx + i,
              cy - 10
            );
            ctx2.lineTo(
              cx + i,
              cy - 4
            );
            ctx2.stroke();
          }
          ctx2.strokeRect(
            cx - 3,
            cy + 1,
            6,
            7
          );
        } else if (id === "traffic") {
          ctx2.beginPath();
          ctx2.arc(
            cx - 6,
            cy - 4,
            3,
            0,
            Math.PI * 2
          );
          ctx2.arc(
            cx + 5,
            cy - 3,
            3,
            0,
            Math.PI * 2
          );
          ctx2.fill();
          ctx2.beginPath();
          ctx2.arc(
            cx - 6,
            cy + 5,
            5,
            Math.PI,
            0
          );
          ctx2.arc(
            cx + 5,
            cy + 6,
            5,
            Math.PI,
            0
          );
          ctx2.fill();
          ctx2.beginPath();
          ctx2.moveTo(
            cx - 12,
            cy + 11
          );
          ctx2.lineTo(
            cx + 12,
            cy + 11
          );
          ctx2.stroke();
        } else if (id === "research") {
          ctx2.beginPath();
          ctx2.arc(
            cx - 1,
            cy,
            8,
            0,
            Math.PI * 2
          );
          ctx2.stroke();
          ctx2.beginPath();
          ctx2.moveTo(
            cx + 9,
            cy - 10
          );
          ctx2.lineTo(
            cx + 4,
            cy + 10
          );
          ctx2.moveTo(
            cx + 13,
            cy - 9
          );
          ctx2.lineTo(
            cx + 8,
            cy + 10
          );
          ctx2.stroke();
        } else if (id === "supply") {
          ctx2.strokeRect(
            cx - 12,
            cy - 7,
            14,
            11
          );
          ctx2.beginPath();
          ctx2.moveTo(
            cx + 2,
            cy - 4
          );
          ctx2.lineTo(
            cx + 8,
            cy - 4
          );
          ctx2.lineTo(
            cx + 12,
            cy
          );
          ctx2.lineTo(
            cx + 12,
            cy + 4
          );
          ctx2.lineTo(
            cx + 2,
            cy + 4
          );
          ctx2.stroke();
          ctx2.beginPath();
          ctx2.arc(
            cx - 6,
            cy + 7,
            2.4,
            0,
            Math.PI * 2
          );
          ctx2.arc(
            cx + 8,
            cy + 7,
            2.4,
            0,
            Math.PI * 2
          );
          ctx2.stroke();
        } else if (id === "business") {
          ctx2.fillRect(
            cx - 11,
            cy + 1,
            4,
            8
          );
          ctx2.fillRect(
            cx - 3,
            cy - 4,
            4,
            13
          );
          ctx2.fillRect(
            cx + 5,
            cy - 9,
            4,
            18
          );
          ctx2.beginPath();
          ctx2.moveTo(
            cx - 12,
            cy + 10
          );
          ctx2.lineTo(
            cx + 12,
            cy + 10
          );
          ctx2.stroke();
        } else {
          ctx2.beginPath();
          ctx2.arc(
            cx,
            cy,
            5.5,
            0,
            Math.PI * 2
          );
          ctx2.stroke();
          ctx2.beginPath();
          ctx2.arc(
            cx,
            cy,
            1.7,
            0,
            Math.PI * 2
          );
          ctx2.fill();
          for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4;
            ctx2.beginPath();
            ctx2.moveTo(
              cx + Math.cos(
                a
              ) * 7,
              cy + Math.sin(
                a
              ) * 7
            );
            ctx2.lineTo(
              cx + Math.cos(
                a
              ) * 10,
              cy + Math.sin(
                a
              ) * 10
            );
            ctx2.stroke();
          }
        }
        ctx2.restore();
      }
      function addButton(id, x, y, w, h) {
        const hitW = Math.max(
          40,
          w
        );
        const hitH = Math.max(
          36,
          h
        );
        buttons.push({
          id,
          x: x - (hitW - w) / 2,
          y: y - (hitH - h) / 2,
          w: hitW,
          h: hitH
        });
      }
      function showToast(text) {
        if (api && typeof api.showToast === "function") {
          api.showToast({
            title: text,
            icon: "none"
          });
        }
      }
      function drawImageFocus(target, image, dx, dy, dw, dh, zoom, focusX, focusY) {
        const iw = image.naturalWidth || image.width;
        const ih = image.naturalHeight || image.height;
        if (!iw || !ih) {
          return;
        }
        const boxRatio = dw / dh;
        const imageRatio = iw / ih;
        let sw;
        let sh;
        if (imageRatio > boxRatio) {
          sh = ih;
          sw = sh * boxRatio;
        } else {
          sw = iw;
          sh = sw / boxRatio;
        }
        const z = Math.max(
          1,
          zoom || 1
        );
        sw /= z;
        sh /= z;
        const maxX = Math.max(
          0,
          iw - sw
        );
        const maxY = Math.max(
          0,
          ih - sh
        );
        const fx = Math.max(
          0,
          Math.min(
            1,
            focusX == null ? 0.5 : focusX
          )
        );
        const fy = Math.max(
          0,
          Math.min(
            1,
            focusY == null ? 0.5 : focusY
          )
        );
        const sx = maxX * fx;
        const sy = maxY * fy;
        target.drawImage(
          image,
          sx,
          sy,
          sw,
          sh,
          dx,
          dy,
          dw,
          dh
        );
      }
      function createOffscreenCanvas(width, height) {
        if (typeof document !== "undefined" && document.createElement) {
          const c = document.createElement(
            "canvas"
          );
          c.width = width;
          c.height = height;
          return c;
        }
        if (runtime.platform !== "android" && api && typeof api.createCanvas === "function") {
          try {
            const c = api.createCanvas();
            if (c && c !== canvas2) {
              c.width = width;
              c.height = height;
              return c;
            }
          } catch (error) {
            return null;
          }
        }
        return null;
      }
      function buildMapCache() {
        const image = resourceManager.getImage(
          "city_base_01"
        );
        if (!image) {
          return false;
        }
        const cacheScale = 2;
        const c = createOffscreenCanvas(
          Math.max(
            1,
            Math.floor(
              MAP_W * cacheScale
            )
          ),
          Math.max(
            1,
            Math.floor(
              MAP_H * cacheScale
            )
          )
        );
        if (!c || typeof c.getContext !== "function") {
          mapCache = null;
          return false;
        }
        const cctx = c.getContext(
          "2d"
        );
        if (!cctx) {
          return false;
        }
        cctx.setTransform(
          cacheScale,
          0,
          0,
          cacheScale,
          0,
          0
        );
        drawImageFocus(
          cctx,
          image,
          0,
          0,
          MAP_W,
          MAP_H,
          1.06,
          0.52,
          0.13
        );
        const gradient = cctx.createLinearGradient(
          0,
          0,
          0,
          MAP_H
        );
        gradient.addColorStop(
          0,
          "rgba(5,25,38,0.025)"
        );
        gradient.addColorStop(
          0.68,
          "rgba(5,25,38,0.01)"
        );
        gradient.addColorStop(
          1,
          "rgba(5,25,38,0.10)"
        );
        cctx.fillStyle = gradient;
        cctx.fillRect(
          0,
          0,
          MAP_W,
          MAP_H
        );
        mapCache = c;
        mapCacheHeight = MAP_H;
        return true;
      }
      function drawTopHud() {
        const player = gameState.getPlayer();
        const world = gameState.getWorld();
        const display = timeSystem.getDisplayState();
        let cityName = gameState.getCityName();
        if (!cityName || cityName === "\u672A\u547D\u540D\u57CE\u5E02") {
          cityName = "\u4E91\u5DDE\u5E02";
        }
        const cityImage = resourceManager.getImage(
          "city_base_01"
        );
        if (cityImage) {
          drawImageFocus(
            ctx2,
            cityImage,
            0,
            0,
            VIEW_W,
            TOP_H,
            1.48,
            0.52,
            0.17
          );
          ctx2.fillStyle = "rgba(4,35,58,0.61)";
          ctx2.fillRect(
            0,
            0,
            VIEW_W,
            TOP_H
          );
        } else {
          ctx2.fillStyle = COLORS.navy;
          ctx2.fillRect(
            0,
            0,
            VIEW_W,
            TOP_H
          );
        }
        drawCityBadge(
          cityName,
          10,
          8 + SAFE_TOP,
          45
        );
        drawText(
          fitText(
            cityName,
            87,
            15.5,
            "800"
          ),
          65,
          20 + SAFE_TOP,
          15.5,
          COLORS.white,
          "800"
        );
        roundedRect(
          145,
          12 + SAFE_TOP,
          18,
          18,
          5,
          "rgba(4,49,72,0.74)",
          "rgba(255,255,255,0.24)"
        );
        drawText(
          "\u270E",
          154,
          21 + SAFE_TOP,
          7.4,
          "#FFE08B",
          "800",
          "center"
        );
        addButton(
          "city:rename",
          140,
          7 + SAFE_TOP,
          28,
          28
        );
        drawText(
          "\u6253\u9020\u5C5E\u4E8E\u4F60\u7684\u7F8E\u98DF\u5E1D\u56FD",
          65,
          42 + SAFE_TOP,
          7.1,
          "#E1EEF3",
          "600"
        );
        drawWeatherGlyph(
          world.weather,
          190,
          24 + SAFE_TOP
        );
        drawText(
          WEATHER_NAMES[world.weather] || "\u6674",
          211,
          20 + SAFE_TOP,
          6.9,
          "#FFFFFF",
          "700",
          "center"
        );
        drawText(
          Number.isFinite(
            Number(
              world.temperature
            )
          ) ? world.temperature + "\u2103" : "--\u2103",
          211,
          40 + SAFE_TOP,
          6.6,
          "#DDECF1",
          "600",
          "center"
        );
        roundedRect(
          231,
          8 + SAFE_TOP,
          94,
          47,
          12,
          "rgba(5,43,65,0.90)",
          "rgba(114,208,244,0.44)"
        );
        drawCashGlyph(
          247,
          25 + SAFE_TOP
        );
        drawText(
          fitText(
            "\xA5" + player.cash.toLocaleString(),
            61,
            10.8,
            "800"
          ),
          278,
          22 + SAFE_TOP,
          10.8,
          "#FFF1A7",
          "800",
          "center"
        );
        drawText(
          "\u53EF\u7528\u8D44\u91D1",
          278,
          42 + SAFE_TOP,
          6.2,
          "#D9E9EF",
          "600",
          "center"
        );
        roundedRect(
          309,
          16 + SAFE_TOP,
          11,
          11,
          4,
          "#F5B62D",
          "#FFE598"
        );
        drawText(
          "+",
          314.5,
          21.5 + SAFE_TOP,
          8,
          "#FFFFFF",
          "800",
          "center"
        );
        const brand = getBrandState(
          player
        );
        roundedRect(
          330,
          8 + SAFE_TOP,
          51,
          47,
          12,
          "rgba(5,43,65,0.90)",
          "rgba(114,208,244,0.44)"
        );
        drawCrownGlyph(
          343,
          24 + SAFE_TOP
        );
        drawText(
          "Lv." + brand.level,
          361,
          21 + SAFE_TOP,
          7.8,
          "#FFE27D",
          "800",
          "center"
        );
        roundedRect(
          339,
          41 + SAFE_TOP,
          34,
          3,
          1.5,
          "rgba(255,255,255,0.22)"
        );
        roundedRect(
          339,
          41 + SAFE_TOP,
          Math.max(
            3,
            34 * brand.progress
          ),
          3,
          1.5,
          COLORS.gold
        );
        drawText(
          brand.reputation + "/" + Math.max(
            100,
            Math.ceil(
              (brand.reputation + 1) / 100
            ) * 100
          ),
          356,
          50 + SAFE_TOP,
          4.9,
          "#E7F2F6",
          "600",
          "center"
        );
        addButton(
          "brand:status",
          327,
          5 + SAFE_TOP,
          57,
          53
        );
        const speedItems = [
          [
            "time:pause",
            timeSystem.isPaused() ? "\u25B6" : "\u2161"
          ],
          [
            "time:speed:1",
            "1\xD7"
          ],
          [
            "time:speed:2",
            "2\xD7"
          ],
          [
            "time:speed:5",
            "5\xD7"
          ],
          [
            "time:speed:10",
            "10\xD7"
          ]
        ];
        const y = TOP_H - 28;
        for (let i = 0; i < speedItems.length; i++) {
          const id = speedItems[i][0];
          const speed = timeSystem.getSpeed();
          const paused = timeSystem.isPaused();
          const active = id === "time:pause" ? paused : !paused && Number(
            id.split(":")[2]
          ) === speed;
          const x = 12 + i * 45;
          roundedRect(
            x,
            y,
            39,
            21,
            8,
            active ? COLORS.gold : "rgba(4,40,60,0.84)",
            active ? "#FFE38D" : "rgba(255,255,255,0.20)"
          );
          drawText(
            speedItems[i][1],
            x + 19.5,
            y + 10.5,
            8,
            active ? "#173444" : COLORS.white,
            "800",
            "center"
          );
          addButton(
            id,
            x - 3,
            y - 5,
            45,
            31
          );
        }
        drawText(
          fitText(
            display.date + " \xB7 " + display.time + " \xB7 " + (MEAL_NAMES[display.mealPeriod] || ""),
            148,
            6.5,
            "600"
          ),
          377,
          y + 10.5,
          6.5,
          "#E5F0F4",
          "600",
          "right"
        );
      }
      function drawMapBase() {
        if (mapCache) {
          ctx2.drawImage(
            mapCache,
            MAP_X,
            MAP_Y,
            MAP_W,
            MAP_H
          );
          return;
        }
        const image = resourceManager.getImage(
          "city_base_01"
        );
        if (image) {
          drawImageFocus(
            ctx2,
            image,
            MAP_X,
            MAP_Y,
            MAP_W,
            MAP_H,
            1.06,
            0.52,
            0.13
          );
          return;
        }
        ctx2.fillStyle = "#B9C8C0";
        ctx2.fillRect(
          MAP_X,
          MAP_Y,
          MAP_W,
          MAP_H
        );
        drawText(
          "\u57CE\u5E02\u5730\u56FE\u52A0\u8F7D\u4E2D\u2026",
          VIEW_W / 2,
          MAP_Y + MAP_H / 2,
          12,
          COLORS.white,
          "700",
          "center"
        );
      }
      function getDistricts() {
        const world = gameState.getWorld();
        return citySystem.getDistrictsByCity(
          world.currentCityId
        );
      }
      function getDistrictPoint(districtId) {
        const layout = DISTRICT_LAYOUT[districtId];
        if (!layout) {
          return null;
        }
        return {
          x: MAP_X + MAP_W * layout.x,
          y: MAP_Y + MAP_H * layout.y
        };
      }
      function drawDistrictMarker(district) {
        const point = getDistrictPoint(
          district.id
        );
        if (!point) {
          return;
        }
        const x = point.x;
        const y = point.y;
        const selected = selectedDistrictId === district.id;
        const meta = getDistrictVisualMeta(
          district
        );
        const animated = districtFx.id === district.id;
        const markerScale = animated ? districtFx.scale : 1;
        const markerKeys = {
          university: "district_marker_gold",
          hightech: "district_marker_blue",
          cbd: "district_marker_orange",
          oldtown: "district_marker_purple",
          village: "district_marker_green",
          market: "district_marker_red",
          industry: "district_marker_blue"
        };
        const image = resourceManager.getImage(
          markerKeys[district.id]
        );
        if (selected) {
          ctx2.beginPath();
          ctx2.arc(
            x,
            y,
            23 + districtFx.flash * 5,
            0,
            Math.PI * 2
          );
          ctx2.fillStyle = "rgba(255,195,54,0.24)";
          ctx2.fill();
        }
        ctx2.save();
        ctx2.translate(
          x,
          y
        );
        ctx2.scale(
          markerScale,
          markerScale
        );
        if (image) {
          ctx2.drawImage(
            image,
            -18,
            -27,
            36,
            50
          );
        } else {
          ctx2.beginPath();
          ctx2.arc(
            0,
            0,
            10,
            0,
            Math.PI * 2
          );
          ctx2.fillStyle = COLORS.gold;
          ctx2.fill();
        }
        drawDistrictPictogram(
          district.id,
          0,
          -8
        );
        ctx2.restore();
        const boxW = Math.max(
          81,
          Math.min(
            102,
            43 + district.name.length * 11
          )
        );
        const preferLeft = x > VIEW_W * 0.62;
        let boxX = preferLeft ? x - boxW - 11 : x + 11;
        boxX = Math.max(
          5,
          Math.min(
            VIEW_W - boxW - 5,
            boxX
          )
        );
        let boxY = y - 15;
        boxY = Math.max(
          MAP_Y + 82,
          Math.min(
            CARD_Y - 54,
            boxY
          )
        );
        roundedRect(
          boxX,
          boxY,
          boxW,
          27,
          11,
          "#073E5D",
          selected ? "#FFE06C" : "#F1C34A",
          selected ? 1.4 : 1
        );
        drawText(
          district.name,
          boxX + 11,
          boxY + 13.5,
          8.7,
          "#FFFFFF",
          "800"
        );
        drawText(
          "\u203A",
          boxX + boxW - 10,
          boxY + 13.5,
          11,
          "#FFE49C",
          "800",
          "center"
        );
        roundedRect(
          boxX + 6,
          boxY + 27,
          boxW - 12,
          18,
          7,
          "rgba(255,253,247,0.96)",
          "rgba(11,55,76,0.13)"
        );
        drawText(
          fitText(
            meta.subtitle,
            boxW - 20,
            5.5,
            "700"
          ),
          boxX + boxW / 2,
          boxY + 36,
          5.5,
          "#23455B",
          "700",
          "center"
        );
        if (meta.badge) {
          const badgeW = Math.max(
            35,
            17 + meta.badge.length * 6
          );
          const badgeX = Math.max(
            5,
            Math.min(
              VIEW_W - badgeW - 5,
              boxX + boxW - badgeW + 5
            )
          );
          roundedRect(
            badgeX,
            boxY - 7,
            badgeW,
            17,
            8,
            meta.badgeColor,
            "#FFF2C8"
          );
          drawText(
            meta.badge,
            badgeX + badgeW / 2,
            boxY + 1.5,
            5.4,
            "#FFFFFF",
            "800",
            "center"
          );
        }
        if (meta.myShopCount > 0) {
          const textValue = meta.myShopCount > 1 ? "\u2713 \u6211\u7684\u5E97\xD7" + meta.myShopCount : "\u2713 \u6211\u7684\u5E97";
          const shopW = meta.myShopCount > 1 ? 54 : 43;
          const sx = Math.max(
            5,
            Math.min(
              VIEW_W - shopW - 5,
              boxX + boxW - shopW + 8
            )
          );
          roundedRect(
            sx,
            boxY - 27,
            shopW,
            17,
            8,
            "#1E9A5E",
            "#B9F0C8"
          );
          drawText(
            textValue,
            sx + shopW / 2,
            boxY - 18.5,
            5.2,
            "#FFFFFF",
            "800",
            "center"
          );
        }
        const hitLeft = Math.min(
          x - 20,
          boxX - 3
        );
        const hitRight = Math.max(
          x + 20,
          boxX + boxW + 3
        );
        const hitTop = Math.min(
          y - 31,
          boxY - 29
        );
        const hitBottom = Math.max(
          y + 25,
          boxY + 49
        );
        addButton(
          "district:" + district.id,
          hitLeft,
          hitTop,
          hitRight - hitLeft,
          hitBottom - hitTop
        );
      }
      function startDistrictFx(districtId) {
        animationManager.cancelGroup(
          "districtTap"
        );
        districtFx.id = districtId;
        districtFx.scale = 0.86;
        districtFx.flash = 1;
        animationManager.start({
          id: "district_tap_scale",
          group: "districtTap",
          from: 0.86,
          to: 1,
          duration: 150,
          easing: "easeOutBack",
          onUpdate(value) {
            districtFx.scale = value;
          }
        });
        animationManager.start({
          id: "district_tap_flash",
          group: "districtTap",
          from: 1,
          to: 0,
          duration: 300,
          easing: "easeOutCubic",
          onUpdate(value) {
            districtFx.flash = value;
          },
          onComplete() {
            districtFx.scale = 1;
            districtFx.flash = 0;
          }
        });
      }
      function drawNewsTicker() {
        const feed = simulationSystem.getNewsFeed();
        const bulletin = simulationSystem.getBulletin();
        const x = 8;
        const y = MAP_Y + 7;
        const w = VIEW_W - 16;
        const h = 31;
        roundedRect(
          x,
          y,
          w,
          h,
          15,
          "rgba(3,40,62,0.94)",
          "rgba(73,192,239,0.56)"
        );
        drawText(
          "\u{1F4E3}",
          x + 16,
          y + 15.5,
          10,
          "#FFD65A",
          "800",
          "center"
        );
        drawText(
          "\u57CE\u5E02\u901A\u62A5",
          x + 31,
          y + 15.5,
          7,
          "#FFD65A",
          "800"
        );
        const items = (feed && feed.length ? feed : [
          bulletin
        ]).slice(
          0,
          3
        );
        const startX = x + 85;
        const sectionW = (w - 112) / Math.max(
          1,
          items.length
        );
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (i > 0) {
            ctx2.fillStyle = "rgba(230,242,247,0.34)";
            ctx2.fillRect(
              startX + i * sectionW - 5,
              y + 8,
              1,
              15
            );
          }
          drawText(
            fitText(
              item && item.title ? item.title : "\u57CE\u5E02\u8FD0\u884C\u5E73\u7A33",
              sectionW - 10,
              6,
              "600"
            ),
            startX + i * sectionW,
            y + 15.5,
            6,
            "#F3FAFC",
            "600"
          );
        }
        drawText(
          "\u203A",
          x + w - 13,
          y + 15.5,
          14,
          "#FFE49C",
          "800",
          "center"
        );
        addButton(
          "tool:news",
          x,
          y,
          w,
          h
        );
      }
      function drawSideTools() {
      }
      function drawMetricChip(x, y, w, label, value, color) {
        roundedRect(
          x,
          y,
          w,
          38,
          9,
          "#F7F4EE",
          "rgba(15,53,73,0.08)"
        );
        drawText(
          label,
          x + 8,
          y + 10,
          5.8,
          COLORS.muted,
          "700"
        );
        drawText(
          value,
          x + 8,
          y + 27,
          8.1,
          color,
          "800"
        );
      }
      function drawDistrictCard() {
        const x = CARD_X;
        const y = CARD_Y;
        const w = CARD_W;
        const h = CARD_H;
        roundedRect(
          x,
          y,
          w,
          h,
          16,
          "rgba(255,253,247,0.988)",
          "rgba(17,53,72,0.22)",
          1
        );
        if (!selectedDistrictId) {
          drawText(
            trafficMode ? "\u8BF7\u9009\u62E9\u4E00\u4E2A\u5BA2\u6D41\u70ED\u70B9" : "\u8BF7\u9009\u62E9\u4E00\u4E2A\u5546\u5708",
            18,
            y + 22,
            12.3,
            COLORS.text,
            "800"
          );
          drawText(
            trafficMode ? "\u5730\u56FE\u70ED\u529B\u663E\u793A\u5B9E\u65F6\u9910\u996E\u9700\u6C42\uFF0C\u70B9\u51FB\u70ED\u70B9\u67E5\u770B\u8BE6\u7EC6\u6570\u636E" : "\u70B9\u51FB\u5730\u56FE\u5730\u70B9\uFF0C\u67E5\u770B\u7ECF\u8425\u6570\u636E\u4E0E\u5F00\u5E97\u673A\u4F1A",
            18,
            y + 43,
            6.8,
            COLORS.muted,
            "600"
          );
          drawMetricChip(
            18,
            y + 58,
            108,
            "\u4EBA\u53E3",
            "--",
            COLORS.blue
          );
          drawMetricChip(
            141,
            y + 58,
            108,
            "\u9700\u6C42",
            "--",
            COLORS.green
          );
          drawMetricChip(
            264,
            y + 58,
            108,
            "\u5BA2\u5355",
            "--",
            COLORS.navy
          );
          return;
        }
        const district = citySystem.getDistrict(
          selectedDistrictId
        );
        if (!district) {
          return;
        }
        const currentDemand = demandSystem.getTotalDemand(
          district.id
        );
        drawDistrictThumb(
          district.id,
          x + 8,
          y + 8,
          95,
          h - 16
        );
        const meta = getDistrictVisualMeta(
          district
        );
        roundedRect(
          x + 113,
          y + 11,
          22,
          22,
          11,
          "#F2A51F",
          "#FFD964"
        );
        drawDistrictPictogram(
          district.id,
          x + 124,
          y + 22
        );
        drawText(
          fitText(
            district.name,
            126,
            13.4,
            "800"
          ),
          x + 142,
          y + 22,
          13.4,
          "#0D3760",
          "800"
        );
        drawText(
          fitText(
            meta.subtitle + " \xB7 " + (district.saturation >= 90 ? "\u7ADE\u4E89\u8F83\u9AD8" : "\u4ECD\u6709\u7ECF\u8425\u673A\u4F1A"),
            190,
            6.1,
            "600"
          ),
          x + 142,
          y + 42,
          6.1,
          "#4776A0",
          "600"
        );
        const metrics = [
          [
            "\u4EBA\u53E3",
            district.population.toLocaleString(),
            "#1769AE"
          ],
          [
            "\u9700\u6C42",
            currentDemand.toLocaleString(),
            "#15924C"
          ],
          [
            "\u5BA2\u5355",
            "\xA5" + district.avgSpend,
            "#164A86"
          ],
          [
            "\u9910\u996E\u5E97",
            district.restaurantCount + "\u5BB6",
            "#164A86"
          ],
          [
            "\u9971\u548C\u5EA6",
            district.saturation + "%",
            "#1E76C5"
          ],
          [
            "\u79DF\u91D1",
            district.rentIndex.toFixed(
              2
            ),
            "#164A86"
          ]
        ];
        const metricX = x + 111;
        const metricY = y + 54;
        const metricGap = 3;
        const metricW = (w - 121 - metricGap * 5) / 6;
        for (let i = 0; i < metrics.length; i++) {
          const mx = metricX + i * (metricW + metricGap);
          roundedRect(
            mx,
            metricY,
            metricW,
            48,
            9,
            "#F8F5EF",
            "rgba(17,62,92,0.10)"
          );
          drawMetricSymbol(
            metrics[i][0],
            mx + metricW / 2,
            metricY + 11,
            metrics[i][2]
          );
          drawText(
            metrics[i][0],
            mx + metricW / 2,
            metricY + 27,
            5.5,
            "#245276",
            "700",
            "center"
          );
          drawText(
            metrics[i][1],
            mx + metricW / 2,
            metricY + 41,
            6.9,
            metrics[i][2],
            "800",
            "center"
          );
        }
        drawText(
          trafficMode ? "\u5BA2\u6D41\u70ED\u529B\u4F1A\u968F\u65F6\u95F4\u3001\u5929\u6C14\u3001\u4E8B\u4EF6\u4E0E\u6D88\u8D39\u65F6\u6BB5\u5B9E\u65F6\u53D8\u5316" : "\u5B9E\u65F6\u6570\u636E\u4F1A\u968F\u4EBA\u53E3\u3001\u57CE\u5E02\u4E8B\u4EF6\u3001\u7ADE\u4E89\u548C\u79DF\u91D1\u53D8\u5316",
          x + 112,
          y + h - 18,
          5.7,
          "#50718A",
          "600"
        );
        roundedRect(
          x + w - 115,
          y + h - 43,
          104,
          34,
          17,
          "#FFC22D",
          "#DFA01B",
          1.2
        );
        drawText(
          "\u8FDB\u5165\u5546\u5708  \u203A",
          x + w - 63,
          y + h - 26,
          8.2,
          "#123A53",
          "800",
          "center"
        );
        addButton(
          "district:details",
          x + w - 121,
          y + h - 48,
          116,
          44
        );
      }
      function drawBottomNav() {
        const gradient = ctx2.createLinearGradient(
          0,
          NAV_Y,
          0,
          VIEW_H
        );
        gradient.addColorStop(
          0,
          "#0B4A70"
        );
        gradient.addColorStop(
          1,
          "#052A42"
        );
        ctx2.fillStyle = gradient;
        ctx2.fillRect(
          0,
          NAV_Y,
          VIEW_W,
          NAV_H
        );
        ctx2.fillStyle = "rgba(75,191,239,0.36)";
        ctx2.fillRect(
          0,
          NAV_Y,
          VIEW_W,
          1
        );
        const current = sceneManager.getCurrentId();
        const cellW = VIEW_W / NAV_ITEMS.length;
        for (let i = 0; i < NAV_ITEMS.length; i++) {
          const item = NAV_ITEMS[i];
          const cx = i * cellW + cellW / 2;
          const active = item.id === "city" && current === "city" && !trafficMode || item.id === "traffic" && current === "city" && trafficMode || item.id === "shop" && (current === "shop" || current === "propertyMarket" || current === "equipment" || current === "license" || current === "staff" || current === "renovation") || item.id === current;
          if (active) {
            const fill = ctx2.createLinearGradient(
              0,
              NAV_Y + 6,
              0,
              VIEW_H - 6
            );
            fill.addColorStop(
              0,
              "#FFE066"
            );
            fill.addColorStop(
              1,
              "#F2B22A"
            );
            roundedRect(
              i * cellW + 4,
              NAV_Y + 6,
              cellW - 8,
              NAV_H - 12,
              11,
              fill,
              "#FFE79B",
              1.2
            );
          }
          drawNavIcon(
            item.id,
            cx,
            NAV_Y + NAV_H * 0.34,
            active
          );
          drawText(
            item.name,
            cx,
            NAV_Y + NAV_H * 0.73,
            6.5,
            active ? "#173545" : "#EEF7FA",
            active ? "800" : "600",
            "center"
          );
          addButton(
            "nav:" + item.id,
            i * cellW,
            NAV_Y,
            cellW,
            NAV_H
          );
        }
      }
      var cityScene = {
        id: "city",
        enter() {
        },
        exit() {
          animationManager.cancelGroup(
            "districtTap"
          );
        },
        update() {
        },
        render() {
          ctx2.fillStyle = "#DDE5E1";
          ctx2.fillRect(
            0,
            0,
            VIEW_W,
            VIEW_H
          );
          drawTopHud();
          drawMapBase();
          drawNewsTicker();
          drawGoalBar();
          drawTrafficOverlay();
          const districts = getDistricts();
          for (let i = 0; i < districts.length; i++) {
            drawDistrictMarker(
              districts[i]
            );
          }
          drawSideTools();
          drawDistrictCard();
        },
        handleTap(x, y, target) {
          if (!target) {
            return false;
          }
          if (target.id.indexOf(
            "district:"
          ) === 0 && target.id !== "district:details") {
            const districtId = target.id.split(":")[1];
            selectedDistrictId = districtId;
            citySystem.setCurrentDistrict(
              districtId
            );
            startDistrictFx(
              districtId
            );
            return true;
          }
          if (target.id === "city:rename") {
            textInput.requestText({
              title: "\u4FEE\u6539\u57CE\u5E02\u540D\u79F0",
              value: gameState.getCityName(),
              placeholder: "\u8BF7\u8F93\u5165\u57CE\u5E02\u540D\u79F0",
              maxLength: 8
            }).then(
              (value) => {
                if (!value) {
                  return;
                }
                if (gameState.setCityName(
                  value
                )) {
                  textInput.requestRender();
                }
              }
            );
            return true;
          }
          if (target.id === "brand:status") {
            const brand = getBrandState(
              gameState.getPlayer()
            );
            showToast(
              "\u54C1\u724C\u7B49\u7EA7 Lv." + brand.level + " \xB7 \u58F0\u671B " + brand.reputation
            );
            return true;
          }
          if (target.id === "goal:current") {
            const business = gameState.getBusiness();
            if (business.hasShop && business.shops.length) {
              sceneManager.switchTo(
                "shop"
              );
              return true;
            }
            if (!selectedDistrictId) {
              selectBusiestDistrict();
              return true;
            }
            sceneManager.switchTo(
              "district",
              {
                districtId: selectedDistrictId
              }
            );
            return true;
          }
          return false;
        }
      };
      sceneManager.register(
        "city",
        cityScene
      );
      sceneManager.register(
        "shop",
        storeScene
      );
      sceneManager.register(
        "district",
        districtScene
      );
      sceneManager.register(
        "propertyMarket",
        propertyMarketScene
      );
      sceneManager.register(
        "renovation",
        renovationScene
      );
      sceneManager.register(
        "equipment",
        equipmentScene
      );
      sceneManager.register(
        "license",
        licenseScene
      );
      sceneManager.register(
        "staff",
        staffScene
      );
      sceneManager.register(
        "research",
        researchScene
      );
      sceneManager.register(
        "supply",
        supplyScene
      );
      sceneManager.register(
        "business",
        businessScene
      );
      function render() {
        if (needsResize) {
          resizeCanvas();
        }
        buttons.length = 0;
        ctx2.clearRect(
          0,
          0,
          VIEW_W,
          VIEW_H
        );
        sceneManager.render(
          ctx2
        );
        drawBottomNav();
      }
      runtime.requestRender = render;
      function screenToDesign(x, y) {
        return {
          x: x / scale,
          y: y / scale
        };
      }
      function hitTest(x, y) {
        for (let i = buttons.length - 1; i >= 0; i--) {
          const button = buttons[i];
          if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
            return button;
          }
        }
        return null;
      }
      function handleTimeButton(id) {
        if (id === "time:pause") {
          timeSystem.togglePause();
          timeSystem.resetAccumulator();
          return true;
        }
        if (id.indexOf(
          "time:speed:"
        ) === 0) {
          const value = Number(
            id.split(":")[2]
          );
          if (timeSystem.setSpeed(
            value
          )) {
            if (timeSystem.isPaused()) {
              timeSystem.resume();
            }
            timeSystem.resetAccumulator();
            return true;
          }
        }
        return false;
      }
      function handleTap(screenX, screenY) {
        const point = screenToDesign(
          screenX,
          screenY
        );
        const target = hitTest(
          point.x,
          point.y
        );
        if (!target) {
          const scene2 = sceneManager.getCurrentScene();
          if (scene2 && typeof scene2.handleTap === "function") {
            if (scene2.handleTap(
              point.x,
              point.y,
              null
            )) {
              render();
            }
          }
          return;
        }
        if (target.id.indexOf(
          "time:"
        ) === 0) {
          if (handleTimeButton(
            target.id
          )) {
            render();
          }
          return;
        }
        if (target.id === "district:details") {
          const district = selectedDistrictId ? citySystem.getDistrict(
            selectedDistrictId
          ) : null;
          if (district) {
            citySystem.setCurrentDistrict(
              district.id
            );
            if (sceneManager.switchTo(
              "district",
              {
                districtId: district.id
              }
            )) {
              render();
            }
          }
          return;
        }
        if (target.id.indexOf(
          "tool:"
        ) === 0) {
          const toolId = target.id.split(":")[1];
          if (toolId === "news") {
            const bulletin = simulationSystem.getBulletin();
            if (bulletin && bulletin.districtId && citySystem.getDistrict(
              bulletin.districtId
            )) {
              selectedDistrictId = bulletin.districtId;
              citySystem.setCurrentDistrict(
                bulletin.districtId
              );
              startDistrictFx(
                bulletin.districtId
              );
            }
            showToast(
              bulletin.title + "\uFF1A" + bulletin.detail
            );
          } else {
            showToast(
              "\u8BE5\u57CE\u5E02\u529F\u80FD\u5DF2\u9884\u7559"
            );
          }
          return;
        }
        if (target.id.indexOf(
          "nav:"
        ) === 0) {
          const sceneId = target.id.split(":")[1];
          if (sceneId === "traffic") {
            trafficMode = true;
            if (sceneManager.getCurrentId() !== "city") {
              sceneManager.switchTo(
                "city"
              );
            }
            if (!selectedDistrictId) {
              selectBusiestDistrict();
            }
            render();
            return;
          }
          if (sceneId === "city") {
            trafficMode = false;
            selectedDistrictId = null;
            animationManager.cancelGroup(
              "districtTap"
            );
            if (sceneManager.getCurrentId() !== "city") {
              sceneManager.switchTo(
                "city"
              );
            }
            render();
            return;
          }
          if (sceneId === "system") {
            showToast(
              "\u7CFB\u7EDF\u8BBE\u7F6E\u5C06\u5728\u4E0B\u4E00\u9636\u6BB5\u63A5\u5165"
            );
            return;
          }
          trafficMode = false;
          selectedDistrictId = null;
          animationManager.cancelGroup(
            "districtTap"
          );
          if (sceneManager.switchTo(
            sceneId
          )) {
            render();
          }
          return;
        }
        const scene = sceneManager.getCurrentScene();
        if (scene && typeof scene.handleTap === "function") {
          if (scene.handleTap(
            point.x,
            point.y,
            target
          )) {
            render();
          }
        }
      }
      if (api && typeof api.onTouchEnd === "function") {
        api.onTouchEnd(
          function(event) {
            const touch = event.changedTouches && event.changedTouches[0];
            if (!touch) {
              return;
            }
            handleTap(
              touch.clientX,
              touch.clientY
            );
          }
        );
      }
      function scheduleNextFrame(callback) {
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(
            callback
          );
          return;
        }
        setTimeout(
          function() {
            callback(
              Date.now()
            );
          },
          33
        );
      }
      function gameLoop(timestamp) {
        const now = typeof timestamp === "number" ? timestamp : Date.now();
        if (lastFrameTime === null) {
          lastFrameTime = now;
        }
        const deltaMs = Math.max(
          0,
          now - lastFrameTime
        );
        lastFrameTime = now;
        sceneManager.update(
          deltaMs
        );
        const animationChanged = animationManager.update(
          deltaMs
        );
        const advancedMinutes = timeSystem.update(
          deltaMs
        );
        const simulationChanged = advancedMinutes > 0 ? simulationSystem.update(
          advancedMinutes
        ) : false;
        if (advancedMinutes > 0 || simulationChanged || animationChanged || needsResize) {
          render();
        }
        scheduleNextFrame(
          gameLoop
        );
      }
      function loadResources() {
        return Promise.all([
          resourceManager.loadImage(
            "city_base_01",
            "assets/images/map/city_base_01.png",
            "city"
          ),
          resourceManager.loadImage(
            "ui_atlas_01",
            "assets/images/ui/ui_atlas_01_fixed.png",
            "ui"
          ),
          resourceManager.loadImage(
            "property_icons_01",
            "assets/images/ui/property_icons_01.png",
            "property"
          ),
          resourceManager.loadImage(
            "city_header_thumb",
            "assets/images/premium/district/header_city.jpg",
            "city"
          ),
          resourceManager.loadImage(
            "district_marker_gold",
            "assets/images/split/ui/marker_gold.png",
            "city"
          ),
          resourceManager.loadImage(
            "district_marker_blue",
            "assets/images/split/ui/marker_blue.png",
            "city"
          ),
          resourceManager.loadImage(
            "district_marker_orange",
            "assets/images/split/ui/marker_orange.png",
            "city"
          ),
          resourceManager.loadImage(
            "district_marker_purple",
            "assets/images/split/ui/marker_purple.png",
            "city"
          ),
          resourceManager.loadImage(
            "district_marker_green",
            "assets/images/split/ui/marker_green.png",
            "city"
          ),
          resourceManager.loadImage(
            "district_marker_red",
            "assets/images/split/ui/marker_red.png",
            "city"
          )
        ]).then(
          function() {
            buildMapCache();
            render();
          }
        ).catch(
          function(error) {
            console.error(
              "\u8D44\u6E90\u52A0\u8F7D\u5931\u8D25",
              error
            );
            render();
          }
        );
      }
      var V21_DISTRICT_ICON_KEYS = {
        university: "v21_district_university",
        hightech: "v21_district_hightech",
        cbd: "v21_district_cbd",
        oldtown: "v21_district_oldtown",
        village: "v21_district_village",
        market: "v21_district_market",
        industry: "v21_district_industry"
      };
      var V21_NAV_ICON_KEYS = {
        city: "v21_nav_city",
        shop: "v21_nav_store",
        traffic: "v21_nav_traffic",
        research: "v21_nav_menu",
        supply: "v21_nav_supply",
        business: "v21_nav_data",
        system: "v21_nav_system"
      };
      var V21_METRIC_ICON_KEYS = {
        "\u4EBA\u53E3": "v21_metric_population",
        "\u9700\u6C42": "v21_metric_demand",
        "\u5BA2\u5355": "v21_metric_spend",
        "\u9910\u996E\u5E97": "v21_metric_restaurants",
        "\u9971\u548C\u5EA6": "v21_metric_saturation",
        "\u79DF\u91D1": "v21_metric_rent"
      };
      function v21DrawImage(key, cx, cy, w, h, alpha) {
        const image = resourceManager.getImage(key);
        if (!image) return false;
        ctx2.save();
        ctx2.globalAlpha = alpha == null ? 1 : alpha;
        ctx2.drawImage(
          image,
          cx - w / 2,
          cy - h / 2,
          w,
          h
        );
        ctx2.restore();
        return true;
      }
      var v21OriginalDrawWeatherGlyph = drawWeatherGlyph;
      var v21OriginalDrawCashGlyph = drawCashGlyph;
      var v21OriginalDrawCrownGlyph = drawCrownGlyph;
      var v21OriginalDrawMetricSymbol = drawMetricSymbol;
      var v21OriginalDrawNavIcon = drawNavIcon;
      updateLayout = function() {
        TOP_H = (VIEW_H < 740 ? 92 : 96) + SAFE_TOP;
        NAV_H = (VIEW_H < 740 ? 56 : 60) + SAFE_BOTTOM;
        MAP_X = 0;
        MAP_Y = TOP_H;
        MAP_W = VIEW_W;
        NAV_Y = VIEW_H - NAV_H;
        MAP_H = NAV_Y - MAP_Y;
        CARD_H = VIEW_H < 740 ? 124 : 136;
        CARD_X = 7;
        CARD_W = VIEW_W - 14;
        CARD_Y = NAV_Y - CARD_H - 6;
      };
      drawWeatherGlyph = function(weather, x, y) {
        if (v21DrawImage("v21_hud_weather", x, y, 28, 28)) return;
        return v21OriginalDrawWeatherGlyph(weather, x, y);
      };
      drawCashGlyph = function(x, y) {
        if (v21DrawImage("v21_hud_money", x, y, 27, 27)) return;
        return v21OriginalDrawCashGlyph(x, y);
      };
      drawCrownGlyph = function(x, y) {
        if (v21DrawImage("v21_hud_crown", x, y, 24, 24)) return;
        return v21OriginalDrawCrownGlyph(x, y);
      };
      drawMetricSymbol = function(label, x, y, color) {
        const key = V21_METRIC_ICON_KEYS[label];
        if (key && v21DrawImage(key, x, y, 17, 17)) return;
        return v21OriginalDrawMetricSymbol(
          label,
          x,
          y,
          color
        );
      };
      drawNavIcon = function(id, cx, cy, active) {
        const key = V21_NAV_ICON_KEYS[id];
        if (key && v21DrawImage(
          key,
          cx,
          cy,
          active ? 25 : 23,
          active ? 25 : 23,
          active ? 1 : 0.9
        )) {
          return;
        }
        return v21OriginalDrawNavIcon(
          id,
          cx,
          cy,
          active
        );
      };
      drawDistrictMarker = function(district) {
        const point = getDistrictPoint(district.id);
        if (!point) return;
        const x = point.x;
        const y = point.y;
        const selected = selectedDistrictId === district.id;
        const meta = getDistrictVisualMeta(district);
        const animated = districtFx.id === district.id;
        const markerScale = animated ? districtFx.scale : 1;
        if (selected) {
          ctx2.beginPath();
          ctx2.arc(
            x,
            y,
            19 + districtFx.flash * 4,
            0,
            Math.PI * 2
          );
          ctx2.fillStyle = "rgba(255,195,54,0.20)";
          ctx2.fill();
        }
        ctx2.save();
        ctx2.translate(x, y);
        ctx2.scale(markerScale, markerScale);
        const key = V21_DISTRICT_ICON_KEYS[district.id];
        if (!key || !v21DrawImage(key, 0, -4, 31, 40)) {
          drawDistrictPictogram(district.id, 0, -5);
        }
        ctx2.restore();
        const boxW = Math.max(
          70,
          Math.min(
            91,
            38 + district.name.length * 9
          )
        );
        const preferLeft = x > VIEW_W * 0.64;
        let boxX = preferLeft ? x - boxW - 9 : x + 9;
        boxX = Math.max(
          5,
          Math.min(
            VIEW_W - boxW - 5,
            boxX
          )
        );
        let boxY = y - 13;
        boxY = Math.max(
          MAP_Y + 73,
          Math.min(
            CARD_Y - 44,
            boxY
          )
        );
        roundedRect(
          boxX,
          boxY,
          boxW,
          23,
          9,
          "rgba(5,53,79,0.96)",
          selected ? "#FFE06C" : "rgba(255,218,93,0.78)",
          selected ? 1.3 : 0.9
        );
        drawText(
          district.name,
          boxX + 9,
          boxY + 11.5,
          7.7,
          "#FFFFFF",
          "800"
        );
        drawText(
          "\u203A",
          boxX + boxW - 8,
          boxY + 11.5,
          9.5,
          "#FFE49C",
          "800",
          "center"
        );
        roundedRect(
          boxX + 5,
          boxY + 23,
          boxW - 10,
          15,
          6,
          "rgba(255,253,247,0.96)",
          "rgba(11,55,76,0.11)"
        );
        drawText(
          fitText(
            meta.subtitle,
            boxW - 16,
            4.9,
            "700"
          ),
          boxX + boxW / 2,
          boxY + 30.5,
          4.9,
          "#23455B",
          "700",
          "center"
        );
        if (meta.badge) {
          const badgeW = Math.max(
            31,
            14 + meta.badge.length * 5.2
          );
          const badgeX = Math.max(
            5,
            Math.min(
              VIEW_W - badgeW - 5,
              boxX + boxW - badgeW + 3
            )
          );
          roundedRect(
            badgeX,
            boxY - 6,
            badgeW,
            14,
            7,
            meta.badgeColor,
            "rgba(255,245,218,0.96)"
          );
          drawText(
            meta.badge,
            badgeX + badgeW / 2,
            boxY + 1,
            4.8,
            "#FFFFFF",
            "800",
            "center"
          );
        }
        if (meta.myShopCount > 0) {
          const textValue = meta.myShopCount > 1 ? "\u2713 \u6211\u7684\u5E97\xD7" + meta.myShopCount : "\u2713 \u6211\u7684\u5E97";
          const shopW = meta.myShopCount > 1 ? 49 : 39;
          const sx = Math.max(
            5,
            Math.min(
              VIEW_W - shopW - 5,
              boxX + boxW - shopW + 6
            )
          );
          roundedRect(
            sx,
            boxY - 22,
            shopW,
            14,
            7,
            "#1E9A5E",
            "#B9F0C8"
          );
          drawText(
            textValue,
            sx + shopW / 2,
            boxY - 15,
            4.6,
            "#FFFFFF",
            "800",
            "center"
          );
        }
        const hitLeft = Math.min(x - 18, boxX - 3);
        const hitRight = Math.max(x + 18, boxX + boxW + 3);
        const hitTop = Math.min(y - 25, boxY - 24);
        const hitBottom = Math.max(y + 20, boxY + 41);
        addButton(
          "district:" + district.id,
          hitLeft,
          hitTop,
          hitRight - hitLeft,
          hitBottom - hitTop
        );
      };
      var v21OriginalLoadResources = loadResources;
      loadResources = function() {
        const assets = [
          ["v21_hud_city", "hud_city.png"],
          ["v21_hud_weather", "hud_weather.png"],
          ["v21_hud_money", "hud_money.png"],
          ["v21_hud_plus", "hud_plus.png"],
          ["v21_hud_crown", "hud_crown.png"],
          ["v21_hud_bulletin", "hud_bulletin.png"],
          ["v21_hud_goal", "hud_goal.png"],
          ["v21_hud_reward", "hud_reward.png"],
          ["v21_district_university", "district_university.png"],
          ["v21_district_hightech", "district_hightech.png"],
          ["v21_district_cbd", "district_cbd.png"],
          ["v21_district_oldtown", "district_oldtown.png"],
          ["v21_district_village", "district_village.png"],
          ["v21_district_market", "district_market.png"],
          ["v21_district_industry", "district_industry.png"],
          ["v21_metric_population", "metric_population.png"],
          ["v21_metric_demand", "metric_demand.png"],
          ["v21_metric_spend", "metric_spend.png"],
          ["v21_metric_restaurants", "metric_restaurants.png"],
          ["v21_metric_saturation", "metric_saturation.png"],
          ["v21_metric_rent", "metric_rent.png"],
          ["v21_nav_city", "nav_city.png"],
          ["v21_nav_store", "nav_store.png"],
          ["v21_nav_traffic", "nav_traffic.png"],
          ["v21_nav_menu", "nav_menu.png"],
          ["v21_nav_supply", "nav_supply.png"],
          ["v21_nav_data", "nav_data.png"],
          ["v21_nav_system", "nav_system.png"]
        ];
        const tasks = [];
        for (let i = 0; i < assets.length; i++) {
          tasks.push(
            resourceManager.loadImage(
              assets[i][0],
              "assets/images/v21/" + assets[i][1],
              "v21-ui"
            )
          );
        }
        return Promise.all(tasks).then(function() {
          return v21OriginalLoadResources();
        });
      };
      console.log("V21_HOME_ICON_POLISH loaded");
      var V22_DISTRICT_POINT_RATIOS = {
        university: { x: 0.22, y: 0.24 },
        hightech: { x: 0.81, y: 0.25 },
        cbd: { x: 0.56, y: 0.44 },
        oldtown: { x: 0.12, y: 0.57 },
        village: { x: 0.43, y: 0.64 },
        market: { x: 0.18, y: 0.8 },
        industry: { x: 0.81, y: 0.57 }
      };
      var v22OriginalDrawMapBase = drawMapBase;
      var v22OriginalDrawDistrictCard = drawDistrictCard;
      var v22OriginalDrawDistrictMarker = drawDistrictMarker;
      function v22EnsureSelectedDistrict() {
        const districts = getDistricts();
        if (!districts || !districts.length) return null;
        let current = null;
        for (let i = 0; i < districts.length; i++) {
          if (districts[i].id === selectedDistrictId) {
            current = districts[i];
            break;
          }
        }
        if (current) return current;
        const preferred = districts.find(function(item) {
          return item.id === "market";
        });
        current = preferred || districts[0];
        if (current) {
          selectedDistrictId = current.id;
        }
        return current;
      }
      function v22GetDistrictPoint(districtId) {
        const ratio = V22_DISTRICT_POINT_RATIOS[districtId];
        if (!ratio) {
          return getDistrictPoint(districtId);
        }
        const top = MAP_Y + 96;
        const bottom = CARD_Y - 62;
        const usableH = Math.max(120, bottom - top);
        return {
          x: Math.round(MAP_X + MAP_W * ratio.x),
          y: Math.round(top + usableH * ratio.y)
        };
      }
      updateLayout = function() {
        TOP_H = (VIEW_H < 740 ? 94 : 98) + SAFE_TOP;
        NAV_H = (VIEW_H < 740 ? 58 : 62) + SAFE_BOTTOM;
        MAP_X = 0;
        MAP_Y = TOP_H;
        MAP_W = VIEW_W;
        NAV_Y = VIEW_H - NAV_H;
        MAP_H = NAV_Y - MAP_Y;
        CARD_H = VIEW_H < 740 ? 126 : 138;
        CARD_X = 7;
        CARD_W = VIEW_W - 14;
        CARD_Y = NAV_Y - CARD_H - 5;
      };
      drawMapBase = function() {
        const image = resourceManager.getImage("city_base_01");
        if (!image) {
          return v22OriginalDrawMapBase();
        }
        drawImageFocus(
          ctx2,
          image,
          MAP_X,
          MAP_Y,
          MAP_W,
          MAP_H,
          1.64,
          0.56,
          0.55
        );
        const topFade = ctx2.createLinearGradient(0, MAP_Y, 0, MAP_Y + 110);
        topFade.addColorStop(0, "rgba(8,45,70,0.26)");
        topFade.addColorStop(1, "rgba(8,45,70,0.02)");
        ctx2.fillStyle = topFade;
        ctx2.fillRect(MAP_X, MAP_Y, MAP_W, 110);
        const mapTint = ctx2.createLinearGradient(0, MAP_Y, 0, CARD_Y - 8);
        mapTint.addColorStop(0, "rgba(24,118,170,0.03)");
        mapTint.addColorStop(1, "rgba(255,255,255,0.00)");
        ctx2.fillStyle = mapTint;
        ctx2.fillRect(MAP_X, MAP_Y, MAP_W, CARD_Y - MAP_Y);
      };
      drawTopHud = function() {
        const player = gameState.getPlayer();
        const world = gameState.getWorld();
        const display = timeSystem.getDisplayState();
        const brand = getBrandState(player);
        let cityName = gameState.getCityName();
        if (!cityName || cityName === "\u672A\u547D\u540D\u57CE\u5E02") cityName = "\u4E91\u5DDE\u5E02";
        const cityImage = resourceManager.getImage("city_base_01");
        if (cityImage) {
          drawImageFocus(ctx2, cityImage, 0, 0, VIEW_W, TOP_H, 1.58, 0.55, 0.16);
          ctx2.fillStyle = "rgba(4,35,58,0.58)";
          ctx2.fillRect(0, 0, VIEW_W, TOP_H);
        } else {
          ctx2.fillStyle = COLORS.navy;
          ctx2.fillRect(0, 0, VIEW_W, TOP_H);
        }
        drawCityBadge(cityName, 10, 8 + SAFE_TOP, 44);
        drawText(fitText(cityName, 112, 18, "800"), 66, 19 + SAFE_TOP, 18, COLORS.white, "800");
        roundedRect(145, 11 + SAFE_TOP, 18, 18, 5, "rgba(4,49,72,0.74)", "rgba(255,255,255,0.24)");
        drawText("\u270E", 154, 20 + SAFE_TOP, 7.3, "#FFE08B", "800", "center");
        addButton("city:rename", 140, 6 + SAFE_TOP, 28, 28);
        drawText("\u6253\u9020\u5C5E\u4E8E\u4F60\u7684\u7F8E\u98DF\u4E4B\u90FD", 66, 40 + SAFE_TOP, 7.2, "#E7F0F5", "600");
        drawWeatherGlyph(world.weather, 187, 24 + SAFE_TOP);
        drawText(WEATHER_NAMES[world.weather] || "\u591A\u4E91", 210, 17 + SAFE_TOP, 7.8, "#FFFFFF", "800", "center");
        drawText(
          (Number.isFinite(Number(world.temperature)) ? world.temperature : 22) + "\u2103",
          210,
          35 + SAFE_TOP,
          7.8,
          "#E9F4F8",
          "700",
          "center"
        );
        roundedRect(230, 8 + SAFE_TOP, 95, 48, 12, "rgba(5,43,65,0.92)", "rgba(114,208,244,0.40)");
        drawCashGlyph(246, 25 + SAFE_TOP);
        drawText(fitText("\xA5" + player.cash.toLocaleString(), 62, 11.5, "800"), 279, 21 + SAFE_TOP, 11.5, "#FFF1A7", "800", "center");
        drawText("\u53EF\u7528\u8D44\u91D1", 279, 41 + SAFE_TOP, 6.8, "#DCEBF1", "600", "center");
        roundedRect(309, 16 + SAFE_TOP, 12, 12, 4, "#F5B62D", "#FFE598");
        drawText("+", 315, 22 + SAFE_TOP, 8.5, "#FFFFFF", "800", "center");
        roundedRect(331, 8 + SAFE_TOP, 52, 48, 12, "rgba(5,43,65,0.92)", "rgba(114,208,244,0.40)");
        drawCrownGlyph(344, 24 + SAFE_TOP);
        drawText("Lv." + brand.level, 362, 19 + SAFE_TOP, 8.4, "#FFE27D", "800", "center");
        roundedRect(339, 39 + SAFE_TOP, 35, 4, 2, "rgba(255,255,255,0.22)");
        roundedRect(339, 39 + SAFE_TOP, Math.max(3, 35 * brand.progress), 4, 2, COLORS.gold);
        drawText(
          brand.reputation + "/100",
          357,
          49 + SAFE_TOP,
          5.2,
          "#E7F2F6",
          "600",
          "center"
        );
        addButton("brand:status", 328, 5 + SAFE_TOP, 58, 54);
        const speedItems = [
          ["time:pause", timeSystem.isPaused() ? "\u25B6" : "\u2161"],
          ["time:speed:1", "1x"],
          ["time:speed:2", "2x"],
          ["time:speed:5", "5x"],
          ["time:speed:10", "10x"]
        ];
        const y = TOP_H - 28;
        for (let i = 0; i < speedItems.length; i++) {
          const id = speedItems[i][0];
          const speed = timeSystem.getSpeed();
          const paused = timeSystem.isPaused();
          const active = id === "time:pause" ? paused : !paused && Number(id.split(":")[2]) === speed;
          const x = 12 + i * 46;
          roundedRect(
            x,
            y,
            40,
            21,
            8,
            active ? COLORS.gold : "rgba(4,40,60,0.86)",
            active ? "#FFE38D" : "rgba(255,255,255,0.18)"
          );
          drawText(speedItems[i][1], x + 20, y + 10.5, 8, active ? "#173444" : COLORS.white, "800", "center");
          addButton(id, x - 3, y - 5, 46, 31);
        }
        drawText(
          fitText(display.date + " \xB7 " + display.time + " \xB7 " + (MEAL_NAMES[display.mealPeriod] || ""), 168, 6.7, "600"),
          378,
          y + 10.5,
          6.7,
          "#E5F0F4",
          "600",
          "right"
        );
      };
      drawNewsTicker = function() {
        const feed = simulationSystem.getNewsFeed();
        const bulletin = simulationSystem.getBulletin();
        const x = 8;
        const y = MAP_Y + 5;
        const w = VIEW_W - 16;
        const h = 30;
        roundedRect(x, y, w, h, 15, "rgba(3,40,62,0.95)", "rgba(73,192,239,0.54)");
        drawText("\u{1F4E3}", x + 16, y + 15.5, 10, "#FFD65A", "800", "center");
        drawText("\u57CE\u5E02\u901A\u62A5", x + 31, y + 15.5, 7.3, "#FFD65A", "800");
        const items = (feed && feed.length ? feed : [bulletin]).slice(0, 3);
        const startX = x + 84;
        const sectionW = (w - 111) / Math.max(1, items.length);
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (i > 0) {
            ctx2.fillStyle = "rgba(230,242,247,0.34)";
            ctx2.fillRect(startX + i * sectionW - 5, y + 8, 1, 14);
          }
          drawText(
            fitText(item && item.title ? item.title : "\u57CE\u5E02\u8FD0\u884C\u5E73\u7A33", sectionW - 12, 6.2, "600"),
            startX + i * sectionW,
            y + 15.2,
            6.2,
            "#F3FAFC",
            "600"
          );
        }
        drawText("\u203A", x + w - 12, y + 15.3, 14, "#FFE49C", "800", "center");
        addButton("tool:news", x, y, w, h);
      };
      drawGoalBar = function() {
        const goal = getHomeGoalState();
        const x = 8;
        const y = MAP_Y + 40;
        const w = VIEW_W - 16;
        const h = 30;
        roundedRect(x, y, w, h, 15, "rgba(3,40,62,0.95)", "rgba(73,192,239,0.46)");
        drawText("\u25CE", x + 15, y + 15, 13, "#FFD85C", "800", "center");
        drawText("\u5F53\u524D\u76EE\u6807\uFF1A", x + 28, y + 15, 7.1, "#FFD85C", "800");
        drawText(goal.title === "\u7B79\u5907\u9996\u5E97" ? "\u5F00\u8BBE\u9996\u5BB6\u9910\u5385" : goal.title, x + 83, y + 15, 7.2, "#FFFFFF", "800");
        const labels = goal.title === "\u7B79\u5907\u9996\u5E97" ? ["\u9009\u5740", "\u770B\u94FA", "\u8C08\u5224", "\u7B7E\u7EA6", "\u88C5\u4FEE"] : goal.steps;
        const currentIndex = Math.max(0, Math.min(labels.length - 1, goal.current));
        const startX = x + 159;
        const usable = w - 190;
        const gap = usable / Math.max(1, labels.length - 1);
        for (let i = 0; i < labels.length; i++) {
          const cx = startX + i * gap;
          const done = i < currentIndex;
          const active = i === currentIndex && !goal.completed;
          if (i < labels.length - 1) {
            ctx2.strokeStyle = i < currentIndex ? "#F7CC4A" : "rgba(220,234,240,0.38)";
            ctx2.lineWidth = 1.4;
            ctx2.beginPath();
            ctx2.moveTo(cx + 8, y + 11);
            ctx2.lineTo(cx + gap - 8, y + 11);
            ctx2.stroke();
          }
          ctx2.beginPath();
          ctx2.arc(cx, y + 11, 5.5, 0, Math.PI * 2);
          ctx2.fillStyle = done ? "#F2C744" : active ? "#FFF8CF" : "rgba(225,239,244,0.18)";
          ctx2.fill();
          ctx2.strokeStyle = done || active ? "#FFE58B" : "#9DB8C5";
          ctx2.lineWidth = 1;
          ctx2.stroke();
          drawText(labels[i], cx, y + 23.5, 5.8, active ? "#FFE08A" : "#E8F3F7", active ? "800" : "600", "center");
        }
        drawText("\u{1F381}", x + w - 13, y + 15.5, 10.5, "#FFD85C", "800", "center");
      };
      drawDistrictMarker = function(district) {
        const point = v22GetDistrictPoint(district.id);
        if (!point) return v22OriginalDrawDistrictMarker(district);
        const x = point.x;
        const y = point.y;
        const selected = selectedDistrictId === district.id;
        const meta = getDistrictVisualMeta(district);
        const animated = districtFx.id === district.id;
        const markerScale = animated ? districtFx.scale : 1;
        if (selected) {
          ctx2.beginPath();
          ctx2.arc(x, y, 20 + districtFx.flash * 4, 0, Math.PI * 2);
          ctx2.fillStyle = "rgba(255,195,54,0.16)";
          ctx2.fill();
        }
        ctx2.save();
        ctx2.translate(x, y);
        ctx2.scale(markerScale, markerScale);
        const key = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
        if (!key || !(typeof v21DrawImage === "function" && v21DrawImage(key, 0, -4, 34, 43))) {
          drawDistrictPictogram(district.id, 0, -5);
        }
        ctx2.restore();
        const boxW = Math.max(76, Math.min(95, 38 + district.name.length * 9));
        const preferLeft = x > VIEW_W * 0.64;
        let boxX = preferLeft ? x - boxW - 11 : x + 10;
        boxX = Math.max(5, Math.min(VIEW_W - boxW - 5, boxX));
        let boxY = y - 14;
        boxY = Math.max(MAP_Y + 80, Math.min(CARD_Y - 44, boxY));
        roundedRect(boxX, boxY, boxW, 24, 10, "rgba(5,53,79,0.97)", selected ? "#FFE06C" : "rgba(255,218,93,0.82)", selected ? 1.25 : 1);
        drawText(district.name, boxX + 10, boxY + 12, 8.1, "#FFFFFF", "800");
        drawText("\u203A", boxX + boxW - 8, boxY + 12, 9.6, "#FFE49C", "800", "center");
        roundedRect(boxX + 5, boxY + 24, boxW - 10, 16, 7, "rgba(255,253,247,0.98)", "rgba(11,55,76,0.12)");
        drawText(fitText(meta.subtitle, boxW - 16, 5.2, "700"), boxX + boxW / 2, boxY + 31.5, 5.2, "#23455B", "700", "center");
        if (meta.badge) {
          const badgeW = Math.max(34, 15 + meta.badge.length * 5.6);
          const badgeX = Math.max(5, Math.min(VIEW_W - badgeW - 5, boxX + boxW - badgeW + 4));
          roundedRect(badgeX, boxY - 7, badgeW, 15, 7, meta.badgeColor, "rgba(255,245,218,0.98)");
          drawText(meta.badge, badgeX + badgeW / 2, boxY + 0.8, 4.9, "#FFFFFF", "800", "center");
        }
        if (meta.myShopCount > 0) {
          const textValue = meta.myShopCount > 1 ? "\u2713 \u6211\u7684\u5E97\xD7" + meta.myShopCount : "\u2713 \u6211\u7684\u5E97";
          const shopW = meta.myShopCount > 1 ? 50 : 40;
          const sx = Math.max(5, Math.min(VIEW_W - shopW - 5, boxX + boxW - shopW + 6));
          roundedRect(sx, boxY - 24, shopW, 14, 7, "#1E9A5E", "#B9F0C8");
          drawText(textValue, sx + shopW / 2, boxY - 17, 4.6, "#FFFFFF", "800", "center");
        }
        const hitLeft = Math.min(x - 18, boxX - 3);
        const hitRight = Math.max(x + 18, boxX + boxW + 3);
        const hitTop = Math.min(y - 25, boxY - 24);
        const hitBottom = Math.max(y + 22, boxY + 43);
        addButton("district:" + district.id, hitLeft, hitTop, hitRight - hitLeft, hitBottom - hitTop);
      };
      drawDistrictCard = function() {
        const district = v22EnsureSelectedDistrict();
        if (!district) {
          return v22OriginalDrawDistrictCard();
        }
        const meta = getDistrictVisualMeta(district);
        const x = CARD_X;
        const y = CARD_Y;
        const w = CARD_W;
        const h = CARD_H;
        roundedRect(x, y, w, h, 17, "rgba(255,255,255,0.98)", "rgba(10,56,79,0.16)", 1.1);
        const preview = resourceManager.getImage("city_base_01");
        if (preview) {
          ctx2.save();
          ctx2.beginPath();
          const px = x + 12;
          const py = y + 10;
          const pw = 100;
          const ph = h - 20;
          ctx2.moveTo(px + 14, py);
          ctx2.arcTo(px + pw, py, px + pw, py + ph, 14);
          ctx2.arcTo(px + pw, py + ph, px, py + ph, 14);
          ctx2.arcTo(px, py + ph, px, py, 14);
          ctx2.arcTo(px, py, px + pw, py, 14);
          ctx2.closePath();
          ctx2.clip();
          drawImageFocus(ctx2, preview, px, py, pw, ph, 2, 0.56, 0.6);
          ctx2.restore();
        } else {
          roundedRect(x + 12, y + 10, 100, h - 20, 14, "#C5D7E1");
        }
        const iconKey = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
        if (iconKey && typeof v21DrawImage === "function") {
          v21DrawImage(iconKey, x + 132, y + 22, 23, 29);
        }
        drawText(district.name, x + 146, y + 22, 13.5, "#113654", "800");
        drawText("\u203A", x + 212, y + 22, 13, "#2F5673", "800", "center");
        drawText(meta.subtitle + " \xB7 " + (meta.badge ? meta.badge.replace("\u2191", "") : "\u4ECD\u6709\u7ECF\u8425\u673A\u4F1A"), x + 146, y + 43, 6.4, "#40627B", "700");
        const metrics = [
          ["\u4EBA\u53E3", district.population.toLocaleString(), "#1E76C5"],
          ["\u9700\u6C42", demandSystem.getTotalDemand(district.id).toLocaleString(), "#1E9A5E"],
          ["\u5BA2\u5355", "\xA5" + district.avgSpend, "#164A86"],
          ["\u9910\u996E\u5E97", district.restaurantCount + "\u5BB6", "#164A86"],
          ["\u9971\u548C\u5EA6", district.saturation + "%", "#1E76C5"],
          ["\u79DF\u91D1", district.rentIndex.toFixed(2), "#164A86"]
        ];
        const metricX = x + 120;
        const metricY = y + 52;
        const metricGap = 4;
        const metricW = (w - 132 - metricGap * 5) / 6;
        for (let i = 0; i < metrics.length; i++) {
          const mx = metricX + i * (metricW + metricGap);
          roundedRect(mx, metricY, metricW, 45, 9, "#FAF8F3", "rgba(17,62,92,0.10)");
          drawMetricSymbol(metrics[i][0], mx + metricW / 2, metricY + 10.5, metrics[i][2]);
          drawText(metrics[i][0], mx + metricW / 2, metricY + 24, 5.4, "#245276", "700", "center");
          drawText(metrics[i][1], mx + metricW / 2, metricY + 38, 6.8, metrics[i][2], "800", "center");
        }
        let summary = "\u5BA2\u7FA4\u6D3B\u8DC3 \xB7 \u4ECD\u6709\u7ECF\u8425\u673A\u4F1A";
        if (meta.badge === "\u79DF\u91D1\u4F4E") summary = "\u79DF\u91D1\u8F83\u4F4E \xB7 \u9002\u5408\u62A2\u5148\u5E03\u5C40";
        if (meta.badge === "\u7ADE\u4E89\u9AD8") summary = "\u7ADE\u4E89\u6FC0\u70C8 \xB7 \u9002\u5408\u5DEE\u5F02\u5316\u7ECF\u8425";
        if (meta.badge === "\u4EBA\u6C14\u9AD8") summary = "\u5BA2\u7FA4\u6D3B\u8DC3 \xB7 \u4ECD\u6709\u7ECF\u8425\u673A\u4F1A";
        if (meta.myShopCount > 0) summary = "\u5DF2\u5F00\u95E8\u5E97 \xB7 \u53EF\u7EE7\u7EED\u6DF1\u8015\u7ECF\u8425";
        drawText(summary, x + 120, y + h - 38, 7.2, "#25597A", "800");
        drawText("\u5B9E\u65F6\u6570\u636E\u4F1A\u968F\u4EBA\u53E3\u3001\u57CE\u5E02\u4E8B\u4EF6\u3001\u7ADE\u4E89\u548C\u79DF\u91D1\u53D8\u5316", x + 120, y + h - 18, 5.6, "#607D92", "600");
        roundedRect(x + w - 119, y + h - 44, 108, 36, 18, "#FFC22D", "#DFA01B", 1.2);
        drawText("\u8FDB\u5165\u5546\u5708  \u203A", x + w - 65, y + h - 26, 8.6, "#123A53", "800", "center");
        addButton("district:details", x + w - 123, y + h - 48, 116, 44);
      };
      drawBottomNav = function() {
        const items = [
          { id: "city", label: "\u57CE\u5E02" },
          { id: "shop", label: "\u95E8\u5E97" },
          { id: "traffic", label: "\u5BA2\u6D41" },
          { id: "research", label: "\u83DC\u5355" },
          { id: "supply", label: "\u4F9B\u5E94\u94FE" },
          { id: "business", label: "\u6570\u636E" },
          { id: "system", label: "\u7CFB\u7EDF" }
        ];
        roundedRect(0, NAV_Y, VIEW_W, NAV_H, 0, "rgba(5,52,79,0.98)");
        const glow = ctx2.createLinearGradient(0, NAV_Y, 0, NAV_Y + NAV_H);
        glow.addColorStop(0, "rgba(23,125,203,0.18)");
        glow.addColorStop(1, "rgba(23,125,203,0.00)");
        ctx2.fillStyle = glow;
        ctx2.fillRect(0, NAV_Y, VIEW_W, NAV_H);
        const cellW = VIEW_W / items.length;
        const current = sceneManager.getCurrentId();
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const active = item.id === "city" && current === "city" && !trafficMode || item.id === "traffic" && current === "city" && trafficMode || item.id === "shop" && (current === "shop" || current === "propertyMarket" || current === "equipment" || current === "license" || current === "staff" || current === "renovation") || item.id !== "city" && item.id !== "traffic" && item.id !== "shop" && item.id === current;
          const cellX = i * cellW;
          if (active) {
            roundedRect(cellX + 3, NAV_Y + 4, cellW - 6, NAV_H - 8, 14, "#F3BF20", "#FFE599", 1.1);
          }
          drawNavIcon(item.id, cellX + cellW / 2, NAV_Y + 19, active);
          drawText(item.label, cellX + cellW / 2, NAV_Y + 42, 6.8, active ? "#173444" : "#FFFFFF", active ? "800" : "600", "center");
          addButton("nav:" + item.id, cellX, NAV_Y, cellW, NAV_H);
        }
      };
      if (cityScene && typeof cityScene.enter === "function") {
        const v22OriginalCityEnter = cityScene.enter;
        cityScene.enter = function() {
          v22OriginalCityEnter.call(this);
          v22EnsureSelectedDistrict();
        };
      }
      console.log("V22_HOME_MATCH loaded");
      var V23_DISTRICT_LAYOUT = {
        university: {
          px: 0.17,
          py: 0.34,
          cardFocusX: 0.23,
          cardFocusY: 0.3,
          labelSide: "right"
        },
        hightech: {
          px: 0.79,
          py: 0.36,
          cardFocusX: 0.76,
          cardFocusY: 0.31,
          labelSide: "left"
        },
        cbd: {
          px: 0.5,
          py: 0.49,
          cardFocusX: 0.52,
          cardFocusY: 0.46,
          labelSide: "right"
        },
        oldtown: {
          px: 0.1,
          py: 0.63,
          cardFocusX: 0.17,
          cardFocusY: 0.58,
          labelSide: "right"
        },
        village: {
          px: 0.36,
          py: 0.71,
          cardFocusX: 0.41,
          cardFocusY: 0.66,
          labelSide: "right"
        },
        market: {
          px: 0.16,
          py: 0.85,
          cardFocusX: 0.19,
          cardFocusY: 0.79,
          labelSide: "right"
        },
        industry: {
          px: 0.8,
          py: 0.61,
          cardFocusX: 0.79,
          cardFocusY: 0.58,
          labelSide: "left"
        }
      };
      var v23OriginalDrawMapBase = drawMapBase;
      var v23OriginalDrawDistrictMarker = drawDistrictMarker;
      var v23OriginalDrawDistrictCard = drawDistrictCard;
      var v23OriginalDrawTopHud = drawTopHud;
      var v23OriginalDrawBottomNav = drawBottomNav;
      function v23EnsureSelectedDistrict() {
        const districts = getDistricts();
        if (!districts || !districts.length) return null;
        for (let i = 0; i < districts.length; i++) {
          if (districts[i].id === selectedDistrictId) {
            return districts[i];
          }
        }
        const fallback = districts.find(function(item) {
          return item.id === "market";
        }) || districts[0];
        if (fallback) {
          selectedDistrictId = fallback.id;
        }
        return fallback || null;
      }
      function v23GetMapPoint(districtId) {
        const config = V23_DISTRICT_LAYOUT[districtId];
        if (!config) {
          return getDistrictPoint(districtId);
        }
        const top = MAP_Y + 84;
        const bottom = CARD_Y - 44;
        const usableH = Math.max(120, bottom - top);
        return {
          x: Math.round(MAP_X + MAP_W * config.px),
          y: Math.round(top + usableH * config.py)
        };
      }
      function v23GetCardFocus(districtId) {
        const config = V23_DISTRICT_LAYOUT[districtId] || {};
        return {
          x: config.cardFocusX == null ? 0.56 : config.cardFocusX,
          y: config.cardFocusY == null ? 0.6 : config.cardFocusY
        };
      }
      updateLayout = function() {
        TOP_H = (VIEW_H < 740 ? 93 : 96) + SAFE_TOP;
        NAV_H = (VIEW_H < 740 ? 58 : 62) + SAFE_BOTTOM;
        MAP_X = 0;
        MAP_Y = TOP_H;
        MAP_W = VIEW_W;
        NAV_Y = VIEW_H - NAV_H;
        MAP_H = NAV_Y - MAP_Y;
        CARD_H = VIEW_H < 740 ? 122 : 132;
        CARD_X = 6;
        CARD_W = VIEW_W - 12;
        CARD_Y = NAV_Y - CARD_H - 4;
      };
      drawMapBase = function() {
        const image = resourceManager.getImage("city_base_01");
        if (!image) {
          return v23OriginalDrawMapBase();
        }
        drawImageFocus(
          ctx2,
          image,
          MAP_X,
          MAP_Y,
          MAP_W,
          MAP_H,
          1.72,
          0.56,
          0.57
        );
        const topFade = ctx2.createLinearGradient(0, MAP_Y, 0, MAP_Y + 120);
        topFade.addColorStop(0, "rgba(6,39,61,0.24)");
        topFade.addColorStop(1, "rgba(6,39,61,0.01)");
        ctx2.fillStyle = topFade;
        ctx2.fillRect(MAP_X, MAP_Y, MAP_W, 120);
        const bottomFade = ctx2.createLinearGradient(0, CARD_Y - 50, 0, CARD_Y + 10);
        bottomFade.addColorStop(0, "rgba(255,255,255,0.00)");
        bottomFade.addColorStop(1, "rgba(255,255,255,0.10)");
        ctx2.fillStyle = bottomFade;
        ctx2.fillRect(MAP_X, CARD_Y - 50, MAP_W, 60);
      };
      drawTopHud = function() {
        v23OriginalDrawTopHud();
        drawText("\u54C1\u724C\uFF1A" + (gameState.getPlayer() && gameState.getPlayer().brandName || "\u672A\u547D\u540D\u54C1\u724C"), 66, 50 + SAFE_TOP, 6.2, "#EAF5FA", "600");
      };
      drawNewsTicker = function() {
        const feed = simulationSystem.getNewsFeed();
        const bulletin = simulationSystem.getBulletin();
        const x = 8;
        const y = MAP_Y + 6;
        const w = VIEW_W - 16;
        const h = 29;
        roundedRect(x, y, w, h, 14, "rgba(2,42,67,0.96)", "rgba(82,199,243,0.50)");
        drawText("\u{1F4E3}", x + 16, y + 14.5, 9.5, "#FFD75F", "800", "center");
        drawText("\u57CE\u5E02\u901A\u62A5", x + 31, y + 14.5, 7.4, "#FFD75F", "800");
        const items = (feed && feed.length ? feed : [bulletin]).slice(0, 2);
        const startX = x + 84;
        const sectionW = (w - 107) / Math.max(1, items.length);
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (i > 0) {
            ctx2.fillStyle = "rgba(235,245,248,0.28)";
            ctx2.fillRect(startX + i * sectionW - 7, y + 8, 1, 13);
          }
          drawText(
            fitText(item && item.title ? item.title : "\u57CE\u5E02\u8FD0\u884C\u5E73\u7A33", sectionW - 16, 6.5, "600"),
            startX + i * sectionW,
            y + 14.5,
            6.5,
            "#F5FBFD",
            "600"
          );
        }
        drawText("\u203A", x + w - 13, y + 14.5, 13, "#FFD75F", "800", "center");
        addButton("tool:news", x, y, w, h);
      };
      drawGoalBar = function() {
        const goal = getHomeGoalState();
        const x = 8;
        const y = MAP_Y + 41;
        const w = VIEW_W - 16;
        const h = 30;
        roundedRect(x, y, w, h, 14, "rgba(2,42,67,0.96)", "rgba(82,199,243,0.45)");
        drawText("\u25CE", x + 15, y + 14.5, 12.5, "#FFD85C", "800", "center");
        drawText("\u5F53\u524D\u76EE\u6807\uFF1A", x + 28, y + 14.5, 7.3, "#FFD85C", "800");
        drawText(goal.title === "\u7B79\u5907\u9996\u5E97" ? "\u5F00\u8BBE\u9996\u5BB6\u9910\u5385" : goal.title, x + 83, y + 14.5, 7.3, "#FFFFFF", "800");
        const labels = goal.title === "\u7B79\u5907\u9996\u5E97" ? ["\u9009\u5740", "\u770B\u94FA", "\u8C08\u5224", "\u7B7E\u7EA6", "\u88C5\u4FEE"] : goal.steps;
        const currentIndex = Math.max(0, Math.min(labels.length - 1, goal.current));
        const startX = x + 164;
        const usable = w - 197;
        const gap = usable / Math.max(1, labels.length - 1);
        for (let i = 0; i < labels.length; i++) {
          const cx = startX + i * gap;
          const done = i < currentIndex;
          const active = i === currentIndex && !goal.completed;
          if (i < labels.length - 1) {
            ctx2.strokeStyle = i < currentIndex ? "#F3C644" : "rgba(227,237,241,0.40)";
            ctx2.lineWidth = 1.2;
            ctx2.beginPath();
            ctx2.moveTo(cx + 8, y + 10.5);
            ctx2.lineTo(cx + gap - 8, y + 10.5);
            ctx2.stroke();
          }
          ctx2.beginPath();
          ctx2.arc(cx, y + 10.5, 5.1, 0, Math.PI * 2);
          ctx2.fillStyle = done ? "#F2C745" : active ? "#FFF6C7" : "rgba(225,239,244,0.18)";
          ctx2.fill();
          ctx2.strokeStyle = done || active ? "#FFE58B" : "#9DB8C5";
          ctx2.lineWidth = 1;
          ctx2.stroke();
          drawText(labels[i], cx, y + 22.5, 5.8, active ? "#FFE08A" : "#E8F3F7", active ? "800" : "600", "center");
        }
        drawText("\u{1F381}", x + w - 13, y + 15, 10.5, "#FFD85C", "800", "center");
      };
      drawDistrictMarker = function(district) {
        const config = V23_DISTRICT_LAYOUT[district.id];
        if (!config) {
          return v23OriginalDrawDistrictMarker(district);
        }
        const point = v23GetMapPoint(district.id);
        const x = point.x;
        const y = point.y;
        const selected = selectedDistrictId === district.id;
        const meta = getDistrictVisualMeta(district);
        const animated = districtFx.id === district.id;
        const markerScale = animated ? districtFx.scale : 1;
        if (selected) {
          ctx2.beginPath();
          ctx2.arc(x, y, 23 + districtFx.flash * 4, 0, Math.PI * 2);
          ctx2.fillStyle = "rgba(255,199,65,0.16)";
          ctx2.fill();
        }
        ctx2.save();
        ctx2.translate(x, y);
        ctx2.scale(markerScale, markerScale);
        const key = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
        if (!key || !(typeof v21DrawImage === "function" && v21DrawImage(key, 0, -3, 40, 50))) {
          drawDistrictPictogram(district.id, 0, -3);
        }
        ctx2.restore();
        const boxW = Math.max(82, Math.min(106, 44 + district.name.length * 10));
        const boxH = 25;
        const subH = 17;
        const side = config.labelSide || "right";
        let boxX = side === "left" ? x - boxW - 13 : x + 14;
        boxX = Math.max(6, Math.min(VIEW_W - boxW - 6, boxX));
        let boxY = y - 14;
        boxY = Math.max(MAP_Y + 84, Math.min(CARD_Y - 52, boxY));
        roundedRect(boxX, boxY, boxW, boxH, 11, "rgba(5,53,79,0.98)", selected ? "#FFE06C" : "rgba(255,218,93,0.82)", selected ? 1.25 : 1);
        drawText(district.name, boxX + 10, boxY + 12.3, 8.5, "#FFFFFF", "800");
        drawText("\u203A", boxX + boxW - 9, boxY + 12.3, 9.6, "#FFE49C", "800", "center");
        roundedRect(boxX + 5, boxY + boxH, boxW - 10, subH, 7, "rgba(255,253,247,0.99)", "rgba(11,55,76,0.10)");
        drawText(fitText(meta.subtitle, boxW - 16, 5.7, "700"), boxX + boxW / 2, boxY + boxH + 8.6, 5.7, "#23455B", "700", "center");
        if (meta.badge) {
          const badgeW = Math.max(35, 16 + meta.badge.length * 5.8);
          const badgeX = Math.max(6, Math.min(VIEW_W - badgeW - 6, boxX + boxW - badgeW + 4));
          roundedRect(badgeX, boxY - 8, badgeW, 16, 8, meta.badgeColor, "rgba(255,245,218,0.98)");
          drawText(meta.badge, badgeX + badgeW / 2, boxY + 0.8, 5.1, "#FFFFFF", "800", "center");
        }
        if (meta.myShopCount > 0) {
          const textValue = meta.myShopCount > 1 ? "\u2713 \u6211\u7684\u5E97\xD7" + meta.myShopCount : "\u2713 \u6211\u7684\u5E97";
          const shopW = meta.myShopCount > 1 ? 52 : 42;
          const sx = Math.max(6, Math.min(VIEW_W - shopW - 6, boxX + boxW - shopW + 2));
          roundedRect(sx, boxY - 26, shopW, 15, 7, "#1E9A5E", "#B9F0C8");
          drawText(textValue, sx + shopW / 2, boxY - 18.5, 4.8, "#FFFFFF", "800", "center");
        }
        const hitLeft = Math.min(x - 20, boxX - 4);
        const hitRight = Math.max(x + 22, boxX + boxW + 4);
        const hitTop = Math.min(y - 28, boxY - 26);
        const hitBottom = Math.max(y + 25, boxY + 44);
        addButton("district:" + district.id, hitLeft, hitTop, hitRight - hitLeft, hitBottom - hitTop);
      };
      drawDistrictCard = function() {
        const district = v23EnsureSelectedDistrict();
        if (!district) {
          return v23OriginalDrawDistrictCard();
        }
        const meta = getDistrictVisualMeta(district);
        const x = CARD_X;
        const y = CARD_Y;
        const w = CARD_W;
        const h = CARD_H;
        roundedRect(x, y, w, h, 17, "rgba(255,255,255,0.985)", "rgba(10,56,79,0.16)", 1.1);
        const preview = resourceManager.getImage("city_base_01");
        const px = x + 11;
        const py = y + 10;
        const pw = 88;
        const ph = h - 20;
        if (preview) {
          const focus = v23GetCardFocus(district.id);
          ctx2.save();
          ctx2.beginPath();
          ctx2.moveTo(px + 14, py);
          ctx2.arcTo(px + pw, py, px + pw, py + ph, 14);
          ctx2.arcTo(px + pw, py + ph, px, py + ph, 14);
          ctx2.arcTo(px, py + ph, px, py, 14);
          ctx2.arcTo(px, py, px + pw, py, 14);
          ctx2.closePath();
          ctx2.clip();
          drawImageFocus(ctx2, preview, px, py, pw, ph, 2.15, focus.x, focus.y);
          ctx2.restore();
        } else {
          roundedRect(px, py, pw, ph, 14, "#C5D7E1");
        }
        const iconKey = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
        if (iconKey && typeof v21DrawImage === "function") {
          v21DrawImage(iconKey, x + 118, y + 19, 19, 24);
        }
        drawText(district.name, x + 130, y + 18, 13.2, "#103655", "800");
        drawText("\u203A", x + 194, y + 18, 12.4, "#2F5673", "800", "center");
        let summary = "\u5BA2\u7FA4\u6D3B\u8DC3 \xB7 \u4ECD\u6709\u7ECF\u8425\u673A\u4F1A";
        if (meta.badge === "\u79DF\u91D1\u4F4E") summary = "\u79DF\u91D1\u8F83\u4F4E \xB7 \u9002\u5408\u62A2\u5148\u5E03\u5C40";
        if (meta.badge === "\u7ADE\u4E89\u9AD8") summary = "\u7ADE\u4E89\u6FC0\u70C8 \xB7 \u9002\u5408\u5DEE\u5F02\u5316\u7ECF\u8425";
        if (meta.badge === "\u9700\u6C42\u2191") summary = "\u9700\u6C42\u4E0A\u6DA8 \xB7 \u53EF\u4F18\u5148\u8FDB\u5165";
        if (meta.badge === "\u4EBA\u6C14\u9AD8") summary = "\u5BA2\u7FA4\u6D3B\u8DC3 \xB7 \u4ECD\u6709\u7ECF\u8425\u673A\u4F1A";
        if (meta.myShopCount > 0) summary = "\u5DF2\u5F00\u95E8\u5E97 \xB7 \u53EF\u7EE7\u7EED\u6DF1\u8015\u7ECF\u8425";
        drawText(summary, x + 110, y + 35, 6.2, "#39627E", "700");
        const metrics = [
          ["\u4EBA\u53E3", district.population.toLocaleString(), "#1E76C5"],
          ["\u9700\u6C42", demandSystem.getTotalDemand(district.id).toLocaleString(), "#1E9A5E"],
          ["\u5BA2\u5355", "\xA5" + district.avgSpend, "#164A86"],
          ["\u9910\u996E\u5E97", district.restaurantCount + "\u5BB6", "#164A86"],
          ["\u9971\u548C\u5EA6", district.saturation + "%", "#1E76C5"],
          ["\u79DF\u91D1", district.rentIndex.toFixed(2), "#164A86"]
        ];
        const metricX = x + 103;
        const metricY = y + 47;
        const metricGap = 4;
        const metricW = Math.floor((w - 220 - metricGap * 5) / 6);
        for (let i = 0; i < metrics.length; i++) {
          const mx = metricX + i * (metricW + metricGap);
          roundedRect(mx, metricY, metricW, 39, 8, "#FAF8F3", "rgba(17,62,92,0.10)");
          drawMetricSymbol(metrics[i][0], mx + metricW / 2, metricY + 9.5, metrics[i][2]);
          drawText(metrics[i][0], mx + metricW / 2, metricY + 20.5, 4.9, "#245276", "700", "center");
          drawText(metrics[i][1], mx + metricW / 2, metricY + 33.5, 6.2, metrics[i][2], "800", "center");
        }
        drawText("\u5B9E\u65F6\u6570\u636E\u4F1A\u968F\u4EBA\u53E3\u3001\u57CE\u5E02\u4E8B\u4EF6\u3001\u7ADE\u4E89\u548C\u79DF\u91D1\u53D8\u5316", x + 109, y + h - 17, 5.5, "#607D92", "600");
        roundedRect(x + w - 116, y + h - 42, 106, 34, 18, "#FFC22D", "#DFA01B", 1.2);
        drawText("\u8FDB\u5165\u5546\u5708  \u203A", x + w - 63, y + h - 25, 8.4, "#123A53", "800", "center");
        addButton("district:details", x + w - 120, y + h - 46, 112, 42);
      };
      drawBottomNav = function() {
        v23OriginalDrawBottomNav();
        ctx2.strokeStyle = "rgba(86,190,244,0.26)";
        ctx2.lineWidth = 1;
        ctx2.strokeRect(0.5, NAV_Y + 0.5, VIEW_W - 1, NAV_H - 1);
      };
      if (cityScene && typeof cityScene.enter === "function") {
        const v23OriginalCityEnter = cityScene.enter;
        cityScene.enter = function() {
          v23OriginalCityEnter.call(this);
          v23EnsureSelectedDistrict();
        };
      }
      console.log("V23_HOME_REMAP loaded");
      var V24_DISTRICT_PREVIEW_KEYS = {
        university: "v24_preview_university",
        hightech: "v24_preview_hightech",
        cbd: "v24_preview_cbd",
        oldtown: "v24_preview_oldtown",
        village: "v24_preview_village",
        market: "v24_preview_market",
        industry: "v24_preview_industry"
      };
      var v24OriginalLoadResources = loadResources;
      var v24OriginalDrawDistrictCard = drawDistrictCard;
      var v24OriginalDrawMapBase = drawMapBase;
      loadResources = function() {
        const previews = [
          ["v24_preview_university", "district_preview_university.png"],
          ["v24_preview_hightech", "district_preview_hightech.png"],
          ["v24_preview_cbd", "district_preview_cbd.png"],
          ["v24_preview_oldtown", "district_preview_oldtown.png"],
          ["v24_preview_village", "district_preview_village.png"],
          ["v24_preview_market", "district_preview_market.png"],
          ["v24_preview_industry", "district_preview_industry.png"]
        ];
        const tasks = [];
        for (let i = 0; i < previews.length; i++) {
          tasks.push(
            resourceManager.loadImage(
              previews[i][0],
              "assets/images/v24/" + previews[i][1],
              "v24-ui"
            )
          );
        }
        return Promise.all(tasks).then(function() {
          return v24OriginalLoadResources();
        });
      };
      drawMapBase = function() {
        const image = resourceManager.getImage("city_base_01");
        if (!image) {
          return v24OriginalDrawMapBase();
        }
        drawImageFocus(
          ctx2,
          image,
          MAP_X,
          MAP_Y,
          MAP_W,
          MAP_H,
          1.58,
          0.51,
          0.52
        );
        const topFade = ctx2.createLinearGradient(0, MAP_Y, 0, MAP_Y + 120);
        topFade.addColorStop(0, "rgba(5,35,54,0.20)");
        topFade.addColorStop(1, "rgba(5,35,54,0.00)");
        ctx2.fillStyle = topFade;
        ctx2.fillRect(MAP_X, MAP_Y, MAP_W, 120);
      };
      drawDistrictCard = function() {
        const district = typeof v23EnsureSelectedDistrict === "function" ? v23EnsureSelectedDistrict() : (getDistricts() || [])[0] || null;
        if (!district) {
          return v24OriginalDrawDistrictCard();
        }
        const meta = getDistrictVisualMeta(district);
        const x = CARD_X;
        const y = CARD_Y;
        const w = CARD_W;
        const h = CARD_H;
        roundedRect(x, y, w, h, 17, "rgba(255,255,255,0.988)", "rgba(10,56,79,0.16)", 1.1);
        const previewKey = V24_DISTRICT_PREVIEW_KEYS[district.id];
        const preview = resourceManager.getImage(previewKey);
        const px = x + 11;
        const py = y + 10;
        const pw = 88;
        const ph = h - 20;
        if (preview) {
          ctx2.save();
          ctx2.beginPath();
          ctx2.moveTo(px + 14, py);
          ctx2.arcTo(px + pw, py, px + pw, py + ph, 14);
          ctx2.arcTo(px + pw, py + ph, px, py + ph, 14);
          ctx2.arcTo(px, py + ph, px, py, 14);
          ctx2.arcTo(px, py, px + pw, py, 14);
          ctx2.closePath();
          ctx2.clip();
          drawImageFocus(ctx2, preview, px, py, pw, ph, 1.02, 0.5, 0.5);
          ctx2.restore();
        } else {
          return v24OriginalDrawDistrictCard();
        }
        const iconKey = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
        if (iconKey && typeof v21DrawImage === "function") {
          v21DrawImage(iconKey, x + 118, y + 19, 19, 24);
        }
        drawText(district.name, x + 130, y + 18, 13.2, "#103655", "800");
        drawText("\u203A", x + 194, y + 18, 12.4, "#2F5673", "800", "center");
        let summary = "\u5BA2\u7FA4\u6D3B\u8DC3 \xB7 \u4ECD\u6709\u7ECF\u8425\u673A\u4F1A";
        if (meta.badge === "\u79DF\u91D1\u4F4E") summary = "\u79DF\u91D1\u8F83\u4F4E \xB7 \u9002\u5408\u62A2\u5148\u5E03\u5C40";
        if (meta.badge === "\u7ADE\u4E89\u9AD8") summary = "\u7ADE\u4E89\u6FC0\u70C8 \xB7 \u9002\u5408\u5DEE\u5F02\u5316\u7ECF\u8425";
        if (meta.badge === "\u9700\u6C42\u2191") summary = "\u9700\u6C42\u4E0A\u6DA8 \xB7 \u53EF\u4F18\u5148\u8FDB\u5165";
        if (meta.badge === "\u4EBA\u6C14\u9AD8") summary = "\u5BA2\u7FA4\u6D3B\u8DC3 \xB7 \u4ECD\u6709\u7ECF\u8425\u673A\u4F1A";
        if (meta.myShopCount > 0) summary = "\u5DF2\u5F00\u95E8\u5E97 \xB7 \u53EF\u7EE7\u7EED\u6DF1\u8015\u7ECF\u8425";
        drawText(summary, x + 110, y + 35, 6.2, "#39627E", "700");
        const metrics = [
          ["\u4EBA\u53E3", district.population.toLocaleString(), "#1E76C5"],
          ["\u9700\u6C42", demandSystem.getTotalDemand(district.id).toLocaleString(), "#1E9A5E"],
          ["\u5BA2\u5355", "\xA5" + district.avgSpend, "#164A86"],
          ["\u9910\u996E\u5E97", district.restaurantCount + "\u5BB6", "#164A86"],
          ["\u9971\u548C\u5EA6", district.saturation + "%", "#1E76C5"],
          ["\u79DF\u91D1", district.rentIndex.toFixed(2), "#164A86"]
        ];
        const metricX = x + 103;
        const metricY = y + 47;
        const metricGap = 4;
        const metricW = Math.floor((w - 220 - metricGap * 5) / 6);
        for (let i = 0; i < metrics.length; i++) {
          const mx = metricX + i * (metricW + metricGap);
          roundedRect(mx, metricY, metricW, 39, 8, "#FAF8F3", "rgba(17,62,92,0.10)");
          drawMetricSymbol(metrics[i][0], mx + metricW / 2, metricY + 9.5, metrics[i][2]);
          drawText(metrics[i][0], mx + metricW / 2, metricY + 20.5, 4.9, "#245276", "700", "center");
          drawText(metrics[i][1], mx + metricW / 2, metricY + 33.5, 6.2, metrics[i][2], "800", "center");
        }
        drawText("\u5B9E\u65F6\u6570\u636E\u4F1A\u968F\u4EBA\u53E3\u3001\u57CE\u5E02\u4E8B\u4EF6\u3001\u7ADE\u4E89\u548C\u79DF\u91D1\u53D8\u5316", x + 109, y + h - 17, 5.5, "#607D92", "600");
        roundedRect(x + w - 116, y + h - 42, 106, 34, 18, "#FFC22D", "#DFA01B", 1.2);
        drawText("\u8FDB\u5165\u5546\u5708  \u203A", x + w - 63, y + h - 25, 8.4, "#123A53", "800", "center");
        addButton("district:details", x + w - 120, y + h - 46, 112, 42);
      };
      console.log("V24_FINAL_HOME_PACK loaded");
      var V25_POINTS = {
        university: { x: 0.17, y: 0.13, side: "right" },
        hightech: { x: 0.8, y: 0.15, side: "left" },
        cbd: { x: 0.54, y: 0.36, side: "right" },
        oldtown: { x: 0.1, y: 0.52, side: "right" },
        village: { x: 0.38, y: 0.63, side: "right" },
        industry: { x: 0.81, y: 0.57, side: "left" },
        market: { x: 0.17, y: 0.8, side: "right" }
      };
      function v25SelectedDistrict() {
        const districts = getDistricts() || [];
        let selected = districts.find(function(d) {
          return d.id === selectedDistrictId;
        });
        if (!selected) {
          selected = districts.find(function(d) {
            return d.id === "market";
          }) || districts[0] || null;
          if (selected) selectedDistrictId = selected.id;
        }
        return selected;
      }
      function v25Point(id) {
        const p = V25_POINTS[id];
        if (!p) return getDistrictPoint(id);
        const top = MAP_Y + 78;
        const bottom = CARD_Y - 34;
        const usable = Math.max(160, bottom - top);
        return {
          x: Math.round(MAP_X + MAP_W * p.x),
          y: Math.round(top + usable * p.y)
        };
      }
      updateLayout = function() {
        TOP_H = (VIEW_H < 740 ? 91 : 94) + SAFE_TOP;
        NAV_H = (VIEW_H < 740 ? 64 : 68) + SAFE_BOTTOM;
        MAP_X = 0;
        MAP_Y = TOP_H;
        MAP_W = VIEW_W;
        NAV_Y = VIEW_H - NAV_H;
        MAP_H = NAV_Y - MAP_Y;
        CARD_H = VIEW_H < 740 ? 96 : 102;
        CARD_X = 6;
        CARD_W = VIEW_W - 12;
        CARD_Y = NAV_Y - CARD_H - 5;
      };
      drawNewsTicker = function() {
        const feed = simulationSystem.getNewsFeed();
        const bulletin = simulationSystem.getBulletin();
        const x = 8;
        const y = MAP_Y + 5;
        const w = VIEW_W - 16;
        const h = 28;
        roundedRect(x, y, w, h, 14, "rgba(3,42,66,0.965)", "rgba(84,199,243,0.50)");
        drawText("\u{1F4E3}", x + 16, y + 14, 9.2, "#FFD75F", "800", "center");
        drawText("\u57CE\u5E02\u901A\u62A5", x + 31, y + 14, 7.5, "#FFD75F", "800");
        const items = (feed && feed.length ? feed : [bulletin]).slice(0, 3);
        const startX = x + 84;
        const sectionW = (w - 106) / Math.max(1, items.length);
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (i > 0) {
            ctx2.fillStyle = "rgba(235,245,248,0.28)";
            ctx2.fillRect(startX + i * sectionW - 6, y + 7, 1, 14);
          }
          drawText(
            fitText(item && item.title ? item.title : "\u57CE\u5E02\u8FD0\u884C\u5E73\u7A33", sectionW - 12, 6.1, "600"),
            startX + i * sectionW,
            y + 14,
            6.1,
            "#F6FBFD",
            "600"
          );
        }
        drawText("\u203A", x + w - 12, y + 14, 13, "#FFE071", "800", "center");
        addButton("tool:news", x, y, w, h);
      };
      drawGoalBar = function() {
        const goal = getHomeGoalState();
        const x = 8;
        const y = MAP_Y + 38;
        const w = VIEW_W - 16;
        const h = 28;
        roundedRect(x, y, w, h, 14, "rgba(3,42,66,0.965)", "rgba(84,199,243,0.45)");
        drawText("\u25CE", x + 15, y + 14, 12, "#FFD85C", "800", "center");
        drawText("\u5F53\u524D\u76EE\u6807\uFF1A", x + 29, y + 14, 7.2, "#FFD85C", "800");
        drawText(goal.title === "\u7B79\u5907\u9996\u5E97" ? "\u5F00\u8BBE\u9996\u5BB6\u9910\u5385" : goal.title, x + 84, y + 14, 7.2, "#FFFFFF", "800");
        const labels = goal.title === "\u7B79\u5907\u9996\u5E97" ? ["\u9009\u5740", "\u770B\u94FA", "\u8C08\u5224", "\u7B7E\u7EA6", "\u88C5\u4FEE"] : goal.steps;
        const currentIndex = Math.max(0, Math.min(labels.length - 1, goal.current));
        const startX = x + 165;
        const usable = w - 198;
        const gap = usable / Math.max(1, labels.length - 1);
        for (let i = 0; i < labels.length; i++) {
          const cx = startX + i * gap;
          const done = i < currentIndex;
          const active = i === currentIndex && !goal.completed;
          if (i < labels.length - 1) {
            ctx2.strokeStyle = i < currentIndex ? "#F5C94A" : "rgba(226,238,243,0.42)";
            ctx2.lineWidth = 1.15;
            ctx2.beginPath();
            ctx2.moveTo(cx + 7, y + 9.5);
            ctx2.lineTo(cx + gap - 7, y + 9.5);
            ctx2.stroke();
          }
          ctx2.beginPath();
          ctx2.arc(cx, y + 9.5, 4.8, 0, Math.PI * 2);
          ctx2.fillStyle = done ? "#F2C744" : active ? "#FFF6CC" : "rgba(225,239,244,0.17)";
          ctx2.fill();
          ctx2.strokeStyle = done || active ? "#FFE58B" : "#9DB8C5";
          ctx2.lineWidth = 1;
          ctx2.stroke();
          drawText(labels[i], cx, y + 21.5, 5.9, active ? "#FFE08A" : "#EBF4F7", active ? "800" : "600", "center");
        }
        drawText("\u{1F381}", x + w - 13, y + 14, 10, "#FFD85C", "800", "center");
      };
      drawDistrictMarker = function(district) {
        const point = v25Point(district.id);
        if (!point) return;
        const x = point.x;
        const y = point.y;
        const selected = selectedDistrictId === district.id;
        const meta = getDistrictVisualMeta(district);
        const config = V25_POINTS[district.id] || { side: "right" };
        const animated = districtFx.id === district.id;
        const markerScale = animated ? districtFx.scale : 1;
        if (selected) {
          ctx2.beginPath();
          ctx2.arc(x, y, 25 + districtFx.flash * 4, 0, Math.PI * 2);
          ctx2.fillStyle = "rgba(255,196,46,0.18)";
          ctx2.fill();
        }
        ctx2.save();
        ctx2.translate(x, y);
        ctx2.scale(markerScale, markerScale);
        const key = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
        if (!key || !(typeof v21DrawImage === "function" && v21DrawImage(key, 0, -4, 46, 58))) {
          drawDistrictPictogram(district.id, 0, -4);
        }
        ctx2.restore();
        const boxW = Math.max(90, Math.min(118, 48 + district.name.length * 11));
        const boxH = 28;
        const subH = 18;
        let boxX = config.side === "left" ? x - boxW - 15 : x + 15;
        boxX = Math.max(6, Math.min(VIEW_W - boxW - 6, boxX));
        let boxY = y - 15;
        boxY = Math.max(MAP_Y + 72, Math.min(CARD_Y - 50, boxY));
        roundedRect(
          boxX,
          boxY,
          boxW,
          boxH,
          12,
          "rgba(4,52,79,0.98)",
          selected ? "#FFE06C" : "rgba(255,220,97,0.86)",
          selected ? 1.35 : 1
        );
        drawText(
          district.name,
          boxX + 11,
          boxY + 14,
          9.2,
          "#FFFFFF",
          "800"
        );
        drawText(
          "\u203A",
          boxX + boxW - 10,
          boxY + 14,
          10.3,
          "#FFE49C",
          "800",
          "center"
        );
        roundedRect(
          boxX + 6,
          boxY + boxH,
          boxW - 12,
          subH,
          8,
          "rgba(255,253,247,0.99)",
          "rgba(11,55,76,0.10)"
        );
        drawText(
          fitText(meta.subtitle, boxW - 20, 6.1, "700"),
          boxX + boxW / 2,
          boxY + boxH + 9,
          6.1,
          "#23455B",
          "700",
          "center"
        );
        if (meta.badge) {
          const badgeW = Math.max(37, 16 + meta.badge.length * 6.1);
          const badgeX = Math.max(
            6,
            Math.min(VIEW_W - badgeW - 6, boxX + boxW - badgeW + 5)
          );
          roundedRect(
            badgeX,
            boxY - 9,
            badgeW,
            17,
            8,
            meta.badgeColor,
            "rgba(255,245,218,0.98)"
          );
          drawText(
            meta.badge,
            badgeX + badgeW / 2,
            boxY - 0.5,
            5.4,
            "#FFFFFF",
            "800",
            "center"
          );
        }
        if (meta.myShopCount > 0) {
          const txt = meta.myShopCount > 1 ? "\u2713 \u6211\u7684\u5E97\xD7" + meta.myShopCount : "\u2713 \u6211\u7684\u5E97";
          const sw = meta.myShopCount > 1 ? 55 : 44;
          const sx = Math.max(
            6,
            Math.min(VIEW_W - sw - 6, boxX + boxW - sw + 3)
          );
          roundedRect(
            sx,
            boxY - 28,
            sw,
            16,
            8,
            "#1E9A5E",
            "#B9F0C8"
          );
          drawText(
            txt,
            sx + sw / 2,
            boxY - 20,
            5,
            "#FFFFFF",
            "800",
            "center"
          );
        }
        const hitLeft = Math.min(x - 24, boxX - 4);
        const hitRight = Math.max(x + 24, boxX + boxW + 4);
        const hitTop = Math.min(y - 32, boxY - 28);
        const hitBottom = Math.max(y + 28, boxY + boxH + subH + 3);
        addButton(
          "district:" + district.id,
          hitLeft,
          hitTop,
          hitRight - hitLeft,
          hitBottom - hitTop
        );
      };
      drawDistrictCard = function() {
        const district = v25SelectedDistrict();
        if (!district) return;
        const meta = getDistrictVisualMeta(district);
        const x = CARD_X;
        const y = CARD_Y;
        const w = CARD_W;
        const h = CARD_H;
        roundedRect(x, y, w, h, 17, "rgba(255,255,255,0.99)", "rgba(10,56,79,0.16)", 1.1);
        const previewKey = typeof V24_DISTRICT_PREVIEW_KEYS !== "undefined" ? V24_DISTRICT_PREVIEW_KEYS[district.id] : null;
        const preview = previewKey ? resourceManager.getImage(previewKey) : resourceManager.getImage("city_base_01");
        const px = x + 10;
        const py = y + 8;
        const pw = 91;
        const ph = h - 16;
        if (preview) {
          ctx2.save();
          ctx2.beginPath();
          ctx2.moveTo(px + 13, py);
          ctx2.arcTo(px + pw, py, px + pw, py + ph, 13);
          ctx2.arcTo(px + pw, py + ph, px, py + ph, 13);
          ctx2.arcTo(px, py + ph, px, py, 13);
          ctx2.arcTo(px, py, px + pw, py, 13);
          ctx2.closePath();
          ctx2.clip();
          drawImageFocus(ctx2, preview, px, py, pw, ph, 1.02, 0.5, 0.5);
          ctx2.restore();
        }
        const iconKey = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
        if (iconKey && typeof v21DrawImage === "function") {
          v21DrawImage(iconKey, x + 116, y + 17, 18, 23);
        }
        drawText(district.name, x + 129, y + 17, 12.3, "#103655", "800");
        drawText("\u203A", x + 195, y + 17, 12, "#2F5673", "800", "center");
        let summary = "\u5BA2\u7FA4\u6D3B\u8DC3 \xB7 \u4ECD\u6709\u7ECF\u8425\u673A\u4F1A";
        if (meta.badge === "\u79DF\u91D1\u4F4E") summary = "\u79DF\u91D1\u8F83\u4F4E \xB7 \u9002\u5408\u62A2\u5148\u5E03\u5C40";
        if (meta.badge === "\u7ADE\u4E89\u9AD8") summary = "\u7ADE\u4E89\u6FC0\u70C8 \xB7 \u9002\u5408\u5DEE\u5F02\u5316\u7ECF\u8425";
        if (meta.badge === "\u9700\u6C42\u2191") summary = "\u9700\u6C42\u4E0A\u6DA8 \xB7 \u53EF\u4F18\u5148\u8FDB\u5165";
        if (meta.myShopCount > 0) summary = "\u5DF2\u5F00\u95E8\u5E97 \xB7 \u53EF\u7EE7\u7EED\u6DF1\u8015\u7ECF\u8425";
        drawText(summary, x + 109, y + 32, 5.9, "#39627E", "700");
        const metrics = [
          ["\u4EBA\u53E3", district.population.toLocaleString(), "#1E76C5"],
          ["\u9700\u6C42", demandSystem.getTotalDemand(district.id).toLocaleString(), "#1E9A5E"],
          ["\u5BA2\u5355", "\xA5" + district.avgSpend, "#164A86"],
          ["\u9910\u996E\u5E97", district.restaurantCount + "\u5BB6", "#164A86"],
          ["\u9971\u548C\u5EA6", district.saturation + "%", "#1E76C5"],
          ["\u79DF\u91D1", district.rentIndex.toFixed(2), "#164A86"]
        ];
        const metricX = x + 105;
        const metricY = y + 40;
        const metricGap = 3;
        const metricW = Math.floor((w - 218 - metricGap * 5) / 6);
        for (let i = 0; i < metrics.length; i++) {
          const mx = metricX + i * (metricW + metricGap);
          roundedRect(
            mx,
            metricY,
            metricW,
            35,
            8,
            "#FAF8F3",
            "rgba(17,62,92,0.10)"
          );
          drawMetricSymbol(
            metrics[i][0],
            mx + metricW / 2,
            metricY + 8.5,
            metrics[i][2]
          );
          drawText(
            metrics[i][0],
            mx + metricW / 2,
            metricY + 18.5,
            4.7,
            "#245276",
            "700",
            "center"
          );
          drawText(
            metrics[i][1],
            mx + metricW / 2,
            metricY + 30,
            5.9,
            metrics[i][2],
            "800",
            "center"
          );
        }
        drawText(
          "\u5B9E\u65F6\u6570\u636E\u968F\u4EBA\u53E3\u3001\u57CE\u5E02\u4E8B\u4EF6\u3001\u7ADE\u4E89\u548C\u79DF\u91D1\u53D8\u5316",
          x + 108,
          y + h - 11,
          5,
          "#607D92",
          "600"
        );
        roundedRect(
          x + w - 104,
          y + h - 35,
          95,
          29,
          15,
          "#FFC22D",
          "#DFA01B",
          1.15
        );
        drawText(
          "\u8FDB\u5165\u5546\u5708  \u203A",
          x + w - 57,
          y + h - 20.5,
          7.6,
          "#123A53",
          "800",
          "center"
        );
        addButton(
          "district:details",
          x + w - 108,
          y + h - 39,
          103,
          37
        );
      };
      drawBottomNav = function() {
        const items = [
          { id: "city", label: "\u57CE\u5E02" },
          { id: "shop", label: "\u95E8\u5E97" },
          { id: "traffic", label: "\u5BA2\u6D41" },
          { id: "research", label: "\u83DC\u5355" },
          { id: "supply", label: "\u4F9B\u5E94\u94FE" },
          { id: "business", label: "\u6570\u636E" },
          { id: "system", label: "\u7CFB\u7EDF" }
        ];
        roundedRect(0, NAV_Y, VIEW_W, NAV_H, 0, "rgba(4,52,79,0.99)");
        const cellW = VIEW_W / items.length;
        const current = sceneManager.getCurrentId();
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const active = item.id === "city" && current === "city" && !trafficMode || item.id === "traffic" && current === "city" && trafficMode || item.id === "shop" && (current === "shop" || current === "propertyMarket" || current === "equipment" || current === "license" || current === "staff" || current === "renovation") || item.id !== "city" && item.id !== "traffic" && item.id !== "shop" && item.id === current;
          const cellX = i * cellW;
          if (active) {
            roundedRect(
              cellX + 3,
              NAV_Y + 4,
              cellW - 6,
              NAV_H - 8,
              15,
              "#F3BF20",
              "#FFE599",
              1.1
            );
          }
          drawNavIcon(
            item.id,
            cellX + cellW / 2,
            NAV_Y + 21,
            active
          );
          drawText(
            item.label,
            cellX + cellW / 2,
            NAV_Y + 47,
            7.5,
            active ? "#173444" : "#FFFFFF",
            active ? "800" : "700",
            "center"
          );
          addButton(
            "nav:" + item.id,
            cellX,
            NAV_Y,
            cellW,
            NAV_H
          );
        }
        ctx2.strokeStyle = "rgba(86,190,244,0.35)";
        ctx2.lineWidth = 1;
        ctx2.strokeRect(0.5, NAV_Y + 0.5, VIEW_W - 1, NAV_H - 1);
      };
      console.log("V25_STRICT_HOME_LAYOUT loaded");
      var V26_HOME_POINTS = {
        university: { x: 0.18, y: 0.17, side: "right" },
        hightech: { x: 0.82, y: 0.17, side: "left" },
        cbd: { x: 0.55, y: 0.38, side: "right" },
        oldtown: { x: 0.08, y: 0.57, side: "right" },
        industry: { x: 0.1, y: 0.76, side: "right" },
        village: { x: 0.79, y: 0.57, side: "left" },
        market: { x: 0.81, y: 0.79, side: "left" }
      };
      var V26_HOME_DEFAULT_GOAL_STEPS = ["\u9009\u5740", "\u88C5\u4FEE", "\u8BD5\u8425\u4E1A", "\u7ECF\u8425", "\u7B7E\u7EA6"];
      function v26GetDistricts() {
        return getDistricts() || [];
      }
      function v26GetSelectedDistrict() {
        const districts = v26GetDistricts();
        let current = districts.find(function(item) {
          return item.id === selectedDistrictId;
        });
        if (!current) {
          current = districts.find(function(item) {
            return item.id === "market";
          }) || districts[0] || null;
        }
        if (current) {
          selectedDistrictId = current.id;
        }
        return current;
      }
      function v26GetPoint(districtId) {
        const ratio = V26_HOME_POINTS[districtId];
        if (!ratio) {
          return getDistrictPoint(districtId);
        }
        const top = MAP_Y + 70;
        const bottom = CARD_Y - 36;
        const usableH = Math.max(170, bottom - top);
        return {
          x: Math.round(MAP_X + MAP_W * ratio.x),
          y: Math.round(top + usableH * ratio.y)
        };
      }
      function v26GetBadgeSummary(meta) {
        if (meta.myShopCount > 0) return "\u5DF2\u5F00\u95E8\u5E97 \xB7 \u53EF\u7EE7\u7EED\u6DF1\u8015\u7ECF\u8425";
        if (meta.badge === "\u79DF\u91D1\u4F4E") return "\u79DF\u91D1\u8F83\u4F4E \xB7 \u9002\u5408\u62A2\u5148\u5E03\u5C40";
        if (meta.badge === "\u7ADE\u4E89\u9AD8") return "\u7ADE\u4E89\u6FC0\u70C8 \xB7 \u9002\u5408\u5DEE\u5F02\u5316\u7ECF\u8425";
        if (meta.badge === "\u9700\u6C42\u2191") return "\u9700\u6C42\u4E0A\u6DA8 \xB7 \u53EF\u4F18\u5148\u8FDB\u5165";
        return "\u5BA2\u7FA4\u6D3B\u8DC3 \xB7 \u4ECD\u6709\u7ECF\u8425\u673A\u4F1A";
      }
      updateLayout = function() {
        TOP_H = (VIEW_H < 740 ? 92 : 96) + SAFE_TOP;
        NAV_H = (VIEW_H < 740 ? 78 : 82) + SAFE_BOTTOM;
        MAP_X = 0;
        MAP_Y = TOP_H;
        MAP_W = VIEW_W;
        NAV_Y = VIEW_H - NAV_H;
        MAP_H = NAV_Y - MAP_Y;
        CARD_H = VIEW_H < 740 ? 118 : 126;
        CARD_X = 7;
        CARD_W = VIEW_W - 14;
        CARD_Y = NAV_Y - CARD_H - 6;
      };
      drawMapBase = function() {
        const image = resourceManager.getImage("city_base_01");
        if (!image) {
          ctx2.fillStyle = COLORS.navy;
          ctx2.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);
          return;
        }
        drawImageFocus(
          ctx2,
          image,
          MAP_X,
          MAP_Y,
          MAP_W,
          MAP_H,
          1.49,
          0.52,
          0.545
        );
        const fade = ctx2.createLinearGradient(0, MAP_Y, 0, MAP_Y + 115);
        fade.addColorStop(0, "rgba(6,40,62,0.22)");
        fade.addColorStop(1, "rgba(6,40,62,0.00)");
        ctx2.fillStyle = fade;
        ctx2.fillRect(MAP_X, MAP_Y, MAP_W, 115);
      };
      drawTopHud = function() {
        const player = gameState.getPlayer();
        const world = gameState.getWorld();
        const display = timeSystem.getDisplayState();
        const brand = getBrandState(player);
        let cityName = gameState.getCityName();
        if (!cityName || cityName === "\u672A\u547D\u540D\u57CE\u5E02") cityName = "\u7F8E\u98DF\u5E02";
        const bg = resourceManager.getImage("city_base_01");
        if (bg) {
          drawImageFocus(ctx2, bg, 0, 0, VIEW_W, TOP_H, 1.56, 0.54, 0.18);
          ctx2.fillStyle = "rgba(7,41,64,0.60)";
          ctx2.fillRect(0, 0, VIEW_W, TOP_H);
        } else {
          ctx2.fillStyle = COLORS.navy;
          ctx2.fillRect(0, 0, VIEW_W, TOP_H);
        }
        drawCityBadge(cityName, 10, 9 + SAFE_TOP, 44);
        drawText(fitText(cityName, 116, 18, "800"), 66, 20 + SAFE_TOP, 18, COLORS.white, "800");
        roundedRect(145, 12 + SAFE_TOP, 18, 18, 5, "rgba(4,49,72,0.74)", "rgba(255,255,255,0.22)");
        drawText("\u270E", 154, 21 + SAFE_TOP, 7.3, "#FFE08B", "800", "center");
        addButton("city:rename", 140, 7 + SAFE_TOP, 28, 28);
        drawText("\u6253\u9020\u5C5E\u4E8E\u4F60\u7684\u7F8E\u98DF\u4E4B\u90FD", 66, 40 + SAFE_TOP, 7.2, "#E7F0F5", "600");
        drawText("\u54C1\u724C\uFF1A" + (player.brandName && player.brandName.trim() || "\u672A\u547D\u540D\u54C1\u724C"), 66, 53 + SAFE_TOP, 6.7, "#E7F0F5", "600");
        drawWeatherGlyph(world.weather, 186, 26 + SAFE_TOP);
        drawText(WEATHER_NAMES[world.weather] || "\u591A\u4E91", 210, 17 + SAFE_TOP, 7.6, "#FFFFFF", "800", "center");
        drawText((Number(world.temperature) || 22) + "\u2103", 210, 34 + SAFE_TOP, 7.6, "#E9F4F8", "700", "center");
        roundedRect(230, 9 + SAFE_TOP, 96, 49, 12, "rgba(5,43,65,0.92)", "rgba(114,208,244,0.40)");
        drawCashGlyph(246, 26 + SAFE_TOP);
        drawText(fitText("\xA5" + player.cash.toLocaleString(), 63, 11.8, "800"), 279, 21 + SAFE_TOP, 11.8, "#FFF1A7", "800", "center");
        drawText("\u53EF\u7528\u8D44\u91D1", 279, 41 + SAFE_TOP, 6.8, "#DCEBF1", "600", "center");
        roundedRect(309, 16 + SAFE_TOP, 12, 12, 4, "#F5B62D", "#FFE598");
        drawText("+", 315, 22 + SAFE_TOP, 8.5, "#FFFFFF", "800", "center");
        roundedRect(331, 9 + SAFE_TOP, 52, 49, 12, "rgba(5,43,65,0.92)", "rgba(114,208,244,0.40)");
        drawCrownGlyph(344, 26 + SAFE_TOP);
        drawText("Lv." + brand.level, 362, 19 + SAFE_TOP, 8.4, "#FFE27D", "800", "center");
        roundedRect(339, 40 + SAFE_TOP, 35, 4, 2, "rgba(255,255,255,0.22)");
        roundedRect(339, 40 + SAFE_TOP, Math.max(3, 35 * brand.progress), 4, 2, COLORS.gold);
        drawText(brand.reputation + "/100", 357, 50 + SAFE_TOP, 5.2, "#E7F2F6", "600", "center");
        addButton("brand:status", 328, 5 + SAFE_TOP, 58, 54);
        const speedItems = [
          ["time:pause", timeSystem.isPaused() ? "\u2161" : "\u2161"],
          ["time:speed:1", "1x"],
          ["time:speed:2", "2x"],
          ["time:speed:5", "5x"],
          ["time:speed:10", "10x"]
        ];
        const y = TOP_H - 30;
        for (let i = 0; i < speedItems.length; i++) {
          const id = speedItems[i][0];
          const speed = timeSystem.getSpeed();
          const paused = timeSystem.isPaused();
          const active = id === "time:pause" ? paused : !paused && Number(id.split(":")[2]) === speed;
          const x = 10 + i * 47;
          roundedRect(x, y, 40, 22, 8, active ? COLORS.gold : "rgba(4,40,60,0.86)", active ? "#FFE38D" : "rgba(255,255,255,0.18)");
          drawText(speedItems[i][1], x + 20, y + 11, 8, active ? "#173444" : COLORS.white, "800", "center");
          addButton(id, x - 3, y - 5, 46, 31);
        }
        const timeText = fitText(display.date + " \xB7 " + display.time + " \xB7 " + (MEAL_NAMES[display.mealPeriod] || ""), 172, 6.6, "600");
        drawText(timeText, VIEW_W - 10, y + 11, 6.6, "#E5F0F4", "600", "right");
      };
      drawNewsTicker = function() {
        const feed = simulationSystem.getNewsFeed();
        const bulletin = simulationSystem.getBulletin();
        const x = 8;
        const y = MAP_Y + 4;
        const w = VIEW_W - 16;
        const h = 30;
        roundedRect(x, y, w, h, 15, "rgba(3,41,64,0.96)", "rgba(77,194,240,0.48)");
        drawText("\u{1F50A}", x + 16, y + 15.5, 10, "#FFD65A", "800", "center");
        drawText("\u57CE\u5E02\u64AD\u62A5", x + 31, y + 15.5, 7.3, "#FFD65A", "800");
        const items = (feed && feed.length ? feed : [bulletin]).slice(0, 3);
        const startX = x + 85;
        const sectionW = (w - 109) / 3;
        for (let i = 0; i < 3; i++) {
          const item = items[i] || { title: i === 0 ? "\u7F8E\u98DF\u8282\u5373\u5C06\u76DB\u5927\u5F00\u5E55" : i === 1 ? "\u65B0\u6D3B\u52A8\uFF1A\u820C\u5C16\u4E0A\u7684\u57CE\u5E02" : "\u9910\u996E\u54C1\u724C\u7EB7\u7EB7\u5165\u9A7B" };
          if (i > 0) {
            ctx2.fillStyle = "rgba(230,242,247,0.32)";
            ctx2.fillRect(startX + i * sectionW - 6, y + 8, 1, 14);
          }
          drawText(fitText(item.title || "\u57CE\u5E02\u8FD0\u884C\u5E73\u7A33", sectionW - 12, 6.2, "600"), startX + i * sectionW, y + 15.2, 6.2, "#F3FAFC", "600");
        }
        drawText("\u203A", x + w - 12, y + 15.3, 14, "#FFE49C", "800", "center");
        addButton("tool:news", x, y, w, h);
      };
      drawGoalBar = function() {
        const goal = getHomeGoalState();
        const x = 8;
        const y = MAP_Y + 39;
        const w = VIEW_W - 16;
        const h = 28;
        roundedRect(x, y, w, h, 14, "rgba(3,41,64,0.96)", "rgba(77,194,240,0.42)");
        drawText("\u25CE", x + 15, y + 14.5, 12.5, "#FFD85C", "800", "center");
        drawText("\u5F53\u524D\u76EE\u6807\uFF1A", x + 28, y + 14.5, 7.1, "#FFD85C", "800");
        drawText("\u5F00\u8BBE\u9910\u5385", x + 83, y + 14.5, 7.2, "#FFFFFF", "800");
        const labels = V26_HOME_DEFAULT_GOAL_STEPS;
        let currentIndex = Math.max(0, Math.min(labels.length - 1, goal.current || 0));
        const startX = x + 167;
        const usable = w - 198;
        const gap = usable / (labels.length - 1);
        for (let i = 0; i < labels.length; i++) {
          const cx = startX + i * gap;
          const done = i < currentIndex;
          const active = i === currentIndex && !goal.completed;
          if (i < labels.length - 1) {
            ctx2.strokeStyle = i < currentIndex ? "#F6CC4A" : "rgba(220,234,240,0.38)";
            ctx2.lineWidth = 1.2;
            ctx2.beginPath();
            ctx2.moveTo(cx + 8, y + 10.5);
            ctx2.lineTo(cx + gap - 8, y + 10.5);
            ctx2.stroke();
          }
          ctx2.beginPath();
          ctx2.arc(cx, y + 10.5, 5.2, 0, Math.PI * 2);
          ctx2.fillStyle = done ? "#F2C744" : active ? "#FFF8CF" : "rgba(225,239,244,0.18)";
          ctx2.fill();
          ctx2.strokeStyle = done || active ? "#FFE58B" : "#9DB8C5";
          ctx2.lineWidth = 1;
          ctx2.stroke();
          drawText(labels[i], cx, y + 22.8, 5.8, active ? "#FFE08A" : "#E8F3F7", active ? "800" : "600", "center");
        }
        drawText("\u{1F381}", x + w - 13, y + 15, 10, "#FFD85C", "800", "center");
      };
      drawDistrictMarker = function(district) {
        const point = v26GetPoint(district.id);
        if (!point) return;
        const x = point.x;
        const y = point.y;
        const selected = selectedDistrictId === district.id;
        const meta = getDistrictVisualMeta(district);
        const config = V26_HOME_POINTS[district.id] || { side: "right" };
        const animated = districtFx.id === district.id;
        const markerScale = animated ? districtFx.scale : 1;
        if (selected) {
          ctx2.beginPath();
          ctx2.arc(x, y, 24 + districtFx.flash * 4, 0, Math.PI * 2);
          ctx2.fillStyle = "rgba(255,195,54,0.16)";
          ctx2.fill();
        }
        ctx2.save();
        ctx2.translate(x, y);
        ctx2.scale(markerScale, markerScale);
        const key = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
        if (!key || !(typeof v21DrawImage === "function" && v21DrawImage(key, 0, -4, 44, 56))) {
          drawDistrictPictogram(district.id, 0, -4);
        }
        ctx2.restore();
        const boxW = Math.max(94, Math.min(112, 45 + district.name.length * 10));
        const boxXBase = config.side === "left" ? x - boxW - 12 : x + 12;
        const boxX = Math.max(6, Math.min(VIEW_W - boxW - 6, boxXBase));
        const boxY = Math.max(MAP_Y + 74, Math.min(CARD_Y - 58, y - 14));
        roundedRect(boxX, boxY, boxW, 27, 12, "rgba(5,53,79,0.97)", selected ? "#FFE06C" : "rgba(255,218,93,0.82)", selected ? 1.25 : 1);
        drawText(district.name, boxX + 10, boxY + 13.5, 9.1, "#FFFFFF", "800");
        drawText("\u203A", boxX + boxW - 9, boxY + 13.5, 10.1, "#FFE49C", "800", "center");
        roundedRect(boxX + 5, boxY + 27, boxW - 10, 18, 8, "rgba(255,253,247,0.98)", "rgba(11,55,76,0.12)");
        drawText(fitText(meta.subtitle, boxW - 18, 6, "700"), boxX + boxW / 2, boxY + 36.5, 6, "#23455B", "700", "center");
        if (meta.badge) {
          const badgeW = Math.max(37, 15 + meta.badge.length * 6);
          const badgeX = Math.max(6, Math.min(VIEW_W - badgeW - 6, boxX + boxW - badgeW + 6));
          roundedRect(badgeX, boxY - 9, badgeW, 17, 8, meta.badgeColor, "rgba(255,245,218,0.98)");
          drawText(meta.badge, badgeX + badgeW / 2, boxY - 0.4, 5.4, "#FFFFFF", "800", "center");
        }
        if (meta.myShopCount > 0) {
          const txt = meta.myShopCount > 1 ? "\u2713 \u6211\u7684\u5E97\xD7" + meta.myShopCount : "\u2713 \u6211\u7684\u5E97";
          const sw = meta.myShopCount > 1 ? 56 : 45;
          const sx = Math.max(6, Math.min(VIEW_W - sw - 6, boxX + boxW - sw + 4));
          roundedRect(sx, boxY - 28, sw, 16, 8, "#1E9A5E", "#B9F0C8");
          drawText(txt, sx + sw / 2, boxY - 20, 5, "#FFFFFF", "800", "center");
        }
        const hitLeft = Math.min(x - 22, boxX - 4);
        const hitRight = Math.max(x + 22, boxX + boxW + 4);
        const hitTop = Math.min(y - 30, boxY - 28);
        const hitBottom = Math.max(y + 28, boxY + 46);
        addButton("district:" + district.id, hitLeft, hitTop, hitRight - hitLeft, hitBottom - hitTop);
      };
      drawDistrictCard = function() {
        const district = v26GetSelectedDistrict();
        if (!district) return;
        const meta = getDistrictVisualMeta(district);
        const x = CARD_X;
        const y = CARD_Y;
        const w = CARD_W;
        const h = CARD_H;
        roundedRect(x, y, w, h, 18, "rgba(255,255,255,0.985)", "rgba(10,56,79,0.16)", 1.1);
        const previewKey = typeof V24_DISTRICT_PREVIEW_KEYS !== "undefined" ? V24_DISTRICT_PREVIEW_KEYS[district.id] : null;
        const preview = previewKey ? resourceManager.getImage(previewKey) : resourceManager.getImage("city_base_01");
        const px = x + 11;
        const py = y + 10;
        const pw = 90;
        const ph = h - 20;
        if (preview) {
          ctx2.save();
          ctx2.beginPath();
          ctx2.moveTo(px + 14, py);
          ctx2.arcTo(px + pw, py, px + pw, py + ph, 14);
          ctx2.arcTo(px + pw, py + ph, px, py + ph, 14);
          ctx2.arcTo(px, py + ph, px, py, 14);
          ctx2.arcTo(px, py, px + pw, py, 14);
          ctx2.closePath();
          ctx2.clip();
          drawImageFocus(ctx2, preview, px, py, pw, ph, 1.02, 0.5, 0.5);
          ctx2.restore();
        }
        const iconKey = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
        if (iconKey && typeof v21DrawImage === "function") {
          v21DrawImage(iconKey, x + 114, y + 16, 18, 22);
        }
        drawText(district.name, x + 128, y + 16, 13.6, "#103655", "800");
        drawText("\u203A", x + 197, y + 16, 12.8, "#2F5673", "800", "center");
        drawText(v26GetBadgeSummary(meta), x + 128, y + 32, 6.2, "#39627E", "700");
        const metrics = [
          ["\u4EBA\u53E3", district.population.toLocaleString(), "#1E76C5"],
          ["\u9700\u6C42", demandSystem.getTotalDemand(district.id).toLocaleString(), "#1E9A5E"],
          ["\u5BA2\u5355", "\xA5" + district.avgSpend, "#164A86"],
          ["\u9910\u996E\u5E97", district.restaurantCount + "\u5BB6", "#164A86"],
          ["\u9971\u548C\u5EA6", district.saturation + "%", "#1E76C5"],
          ["\u79DF\u91D1", district.rentIndex.toFixed(2), "#164A86"]
        ];
        const metricX = x + 110;
        const metricY = y + 42;
        const metricGap = 4;
        const metricW = Math.floor((w - 224 - metricGap * 5) / 6);
        for (let i = 0; i < metrics.length; i++) {
          const mx = metricX + i * (metricW + metricGap);
          roundedRect(mx, metricY, metricW, 40, 9, "#FAF8F3", "rgba(17,62,92,0.10)");
          drawMetricSymbol(metrics[i][0], mx + metricW / 2, metricY + 10, metrics[i][2]);
          drawText(metrics[i][0], mx + metricW / 2, metricY + 21, 5, "#245276", "700", "center");
          drawText(metrics[i][1], mx + metricW / 2, metricY + 34, 6.4, metrics[i][2], "800", "center");
        }
        drawText("\u5B9E\u65F6\u6570\u636E\u4F1A\u968F\u4EBA\u53E3\u3001\u57CE\u5E02\u4E8B\u4EF6\u3001\u7ADE\u4E89\u548C\u79DF\u91D1\u53D8\u5316", x + 110, y + h - 18, 5.4, "#607D92", "600");
        roundedRect(x + w - 112, y + h - 46, 102, 34, 17, "#FFC22D", "#DFA01B", 1.2);
        drawText("\u8FDB\u5165\u5546\u5708  \u203A", x + w - 61, y + h - 28, 8.4, "#123A53", "800", "center");
        addButton("district:details", x + w - 116, y + h - 50, 108, 42);
      };
      drawBottomNav = function() {
        const items = [
          { id: "city", label: "\u57CE\u5E02", mapTo: "city" },
          { id: "shop", label: "\u95E8\u5E97", mapTo: "shop" },
          { id: "traffic", label: "\u5BA2\u6D41", mapTo: "city" },
          { id: "research", label: "\u83DC\u5355", mapTo: "menu" },
          { id: "supply", label: "\u4F9B\u5E94\u94FE", mapTo: "supply" },
          { id: "business", label: "\u6570\u636E", mapTo: "business" },
          { id: "system", label: "\u7CFB\u7EDF", mapTo: "system" }
        ];
        roundedRect(0, NAV_Y, VIEW_W, NAV_H, 0, "rgba(5,52,79,0.99)");
        const glow = ctx2.createLinearGradient(0, NAV_Y, 0, NAV_Y + NAV_H);
        glow.addColorStop(0, "rgba(23,125,203,0.18)");
        glow.addColorStop(1, "rgba(23,125,203,0.00)");
        ctx2.fillStyle = glow;
        ctx2.fillRect(0, NAV_Y, VIEW_W, NAV_H);
        ctx2.strokeStyle = "rgba(85,191,243,0.34)";
        ctx2.lineWidth = 1;
        ctx2.strokeRect(0.5, NAV_Y + 0.5, VIEW_W - 1, NAV_H - 1);
        const cellW = VIEW_W / items.length;
        const current = sceneManager.getCurrentId();
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const active = item.id === "city" && current === "city" && !trafficMode || item.id === "traffic" && current === "city" && trafficMode || item.id === "shop" && (current === "shop" || current === "propertyMarket" || current === "equipment" || current === "license" || current === "staff" || current === "renovation") || item.id !== "city" && item.id !== "traffic" && item.id !== "shop" && item.mapTo === current;
          const cellX = i * cellW;
          if (active) {
            roundedRect(cellX + 3, NAV_Y + 5, cellW - 6, NAV_H - 10, 15, "#F3BF20", "#FFE599", 1.1);
          }
          drawNavIcon(item.id, cellX + cellW / 2, NAV_Y + 23, active);
          drawText(item.label, cellX + cellW / 2, NAV_Y + 50, 7.4, active ? "#173444" : "#FFFFFF", active ? "800" : "700", "center");
          addButton("nav:" + item.id, cellX, NAV_Y, cellW, NAV_H);
        }
      };
      if (cityScene && typeof cityScene.enter === "function" && !cityScene.__v26Wrapped) {
        const v26OriginalCityEnter = cityScene.enter;
        cityScene.enter = function() {
          v26OriginalCityEnter.call(this);
          v26GetSelectedDistrict();
        };
        cityScene.__v26Wrapped = true;
      }
      console.log("V26_HARD_REBUILD_HOME loaded");
      var V28_MARKER_IMAGE_KEYS = {
        university: "v28_marker_university",
        hightech: "v28_marker_hightech",
        cbd: "v28_marker_cbd",
        oldtown: "v28_marker_oldtown",
        village: "v28_marker_village",
        industry: "v28_marker_industry",
        market: "v28_marker_market"
      };
      var V28_BADGE_IMAGE_KEYS = {
        "\u9700\u6C42\u2191": "v28_badge_high_popularity",
        "\u7ADE\u4E89\u9AD8": "v28_badge_high_competition",
        "\u79DF\u91D1\u4F4E": "v28_badge_low_rent"
      };
      var V28_MARKER_DISPLAY = {
        university: { w: 43, h: 56, dy: -2 },
        hightech: { w: 43, h: 56, dy: -2 },
        cbd: { w: 44, h: 58, dy: -2 },
        oldtown: { w: 43, h: 56, dy: -2 },
        village: { w: 45, h: 60, dy: -2 },
        industry: { w: 43, h: 58, dy: -2 },
        market: { w: 44, h: 60, dy: -2 }
      };
      var v28OriginalLoadResources = loadResources;
      function v28DrawRawImage(image, x, y, w, h, alpha) {
        if (!image) return false;
        ctx2.save();
        ctx2.globalAlpha = alpha == null ? 1 : alpha;
        ctx2.drawImage(image, x, y, w, h);
        ctx2.restore();
        return true;
      }
      loadResources = function() {
        return Promise.all([
          resourceManager.loadImage("v28_marker_university", "assets/images/target_home/markers/university.png", "v28-home"),
          resourceManager.loadImage("v28_marker_hightech", "assets/images/target_home/markers/hightech.png", "v28-home"),
          resourceManager.loadImage("v28_marker_cbd", "assets/images/target_home/markers/cbd.png", "v28-home"),
          resourceManager.loadImage("v28_marker_oldtown", "assets/images/target_home/markers/oldtown.png", "v28-home"),
          resourceManager.loadImage("v28_marker_village", "assets/images/target_home/markers/village.png", "v28-home"),
          resourceManager.loadImage("v28_marker_industry", "assets/images/target_home/markers/industry.png", "v28-home"),
          resourceManager.loadImage("v28_marker_market", "assets/images/target_home/markers/market.png", "v28-home"),
          resourceManager.loadImage("v28_badge_high_popularity", "assets/images/target_home/status/high_popularity.png", "v28-home"),
          resourceManager.loadImage("v28_badge_high_competition", "assets/images/target_home/status/high_competition.png", "v28-home"),
          resourceManager.loadImage("v28_badge_low_rent", "assets/images/target_home/status/low_rent.png", "v28-home"),
          resourceManager.loadImage("v28_badge_my_store", "assets/images/target_home/status/my_store.png", "v28-home")
        ]).then(function() {
          return v28OriginalLoadResources();
        });
      };
      drawDistrictMarker = function(district) {
        const point = v26GetPoint(district.id);
        if (!point) return;
        const x = point.x;
        const y = point.y;
        const selected = selectedDistrictId === district.id;
        const meta = getDistrictVisualMeta(district);
        const config = V26_HOME_POINTS[district.id] || { side: "right" };
        const animated = districtFx.id === district.id;
        const markerScale = animated ? districtFx.scale : 1;
        if (selected) {
          ctx2.beginPath();
          ctx2.arc(x, y, 24 + districtFx.flash * 4, 0, Math.PI * 2);
          ctx2.fillStyle = "rgba(255,195,54,0.16)";
          ctx2.fill();
        }
        ctx2.save();
        ctx2.translate(x, y);
        ctx2.scale(markerScale, markerScale);
        const markerSpec = V28_MARKER_DISPLAY[district.id] || { w: 44, h: 58, dy: -2 };
        const markerImage = resourceManager.getImage(V28_MARKER_IMAGE_KEYS[district.id]);
        if (markerImage) {
          v28DrawRawImage(
            markerImage,
            -markerSpec.w / 2,
            -markerSpec.h / 2 + markerSpec.dy,
            markerSpec.w,
            markerSpec.h
          );
        } else {
          const key = V21_DISTRICT_ICON_KEYS && V21_DISTRICT_ICON_KEYS[district.id];
          if (!key || !(typeof v21DrawImage === "function" && v21DrawImage(key, 0, -4, 44, 56))) {
            drawDistrictPictogram(district.id, 0, -4);
          }
        }
        ctx2.restore();
        const boxW = Math.max(94, Math.min(112, 45 + district.name.length * 10));
        const boxXBase = config.side === "left" ? x - boxW - 12 : x + 12;
        const boxX = Math.max(6, Math.min(VIEW_W - boxW - 6, boxXBase));
        const boxY = Math.max(MAP_Y + 74, Math.min(CARD_Y - 58, y - 14));
        roundedRect(boxX, boxY, boxW, 27, 12, "rgba(5,53,79,0.97)", selected ? "#FFE06C" : "rgba(255,218,93,0.82)", selected ? 1.25 : 1);
        drawText(district.name, boxX + 10, boxY + 13.5, 9.1, "#FFFFFF", "800");
        drawText("\u203A", boxX + boxW - 9, boxY + 13.5, 10.1, "#FFE49C", "800", "center");
        roundedRect(boxX + 5, boxY + 27, boxW - 10, 18, 8, "rgba(255,253,247,0.98)", "rgba(11,55,76,0.12)");
        drawText(fitText(meta.subtitle, boxW - 18, 6, "700"), boxX + boxW / 2, boxY + 36.5, 6, "#23455B", "700", "center");
        if (meta.badge) {
          const badgeImage = resourceManager.getImage(V28_BADGE_IMAGE_KEYS[meta.badge]);
          const badgeW = meta.badge === "\u9700\u6C42\u2191" ? 39 : meta.badge === "\u7ADE\u4E89\u9AD8" ? 46 : 36;
          const badgeH = 17;
          const badgeX = Math.max(6, Math.min(VIEW_W - badgeW - 6, boxX + boxW - badgeW + 6));
          if (badgeImage) {
            v28DrawRawImage(badgeImage, badgeX, boxY - 9, badgeW, badgeH);
          } else {
            const fallbackW = Math.max(37, 15 + meta.badge.length * 6);
            const fallbackX = Math.max(6, Math.min(VIEW_W - fallbackW - 6, boxX + boxW - fallbackW + 6));
            roundedRect(fallbackX, boxY - 9, fallbackW, 17, 8, meta.badgeColor, "rgba(255,245,218,0.98)");
            drawText(meta.badge, fallbackX + fallbackW / 2, boxY - 0.4, 5.4, "#FFFFFF", "800", "center");
          }
        }
        if (meta.myShopCount > 0) {
          const storeImage = resourceManager.getImage("v28_badge_my_store");
          const sw = meta.myShopCount > 1 ? 58 : 46;
          const sh = 18;
          const sx = Math.max(6, Math.min(VIEW_W - sw - 6, boxX + boxW - sw + 4));
          if (storeImage) {
            v28DrawRawImage(storeImage, sx, boxY - 29, sw, sh);
            if (meta.myShopCount > 1) {
              drawText("\xD7" + meta.myShopCount, sx + sw - 8, boxY - 19.4, 5.2, "#FFFFFF", "800", "center");
            }
          } else {
            const txt = meta.myShopCount > 1 ? "\u2713 \u6211\u7684\u5E97\xD7" + meta.myShopCount : "\u2713 \u6211\u7684\u5E97";
            roundedRect(sx, boxY - 28, sw, 16, 8, "#1E9A5E", "#B9F0C8");
            drawText(txt, sx + sw / 2, boxY - 20, 5, "#FFFFFF", "800", "center");
          }
        }
        const hitLeft = Math.min(x - 22, boxX - 4);
        const hitRight = Math.max(x + 22, boxX + boxW + 4);
        const hitTop = Math.min(y - 30, boxY - 29);
        const hitBottom = Math.max(y + 28, boxY + 46);
        addButton("district:" + district.id, hitLeft, hitTop, hitRight - hitLeft, hitBottom - hitTop);
      };
      console.log("V28_TARGET_MARKERS_AND_BADGES loaded");
      var V29_NAV_KEYS = {
        city: ["v29_nav_city", "v29_nav_city_active"],
        shop: ["v29_nav_store", "v29_nav_store_active"],
        traffic: ["v29_nav_traffic", "v29_nav_traffic_active"],
        research: ["v29_nav_menu", "v29_nav_menu_active"],
        supply: ["v29_nav_supply", "v29_nav_supply_active"],
        business: ["v29_nav_data", "v29_nav_data_active"],
        system: ["v29_nav_system", "v29_nav_system_active"]
      };
      var V29_METRIC_KEYS = {
        "\u4EBA\u53E3": "v29_metric_population",
        "\u9700\u6C42": "v29_metric_demand",
        "\u5BA2\u5355": "v29_metric_spend",
        "\u9910\u996E\u5E97": "v29_metric_restaurants",
        "\u9971\u548C\u5EA6": "v29_metric_saturation",
        "\u79DF\u91D1": "v29_metric_rent"
      };
      var v29OriginalLoadResources = loadResources;
      function v29Img(key, cx, cy, w, h, alpha) {
        const img = resourceManager.getImage(key);
        if (!img) return false;
        ctx2.save();
        ctx2.globalAlpha = alpha == null ? 1 : alpha;
        ctx2.drawImage(img, cx - w / 2, cy - h / 2, w, h);
        ctx2.restore();
        return true;
      }
      loadResources = function() {
        const assets = [
          ["v29_hud_money", "hud_money.png"],
          ["v29_hud_crown", "hud_crown.png"],
          ["v29_hud_weather", "hud_weather.png"],
          ["v29_hud_broadcast", "hud_broadcast.png"],
          ["v29_hud_target", "hud_target.png"],
          ["v29_hud_gift", "hud_gift.png"],
          ["v29_hud_plus", "hud_plus.png"],
          ["v29_hud_edit", "hud_edit.png"],
          ["v29_nav_city", "nav_city.png"],
          ["v29_nav_city_active", "nav_city_active.png"],
          ["v29_nav_store", "nav_store.png"],
          ["v29_nav_store_active", "nav_store_active.png"],
          ["v29_nav_traffic", "nav_traffic.png"],
          ["v29_nav_traffic_active", "nav_traffic_active.png"],
          ["v29_nav_menu", "nav_menu.png"],
          ["v29_nav_menu_active", "nav_menu_active.png"],
          ["v29_nav_supply", "nav_supply.png"],
          ["v29_nav_supply_active", "nav_supply_active.png"],
          ["v29_nav_data", "nav_data.png"],
          ["v29_nav_data_active", "nav_data_active.png"],
          ["v29_nav_system", "nav_system.png"],
          ["v29_nav_system_active", "nav_system_active.png"],
          ["v29_metric_population", "metric_population.png"],
          ["v29_metric_demand", "metric_demand.png"],
          ["v29_metric_spend", "metric_spend.png"],
          ["v29_metric_restaurants", "metric_restaurants.png"],
          ["v29_metric_saturation", "metric_saturation.png"],
          ["v29_metric_rent", "metric_rent.png"]
        ];
        return Promise.all(assets.map((a) => resourceManager.loadImage(a[0], "assets/images/v29/" + a[1], "v29-icons"))).then(() => v29OriginalLoadResources());
      };
      drawWeatherGlyph = function(weather, x, y) {
        if (v29Img("v29_hud_weather", x, y, 34, 28)) return;
      };
      drawCashGlyph = function(x, y) {
        if (v29Img("v29_hud_money", x, y, 35, 28)) return;
      };
      drawCrownGlyph = function(x, y) {
        if (v29Img("v29_hud_crown", x, y, 31, 25)) return;
      };
      drawMetricSymbol = function(label, x, y, color) {
        const key = V29_METRIC_KEYS[label];
        if (key && v29Img(key, x, y, 18, 18)) return;
      };
      drawNavIcon = function(id, cx, cy, active) {
        const keys = V29_NAV_KEYS[id];
        if (keys && v29Img(active ? keys[1] : keys[0], cx, cy, active ? 29 : 26, active ? 29 : 26, 1)) return;
      };
      console.log("V29_CRISP_ICON_PASS loaded");
      var V32_POINTS = {
        university: { x: 0.185, y: 0.105, side: "right" },
        hightech: { x: 0.79, y: 0.11, side: "left" },
        cbd: { x: 0.465, y: 0.325, side: "right" },
        oldtown: { x: 0.07, y: 0.505, side: "right" },
        village: { x: 0.775, y: 0.5, side: "left" },
        industry: { x: 0.18, y: 0.715, side: "right" },
        market: { x: 0.73, y: 0.695, side: "left" }
      };
      var V32_MARKER_KEYS = {
        university: "v32_marker_university",
        hightech: "v32_marker_hightech",
        cbd: "v32_marker_cbd",
        oldtown: "v32_marker_oldtown",
        village: "v32_marker_village",
        industry: "v32_marker_industry",
        market: "v32_marker_market"
      };
      var V32_PREVIEW_KEYS = {
        university: "v32_preview_university",
        hightech: "v32_preview_hightech",
        cbd: "v32_preview_cbd",
        oldtown: "v32_preview_oldtown",
        village: "v32_preview_village",
        industry: "v32_preview_industry",
        market: "v32_preview_market"
      };
      var v32PreviousLoadResources = loadResources;
      function v32FormatMoney(value) {
        const n = Number(value) || 0;
        const abs = Math.abs(n);
        if (abs < 1e6) {
          return "\xA5" + Math.round(n).toLocaleString();
        }
        if (abs < 1e8) {
          const v2 = n / 1e4;
          return "\xA5" + (Math.abs(v2) >= 100 ? v2.toFixed(0) : v2.toFixed(1).replace(/\.0$/, "")) + "\u4E07";
        }
        if (abs < 1e12) {
          const v2 = n / 1e8;
          return "\xA5" + (Math.abs(v2) >= 100 ? v2.toFixed(0) : v2.toFixed(1).replace(/\.0$/, "")) + "\u4EBF";
        }
        const v = n / 1e12;
        return "\xA5" + (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")) + "\u4E07\u4EBF";
      }
      function v32SelectedDistrict() {
        const districts = getDistricts() || [];
        let current = districts.find(function(item) {
          return item.id === selectedDistrictId;
        });
        if (!current) {
          current = districts.find(function(item) {
            return item.id === "market";
          }) || districts[0] || null;
          if (current) {
            selectedDistrictId = current.id;
          }
        }
        return current;
      }
      function v32DistrictPoint(id) {
        const point = V32_POINTS[id];
        if (!point) return v26GetPoint(id);
        const top = MAP_Y + 65;
        const bottom = CARD_Y - 9;
        const usableH = Math.max(120, bottom - top);
        return {
          x: Math.round(MAP_X + MAP_W * point.x),
          y: Math.round(top + usableH * point.y)
        };
      }
      function v32DisplayBadge(meta) {
        if (meta.myShopCount > 0) return null;
        if (meta.badge === "\u9700\u6C42\u2191") return { text: "\u4EBA\u6C14\u9AD8", fill: "#ED3347" };
        if (meta.badge === "\u7ADE\u4E89\u9AD8") return { text: "\u7ADE\u4E89\u6FC0\u70C8", fill: "#ED3347" };
        if (meta.badge === "\u79DF\u91D1\u4F4E") return { text: "\u79DF\u91D1\u4F4E", fill: "#ED3347" };
        return null;
      }
      loadResources = function() {
        const tasks = [
          resourceManager.loadImage("v32_home_background", "assets/images/v32_home/home_background.jpg", "v32-home"),
          resourceManager.loadImage("v32_bottom_nav_reference", "assets/images/v32_home/bottom_nav_reference.png", "v32-home"),
          resourceManager.loadImage("v32_nav_renovation", "assets/images/v32_home/nav_renovation.png", "v32-home"),
          resourceManager.loadImage("v32_marker_university", "assets/images/v32_home/marker_university.png", "v32-home"),
          resourceManager.loadImage("v32_marker_hightech", "assets/images/v32_home/marker_hightech.png", "v32-home"),
          resourceManager.loadImage("v32_marker_cbd", "assets/images/v32_home/marker_cbd.png", "v32-home"),
          resourceManager.loadImage("v32_marker_oldtown", "assets/images/v32_home/marker_oldtown.png", "v32-home"),
          resourceManager.loadImage("v32_marker_village", "assets/images/v32_home/marker_village.png", "v32-home"),
          resourceManager.loadImage("v32_marker_industry", "assets/images/v32_home/marker_industry.png", "v32-home"),
          resourceManager.loadImage("v32_marker_market", "assets/images/v32_home/marker_market.png", "v32-home"),
          resourceManager.loadImage("v32_preview_university", "assets/images/v32_home/preview_university.jpg", "v32-home"),
          resourceManager.loadImage("v32_preview_hightech", "assets/images/v32_home/preview_hightech.jpg", "v32-home"),
          resourceManager.loadImage("v32_preview_cbd", "assets/images/v32_home/preview_cbd.jpg", "v32-home"),
          resourceManager.loadImage("v32_preview_oldtown", "assets/images/v32_home/preview_oldtown.jpg", "v32-home"),
          resourceManager.loadImage("v32_preview_village", "assets/images/v32_home/preview_village.jpg", "v32-home"),
          resourceManager.loadImage("v32_preview_industry", "assets/images/v32_home/preview_industry.jpg", "v32-home"),
          resourceManager.loadImage("v32_preview_market", "assets/images/v32_home/preview_market.jpg", "v32-home")
        ];
        return Promise.all(tasks).then(function() {
          return v32PreviousLoadResources();
        });
      };
      updateLayout = function() {
        TOP_H = (VIEW_H < 740 ? 94 : 98) + SAFE_TOP;
        NAV_H = (VIEW_H < 740 ? 62 : 65) + SAFE_BOTTOM;
        MAP_X = 0;
        MAP_Y = TOP_H;
        MAP_W = VIEW_W;
        NAV_Y = VIEW_H - NAV_H;
        MAP_H = NAV_Y - MAP_Y;
        CARD_H = VIEW_H < 740 ? 138 : 144;
        CARD_X = 6;
        CARD_W = VIEW_W - 12;
        CARD_Y = NAV_Y - CARD_H;
      };
      drawMapBase = function() {
        const image = resourceManager.getImage("v32_home_background");
        if (!image) {
          const fallback = resourceManager.getImage("city_base_01");
          if (fallback) {
            drawImageFocus(ctx2, fallback, MAP_X, MAP_Y, MAP_W, MAP_H, 1.35, 0.5, 0.53);
            return;
          }
          ctx2.fillStyle = "#0D5478";
          ctx2.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);
          return;
        }
        drawImageFocus(
          ctx2,
          image,
          MAP_X,
          MAP_Y,
          MAP_W,
          MAP_H,
          1,
          0.5,
          0.49
        );
      };
      drawTopHud = function() {
        const player = gameState.getPlayer();
        const world = gameState.getWorld();
        const display = timeSystem.getDisplayState();
        const brand = getBrandState(player);
        let cityName = gameState.getCityName();
        if (!cityName || cityName === "\u672A\u547D\u540D\u57CE\u5E02") cityName = "\u7F8E\u98DF\u5E02";
        const bg = resourceManager.getImage("v32_home_background");
        if (bg) {
          drawImageFocus(ctx2, bg, 0, 0, VIEW_W, TOP_H, 1.3, 0.5, 0.1);
          ctx2.fillStyle = "rgba(4,43,70,0.56)";
          ctx2.fillRect(0, 0, VIEW_W, TOP_H);
        } else {
          ctx2.fillStyle = "#0B4A72";
          ctx2.fillRect(0, 0, VIEW_W, TOP_H);
        }
        drawCityBadge(cityName, 10, 9 + SAFE_TOP, 44);
        drawText(
          fitText(cityName, 112, 18.8, "800"),
          66,
          20 + SAFE_TOP,
          18.8,
          "#FFFFFF",
          "800"
        );
        roundedRect(
          145,
          12 + SAFE_TOP,
          18,
          18,
          5,
          "rgba(4,49,72,0.78)",
          "rgba(255,255,255,0.24)"
        );
        drawText("\u270E", 154, 21 + SAFE_TOP, 7.2, "#FFE48A", "800", "center");
        addButton("city:rename", 140, 7 + SAFE_TOP, 28, 28);
        drawText(
          "\u6253\u9020\u5C5E\u4E8E\u4F60\u7684\u7F8E\u98DF\u4E4B\u90FD",
          66,
          42 + SAFE_TOP,
          7.4,
          "#F1F8FC",
          "600"
        );
        drawWeatherGlyph(world.weather, 180, 27 + SAFE_TOP);
        drawText(
          WEATHER_NAMES[world.weather] || "\u6674",
          200,
          18 + SAFE_TOP,
          7.6,
          "#FFFFFF",
          "800",
          "center"
        );
        drawText(
          (Number(world.temperature) || 22) + "\u2103",
          200,
          37 + SAFE_TOP,
          7.6,
          "#F4FAFD",
          "700",
          "center"
        );
        const levelW = 68;
        const moneyW = 106;
        const right = VIEW_W - 7;
        const levelX = right - levelW;
        const moneyX = levelX - 5 - moneyW;
        roundedRect(
          moneyX,
          9 + SAFE_TOP,
          moneyW,
          49,
          12,
          "rgba(3,57,91,0.94)",
          "rgba(72,183,236,0.55)"
        );
        drawCashGlyph(moneyX + 18, 26 + SAFE_TOP);
        const moneyText = v32FormatMoney(player.cash);
        const moneyFont = moneyText.length <= 7 ? 11.9 : moneyText.length <= 9 ? 10.9 : 9.9;
        drawText(
          fitText(moneyText, moneyW - 44, moneyFont, "800"),
          moneyX + 63,
          21 + SAFE_TOP,
          moneyFont,
          "#FFF5A9",
          "800",
          "center"
        );
        drawText(
          "\u53EF\u7528\u8D44\u91D1",
          moneyX + 63,
          42 + SAFE_TOP,
          6.9,
          "#E5F2F7",
          "600",
          "center"
        );
        roundedRect(
          moneyX + moneyW - 18,
          16 + SAFE_TOP,
          13,
          13,
          4,
          "#FFB72B",
          "#FFE68D"
        );
        drawText("+", moneyX + moneyW - 11.5, 22.5 + SAFE_TOP, 8.6, "#FFFFFF", "800", "center");
        roundedRect(
          levelX,
          9 + SAFE_TOP,
          levelW,
          49,
          12,
          "rgba(3,57,91,0.94)",
          "rgba(72,183,236,0.55)"
        );
        drawCrownGlyph(levelX + 15, 26 + SAFE_TOP);
        drawText(
          "Lv." + brand.level,
          levelX + 45,
          19 + SAFE_TOP,
          8.6,
          "#FFE77E",
          "800",
          "center"
        );
        roundedRect(levelX + 20, 40 + SAFE_TOP, 40, 4, 2, "rgba(255,255,255,0.22)");
        roundedRect(levelX + 20, 40 + SAFE_TOP, Math.max(4, 40 * brand.progress), 4, 2, "#FFD34B");
        drawText(
          brand.reputation + "/100",
          levelX + 40,
          51 + SAFE_TOP,
          5.5,
          "#F0F8FB",
          "600",
          "center"
        );
        addButton("brand:status", levelX - 3, 5 + SAFE_TOP, levelW + 6, 55);
        const speedItems = [
          ["time:pause", "\u2161"],
          ["time:speed:1", "1x"],
          ["time:speed:2", "2x"],
          ["time:speed:5", "5x"],
          ["time:speed:10", "10x"]
        ];
        const y = TOP_H - 30;
        for (let i = 0; i < speedItems.length; i++) {
          const id = speedItems[i][0];
          const speed = timeSystem.getSpeed();
          const paused = timeSystem.isPaused();
          const active = id === "time:pause" ? paused : !paused && Number(id.split(":")[2]) === speed;
          const x = 10 + i * 47;
          roundedRect(
            x,
            y,
            40,
            22,
            8,
            active ? "#FFC32E" : "rgba(2,47,74,0.90)",
            active ? "#FFE58B" : "rgba(255,255,255,0.18)"
          );
          drawText(
            speedItems[i][1],
            x + 20,
            y + 11,
            8,
            active ? "#14384D" : "#FFFFFF",
            "800",
            "center"
          );
          addButton(id, x - 3, y - 5, 46, 31);
        }
        drawText(
          fitText(
            display.date + " \xB7 " + display.time + " \xB7 " + (MEAL_NAMES[display.mealPeriod] || ""),
            170,
            6.6,
            "600"
          ),
          VIEW_W - 8,
          y + 11,
          6.6,
          "#F1F7FA",
          "600",
          "right"
        );
      };
      drawNewsTicker = function() {
        const feed = simulationSystem.getNewsFeed();
        const bulletin = simulationSystem.getBulletin();
        const x = 7;
        const y = MAP_Y + 4;
        const w = VIEW_W - 14;
        const h = 27;
        roundedRect(
          x,
          y,
          w,
          h,
          13.5,
          "rgba(2,54,86,0.96)",
          "rgba(87,194,241,0.66)"
        );
        drawText("\u{1F50A}", x + 15, y + 13.8, 9.4, "#FFD85C", "800", "center");
        drawText("\u57CE\u5E02\u64AD\u62A5", x + 30, y + 13.8, 7.4, "#FFD85C", "800");
        const items = (feed && feed.length ? feed : [bulletin]).slice(0, 3);
        const startX = x + 87;
        const sectionW = (w - 111) / 3;
        for (let i = 0; i < 3; i++) {
          const item = items[i] || {
            title: i === 0 ? "\u7F8E\u98DF\u8282\u5373\u5C06\u76DB\u5927\u5F00\u5E55" : i === 1 ? "\u65B0\u6D3B\u52A8\uFF1A\u820C\u5C16\u4E0A\u7684\u57CE\u5E02" : "\u9910\u996E\u54C1\u724C\u7EB7\u7EB7\u5165\u9A7B"
          };
          if (i > 0) {
            ctx2.fillStyle = "rgba(225,242,250,0.38)";
            ctx2.fillRect(startX + i * sectionW - 6, y + 7, 1, 13);
          }
          drawText(
            fitText(item.title || "\u57CE\u5E02\u8FD0\u884C\u5E73\u7A33", sectionW - 12, 6.2, "600"),
            startX + i * sectionW,
            y + 13.6,
            6.2,
            "#F8FCFE",
            "600"
          );
        }
        drawText("\u203A", x + w - 12, y + 13.7, 13.5, "#FFE49A", "800", "center");
        addButton("tool:news", x, y, w, h);
      };
      drawGoalBar = function() {
        const goal = getHomeGoalState();
        const x = 7;
        const y = MAP_Y + 35;
        const w = VIEW_W - 14;
        const h = 27;
        roundedRect(
          x,
          y,
          w,
          h,
          13.5,
          "rgba(2,54,86,0.96)",
          "rgba(87,194,241,0.58)"
        );
        drawText("\u25CE", x + 15, y + 13.5, 12, "#FFD85C", "800", "center");
        drawText("\u5F53\u524D\u76EE\u6807\uFF1A", x + 28, y + 13.5, 7.1, "#FFD85C", "800");
        drawText("\u5F00\u8BBE\u9910\u5385", x + 83, y + 13.5, 7.2, "#FFFFFF", "800");
        const labels = ["\u9009\u5740", "\u88C5\u4FEE", "\u8BD5\u8425\u4E1A", "\u7ECF\u8425", "\u7B7E\u7EA6"];
        const currentIndex = Math.max(0, Math.min(labels.length - 1, Number(goal.current) || 0));
        const startX = x + 168;
        const usable = w - 198;
        const gap = usable / (labels.length - 1);
        for (let i = 0; i < labels.length; i++) {
          const cx = startX + i * gap;
          const done = i < currentIndex;
          const active = i === currentIndex && !goal.completed;
          if (i < labels.length - 1) {
            ctx2.strokeStyle = i < currentIndex ? "#FFD047" : "rgba(221,237,245,0.42)";
            ctx2.lineWidth = 1.1;
            ctx2.beginPath();
            ctx2.moveTo(cx + 8, y + 9.8);
            ctx2.lineTo(cx + gap - 8, y + 9.8);
            ctx2.stroke();
          }
          ctx2.beginPath();
          ctx2.arc(cx, y + 9.8, 5, 0, Math.PI * 2);
          ctx2.fillStyle = done ? "#F5C83A" : active ? "#FFF8C8" : "rgba(225,239,244,0.18)";
          ctx2.fill();
          ctx2.strokeStyle = done || active ? "#FFE58B" : "#9CB9C8";
          ctx2.lineWidth = 1;
          ctx2.stroke();
          drawText(
            labels[i],
            cx,
            y + 21.2,
            5.8,
            active ? "#FFE38A" : "#EEF7FA",
            active ? "800" : "600",
            "center"
          );
        }
        drawText("\u{1F381}", x + w - 13, y + 13.5, 9.7, "#FFD85C", "800", "center");
      };
      drawDistrictMarker = function(district) {
        const point = v32DistrictPoint(district.id);
        if (!point) return;
        const x = point.x;
        const y = point.y;
        const selected = selectedDistrictId === district.id;
        const meta = getDistrictVisualMeta(district);
        const config = V32_POINTS[district.id] || { side: "right" };
        const markerImage = resourceManager.getImage(V32_MARKER_KEYS[district.id]);
        if (selected) {
          ctx2.beginPath();
          ctx2.arc(x, y, 25 + districtFx.flash * 3, 0, Math.PI * 2);
          ctx2.fillStyle = "rgba(255,205,54,0.16)";
          ctx2.fill();
        }
        const markerW = district.id === "village" ? 50 : 48;
        const markerH = district.id === "village" ? 50 : 48;
        if (markerImage) {
          ctx2.save();
          const animated = districtFx.id === district.id;
          const markerScale = animated ? districtFx.scale : 1;
          ctx2.translate(x, y);
          ctx2.scale(markerScale, markerScale);
          ctx2.drawImage(markerImage, -markerW / 2, -markerH / 2 - 2, markerW, markerH);
          ctx2.restore();
        }
        const boxW = Math.max(83, Math.min(108, 44 + district.name.length * 9.5));
        const boxXBase = config.side === "left" ? x - boxW - 14 : x + 14;
        const boxX = Math.max(6, Math.min(VIEW_W - boxW - 6, boxXBase));
        const boxY = Math.max(MAP_Y + 68, Math.min(CARD_Y - 46, y - 13));
        roundedRect(
          boxX,
          boxY,
          boxW,
          23,
          10,
          "rgba(3,61,91,0.97)",
          selected ? "#FFE16A" : "rgba(255,224,105,0.86)",
          selected ? 1.35 : 1
        );
        drawText(district.name, boxX + 9, boxY + 11.5, 8.6, "#FFFFFF", "800");
        drawText("\u203A", boxX + boxW - 8, boxY + 11.5, 9.5, "#FFE49C", "800", "center");
        const subtitle = meta.subtitle || "";
        const subW = Math.max(boxW - 8, Math.min(150, 22 + subtitle.length * 6));
        let subX = boxX + boxW / 2 - subW / 2;
        subX = Math.max(5, Math.min(VIEW_W - subW - 5, subX));
        roundedRect(
          subX,
          boxY + 23,
          subW,
          16,
          7,
          "rgba(255,254,249,0.98)",
          "rgba(7,55,79,0.11)"
        );
        drawText(
          fitText(subtitle, subW - 14, 5.5, "700"),
          subX + subW / 2,
          boxY + 31.4,
          5.5,
          "#23485F",
          "700",
          "center"
        );
        const badge = v32DisplayBadge(meta);
        if (badge) {
          const badgeW = badge.text.length >= 4 ? 49 : 37;
          const badgeX = Math.max(
            5,
            Math.min(VIEW_W - badgeW - 5, boxX + boxW - badgeW + 7)
          );
          roundedRect(
            badgeX,
            boxY - 9,
            badgeW,
            17,
            8,
            badge.fill,
            "#FFD7D9",
            0.9
          );
          drawText(
            badge.text,
            badgeX + badgeW / 2,
            boxY - 0.4,
            5.5,
            "#FFFFFF",
            "800",
            "center"
          );
        }
        if (meta.myShopCount > 0) {
          const sw = meta.myShopCount > 1 ? 56 : 46;
          const sx = Math.max(
            5,
            Math.min(VIEW_W - sw - 5, boxX + boxW - sw + 6)
          );
          roundedRect(
            sx,
            boxY - 28,
            sw,
            17,
            8,
            "#1D9D5E",
            "#BCF0CB",
            0.9
          );
          drawText(
            meta.myShopCount > 1 ? "\u2713 \u6211\u7684\u5E97\xD7" + meta.myShopCount : "\u2713 \u6211\u7684\u5E97",
            sx + sw / 2,
            boxY - 19.5,
            5,
            "#FFFFFF",
            "800",
            "center"
          );
        }
        const hitLeft = Math.min(x - 25, subX - 4);
        const hitRight = Math.max(x + 25, subX + subW + 4);
        const hitTop = Math.min(y - 28, boxY - 30);
        const hitBottom = Math.max(y + 28, boxY + 42);
        addButton(
          "district:" + district.id,
          hitLeft,
          hitTop,
          hitRight - hitLeft,
          hitBottom - hitTop
        );
      };
      drawDistrictCard = function() {
        const district = v32SelectedDistrict();
        if (!district) return;
        const meta = getDistrictVisualMeta(district);
        const x = CARD_X;
        const y = CARD_Y;
        const w = CARD_W;
        const h = CARD_H;
        roundedRect(
          x,
          y,
          w,
          h,
          17,
          "rgba(255,255,255,0.99)",
          "rgba(8,52,79,0.18)",
          1.15
        );
        const preview = resourceManager.getImage(V32_PREVIEW_KEYS[district.id]);
        const px = x + 9;
        const py = y + 8;
        const pw = 99;
        const ph = h - 16;
        if (preview) {
          ctx2.save();
          ctx2.beginPath();
          ctx2.moveTo(px + 13, py);
          ctx2.arcTo(px + pw, py, px + pw, py + ph, 13);
          ctx2.arcTo(px + pw, py + ph, px, py + ph, 13);
          ctx2.arcTo(px, py + ph, px, py, 13);
          ctx2.arcTo(px, py, px + pw, py, 13);
          ctx2.closePath();
          ctx2.clip();
          drawImageFocus(
            ctx2,
            preview,
            px,
            py,
            pw,
            ph,
            1,
            0.5,
            0.47
          );
          ctx2.restore();
        }
        const smallMarker = resourceManager.getImage(V32_MARKER_KEYS[district.id]);
        if (smallMarker) {
          ctx2.drawImage(smallMarker, x + 112, y + 7, 24, 24);
        }
        drawText(
          district.name,
          x + 135,
          y + 18,
          14.6,
          "#0C3960",
          "800"
        );
        drawText(
          "\u203A",
          x + 205,
          y + 18,
          13,
          "#2A5774",
          "800",
          "center"
        );
        drawText(
          fitText(meta.subtitle || "", w - 225, 6.3, "700"),
          x + 219,
          y + 18,
          6.3,
          "#547289",
          "700"
        );
        drawText(
          v26GetBadgeSummary(meta),
          x + 113,
          y + 36,
          6.8,
          "#1688C9",
          "800"
        );
        const metrics = [
          ["\u4EBA\u53E3", district.population.toLocaleString(), "#176CB0"],
          ["\u9700\u6C42", demandSystem.getTotalDemand(district.id).toLocaleString(), "#20A05B"],
          ["\u5BA2\u5355", "\xA5" + district.avgSpend, "#154A85"],
          ["\u9910\u996E\u5E97", district.restaurantCount + "\u5BB6", "#154A85"],
          ["\u9971\u548C\u5EA6", district.saturation + "%", "#1788CE"],
          ["\u79DF\u91D1", district.rentIndex.toFixed(2), "#154A85"]
        ];
        const metricX = x + 113;
        const metricY = y + 49;
        const gap = 4;
        const usableW = w - 123;
        const metricW = Math.floor((usableW - gap * 5) / 6);
        const metricH = 48;
        for (let i = 0; i < metrics.length; i++) {
          const mx = metricX + i * (metricW + gap);
          roundedRect(
            mx,
            metricY,
            metricW,
            metricH,
            8,
            "#FAF9F4",
            "rgba(19,65,92,0.10)"
          );
          drawMetricSymbol(
            metrics[i][0],
            mx + metricW / 2,
            metricY + 11,
            metrics[i][2]
          );
          drawText(
            metrics[i][0],
            mx + metricW / 2,
            metricY + 25,
            5.6,
            "#245477",
            "700",
            "center"
          );
          drawText(
            metrics[i][1],
            mx + metricW / 2,
            metricY + 40,
            7.2,
            metrics[i][2],
            "800",
            "center"
          );
        }
        const buttonW = 104;
        const buttonH = 35;
        const buttonX = x + w - buttonW - 9;
        const buttonY = y + h - buttonH - 8;
        drawText(
          fitText(
            "\u5B9E\u65F6\u6570\u636E\u968F\u4EBA\u53E3\u3001\u4E8B\u4EF6\u3001\u7ADE\u4E89\u53CA\u79DF\u91D1\u52A8\u6001\u53D8\u5316",
            buttonX - (x + 113) - 8,
            5.7,
            "600"
          ),
          x + 113,
          y + h - 17,
          5.7,
          "#667F91",
          "600"
        );
        roundedRect(
          buttonX,
          buttonY,
          buttonW,
          buttonH,
          17,
          "#FFC62D",
          "#DBA11B",
          1.25
        );
        drawText(
          "\u8FDB\u5165\u5546\u5708  \u203A",
          buttonX + buttonW / 2,
          buttonY + buttonH / 2,
          8.8,
          "#12394F",
          "800",
          "center"
        );
        addButton(
          "district:details",
          buttonX - 4,
          buttonY - 4,
          buttonW + 8,
          buttonH + 8
        );
      };
      drawBottomNav = function() {
        const current = sceneManager.getCurrentId();
        const items = [
          { id: "city", label: "\u57CE\u5E02", mapTo: "city" },
          { id: "shop", label: "\u95E8\u5E97", mapTo: "shop" },
          { id: "renovation", label: "\u88C5\u4FEE", mapTo: "renovation" },
          { id: "research", label: "\u83DC\u5355", mapTo: "research" },
          { id: "supply", label: "\u4F9B\u5E94\u94FE", mapTo: "supply" },
          { id: "business", label: "\u6570\u636E", mapTo: "business" },
          { id: "system", label: "\u7CFB\u7EDF", mapTo: "system" }
        ];
        if (current === "city") {
          const navImage = resourceManager.getImage("v32_bottom_nav_reference");
          ctx2.fillStyle = "#063C61";
          ctx2.fillRect(0, NAV_Y, VIEW_W, NAV_H);
          if (navImage) {
            ctx2.drawImage(
              navImage,
              0,
              NAV_Y,
              VIEW_W,
              NAV_H - SAFE_BOTTOM
            );
          }
          const cellW2 = VIEW_W / items.length;
          for (let i = 0; i < items.length; i++) {
            addButton(
              "nav:" + items[i].id,
              i * cellW2,
              NAV_Y,
              cellW2,
              NAV_H
            );
          }
          return;
        }
        roundedRect(0, NAV_Y, VIEW_W, NAV_H, 0, "rgba(4,54,84,0.99)");
        const glow = ctx2.createLinearGradient(0, NAV_Y, 0, NAV_Y + NAV_H);
        glow.addColorStop(0, "rgba(28,134,207,0.24)");
        glow.addColorStop(1, "rgba(28,134,207,0)");
        ctx2.fillStyle = glow;
        ctx2.fillRect(0, NAV_Y, VIEW_W, NAV_H);
        const cellW = VIEW_W / items.length;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const active = item.id === "city" && current === "city" || item.id === "shop" && (current === "shop" || current === "propertyMarket" || current === "equipment" || current === "license" || current === "staff") || item.id === "renovation" && current === "renovation" || item.id === "research" && current === "research" || item.id === "supply" && current === "supply" || item.id === "business" && current === "business";
          const cellX = i * cellW;
          if (active) {
            roundedRect(
              cellX + 4,
              NAV_Y + 4,
              cellW - 8,
              NAV_H - SAFE_BOTTOM - 8,
              13,
              "#F7CC2C",
              "#FFE99A",
              1.1
            );
          }
          if (item.id === "renovation") {
            const img = resourceManager.getImage("v32_nav_renovation");
            if (img) {
              ctx2.drawImage(
                img,
                cellX + cellW / 2 - 13,
                NAV_Y + 9,
                26,
                26
              );
            }
          } else {
            drawNavIcon(
              item.id,
              cellX + cellW / 2,
              NAV_Y + 22,
              active
            );
          }
          drawText(
            item.label,
            cellX + cellW / 2,
            NAV_Y + 48,
            8,
            active ? "#17384C" : "#FFFFFF",
            active ? "800" : "700",
            "center"
          );
          addButton(
            "nav:" + item.id,
            cellX,
            NAV_Y,
            cellW,
            NAV_H
          );
        }
      };
      if (cityScene && typeof cityScene.enter === "function" && !cityScene.__v32Wrapped) {
        const originalEnter = cityScene.enter;
        cityScene.enter = function() {
          originalEnter.call(this);
          trafficMode = false;
          v32SelectedDistrict();
        };
        cityScene.__v32Wrapped = true;
      }
      console.log("V32_REFERENCE_HOME_REBUILD loaded");
      simulationSystem.initialize();
      sceneManager.switchTo(
        "city"
      );
      render();
      loadResources();
      scheduleNextFrame(
        gameLoop
      );
      console.log(
        "\u57CE\u5E02\u9910\u996E\u7ECF\u8425\u5C0F\u6E38\u620F V32 \u53C2\u8003\u56FE\u4E3B\u9875\u91CD\u5236\u7248\u542F\u52A8\u6210\u529F"
      );
    }
  });

  // android/entry.js
  var canvas = document.getElementById("gameCanvas");
  if (!canvas) throw new Error("\u627E\u4E0D\u5230 gameCanvas");
  var ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("\u65E0\u6CD5\u521B\u5EFA Canvas 2D \u73AF\u5883");
  var lastTouchAt = 0;
  var activeModal = null;
  function removeActiveModal() {
    if (activeModal && activeModal.parentNode) {
      activeModal.parentNode.removeChild(activeModal);
    }
    activeModal = null;
  }
  function createModal(options) {
    const opts = options || {};
    removeActiveModal();
    const overlay = document.createElement("div");
    activeModal = overlay;
    overlay.style.position = "fixed";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.right = "0";
    overlay.style.bottom = "0";
    overlay.style.zIndex = "10000";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "18px";
    overlay.style.background = "rgba(4, 24, 36, 0.55)";
    overlay.style.backdropFilter = "blur(2px)";
    const panel = document.createElement("div");
    panel.style.width = "min(92vw, 420px)";
    panel.style.borderRadius = "18px";
    panel.style.padding = "18px";
    panel.style.background = "#FFFDF8";
    panel.style.boxShadow = "0 14px 45px rgba(0,0,0,0.30)";
    panel.style.border = "1px solid rgba(14,52,72,0.16)";
    panel.style.fontFamily = "sans-serif";
    panel.style.color = "#16364B";
    const title = document.createElement("div");
    title.textContent = opts.title || "\u63D0\u793A";
    title.style.fontSize = "18px";
    title.style.fontWeight = "800";
    title.style.marginBottom = "10px";
    panel.appendChild(title);
    if (opts.content && !opts.editable) {
      const content = document.createElement("div");
      content.textContent = String(opts.content);
      content.style.fontSize = "14px";
      content.style.lineHeight = "1.55";
      content.style.color = "#61747D";
      content.style.whiteSpace = "pre-wrap";
      content.style.marginBottom = "16px";
      panel.appendChild(content);
    }
    let input = null;
    if (opts.editable) {
      input = document.createElement("input");
      input.type = "text";
      input.value = opts.content || opts.value || "";
      input.placeholder = opts.placeholderText || "\u8BF7\u8F93\u5165\u5185\u5BB9";
      input.maxLength = Number(opts.maxLength) || 24;
      input.autocomplete = "off";
      input.style.display = "block";
      input.style.width = "100%";
      input.style.height = "46px";
      input.style.padding = "0 12px";
      input.style.borderRadius = "12px";
      input.style.border = "1px solid #CFC5B7";
      input.style.background = "#FFF9EF";
      input.style.color = "#17374C";
      input.style.fontSize = "16px";
      input.style.outline = "none";
      input.style.boxSizing = "border-box";
      input.style.marginBottom = "16px";
      panel.appendChild(input);
    }
    const buttons = document.createElement("div");
    buttons.style.display = "flex";
    buttons.style.gap = "10px";
    buttons.style.justifyContent = "flex-end";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = opts.cancelText || "\u53D6\u6D88";
    cancel.style.flex = "1";
    cancel.style.height = "42px";
    cancel.style.border = "1px solid #D3C9BB";
    cancel.style.borderRadius = "12px";
    cancel.style.background = "#F3EEE5";
    cancel.style.color = "#3B5361";
    cancel.style.fontSize = "15px";
    cancel.style.fontWeight = "700";
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.textContent = opts.confirmText || "\u786E\u5B9A";
    confirm.style.flex = "1";
    confirm.style.height = "42px";
    confirm.style.border = "1px solid #D9A12C";
    confirm.style.borderRadius = "12px";
    confirm.style.background = "#F5B72F";
    confirm.style.color = "#1C3442";
    confirm.style.fontSize = "15px";
    confirm.style.fontWeight = "800";
    function finish(result) {
      removeActiveModal();
      if (typeof opts.success === "function") {
        opts.success(result);
      }
    }
    cancel.addEventListener("click", function() {
      finish({
        confirm: false,
        cancel: true
      });
    });
    confirm.addEventListener("click", function() {
      const value = input ? input.value : "";
      finish({
        confirm: true,
        cancel: false,
        content: value,
        inputValue: value,
        value
      });
    });
    buttons.appendChild(cancel);
    buttons.appendChild(confirm);
    panel.appendChild(buttons);
    overlay.appendChild(panel);
    overlay.addEventListener("click", function(event) {
      if (event.target === overlay) {
        finish({
          confirm: false,
          cancel: true
        });
      }
    });
    document.body.appendChild(overlay);
    if (input) {
      window.setTimeout(function() {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }, 60);
      input.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
          event.preventDefault();
          confirm.click();
        } else if (event.key === "Escape") {
          event.preventDefault();
          cancel.click();
        }
      });
    }
  }
  var androidApi = {
    createCanvas() {
      return canvas;
    },
    getSystemInfoSync() {
      const ratio = window.devicePixelRatio || 1;
      return {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        pixelRatio: ratio,
        platform: "android"
      };
    },
    onTouchEnd(callback) {
      canvas.addEventListener(
        "touchend",
        function(event) {
          lastTouchAt = Date.now();
          if (event.cancelable) {
            event.preventDefault();
          }
          if (!event.changedTouches) return;
          callback({
            changedTouches: event.changedTouches
          });
        },
        { passive: false }
      );
      canvas.addEventListener(
        "click",
        function(event) {
          if (Date.now() - lastTouchAt < 700) {
            return;
          }
          callback({
            changedTouches: [
              {
                clientX: event.clientX,
                clientY: event.clientY
              }
            ]
          });
        }
      );
    },
    showToast(options) {
      const title = options && options.title ? options.title : "";
      showAndroidToast(title);
    },
    showModal(options) {
      try {
        createModal(options || {});
      } catch (error) {
        if (options && typeof options.fail === "function") {
          options.fail(error);
        }
      }
    },
    setStorageSync(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    getStorageSync(key) {
      const value = localStorage.getItem(key);
      if (value === null) return null;
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    },
    removeStorageSync(key) {
      localStorage.removeItem(key);
    },
    clearStorageSync() {
      localStorage.clear();
    }
  };
  function showAndroidToast(text) {
    let toast = document.getElementById("androidToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "androidToast";
      toast.style.position = "fixed";
      toast.style.left = "50%";
      toast.style.bottom = "110px";
      toast.style.transform = "translateX(-50%)";
      toast.style.padding = "10px 16px";
      toast.style.borderRadius = "10px";
      toast.style.background = "rgba(20, 39, 52, 0.92)";
      toast.style.color = "#FFFFFF";
      toast.style.fontSize = "14px";
      toast.style.fontFamily = "sans-serif";
      toast.style.zIndex = "9998";
      toast.style.pointerEvents = "none";
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.12s";
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.style.opacity = "1";
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function() {
      toast.style.opacity = "0";
    }, 1400);
  }
  globalThis.GameRuntime = {
    platform: "android",
    api: androidApi,
    canvas,
    ctx
  };
  require_main();
})();
