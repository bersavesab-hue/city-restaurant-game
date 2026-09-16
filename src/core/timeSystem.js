'use strict';

const gameState =
  require('./gameState.js');

const simulationConfig =
  require('./simulationConfig.js');

const timeScheduleCoordinator =
  require('./timeScheduleCoordinatorV0812.js');

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

class TimeSystem {
  constructor() {
    this.minuteAccumulator =
      0;

    this.maxStepProvider =
      null;
  }

  getTime() {
    return gameState.getTime();
  }

  update(
    deltaMs,
    onStep
  ) {
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

    delta =
      Math.min(
        delta,
        Number(
          simulationConfig
            .time
            .maxRealDeltaMs
        ) ||
        250
      );

    const seconds =
      delta /
      1000;

    const speed =
      gameState.getTimeSpeed();

    const gameMinutes =
      seconds *
      this.getMinutesPerSecondForSpeed(
        speed
      );

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

    const callback =
      typeof onStep ===
        'function'
        ? onStep
        : null;

    if (!callback) {
      this.addMinutes(
        wholeMinutes
      );

      return wholeMinutes;
    }

    const uiSpeeds =
      Array.isArray(
        simulationConfig.time.uiSpeeds
      )
        ? simulationConfig.time.uiSpeeds
        : [1, 3, 8];

    const chunkConfig =
      uiSpeeds.indexOf(
        speed
      ) >= 0
        ? simulationConfig.time.playerMaxSimulationChunkMinutes
        : simulationConfig.time.maxSimulationChunkMinutes;

    const baseMaxChunk =
      Math.max(
        1,
        Math.floor(
          Number(
            chunkConfig
          ) ||
          10
        )
      );

    let remaining =
      wholeMinutes;

    let advanced =
      0;

    while (
      remaining >
      0
    ) {
      let maxChunk =
        baseMaxChunk;

      if (
        typeof this.maxStepProvider ===
          'function'
      ) {
        const provided =
          Number(
            this.maxStepProvider({
              remaining,
              speed,
              time:
                gameState.getTime()
            })
          );

        if (
          Number.isFinite(
            provided
          ) &&
          provided >
            0
        ) {
          maxChunk =
            Math.max(
              1,
              Math.min(
                baseMaxChunk,
                Math.floor(
                  provided
                )
              )
            );
        }
      }

      const step =
        Math.min(
          maxChunk,
          remaining
        );

      this.addMinutes(
        step
      );

      advanced +=
        step;

      callback(
        step
      );

      remaining -=
        step;

      // 智能推进或关键事件可在回调中暂停。
      // 一旦暂停，当前帧不再继续吞掉剩余游戏时间。
      if (
        gameState.isTimePaused()
      ) {
        this.minuteAccumulator =
          0;
        break;
      }
    }

    return advanced;
  }

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

  getMinutesPerSecondForSpeed(speed) {
    const value =
      Number(speed) ||
      1;

    const uiSpeeds =
      Array.isArray(
        simulationConfig.time.uiSpeeds
      )
        ? simulationConfig.time.uiSpeeds
        : [1, 3, 8];

    const playerBase =
      Number(
        simulationConfig.time.playerBaseGameMinutesPerSecond
      ) ||
      12;

    const legacyBase =
      Number(
        simulationConfig.time.baseGameMinutesPerSecond
      ) ||
      6;

    return (
      uiSpeeds.indexOf(
        value
      ) >= 0
        ? playerBase * value
        : legacyBase * value
    );
  }

  getEffectiveMinutesPerSecond() {
    return this.getMinutesPerSecondForSpeed(
      this.getSpeed()
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

  resetAccumulator() {
    this.minuteAccumulator =
      0;
  }

  setMaxStepProvider(
    provider
  ) {
    this.maxStepProvider =
      typeof provider ===
        'function'
        ? provider
        : null;
  }

  clearMaxStepProvider() {
    this.maxStepProvider =
      null;
  }

  isLeapYear(year) {
    return (
      timeScheduleCoordinator
        .isLeapYear(
          year
        )
    );
  }

  getDaysInMonth(
    year,
    month
  ) {
    return (
      timeScheduleCoordinator
        .daysInMonth(
          year,
          month
        )
    );
  }

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

      effectiveMinutesPerSecond:
        this.getEffectiveMinutesPerSecond(),

      paused:
        this.isPaused(),

      mealPeriod:
        this.getMealPeriod()
    };
  }

  getMealPeriod() {
    return (
      timeScheduleCoordinator
        .mealPeriod(
          gameState
            .getTime()
        )
    );
  }

}

const timeSystem =
  new TimeSystem();

module.exports =
  timeSystem;
