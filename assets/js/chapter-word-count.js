(function () {
  "use strict";

  const CACHE_PREFIX = "storyWiki:chapterCount:v1:";

  /**
   * 统计正文字符数。
   * 计算规则：删除空格和换行，保留标点。
   */
  function countCharacters(element) {
    if (!element) {
      return null;
    }

    const copy = element.cloneNode(true);

    // 删除不应计入正文的内容
    copy
      .querySelectorAll("script, style, [data-no-count]")
      .forEach(function (item) {
        item.remove();
      });

    const text = copy.textContent
      .normalize("NFKC")
      .replace(/\s+/g, "");

    return Array.from(text).length;
  }

  function formatCount(count) {
    return `约 ${count.toLocaleString("zh-CN")} 字`;
  }

  function getCacheKey(url) {
    return CACHE_PREFIX + url;
  }

  function readCache(url) {
    try {
      const value = sessionStorage.getItem(getCacheKey(url));

      if (!value) {
        return null;
      }

      const count = Number(value);

      return Number.isFinite(count) ? count : null;
    } catch (error) {
      return null;
    }
  }

  function saveCache(url, count) {
    try {
      sessionStorage.setItem(getCacheKey(url), String(count));
    } catch (error) {
      // 浏览器不允许使用缓存时，忽略即可
    }
  }

  /**
   * 统计当前打开章节的字数。
   */
  function countCurrentChapter() {
    const target = document.querySelector(
      "[data-current-chapter-count]"
    );

    const content = document.querySelector(".chapter-content");

    if (!target || !content) {
      return;
    }

    const count = countCharacters(content);

    if (count === null) {
      target.textContent = "字数暂不可用";
      return;
    }

    target.textContent = formatCount(count);
    saveCache(window.location.href.split("#")[0], count);
  }

  /**
   * 为目录中的章节链接创建字数显示位置。
   */
  function createCountLabel(link) {
    const nextElement = link.nextElementSibling;

    if (
      nextElement &&
      nextElement.hasAttribute("data-chapter-count")
    ) {
      return nextElement;
    }

    const label = document.createElement("small");

    label.className = "chapter-word-count";
    label.setAttribute("data-chapter-count", "");
    label.textContent = "正在统计…";

    link.insertAdjacentElement("afterend", label);

    return label;
  }

  /**
   * 获取单个章节页面并统计字数。
   */
  async function countCatalogChapter(link) {
    const label = createCountLabel(link);

    let chapterUrl;

    try {
      chapterUrl = new URL(link.href, window.location.href);

      // 只允许读取当前网站中的章节
      if (chapterUrl.origin !== window.location.origin) {
        label.textContent = "字数不可用";
        return;
      }

      chapterUrl.hash = "";
    } catch (error) {
      label.textContent = "字数不可用";
      return;
    }

    const cachedCount = readCache(chapterUrl.href);

    if (cachedCount !== null) {
      label.textContent = formatCount(cachedCount);
      return;
    }

    try {
      const response = await fetch(chapterUrl.href, {
        credentials: "same-origin"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const chapterDocument = parser.parseFromString(
        html,
        "text/html"
      );

      const content =
        chapterDocument.querySelector(".chapter-content");

      const count = countCharacters(content);

      if (count === null) {
        throw new Error("未找到章节正文");
      }

      label.textContent = formatCount(count);
      saveCache(chapterUrl.href, count);
    } catch (error) {
      console.warn("无法统计章节字数：", error);
      label.textContent = "字数暂不可用";
    }
  }

  /**
   * 统计目录中标记过的章节。
   * 只读取靠近当前屏幕的章节，减少网络请求。
   */
  function initializeCatalogCounts() {
    const links = Array.from(
      document.querySelectorAll("a[data-chapter-link]")
    );

    if (links.length === 0) {
      return;
    }

    links.forEach(createCountLabel);

    if (!("IntersectionObserver" in window)) {
      links.forEach(countCatalogChapter);
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          observer.unobserve(entry.target);
          countCatalogChapter(entry.target);
        });
      },
      {
        rootMargin: "300px 0px"
      }
    );

    links.forEach(function (link) {
      observer.observe(link);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    countCurrentChapter();
    initializeCatalogCounts();
  });
})();
