'use strict';

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function getLogicalInsets(
  info,
  scale
) {
  const source =
    info ||
    {};

  const safeArea =
    source.safeArea ||
    null;

  const windowHeight =
    Number(
      source.windowHeight
    ) ||
    0;

  const logicalScale =
    Math.max(
      0.01,
      Number(
        scale
      ) ||
      1
    );

  if (
    !safeArea ||
    !windowHeight
  ) {
    return {
      top: 0,
      bottom: 0
    };
  }

  const top =
    Math.max(
      0,
      Number(
        safeArea.top
      ) ||
      0
    ) /
    logicalScale;

  const bottomPixels =
    Math.max(
      0,
      windowHeight -
      (
        Number(
          safeArea.bottom
        ) ||
        windowHeight
      )
    );

  return {
    top:
      clamp(
        top,
        0,
        24
      ),
    bottom:
      clamp(
        bottomPixels /
        logicalScale,
        0,
        24
      )
  };
}

module.exports = {
  getLogicalInsets
};
