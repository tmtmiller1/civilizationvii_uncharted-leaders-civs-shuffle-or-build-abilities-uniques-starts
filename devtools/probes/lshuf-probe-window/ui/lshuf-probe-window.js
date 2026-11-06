// Probe 16, shell scope: a button in the Advanced Settings popup that opens our own window.
import Panel from "/core/ui/panel-support.js";
import ContextManager from "/core/ui/context-manager/context-manager.js";

const log = (globalThis.__lshufWindow = { injected: 0, opened: 0, toggled: [], errors: [] });
const TAG = "lshuf-probe-window-screen";

class ProbeWindow extends Panel {
  onAttach() {
    super.onAttach();
    log.opened++;
    this.Root.classList.add("fullscreen", "flex", "items-center", "justify-center");
    const box = document.createElement("div");
    box.className = "lshuf-probe-window__box flex flex-col p-8";
    box.style.backgroundColor = "rgba(20,24,32,0.96)";
    box.style.minWidth = "40rem";
    const title = document.createElement("div");
    title.className = "font-title text-xl mb-4";
    title.textContent = "Re-dealable Leaders (probe window)";
    const toggle = document.createElement("fxs-checkbox");
    toggle.id = "lshuf-probe-window-toggle";
    const p = GameSetup.findGameParameter("LShufP16Hidden");
    if (p && p.value && p.value.value) toggle.setAttribute("selected", "true");
    toggle.addEventListener("component-value-changed", (e) => {
      const on = !!(e.detail && e.detail.value);
      const r = GameSetup.setGameParameterValue("LShufP16Hidden", on);
      log.toggled.push({ on, r, stored: Configuration.getGame().getValue("LShufP16Hidden") });
    });
    const label = document.createElement("div");
    label.textContent = "Probe: hidden option";
    const row = document.createElement("div");
    row.className = "flex flex-row items-center";
    row.append(toggle, label);
    const close = document.createElement("fxs-button");
    close.setAttribute("caption", "Close");
    close.addEventListener("action-activate", () => ContextManager.pop(TAG));
    box.append(title, row, close);
    this.Root.appendChild(box);
  }
}
Controls.define(TAG, { createInstance: ProbeWindow, description: "Leader Shuffle probe window", initializeImmediately: true });

globalThis.__lshufOpenWindow = () => ContextManager.push(TAG, { singleton: true, createMouseGuard: true });

// Add one button at the top of the Advanced Settings popup's list, each time the popup draws it.
function inject() {
  const first = document.querySelector(".accordian-header");
  if (!first) return;
  const list = first.closest(".accordian")?.parentElement;
  if (!list || list.querySelector(".lshuf-probe-window__open")) return;
  const btn = document.createElement("fxs-button");
  btn.classList.add("lshuf-probe-window__open", "m-2");
  btn.setAttribute("caption", "Re-dealable Leaders...");
  btn.addEventListener("action-activate", () => globalThis.__lshufOpenWindow());
  list.insertBefore(btn, list.firstChild);
  log.injected++;
}
new MutationObserver(() => { try { inject(); } catch (e) { log.errors.push(String(e)); } })
  .observe(document.body, { childList: true, subtree: true });
console.warn("[lshuf-probe-window] installed");
