(function () {
  "use strict";

  /*
   * 保留原来的键名，这样之前记录的“最后阅读章节”
   * 不会因为本次升级而丢失。
   */
  const GLOBAL_KEY = "storyWiki:lastRead:v1";
  const POSITION_PREFIX = "storyWiki:chapterPosition:v1:";

  function getWorkKey(workId) {
    return `${GLOBAL_KEY}:work:${workId}`;
  }

  function getCleanUrl() {
    const url = new URL(window.location.href);

    url.hash = "";
    url.search = "";

    return url.href;
  }

  function getPositionKey(url) {
    try {
      const parsedUrl = new URL(url, window.location.href);

      return POSITION_PREFIX + parsedUrl.pathname;
    } catch (error) {
      return POSITION_PREFIX + url;
    }
  }

  function saveRecord(key, record) {
    try {
      localStorage.setItem(key, JSON.stringify(record));
    } catch (error) {
      console.warn("无法保存阅读记录：", error);
    }
  }

  function loadRecord(key) {
    try {
      const value = localStorage.getItem(key);

      if (!value) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      console.warn("无法读取阅读记录：", error);
      return null;
    }
  }

  /*
   * 记录当前打开的是哪一章。
   * 这个功能用于小说目录中的“继续阅读”按钮。
   */
  function recordCurrentChapter(position) {
    const body = document.body;

    if (!body.hasAttribute("data-reader-page")) {
      return;
    }

    const workId = body.dataset.workId || "";
    const workTitle = body.dataset.workTitle || "";
    const chapterTitle =
      body.dataset.chapterTitle || document.title;

    const record = {
      workId: workId,
      workTitle: workTitle,
      chapterTitle: chapterTitle,
      url: getCleanUrl(),
      updatedAt: Date.now()
    };

    if (position) {
      record.progress = position.progress;
    }

    saveRecord(GLOBAL_KEY, record);

    if (workId) {
      saveRecord(getWorkKey(workId), record);
    }
  }

  /*
   * 显示小说目录中的“继续阅读”按钮。
   */
  function showContinueReadingButtons() {
    const buttons = document.querySelectorAll(
      "[data-continue-reading]"
    );

    buttons.forEach(function (button) {
      const workId = button.dataset.workId || "";

      const key = workId
        ? getWorkKey(workId)
        : GLOBAL_KEY;

      const record = loadRecord(key);

      if (
        !record ||
        !record.url ||
        !record.chapterTitle
      ) {
        return;
      }

      let targetUrl;

      try {
        targetUrl = new URL(
          record.url,
          window.location.href
        );

        /*
         * 只允许跳转到当前网站，避免读取记录时
         * 意外跳转到其他域名。
         */
        if (targetUrl.origin !== window.location.origin) {
          return;
        }
      } catch (error) {
        return;
      }

      button.href = targetUrl.href;
      button.hidden = false;

      const chapterElement = button.querySelector(
        "[data-continue-title]"
      );

      const workElement = button.querySelector(
        "[data-continue-work]"
      );

      if (chapterElement) {
        chapterElement.textContent = record.chapterTitle;
      }

      if (workElement) {
        workElement.textContent = record.workTitle;
      }

      const panel = button.closest(
        ".continue-reading-panel"
      );

      if (panel) {
        const emptyMessage = panel.querySelector(
          "[data-no-reading]"
        );

        if (emptyMessage) {
          emptyMessage.hidden = true;
        }
      }
    });
  }

  /*
   * 取得章节正文的滚动范围。
   *
   * 不直接记录绝对像素，而是记录正文阅读百分比。
   * 这样即使读者更换设备宽度、调整字号，
   * 或者作者稍微修改排版，记录仍然大致有效。
   */
  function getChapterMetrics() {
    const content = document.querySelector(
      ".chapter-content"
    );

    if (!content) {
      return null;
    }

    const rectangle = content.getBoundingClientRect();
    const contentTop =
      window.scrollY + rectangle.top;

    /*
     * 为顶部固定导航保留一些空间。
     */
    const topOffset = 80;

    const startY = Math.max(
      0,
      contentTop - topOffset
    );

    const endY = Math.max(
      startY,
      contentTop +
        content.offsetHeight -
        window.innerHeight +
        topOffset
    );

    return {
      startY: startY,
      endY: endY
    };
  }

  function getCurrentPosition() {
    const metrics = getChapterMetrics();

    if (!metrics) {
      return null;
    }

    const distance =
      metrics.endY - metrics.startY;

    /*
     * 章节比浏览器窗口还短时，没有必要保存位置。
     */
    if (distance < 50) {
      return {
        progress: 0,
        scrollY: window.scrollY,
        updatedAt: Date.now()
      };
    }

    const rawProgress =
      (window.scrollY - metrics.startY) / distance;

    const progress = Math.min(
      1,
      Math.max(0, rawProgress)
    );

    return {
      progress: progress,
      scrollY: window.scrollY,
      updatedAt: Date.now()
    };
  }

  function formatProgress(progress) {
    const percentage = Math.round(progress * 100);

    return `${Math.max(1, percentage)}%`;
  }

  function initializeChapterPosition() {
    const body = document.body;

    if (!body.hasAttribute("data-reader-page")) {
      return;
    }

    const chapterUrl = getCleanUrl();
    const positionKey = getPositionKey(chapterUrl);
    const savedPosition = loadRecord(positionKey);

    const notice = document.querySelector(
      "[data-reading-position-notice]"
    );

    const percentageElement = document.querySelector(
      "[data-reading-position-percent]"
    );

    const restoreButton = document.querySelector(
      "[data-restore-reading-position]"
    );

    const dismissButton = document.querySelector(
      "[data-dismiss-reading-position]"
    );

    /*
     * 打开章节时，先记录“最后阅读章节”。
     * 此处不会覆盖章节内已经保存的位置。
     */
    recordCurrentChapter(savedPosition);

    /*
     * 阅读进度低于 1% 时，可以视为尚未开始阅读，
     * 不显示恢复提示。
     */
    if (
      savedPosition &&
      Number.isFinite(savedPosition.progress) &&
      savedPosition.progress > 0.01 &&
      notice
    ) {
      if (percentageElement) {
        percentageElement.textContent =
          formatProgress(savedPosition.progress);
      }

      notice.hidden = false;
    }

    let saveTimer = null;
    let positionChanged = false;
    let isRestoring = false;
    let previousScrollY = window.scrollY;

    function saveCurrentPosition() {
      const position = getCurrentPosition();

      if (!position) {
        return;
      }

      saveRecord(positionKey, position);
      recordCurrentChapter(position);

      positionChanged = false;
    }

    function scheduleSave() {
      window.clearTimeout(saveTimer);

      saveTimer = window.setTimeout(function () {
        saveCurrentPosition();
      }, 300);
    }

    /*
     * 只有实际发生滚动时才更新记录。
     * 因此读者打开页面但没有滚动，不会立刻把旧位置
     * 覆盖成页面顶部。
     */
    window.addEventListener(
      "scroll",
      function () {
        if (isRestoring) {
          return;
        }

        if (
          Math.abs(window.scrollY - previousScrollY) < 2
        ) {
          return;
        }

        previousScrollY = window.scrollY;
        positionChanged = true;

        scheduleSave();
      },
      {
        passive: true
      }
    );

    /*
     * 点击“回到上次位置”。
     */
    if (restoreButton && savedPosition) {
      restoreButton.addEventListener(
        "click",
        function () {
          if (notice) {
            notice.hidden = true;
          }

          /*
           * 隐藏提示后页面高度可能变化，因此等待浏览器
           * 重新排版，再计算跳转位置。
           */
          window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
              const metrics = getChapterMetrics();

              if (!metrics) {
                return;
              }

              const targetY =
                metrics.startY +
                (
                  metrics.endY -
                  metrics.startY
                ) *
                savedPosition.progress;

              const reduceMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
              ).matches;

              isRestoring = true;

              window.scrollTo({
                top: targetY,
                behavior: reduceMotion
                  ? "auto"
                  : "smooth"
              });

              window.setTimeout(
                function () {
                  isRestoring = false;
                  previousScrollY = window.scrollY;
                  saveCurrentPosition();
                },
                reduceMotion ? 50 : 700
              );
            });
          });
        }
      );
    }

    /*
     * “暂不恢复”只隐藏提示，不删除旧记录。
     * 如果读者从头开始滚动，旧记录会自动被新位置覆盖。
     */
    if (dismissButton) {
      dismissButton.addEventListener(
        "click",
        function () {
          if (notice) {
            notice.hidden = true;
          }
        }
      );
    }

    /*
     * 离开章节前立即保存，避免读者刚刚滚动后
     * 计时器还没有执行就切换页面。
     */
    window.addEventListener(
      "pagehide",
      function () {
        if (!positionChanged) {
          return;
        }

        window.clearTimeout(saveTimer);
        saveCurrentPosition();
      }
    );
  }

  function initialize() {
    showContinueReadingButtons();
    initializeChapterPosition();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }
})();
