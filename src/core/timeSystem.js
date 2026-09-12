'use strict';

const gameState = require('./gameState.js');

/**
 * 游戏时间系统
 *
 * 负责：
 * - 分钟推进
 * - 小时推进
 * - 天数推进
 * - 月份推进
 * - 年份推进
 *
 * 以后营业、房租、工资、天气、事件、商圈变化
 * 都会依赖这个系统。
 */

const DAYS_IN_MONTH = [
  31, // 1月
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

class TimeSystem {
  getTime() {
    return gameState.getTime();
  }

  isLeapYear(year) {
    return (
      year % 400 === 0 ||
      (
        year % 4 === 0 &&
        year % 100 !== 0
      )
    );
  }

  getDaysInMonth(year, month) {
    if (
      month === 2 &&
      this.isLeapYear(year)
    ) {
      return 29;
    }

    return DAYS_IN_MONTH[
      month - 1
    ];
  }

  addMinutes(minutes) {
    const time =
      gameState.getTime();

    time.minute += minutes;

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
    this.addMinutes(
      hours * 60
    );
  }

  addDays(days) {
    const time =
      gameState.getTime();

    for (
      let i = 0;
      i < days;
      i++
    ) {
      time.day += 1;

      const maxDay =
        this.getDaysInMonth(
          time.year,
          time.month
        );

      if (
        time.day > maxDay
      ) {
        time.day = 1;
        time.month += 1;
      }

      if (
        time.month > 12
      ) {
        time.month = 1;
        time.year += 1;
      }
    }
  }

  nextDay() {
    const time =
      gameState.getTime();

    time.hour = 8;
    time.minute = 0;

    this.addDays(1);
  }

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
          hour
        )
      );

    time.minute =
      Math.max(
        0,
        Math.min(
          59,
          minute
        )
      );
  }

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

  getMealPeriod() {
    const hour =
      gameState.getTime().hour;

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
