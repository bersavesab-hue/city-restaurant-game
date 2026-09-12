'use strict';

const fs =
  require('fs');

const path =
  require('path');

function walk(
  dir,
  files
) {
  const out =
    files ||
    [];

  if (
    !fs.existsSync(
      dir
    )
  ) {
    return out;
  }

  for (
    const entry of
    fs.readdirSync(
      dir,
      {
        withFileTypes:
          true
      }
    )
  ) {
    const full =
      path.join(
        dir,
        entry.name
      );

    if (
      entry.isDirectory()
    ) {
      walk(
        full,
        out
      );
    } else if (
      entry.name.endsWith(
        '.js'
      )
    ) {
      out.push(
        full
      );
    }
  }

  return out;
}

function readAll(
  root
) {
  return walk(
    path.join(
      root,
      'src'
    )
  )
    .map(
      file => ({
        file,
        relative:
          path.relative(
            root,
            file
          ),
        text:
          fs.readFileSync(
            file,
            'utf8'
          )
      })
    );
}

function extractCalls(
  source,
  methodNames
) {
  const calls = [];

  for (
    const methodName of
    methodNames
  ) {
    let cursor =
      0;

    while (
      cursor <
      source.length
    ) {
      const start =
        source.indexOf(
          methodName +
            '(',
          cursor
        );

      if (
        start <
        0
      ) {
        break;
      }

      let i =
        start +
        methodName.length +
        1;

      let depth =
        1;

      let quote =
        null;

      let escape =
        false;

      for (
        ;
        i <
        source.length;
        i++
      ) {
        const ch =
          source[i];

        if (
          quote
        ) {
          if (
            escape
          ) {
            escape =
              false;
          } else if (
            ch ===
            '\\'
          ) {
            escape =
              true;
          } else if (
            ch ===
            quote
          ) {
            quote =
              null;
          }

          continue;
        }

        if (
          ch ===
            '"' ||
          ch ===
            "'" ||
          ch ===
            '`'
        ) {
          quote =
            ch;
          continue;
        }

        if (
          ch ===
          '('
        ) {
          depth +=
            1;
        } else if (
          ch ===
          ')'
        ) {
          depth -=
            1;

          if (
            depth ===
            0
          ) {
            calls.push(
              {
                method:
                  methodName,
                raw:
                  source.slice(
                    start +
                      methodName.length +
                      1,
                    i
                  )
              }
            );

            cursor =
              i +
              1;
            break;
          }
        }
      }

      if (
        depth !==
        0
      ) {
        break;
      }
    }
  }

  return calls;
}

function splitTopLevel(
  raw
) {
  const parts = [];

  let current =
    '';

  let depth =
    0;

  let quote =
    null;

  let escape =
    false;

  for (
    let i = 0;
    i <
    raw.length;
    i++
  ) {
    const ch =
      raw[i];

    if (
      quote
    ) {
      current +=
        ch;

      if (
        escape
      ) {
        escape =
          false;
      } else if (
        ch ===
        '\\'
      ) {
        escape =
          true;
      } else if (
        ch ===
        quote
      ) {
        quote =
          null;
      }

      continue;
    }

    if (
      ch ===
        '"' ||
      ch ===
        "'" ||
      ch ===
        '`'
    ) {
      quote =
        ch;
      current +=
        ch;
      continue;
    }

    if (
      ch ===
        '(' ||
      ch ===
        '[' ||
      ch ===
        '{'
    ) {
      depth +=
        1;
      current +=
        ch;
      continue;
    }

    if (
      ch ===
        ')' ||
      ch ===
        ']' ||
      ch ===
        '}'
    ) {
      depth -=
        1;
      current +=
        ch;
      continue;
    }

    if (
      ch ===
        ',' &&
      depth ===
        0
    ) {
      parts.push(
        current.trim()
      );
      current =
        '';
      continue;
    }

    current +=
      ch;
  }

  if (
    current.trim()
  ) {
    parts.push(
      current.trim()
    );
  }

  return parts;
}

function literalNumber(
  text
) {
  const cleaned =
    String(
      text
    ).trim();

  if (
    /^-?\d+(?:\.\d+)?$/
      .test(
        cleaned
      )
  ) {
    return Number(
      cleaned
    );
  }

  return null;
}

function makeIssue(
  id,
  priority,
  dimension,
  title,
  detail,
  evidence,
  remediation
) {
  return {
    id,
    priority,
    dimension,
    title,
    detail,
    evidence,
    remediation
  };
}

function auditSource(
  root
) {
  const sources =
    readAll(
      root
    );

  const issues = [];

  const fontSamples = [];

  const buttonSamples = [];

  const guardedFontFiles =
    new Set();

  const guardedTapFiles =
    new Set();

  let placeholderCount =
    0;

  let sceneCount =
    0;

  let sourceText =
    '';

  for (
    const item of
    sources
  ) {
    sourceText +=
      '\n' +
      item.text;

    if (
      (
        item.text.includes(
          'readableSize'
        ) &&
        item.text.includes(
          'Math.max'
        )
      ) ||
      item.text.includes(
        "require('../ui/premiumUi.js')"
      ) ||
      item.text.includes(
        'premiumUi.text('
      )
    ) {
      guardedFontFiles.add(
        item.relative
      );
    }

    if (
      item.text.includes(
        'hitW'
      ) &&
      item.text.includes(
        'hitH'
      ) &&
      item.text.includes(
        'Math.max'
      )
    ) {
      guardedTapFiles.add(
        item.relative
      );
    }

    if (
      item.relative.startsWith(
        'src/scenes'
      )
    ) {
      sceneCount +=
        1;
    }

    if (
      /src[\\/]scenes[\\/](storeScene|renovationScene|equipmentScene|licenseScene|staffScene)\.js$/
        .test(
          item.relative
        )
    ) {
      placeholderCount +=
        (
          item.text.match(
            /将在下一阶段接入/g
          ) ||
          []
        ).length;
    }

    const textCalls =
      extractCalls(
        item.text,
        [
          'this.text',
          'ui.text',
          'premiumUi.text'
        ]
      );

    for (
      const call of
      textCalls
    ) {
      const args =
        splitTopLevel(
          call.raw
        );

      const size =
        literalNumber(
          args[4]
        );

      if (
        size !==
        null
      ) {
        fontSamples.push(
          {
            file:
              item.relative,
            size
          }
        );
      }
    }

    const buttonCalls =
      extractCalls(
        item.text,
        [
          'this.addButton',
          'this.button'
        ]
      );

    for (
      const call of
      buttonCalls
    ) {
      const args =
        splitTopLevel(
          call.raw
        );

      const w =
        literalNumber(
          args[3]
        );

      const h =
        literalNumber(
          args[4]
        );

      if (
        w !==
          null &&
        h !==
          null
      ) {
        buttonSamples.push(
          {
            file:
              item.relative,
            w,
            h
          }
        );
      }
    }
  }

  const tinyFonts =
    fontSamples.filter(
      item =>
        item.size <
          7 &&
        !guardedFontFiles.has(
          item.file
        )
    );

  const smallFonts =
    fontSamples.filter(
      item =>
        item.size >=
          7 &&
        item.size <
          8 &&
        !guardedFontFiles.has(
          item.file
        )
    );

  if (
    tinyFonts.length >
    0
  ) {
    issues.push(
      makeIssue(
        'UI_FONT_TINY',
        'P1',
        'typography',
        '存在大量极小字号',
        '部分正文/辅助信息字号低于7逻辑像素，小屏、长辈、单手玩家阅读压力很高。',
        {
          count:
            tinyFonts.length,
          samples:
            tinyFonts
              .slice(
                0,
                8
              )
        },
        '建立统一字体层级；正文至少使用更可读字号，并提供字体缩放/高可读模式。'
      )
    );
  }

  if (
    smallFonts.length >
    8
  ) {
    issues.push(
      makeIssue(
        'UI_FONT_DENSE',
        'P2',
        'typography',
        '辅助文字密度偏高',
        '7-8逻辑像素文字数量较多，视觉上容易出现“信息很多但看不清”的感受。',
        {
          count:
            smallFonts.length
        },
        '减少同屏次要文字；把解释放入详情层或点击提示。'
      )
    );
  }

  const tinyTargets =
    buttonSamples.filter(
      item =>
        (
          item.w <
            36 ||
          item.h <
            32
        ) &&
        !guardedTapFiles.has(
          item.file
        )
    );

  if (
    tinyTargets.length >
    0
  ) {
    issues.push(
      makeIssue(
        'UI_TAP_TARGET',
        'P1',
        'interaction',
        '部分点击热区偏小',
        '固定点击区域中存在宽度低于36或高度低于32的区域，小屏/单手容易误触。',
        {
          count:
            tinyTargets.length,
          samples:
            tinyTargets
              .slice(
                0,
                8
              )
        },
        '扩大热区而不是只放大图标；关键按钮保证整个视觉按钮都可点击。'
      )
    );
  }

  if (
    placeholderCount >
    0
  ) {
    issues.push(
      makeIssue(
        'FLOW_PLACEHOLDER',
        'P1',
        'flow',
        '核心流程存在占位模块',
        '玩家从门店筹备进入部分功能时仍会看到“下一阶段接入”类提示，核心闭环被中断。',
        {
          placeholderCount
        },
        '上线前打通签约→装修→设备→证照→招聘→试营业→正式经营完整路径。'
      )
    );
  }

  if (
    !/tutorial|新手|引导/.test(
      sourceText
    )
  ) {
    issues.push(
      makeIssue(
        'ONBOARDING_MISSING',
        'P1',
        'onboarding',
        '缺少明确的新手引导系统',
        '当前源代码未发现独立的新手引导/渐进式教学机制。',
        {
          sourceScan:
            'tutorial/新手/引导 未发现'
        },
        '采用短步骤、可跳过、按场景触发的教学；不要一次堆大量说明文字。'
      )
    );
  }

  if (
    !/fontScale|字体大小|大字体|accessibility/i.test(
      sourceText
    )
  ) {
    issues.push(
      makeIssue(
        'ACCESS_FONT_SCALE',
        'P2',
        'accessibility',
        '没有字体缩放/高可读设置',
        '对视力较弱、老年玩家和小屏设备缺少可读性兜底。',
        {
          sourceScan:
            '未发现字体缩放设置'
        },
        '系统设置加入标准/大字两档，重点页面动态适配。'
      )
    );
  }

  if (
    !/safeArea|safe-area|statusBarHeight/i.test(
      sourceText
    )
  ) {
    issues.push(
      makeIssue(
        'UI_SAFE_AREA',
        'P2',
        'ui',
        '安全区适配信号不足',
        '未发现统一安全区工具，全面屏/异形屏容易出现顶部或底部空间异常。',
        {
          sourceScan:
            '未发现safeArea适配关键词'
        },
        '抽象SafeArea布局层，并在常见安卓/iOS比例做截图巡检。'
      )
    );
  }

  if (
    !/undo|redo|撤销|重做/.test(
      sourceText
    )
  ) {
    issues.push(
      makeIssue(
        'RENOVATION_UNDO',
        'P2',
        'interaction',
        '装修编辑缺少撤销/重做',
        '高自由度装修中误操作成本较高，装修党和沙盒玩家会频繁需要撤销。',
        {
          sourceScan:
            '未发现撤销/重做'
        },
        '装修操作建立命令栈，支持至少10步撤销/重做。'
      )
    );
  }

  if (
    !/colorblind|色盲|高对比|highContrast/i.test(
      sourceText
    )
  ) {
    issues.push(
      makeIssue(
        'ACCESS_COLOR',
        'P3',
        'accessibility',
        '状态信息依赖颜色且缺少辅助模式',
        '大量绿色/橙色/红色表达状态，但没有发现色盲/高对比设置。',
        {
          sourceScan:
            '未发现高对比或色盲模式'
        },
        '关键状态同时使用图标/文字，不只靠颜色；后续增加高对比模式。'
      )
    );
  }

  if (
    !/achievement|成就|collection|收藏/.test(
      sourceText
    )
  ) {
    issues.push(
      makeIssue(
        'META_ACHIEVEMENT',
        'P3',
        'content',
        '缺少明显的长期收集/成就反馈',
        '当前经营核心较强，但收藏党缺少跨局目标和里程碑展示。',
        {
          sourceScan:
            '未发现成就/收藏系统'
        },
        '后续增加经营成就、菜系图鉴、商圈收藏、门店里程碑等长期目标。'
      )
    );
  }

  if (
    sceneCount <
    8
  ) {
    issues.push(
      makeIssue(
        'CONTENT_SCENE_DEPTH',
        'P3',
        'content',
        '可独立体验页面仍偏少',
        '当前场景数量有限，长期经营玩家可能较快触达内容边界。',
        {
          sceneCount
        },
        '优先补齐经营闭环，再增加供应链、员工、菜品、活动、连锁经营等深层页面。'
      )
    );
  }

  return {
    sceneCount,
    fontSamples,
    buttonSamples,
    issues
  };
}

module.exports = {
  auditSource,
  extractCalls,
  splitTopLevel
};
