(function () {
  "use strict";

  function initializeSpoilers() {
    const spoilers = document.querySelectorAll(
      ".main-content .spoiler"
    );

    spoilers.forEach(function (spoiler) {
      /*
       * 防止同一个元素被重复初始化。
       */
      if (
        spoiler.dataset.spoilerReady === "true"
      ) {
        return;
      }

      spoiler.dataset.spoilerReady = "true";

      /*
       * 让 span 和 div 可以通过键盘操作。
       */
      spoiler.setAttribute("role", "button");
      spoiler.setAttribute("tabindex", "0");

      const hiddenLabel =
        spoiler.dataset.spoilerLabel ||
        "剧透内容，点击显示";

      function setRevealed(revealed) {
        spoiler.classList.toggle(
          "is-revealed",
          revealed
        );

        spoiler.setAttribute(
          "aria-expanded",
          String(revealed)
        );

        if (revealed) {
          /*
           * 显示后让辅助工具能够读取真实内容。
           */
          spoiler.removeAttribute("aria-label");
          spoiler.setAttribute(
            "title",
            "点击隐藏剧透"
          );
        } else {
          spoiler.setAttribute(
            "aria-label",
            hiddenLabel
          );

          spoiler.setAttribute(
            "title",
            "点击显示剧透"
          );
        }
      }

      /*
       * 页面打开时默认隐藏。
       */
      setRevealed(false);

      /*
       * 鼠标或触摸操作。
       */
      spoiler.addEventListener(
        "click",
        function () {
          const willReveal =
            !spoiler.classList.contains(
              "is-revealed"
            );

          setRevealed(willReveal);

          /*
           * 再次点击隐藏时取消焦点，
           * 避免键盘轮廓继续停留。
           */
          if (!willReveal) {
            spoiler.blur();
          }
        }
      );

      /*
       * 键盘操作。
       */
      spoiler.addEventListener(
        "keydown",
        function (event) {
          if (
            event.key !== "Enter" &&
            event.key !== " "
          ) {
            return;
          }

          event.preventDefault();
          spoiler.click();
        }
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeSpoilers
    );
  } else {
    initializeSpoilers();
  }
})();
