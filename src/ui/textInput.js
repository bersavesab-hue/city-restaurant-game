'use strict';

const runtime =
  globalThis
    .GameRuntime ||
  {};

const api =
  runtime.api ||
  {};

function requestRender() {
  if (
    runtime &&
    typeof runtime
      .requestRender ===
      'function'
  ) {
    runtime.requestRender();
  }
}

function normalize(
  value,
  maxLength
) {
  return String(
    value == null
      ? ''
      : value
  )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
    .slice(
      0,
      Math.max(
        1,
        Number(
          maxLength
        ) ||
        12
      )
    );
}

function promptFallback(
  options,
  done
) {
  if (
    typeof globalThis.prompt ===
    'function'
  ) {
    const result =
      globalThis.prompt(
        options.title ||
          '请输入名称',
        options.value ||
          ''
      );

    done(
      result == null
        ? null
        : normalize(
            result,
            options.maxLength
          )
    );

    requestRender();

    return;
  }

  if (
    api &&
    typeof api.showToast ===
      'function'
  ) {
    api.showToast({
      title:
        '当前环境暂不支持文字输入',
      icon:
        'none'
    });
  }

  done(
    null
  );
}

function requestText(
  options
) {
  const opts =
    options ||
    {};

  return new Promise(
    resolve => {
      let settled =
        false;

      const finish =
        value => {
          if (settled) {
            return;
          }

          settled =
            true;

          resolve(
            value
          );

          requestRender();
        };

      if (
        api &&
        typeof api.showModal ===
          'function'
      ) {
        try {
          api.showModal({
            title:
              opts.title ||
              '编辑名称',

            content:
              opts.value ||
              '',

            editable:
              true,

            placeholderText:
              opts.placeholder ||
              '请输入名称',

            confirmText:
              '保存',

            cancelText:
              '取消',

            success:
              result => {
                if (
                  !result ||
                  !result.confirm
                ) {
                  finish(
                    null
                  );

                  return;
                }

                const raw =
                  result.content !=
                  null
                    ? result.content
                    : result.inputValue !=
                        null
                      ? result.inputValue
                      : result.value !=
                          null
                        ? result.value
                        : '';

                const text =
                  normalize(
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

            fail:
              () => {
                promptFallback(
                  opts,
                  finish
                );
              }
          });

          return;
        } catch (
          error
        ) {
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
