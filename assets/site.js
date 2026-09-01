(() => {
  const appPage = document.querySelector("[data-app-page]");
  const tabLinks = Array.from(document.querySelectorAll(".app-tabs [data-tab-link]"));
  const sectionLinks = Array.from(document.querySelectorAll("[data-section-link]"));
  const panels = Array.from(document.querySelectorAll("[data-tab-panel]"));

  const safeStoreURL = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "apps.apple.com" ? url.href : null;
    } catch {
      return null;
    }
  };

  const formatCheckedAt = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Noch nicht ausgeführt"
      : new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(date);
  };

  const applyStoreStatus = (slug, entry) => {
    const published = entry?.status === "published";
    const unavailable = entry?.status === "unknown";

    document.querySelectorAll(`[data-store-status="${slug}"]`).forEach((node) => {
      const submissionStatus = node.dataset.submissionStatus;
      const label = published
        ? "Im App Store"
        : submissionStatus === "submitted"
          ? "Bei Apple eingereicht"
          : submissionStatus === "prepared"
            ? "Für die Einreichung vorbereitet"
            : unavailable
              ? "Status nicht verfügbar"
              : "Noch nicht veröffentlicht";
      const statusClass = published
        ? "is-published"
        : submissionStatus === "submitted"
          ? "is-submitted"
          : submissionStatus === "prepared"
            ? "is-prepared"
            : unavailable
              ? "is-unknown"
              : "is-unpublished";
      node.textContent = label;
      node.classList.remove("is-published", "is-submitted", "is-prepared", "is-unpublished", "is-unknown");
      node.classList.add(statusClass);
    });

    document.querySelectorAll(`[data-store-checked="${slug}"]`).forEach((node) => {
      node.textContent = entry?.reason === "placeholder_bundle_id"
        ? "Endgültige Bundle-ID fehlt"
        : formatCheckedAt(entry?.checkedAt);
    });

    document.querySelectorAll(`[data-store-detail="${slug}"]`).forEach((node) => {
      node.textContent = entry?.reason === "placeholder_bundle_id"
        ? "Der automatische Abgleich startet, sobald die endgültige Bundle-ID in der Website-Konfiguration hinterlegt ist."
        : published
        ? `${entry.trackName || "Die App"} ist im öffentlichen Apple-Katalog auffindbar${entry.version ? ` (Version ${entry.version})` : ""}.`
        : document.querySelector(`[data-store-status="${slug}"]`)?.dataset.submissionStatus === "submitted"
          ? "Die App wurde bei Apple eingereicht; der öffentliche Store-Eintrag ist noch nicht bestätigt."
        : document.querySelector(`[data-store-status="${slug}"]`)?.dataset.submissionStatus === "prepared"
          ? "App-Store-Connect-Datensatz, Release-Build und wesentliche Einreichungsangaben wurden als vorbereitet verifiziert."
        : unavailable
          ? "Der letzte automatische Abgleich konnte nicht zuverlässig abgeschlossen werden; die bisherige Anzeige wird nicht als Veröffentlichungsnachweis verwendet."
          : "Die hinterlegte Bundle-ID wurde in den geprüften öffentlichen Apple-Storefronts nicht gefunden.";
    });

    const storeURL = published ? safeStoreURL(entry?.trackViewUrl) : null;
    document.querySelectorAll(`[data-store-link="${slug}"]`).forEach((node) => {
      node.hidden = !storeURL;
      if (storeURL) node.href = storeURL;
      else node.removeAttribute("href");
    });
  };

  const loadStoreStatuses = async () => {
    const script = document.querySelector('script[src$="assets/site.js"]');
    if (!script?.src || !document.querySelector("[data-store-status]")) return;

    try {
      const response = await fetch(new URL("../data/app-store-status.json", script.src), { cache: "no-cache" });
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload?.apps || typeof payload.apps !== "object") return;
      Object.entries(payload.apps).forEach(([slug, entry]) => applyStoreStatus(slug, entry));
    } catch {
      // The explicit unpublished fallback remains visible when the static status file is unavailable.
    }
  };

  const setCurrentURLs = () => {
    const base = window.location.href.split("#")[0];
    document.querySelectorAll("[data-current-url]").forEach((node) => {
      const target = node.dataset.currentUrl;
      node.textContent = `${base}#${target}`;
    });
  };

  const activate = (name, updateHistory = true) => {
    if (!appPage || !panels.some((panel) => panel.dataset.tabPanel === name)) return;

    tabLinks.forEach((link) => {
      const active = link.dataset.tabLink === name;
      link.classList.toggle("is-active", active);
      link.setAttribute("aria-selected", String(active));
      link.tabIndex = active ? 0 : -1;
    });

    panels.forEach((panel) => {
      const active = panel.dataset.tabPanel === name;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });

    if (updateHistory) history.replaceState(null, "", `#${name}`);
    const heading = document.querySelector(`[data-tab-panel="${name}"] h2`);
    const appName = appPage.dataset.appPage;
    document.title = name === "ueberblick"
      ? `${appName} · Support & Recht`
      : `${heading?.textContent ?? name} · ${appName}`;
  };

  tabLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      activate(link.dataset.tabLink);
      document.querySelector(".app-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    link.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = tabLinks.indexOf(link);
      const next = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabLinks.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabLinks.length) % tabLinks.length;
      tabLinks[next].focus();
      activate(tabLinks[next].dataset.tabLink);
    });
  });

  sectionLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      activate(link.dataset.sectionLink);
    });
  });

  if (appPage) {
    const requested = decodeURIComponent(window.location.hash.slice(1));
    activate(requested || "ueberblick", false);
    window.addEventListener("hashchange", () => activate(decodeURIComponent(window.location.hash.slice(1)), false));
  }

  setCurrentURLs();
  loadStoreStatuses();
})();
