(function () {
  "use strict";

  function initializeCharacterCards() {
    const cards = document.querySelectorAll(
      "[data-character-card]"
    );

    cards.forEach(function (card) {
      const toggleButtons = card.querySelectorAll(
        "[data-card-toggle]"
      );

      const front = card.querySelector(
        ".character-card-front"
      );

      const back = card.querySelector(
        ".character-card-back"
      );

      if (
        !front ||
        !back ||
        toggleButtons.length === 0
      ) {
        return;
      }

      function setFlipped(flipped) {
        card.classList.toggle(
          "is-flipped",
          flipped
        );

        front.setAttribute(
          "aria-hidden",
          String(flipped)
        );

        back.setAttribute(
          "aria-hidden",
          String(!flipped)
        );

        /*
         * inert 可以避免隐藏的一面仍然被键盘选中。
         */
        front.inert = flipped;
        back.inert = !flipped;

        toggleButtons.forEach(function (button) {
          button.setAttribute(
            "aria-expanded",
            String(flipped)
          );

          if (flipped) {
            button.setAttribute(
              "aria-label",
              "返回角色档案正面"
            );
          } else {
            button.setAttribute(
              "aria-label",
              "查看角色档案背面"
            );
          }
        });
      }

      toggleButtons.forEach(function (button) {
        button.addEventListener(
          "click",
          function () {
            const willFlip =
              !card.classList.contains(
                "is-flipped"
              );

            setFlipped(willFlip);
          }
        );
      });

      /*
       * 初始显示正面。
       */
      setFlipped(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeCharacterCards
    );
  } else {
    initializeCharacterCards();
  }
})();
