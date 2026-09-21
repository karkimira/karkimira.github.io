(function () {
  "use strict";

  /*
   * 用于保存电脑端侧边栏的状态。
   *
   * true：侧边栏已收起
   * false：侧边栏已展开
   */
  const SIDEBAR_PREFERENCE_KEY =
    "storyWiki:desktopSidebarCollapsed:v1";

  /*
   * 电脑端与手机端的分界点。
   * 需要与 CSS 中的 900px 保持一致。
   */
  const desktopMedia = window.matchMedia(
    "(min-width: 901px)"
  );

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

    /*
     * 读取电脑端保存的目录状态。
     */
    function loadDesktopPreference() {
      try {
        return (
          localStorage.getItem(
            SIDEBAR_PREFERENCE_KEY
          ) === "true"
        );
      } catch (error) {
        return false;
      }
    }

    /*
     * 保存电脑端目录状态。
     */
    function saveDesktopPreference(isCollapsed) {
      try {
        localStorage.setItem(
          SIDEBAR_PREFERENCE_KEY,
          String(isCollapsed)
        );
      } catch (error) {
        /*
         * 如果浏览器禁止 localStorage，
         * 目录仍然可以使用，只是不记忆状态。
         */
      }
    }

    /*
     * 判断当前侧边栏是否展开。
     */
    function isSidebarExpanded() {
      if (desktopMedia.matches) {
        return !document.body.classList.contains(
          "sidebar-collapsed"
        );
      }

      return document.body.classList.contains(
        "sidebar-open"
      );
    }

    /*
     * 根据当前状态更新按钮文字和无障碍属性。
     */
    function updateSidebarState() {
      const isDesktop = desktopMedia.matches;
      const isExpanded = isSidebarExpanded();

      if (toggleButton) {
        toggleButton.setAttribute(
          "aria-expanded",
          String(isExpanded)
        );

        if (isDesktop) {
          toggleButton.textContent = isExpanded
            ? "收起目录"
            : "章节目录";
        } else {
          toggleButton.textContent = isExpanded
            ? "关闭目录"
            : "章节目录";
        }
      }

      if (closeButton) {
        closeButton.textContent = isDesktop
          ? "收起"
          : "关闭";
      }

      if (overlay) {
        overlay.setAttribute(
          "aria-hidden",
          String(isDesktop || !isExpanded)
        );
      }
    }

    /*
     * 展开侧边栏。
     */
    function openSidebar() {
      if (desktopMedia.matches) {
        document.body.classList.remove(
          "sidebar-collapsed"
        );

        saveDesktopPreference(false);
      } else {
        document.body.classList.add(
          "sidebar-open"
        );
      }

      updateSidebarState();
    }

    /*
     * 关闭或收起侧边栏。
     */
    function closeSidebar() {
      if (desktopMedia.matches) {
        document.body.classList.add(
          "sidebar-collapsed"
        );

        saveDesktopPreference(true);
      } else {
        document.body.classList.remove(
          "sidebar-open"
        );
      }

      updateSidebarState();
    }

    /*
     * 在展开和收起之间切换。
     */
    function toggleSidebar() {
      if (isSidebarExpanded()) {
        closeSidebar();
      } else {
        openSidebar();
      }
    }

    /*
     * 进入页面时恢复电脑端上次选择的状态。
     */
    function restoreInitialState() {
      /*
       * 清理可能残留的手机端状态。
       */
      document.body.classList.remove(
        "sidebar-open"
      );

      if (desktopMedia.matches) {
        document.body.classList.toggle(
          "sidebar-collapsed",
          loadDesktopPreference()
        );
      } else {
        document.body.classList.remove(
          "sidebar-collapsed"
        );
      }

      updateSidebarState();
    }

    /*
     * 顶部“章节目录／收起目录”按钮。
     */
    if (toggleButton) {
      toggleButton.addEventListener(
        "click",
        toggleSidebar
      );
    }

    /*
     * 侧边栏顶部的“关闭／收起”按钮。
     */
    if (closeButton) {
      closeButton.addEventListener(
        "click",
        closeSidebar
      );
    }

    /*
     * 手机端点击遮罩关闭目录。
     */
    if (overlay) {
      overlay.addEventListener(
        "click",
        closeSidebar
      );
    }

    /*
     * 按 Esc 关闭或收起目录。
     */
    document.addEventListener(
      "keydown",
      function (event) {
        if (
          event.key === "Escape" &&
          isSidebarExpanded()
        ) {
          closeSidebar();

          if (toggleButton) {
            toggleButton.focus();
          }
        }
      }
    );

    /*
     * 在电脑与手机布局之间切换时，
     * 清除不属于当前布局的状态。
     */
    function handleScreenChange(event) {
      document.body.classList.remove(
        "sidebar-open"
      );

      if (event.matches) {
        document.body.classList.toggle(
          "sidebar-collapsed",
          loadDesktopPreference()
        );
      } else {
        document.body.classList.remove(
          "sidebar-collapsed"
        );
      }

      updateSidebarState();
    }

    /*
     * 兼容不同版本的浏览器。
     */
    if (
      typeof desktopMedia.addEventListener ===
      "function"
    ) {
      desktopMedia.addEventListener(
        "change",
        handleScreenChange
      );
    } else if (
      typeof desktopMedia.addListener === "function"
    ) {
      desktopMedia.addListener(
        handleScreenChange
      );
    }

    restoreInitialState();

    if (!catalogUrl || !content) {
      return;
    }

    /*
     * 手机上点击章节后关闭抽屉。
     * 电脑端点击章节时保持当前展开状态。
     */
    function handleChapterClick() {
      if (!desktopMedia.matches) {
        closeSidebar();
      }
    }

    loadCatalog(
      catalogUrl,
      content,
      handleChapterClick
    );
  }

  /*
   * 将不同形式的网址整理成统一路径，
   * 用于判断当前章节。
   */
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

  /*
   * 判断某个链接是否为章节链接。
   */
  function isChapterUrl(url, link) {
    /*
     * 如果链接手动标记了 data-chapter-link，
     * 就直接视为章节链接。
     */
    if (link.hasAttribute("data-chapter-link")) {
      return true;
    }

    /*
     * 自动识别以下路径：
     *
     * chapter-001/
     * chapter-002/
     * chapter-extra/
     * chapter-001/index.html
     */
    return /\/chapter-[^/]+(?:\/index\.html|\/)?$/i.test(
      url.pathname
    );
  }

  /*
   * 清理标题中的多余空格和换行。
   */
  function cleanText(element) {
    return element.textContent
      .replace(/\s+/g, " ")
      .trim();
  }

  /*
   * 读取作品目录页面。
   */
  async function loadCatalog(
    catalogUrl,
    content,
    handleChapterClick
  ) {
    try {
      const fullCatalogUrl = new URL(
        catalogUrl,
        window.location.href
      );

      /*
       * 只允许读取当前网站内的目录。
       */
      if (
        fullCatalogUrl.origin !==
        window.location.origin
      ) {
        throw new Error(
          "目录不属于当前网站"
        );
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

      const catalogDocument =
        parser.parseFromString(
          html,
          "text/html"
        );

      /*
       * Cayman 主题的正文通常位于 .main-content。
       * 如果找不到，就读取整个页面主体。
       */
      const catalogContent =
        catalogDocument.querySelector(
          ".main-content"
        ) || catalogDocument.body;

      const rootPath =
        fullCatalogUrl.pathname.endsWith("/")
          ? fullCatalogUrl.pathname
          : `${fullCatalogUrl.pathname}/`;

      const chapters = [];
      const knownUrls = new Set();

      let currentSection = "章节";

      /*
       * 按目录页面原有顺序读取：
       *
       * h2       → 分卷标题
       * a[href]  → 章节链接
       */
      const elements =
        catalogContent.querySelectorAll(
          "h2, a[href]"
        );

      elements.forEach(function (element) {
        /*
         * 二级标题作为分卷标题。
         */
        if (element.tagName === "H2") {
          const heading = cleanText(element);

          if (heading) {
            currentSection = heading;
          }

          return;
        }

        const rawHref =
          element.getAttribute("href");

        /*
         * 忽略无效链接、页内锚点和脚本链接。
         */
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

        /*
         * 只允许当前网站中的链接。
         */
        if (
          chapterUrl.origin !==
          window.location.origin
        ) {
          return;
        }

        /*
         * 只读取当前作品目录下面的章节。
         */
        if (
          !chapterUrl.pathname.startsWith(
            rootPath
          )
        ) {
          return;
        }

        if (
          !isChapterUrl(
            chapterUrl,
            element
          )
        ) {
          return;
        }

        chapterUrl.hash = "";
        chapterUrl.search = "";

        const normalizedUrl = normalizePath(
          chapterUrl.href
        );

        /*
         * 避免同一个章节重复出现。
         */
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
        handleChapterClick
      );
    } catch (error) {
      console.warn(
        "无法加载阅读侧边栏：",
        error
      );

      content.textContent = "";

      const message =
        document.createElement("p");

      message.className =
        "reader-sidebar-status";

      message.textContent =
        "章节目录暂时无法加载。";

      content.appendChild(message);
    }
  }

  /*
   * 将读取到的章节显示在侧边栏中。
   */
  function renderCatalog(
    chapters,
    content,
    handleChapterClick
  ) {
    content.textContent = "";

    if (chapters.length === 0) {
      const message =
        document.createElement("p");

      message.className =
        "reader-sidebar-status";

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
      /*
       * 遇到新的分卷时，建立新的分组。
       */
      if (
        chapter.section !== previousSection
      ) {
        const heading =
          document.createElement("p");

        heading.className =
          "reader-sidebar-section";

        heading.textContent =
          chapter.section;

        content.appendChild(heading);

        currentList =
          document.createElement("ol");

        currentList.className =
          "reader-sidebar-list";

        content.appendChild(currentList);

        previousSection =
          chapter.section;
      }

      const item =
        document.createElement("li");

      const link =
        document.createElement("a");

      link.href = chapter.url;
      link.textContent = chapter.title;
      link.className =
        "reader-sidebar-link";

      /*
       * 高亮当前章节。
       */
      if (
        chapter.normalizedUrl ===
        currentPath
      ) {
        link.classList.add("is-current");

        link.setAttribute(
          "aria-current",
          "page"
        );

        currentLink = link;
      }

      /*
       * 手机端点击章节后关闭抽屉。
       * 电脑端保持侧边栏原来的状态。
       */
      link.addEventListener(
        "click",
        function () {
          if (
            typeof handleChapterClick ===
            "function"
          ) {
            handleChapterClick();
          }
        }
      );

      item.appendChild(link);

      if (currentList) {
        currentList.appendChild(item);
      }
    });

    /*
     * 目录加载完成后，
     * 将当前章节滚动到侧边栏中间附近。
     */
    if (currentLink) {
      window.setTimeout(function () {
        currentLink.scrollIntoView({
          block: "center",
          inline: "nearest"
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
