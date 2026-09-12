'use strict';

const runtime =
  globalThis.GameRuntime;

if (!runtime) {
  throw new Error(
    'ResourceManager：GameRuntime 未初始化'
  );
}

const api =
  runtime.api || {};

class ResourceManager {
  constructor() {
    /**
     * 已加载图片
     *
     * key -> Image
     */
    this.images =
      new Map();

    /**
     * 正在加载的图片
     *
     * 防止同一张图同时加载多次
     */
    this.loading =
      new Map();

    /**
     * 加载失败记录
     */
    this.failed =
      new Map();

    /**
     * 资源分组
     *
     * city
     * shop
     * dishes
     * characters
     * 等
     */
    this.groups =
      new Map();
  }

  /**
   * 创建跨平台 Image
   */
  createImage() {
    /**
     * 微信 / 抖音小游戏
     */
    if (
      api &&
      typeof api.createImage ===
        'function'
    ) {
      return api.createImage();
    }

    /**
     * 安卓 WebView /
     * 普通浏览器
     */
    if (
      typeof Image !==
      'undefined'
    ) {
      return new Image();
    }

    throw new Error(
      '当前平台不支持图片加载'
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
  loadImage(
    key,
    path,
    group
  ) {
    if (!key) {
      return Promise.reject(
        new Error(
          '资源 key 不能为空'
        )
      );
    }

    if (!path) {
      return Promise.reject(
        new Error(
          '图片路径不能为空'
        )
      );
    }

    /**
     * 已经加载过
     */
    if (
      this.images.has(key)
    ) {
      return Promise.resolve(
        this.images.get(key)
      );
    }

    /**
     * 正在加载
     */
    if (
      this.loading.has(key)
    ) {
      return this.loading.get(key);
    }

    const promise =
      new Promise(
        (
          resolve,
          reject
        ) => {
          let image;

          try {
            image =
              this.createImage();
          } catch (error) {
            reject(error);
            return;
          }

          image.onload =
            () => {
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

          image.onerror =
            error => {
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
                  '图片加载失败：' +
                  path
                )
              );
            };

          image.src =
            path;
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
  async loadImages(
    resources,
    group
  ) {
    if (
      !Array.isArray(
        resources
      )
    ) {
      return [];
    }

    const tasks =
      resources.map(
        item =>
          this.loadImage(
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
    return (
      this.images.get(key) ||
      null
    );
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
  addToGroup(
    group,
    key
  ) {
    if (
      !this.groups.has(group)
    ) {
      this.groups.set(
        group,
        new Set()
      );
    }

    this.groups
      .get(group)
      .add(key);
  }

  /**
   * 获取一个资源组
   */
  getGroup(group) {
    if (
      !this.groups.has(group)
    ) {
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
    if (
      !this.images.has(key)
    ) {
      return false;
    }

    const image =
      this.images.get(key);

    /**
     * 部分环境允许清空 src
     */
    try {
      if (
        image &&
        typeof image.src ===
          'string'
      ) {
        image.src = '';
      }
    } catch (error) {
      // 不影响释放
    }

    this.images.delete(key);

    /**
     * 从所有资源组移除
     */
    for (
      const group of
      this.groups.values()
    ) {
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
    const keys =
      this.getGroup(group);

    for (
      let i = 0;
      i <
      keys.length;
      i++
    ) {
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
    const keys =
      Array.from(
        this.images.keys()
      );

    for (
      let i = 0;
      i <
      keys.length;
      i++
    ) {
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
      loaded:
        this.images.size,

      loading:
        this.loading.size,

      failed:
        this.failed.size,

      groups:
        this.groups.size
    };
  }
}

const resourceManager =
  new ResourceManager();

module.exports =
  resourceManager;
