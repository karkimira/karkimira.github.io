(function () {
  "use strict";

  function initializeSidebar() {
    const sidebar = document.querySelector(
      "[data-reader-sidebar]"
    );

    if (!sidebar) {
      return;
    }

    const catalogUrl = sidebar.dataset.catalogUrl;
    const content = sidebar.querySelector(
      "[data-sidebar-content]"
    );

    const toggleButton = document.querySelector(
      "[data-sidebar-toggle]"
    );

    const closeButton = document.querySelector(
      "[data-sidebar-close]"
    );

    const overlay = document.querySelector(
      "[data-sidebar-overlay]"
    );

    function openSidebar() {
      document.body.classList.add("sidebar-open");

      if (toggleButton) {
        toggleButton.setAttribute(
          "aria-expanded",
          "true"
        );
      }

      if (overlay) {
        overlay.setAttribute(
          "aria-hidden",
          "false"
        );
      }
    }

    function closeSidebar() {
      document.body.classList.remove("sidebar-open");

      if (toggleButton) {
        toggleButton.setAttribute(
          "aria-expanded",
          "false"
        );
      }

      if (overlay) {
        overlay.setAttribute(
          "aria-hidden",
          "true"
        );
      }
    }

    if (toggleButton) {
      toggleButton.addEventListener(
        "click",
        openSidebar
      );
    }

    if (closeButton) {
      closeButton.addEventListener(
        "click",
        closeSidebar
      );
    }

    if (overlay) {
      overlay.addEventListener(
        "click",
        closeSidebar
      );
    }

    document.addEventListener(
      "keydown",
      function (event) {
        if (event.key === "Escape") {
          closeSidebar();
        }
      }
    );

    if (!catalogUrl || !content) {
      return;
    }

    loadCatalog(catalogUrl, content, closeSidebar);
  }

  function normalizePath(url) {
    try {
      const parsedUrl = new URL(
        url,
        window.location.href
      );

      return parsedUrl.pathname
        .replace(/\/index\.html$/i, "")
        .replace(/\/+$/, "");
    } catch (error) {
      return "";
    }
  }

  function isChapterUrl(url, link) {
    /*
     * 如果以后给章节链接添加了 data-chapter-link，
     * 脚本也能够直接识别。
     */
    if (link.hasAttribute("data-chapter-link")) {
      return true;
    }

    /*
     * 自动识别以下形式：
     *
     * chapter-001/
     * chapter-002/
     * chapter-extra/
     */
    return /\/chapter-[^/]+(?:\/index\.html|\/)?$/i
      .test(url.pathname);
  }

  function cleanText(element) {
    return element.textContent
      .replace(/\s+/g, " ")
      .trim();
  }

  async function loadCatalog(
    catalogUrl,
    content,
    closeSidebar
  ) {
    try {
      const fullCatalogUrl = new URL(
        catalogUrl,
        window.location.href
      );

      if (
        fullCatalogUrl.origin !==
        window.location.origin
      ) {
        throw new Error("目录不属于当前网站");
      }

      const response = await fetch(
        fullCatalogUrl.href,
        {
          credentials: "same-origin"
        }
      );

      if (!response.ok) {
        throw new Error(
          `无法读取目录：HTTP ${response.status}`
        );
      }

      const html = await response.text();
      const parser = new DOMParser();

      const catalogDocument = parser.parseFromString(
        html,
        "text/html"
      );

      const catalogContent =
        catalogDocument.querySelector(".main-content") ||
        catalogDocument.body;

      const rootPath = fullCatalogUrl.pathname.endsWith("/")
        ? fullCatalogUrl.pathname
        : `${fullCatalogUrl.pathname}/`;

      const chapters = [];
      const knownUrls = new Set();

      let currentSection = "章节";

      /*
       * 按照目录页面中的顺序读取二级标题和链接。
       * 二级标题通常就是“第一卷”“第二卷”等。
       */
      const elements = catalogContent.querySelectorAll(
        "h2, a[href]"
      );

      elements.forEach(function (element) {
        if (element.tagName === "H2") {
          const heading = cleanText(element);

          if (heading) {
            currentSection = heading;
          }

          return;
        }

        const rawHref = element.getAttribute("href");

        if (
          !rawHref ||
          rawHref.startsWith("#") ||
          rawHref.startsWith("mailto:") ||
          rawHref.startsWith("javascript:")
        ) {
          return;
        }

        let chapterUrl;

        try {
          chapterUrl = new URL(
            rawHref,
            fullCatalogUrl.href
          );
        } catch (error) {
          return;
        }

        if (
          chapterUrl.origin !==
          window.location.origin
        ) {
          return;
        }

        if (
          !chapterUrl.pathname.startsWith(rootPath)
        ) {
          return;
        }

        if (!isChapterUrl(chapterUrl, element)) {
          return;
        }

        chapterUrl.hash = "";
        chapterUrl.search = "";

        const normalizedUrl = normalizePath(
          chapterUrl.href
        );

        if (knownUrls.has(normalizedUrl)) {
          return;
        }

        const title = cleanText(element);

        if (!title) {
          return;
        }

        knownUrls.add(normalizedUrl);

        chapters.push({
          title: title,
          url: chapterUrl.href,
          normalizedUrl: normalizedUrl,
          section: currentSection
        });
      });

      renderCatalog(
        chapters,
        content,
        closeSidebar
      );
    } catch (error) {
      console.warn(
        "无法加载阅读侧边栏：",
        error
      );

      content.textContent = "";

      const message = document.createElement("p");

      message.className = "reader-sidebar-status";
      message.textContent = "章节目录暂时无法加载。";

      content.appendChild(message);
    }
  }

  function renderCatalog(
    chapters,
    content,
    closeSidebar
  ) {
    content.textContent = "";

    if (chapters.length === 0) {
      const message = document.createElement("p");

      message.className = "reader-sidebar-status";
      message.textContent =
        "没有在本书目录中找到章节链接。";

      content.appendChild(message);
      return;
    }

    const currentPath = normalizePath(
      window.location.href
    );

    let previousSection = "";
    let currentList = null;
    let currentLink = null;

    chapters.forEach(function (chapter) {
      if (chapter.section !== previousSection) {
        const heading = document.createElement("p");

        heading.className =
          "reader-sidebar-section";

        heading.textContent = chapter.section;

        content.appendChild(heading);

        currentList = document.createElement("ol");
        currentList.className =
          "reader-sidebar-list";

        content.appendChild(currentList);

        previousSection = chapter.section;
      }

      const item = document.createElement("li");
      const link = document.createElement("a");

      link.href = chapter.url;
      link.textContent = chapter.title;
      link.className = "reader-sidebar-link";

      if (chapter.normalizedUrl === currentPath) {
        link.classList.add("is-current");
        link.setAttribute("aria-current", "page");
        currentLink = link;
      }

      link.addEventListener(
        "click",
        function () {
          closeSidebar();
        }
      );

      item.appendChild(link);
      currentList.appendChild(item);
    });

    /*
     * 目录加载后，让当前章节出现在侧边栏可视区域中。
     */
    if (currentLink) {
      window.setTimeout(function () {
        currentLink.scrollIntoView({
          block: "center"
        });
      }, 100);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeSidebar
    );
  } else {
    initializeSidebar();
  }
})();
