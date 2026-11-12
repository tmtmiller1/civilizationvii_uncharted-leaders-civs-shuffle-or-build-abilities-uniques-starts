// The game's load-screen-bootstrap.js (base-standard, 1.5.0) with one addition: the mod's loading screen prep runs
// just before the screen reads its data (CONTRACTS 8). Mod UI scripts load only after that read, so this file stands
// in for the shipped one at the same path. Everything below the prep line is the shipped file, unchanged.
import { prepareLoadScreen } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/game/lshuf-load-screen.js";
prepareLoadScreen();

import { render } from '../../../../core/vendor/solid-js/web/dist/web.js';
import { createEffect, onMount, onCleanup, createComponent, Show } from '../../../../core/vendor/solid-js/dist/solid.js';
import { IsControllerActive, IsTouchActive } from '../../../../core/ui-next/services/input.js';
import { AgeTransitionLoadScreen } from '../age-transition/age-transition-load-screen.js';
import { createLoadScreenModel, LoadCurtainClosedEvent } from './load-screen-model.js';
import { LoadScreenContext, LoadScreen } from './load-screen.js';

if (UI.isInGame() || UI.isInLoading()) {
  const model = createLoadScreenModel();
  const isSaveLoad = !Modding.getTransitionInProgress();
  const loadingCurtain = document.getElementById("loading-curtain");
  if (!isSaveLoad) {
    loadingCurtain?.classList.add("age-transition");
  }
  if (model) {
    if (!loadingCurtain) {
      console.error("Unable to render load screen - could not find loading curtain");
    } else {
      let dispose;
      const handleCurtainClosed = (event) => {
        if (event.target != loadingCurtain || !loadingCurtain.classList.contains("curtain-opened")) {
          return;
        }
        loadingCurtain.removeEventListener("animationend", handleCurtainClosed);
        dispose?.();
        dispose = void 0;
        window.dispatchEvent(new LoadCurtainClosedEvent({
          closed: true
        }));
      };
      dispose = render(() => {
        createEffect(() => {
          if (model.data || UI.getGameLoadingState() == UIGameLoadingState.GameStarted) {
            const hourglassElement = document.getElementById("load-screen-flip-book");
            hourglassElement?.remove();
          }
        });
        createEffect(() => {
          if (IsControllerActive() || IsTouchActive()) {
            UI.hideCursor();
          } else {
            UI.showCursor();
          }
        });
        onMount(() => {
          Input.setActiveContext(InputContext.Shell);
        });
        onCleanup(() => {
          loadingCurtain.removeEventListener("animationend", handleCurtainClosed);
          if (!Configuration.getGame().isHotseat) {
            Input.setActiveContext(InputContext.World);
          }
        });
        return createComponent(LoadScreenContext.Provider, {
          value: model,
          get children() {
            return createComponent(Show, {
              when: isSaveLoad,
              get fallback() {
                return createComponent(AgeTransitionLoadScreen, {});
              },
              get children() {
                return createComponent(LoadScreen, {});
              }
            });
          }
        });
      }, loadingCurtain);
      loadingCurtain.addEventListener("animationend", handleCurtainClosed);
    }
  } else {
    console.error("Unable to render load screen - model could not be created");
  }
}
