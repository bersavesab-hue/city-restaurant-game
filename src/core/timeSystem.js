'use strict';

const gameState =
  require('./gameState.js');

/**
 * 游戏时间系统
 *
 * 1× = 现实1秒推进游戏1分钟
 * 2× = 现实1秒推进游戏2分钟
 * 5× = 现实1秒推进游戏5分钟
 * 10× = 现实1秒推进游戏10分钟
 *
 * 后面天气、NPC、营业、订单、
 * 房租、工资、事件等全部跟这个时间走。
 */

const DAYS_IN_MONTH = [
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

const BASE_GAME_MINUTES_PER_SECOND =
  1;

class TimeSystem {
  constructor() {
    /**
     * 保存不足1分钟的小数部分
     */
    this.minuteAccumulator =
      0;
  }

  getTime() {
    return gameState.getTime();
  }

  /* =========================
     实时时间推进
  ========================= */

  /**
   * 游戏主循环每帧调用
   *
   * deltaMs = 距离上一帧过去的毫秒
   */
  update(deltaMs) {
    if (
      gameState.isTimePaused()
    ) {
      return 0;
    }

    let delta =
      Number(deltaMs);

    if (
      !Number.isFinite(delta) ||
      delta <= 0
    ) {
      return 0;
    }

    /**
     * 防止手机切后台后回来
     * 一口气跳过几天。
     *
     * 离线收益以后单独做。
     */
    delta =
      Math.min(
        delta,
        1000
      );

    const seconds =
      delta / 1000;

    const speed =
      gameState.getTimeSpeed();

    const gameMinutes =
      seconds *
      BASE_GAME_MINUTES_PER_SECOND *
      speed;

    this.minuteAccumulator +=
      gameMinutes;

    const wholeMinutes =
      Math.floor(
        this.minuteAccumulator
      );

    if (
      wholeMinutes <= 0
    ) {
      return 0;
    }

    this.minuteAccumulator -=
      wholeMinutes;

    this.addMinutes(
      wholeMinutes
    );

    return wholeMinutes;
  }

  /* =========================
     时间倍率
  ========================= */

  setSpeed(speed) {
    return (
      gameState.setTimeSpeed(
        speed
      )
    );
  }

  getSpeed() {
    return (
      gameState.getTimeSpeed()
    );
  }

  getSpeedText() {
    return (
      this.getSpeed() +
      '×'
    );
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
    return (
      gameState.toggleTimePause()
    );
  }

  isPaused() {
    return (
      gameState.isTimePaused()
    );
  }

  /**
   * 切换速度时清除碎片时间，
   * 防止出现突然跳一分钟。
   */
  resetAccumulator() {
    this.minuteAccumulator =
      0;
  }

  /* =========================
     日期计算
  ========================= */

  isLeapYear(year) {
    return (
      year % 400 === 0 ||
      (
        year % 4 === 0 &&
        year % 100 !== 0
      )
    );
  }

  getDaysInMonth(
    year,
    month
  ) {
    if (
      month === 2 &&
      this.isLeapYear(year)
    ) {
      return 29;
    }

    return (
      DAYS_IN_MONTH[
        month - 1
      ]
    );
  }

  /* =========================
     手动推进
  ========================= */

  addMinutes(minutes) {
    const value =
      Math.floor(
        Number(minutes)
      );

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return;
    }

    const time =
      gameState.getTime();

    time.minute +=
      value;

    while (
      time.minute >= 60
    ) {
      time.minute -= 60;
      time.hour += 1;
    }

    while (
      time.hour >= 24
    ) {
      time.hour -= 24;

      this.addDays(1);
    }
  }

  addHours(hours) {
    const value =
      Math.floor(
        Number(hours)
      );

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return;
    }

    this.addMinutes(
      value * 60
    );
  }

  addDays(days) {
    const value =
      Math.floor(
        Number(days)
      );

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return;
    }

    const time =
      gameState.getTime();

    for (
      let i = 0;
      i < value;
      i++
    ) {
      time.day += 1;

      const maxDay =
        this.getDaysInMonth(
          time.year,
          time.month
        );

      if (
        time.day >
        maxDay
      ) {
        time.day = 1;

        time.month +=
          1;
      }

      if (
        time.month > 12
      ) {
        time.month = 1;

        time.year +=
          1;
      }
    }
  }

  nextDay() {
    const time =
      gameState.getTime();

    this.addDays(1);

    time.hour = 8;
    time.minute = 0;

    this.resetAccumulator();
  }

  /* =========================
     设置时间
  ========================= */

  setTime(
    hour,
    minute
  ) {
    const time =
      gameState.getTime();

    time.hour =
      Math.max(
        0,
        Math.min(
          23,
          Math.floor(
            Number(hour) || 0
          )
        )
      );

    time.minute =
      Math.max(
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

  /* =========================
     UI显示
  ========================= */

  getTimeText() {
    const time =
      gameState.getTime();

    const hour =
      String(
        time.hour
      ).padStart(
        2,
        '0'
      );

    const minute =
      String(
        time.minute
      ).padStart(
        2,
        '0'
      );

    return (
      hour +
      ':' +
      minute
    );
  }

  getDateText() {
    const time =
      gameState.getTime();

    return (
      '第' +
      time.year +
      '年 ' +
      time.month +
      '月' +
      time.day +
      '日'
    );
  }

  getFullText() {
    return (
      this.getDateText() +
      ' ' +
      this.getTimeText()
    );
  }

  /**
   * 给顶部UI一次性读取
   */
  getDisplayState() {
    return {
      date:
        this.getDateText(),

      time:
        this.getTimeText(),

      speed:
        this.getSpeed(),

      speedText:
        this.getSpeedText(),

      paused:
        this.isPaused(),

      mealPeriod:
        this.getMealPeriod()
    };
  }

  /* =========================
     餐饮时段
  ========================= */

  getMealPeriod() {
    const hour =
      gameState
        .getTime()
        .hour;

    if (
      hour >= 6 &&
      hour < 10
    ) {
      return 'breakfast';
    }

    if (
      hour >= 10 &&
      hour < 14
    ) {
      return 'lunch';
    }

    if (
      hour >= 14 &&
      hour < 17
    ) {
      return 'afternoon';
    }

    if (
      hour >= 17 &&
      hour < 21
    ) {
      return 'dinner';
    }

    return 'night';
  }
}

const timeSystem =
  new TimeSystem();

module.exports =
  timeSystem;
