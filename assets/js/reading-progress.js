(function () {
  "use strict";

  const GLOBAL_KEY = "storyWiki:lastRead:v1";

  function getWorkKey(workId) {
    return `${GLOBAL_KEY}:work:${workId}`;
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

  function recordCurrentChapter() {
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
      url: window.location.href,
      updatedAt: Date.now()
    };

    // 记录整个系列最后阅读的章节
    saveRecord(GLOBAL_KEY, record);

    // 分别记录每部小说最后阅读的章节
    if (workId) {
      saveRecord(getWorkKey(workId), record);
    }
  }

  function showContinueReadingButtons() {
    const buttons =
      document.querySelectorAll("[data-continue-reading]");

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

      // 只允许跳转到当前网站中的地址
      let targetUrl;

      try {
        targetUrl = new URL(record.url, window.location.href);

        if (targetUrl.origin !== window.location.origin) {
          return;
        }
      } catch (error) {
        return;
      }

      button.href = targetUrl.href;
      button.hidden = false;

      const chapterElement =
        button.querySelector("[data-continue-title]");

      const workElement =
        button.querySelector("[data-continue-work]");

      if (chapterElement) {
        chapterElement.textContent = record.chapterTitle;
      }

      if (workElement) {
        workElement.textContent = record.workTitle;
      }

      const panel = button.closest(".continue-reading-panel");

      if (panel) {
        const emptyMessage =
          panel.querySelector("[data-no-reading]");

        if (emptyMessage) {
          emptyMessage.hidden = true;
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    recordCurrentChapter();
    showContinueReadingButtons();
  });
})();
