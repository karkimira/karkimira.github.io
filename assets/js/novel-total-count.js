(function () {
  "use strict";

  /**
   * 统计正文字符数：
   * 删除空格和换行，保留标点。
   */
  function countCharacters(element) {
    if (!element) {
      return null;
    }

    const copy = element.cloneNode(true);

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

  /**
   * 获取并统计一个章节。
   */
  async function countChapter(url) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "default"
    });

    if (!response.ok) {
      throw new Error(`无法访问章节：HTTP ${response.status}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const chapterDocument = parser.parseFromString(
      html,
      "text/html"
    );

    const content =
      chapterDocument.querySelector(".chapter-content");

    if (!content) {
      throw new Error("没有找到章节正文");
    }

    return countCharacters(content);
  }

  /**
   * 找到目录页中属于当前作品的章节链接。
   */
  function findChapterUrls(bookRoot) {
    let rootUrl;

    try {
      rootUrl = new URL(bookRoot, window.location.href);
    } catch (error) {
      return [];
    }

    const chapterPattern =
      /\/chapter-[^/]+(?:\/index\.html|\/)?$/;

    const urls = Array.from(
      document.querySelectorAll("a[href]")
    )
      .map(function (link) {
        try {
          return new URL(link.href, window.location.href);
        } catch (error) {
          return null;
        }
      })
      .filter(function (url) {
        if (!url) {
          return false;
        }

        return (
          url.origin === window.location.origin &&
          url.pathname.startsWith(rootUrl.pathname) &&
          chapterPattern.test(url.pathname)
        );
      })
      .map(function (url) {
        url.hash = "";
        url.search = "";
        return url.href;
      });

    // 去掉重复链接
    return Array.from(new Set(urls));
  }

  /**
   * 限制同时读取的章节数量，避免一次发出太多请求。
   */
  async function calculateTotal(urls) {
    let nextIndex = 0;
    let total = 0;
    let successful = 0;

    async function worker() {
      while (nextIndex < urls.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        try {
          const count = await countChapter(
            urls[currentIndex]
          );

          if (count !== null) {
            total += count;
            successful += 1;
          }
        } catch (error) {
          console.warn(
            "无法统计章节：",
            urls[currentIndex],
            error
          );
        }
      }
    }

    const workerCount = Math.min(5, urls.length);

    await Promise.all(
      Array.from(
        { length: workerCount },
        function () {
          return worker();
        }
      )
    );

    return {
      total: total,
      successful: successful
    };
  }

  async function initializePanel(panel) {
    const totalElement =
      panel.querySelector("[data-total-words]");

    const detailElement =
      panel.querySelector("[data-total-detail]");

    const bookRoot = panel.dataset.bookRoot;

    if (!totalElement || !detailElement || !bookRoot) {
      return;
    }

    const chapterUrls = findChapterUrls(bookRoot);

    if (chapterUrls.length === 0) {
      totalElement.textContent = "尚无统计";
      detailElement.textContent =
        "没有在目录中找到章节链接";
      return;
    }

    totalElement.textContent = "正在统计…";
    detailElement.textContent =
      `正在读取 ${chapterUrls.length} 章`;

    const result = await calculateTotal(chapterUrls);

    if (result.successful === 0) {
      totalElement.textContent = "暂时无法统计";
      detailElement.textContent =
        "请检查章节链接和阅读页面";
      return;
    }

    totalElement.textContent =
      `约 ${result.total.toLocaleString("zh-CN")} 字`;

    if (result.successful === chapterUrls.length) {
      detailElement.textContent =
        `共 ${chapterUrls.length} 章`;
    } else {
      detailElement.textContent =
        `已统计 ${result.successful} / ${chapterUrls.length} 章`;
    }
  }

  function initialize() {
    const panels = document.querySelectorAll(
      "[data-novel-total]"
    );

    panels.forEach(function (panel) {
      initializePanel(panel);
    });
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
