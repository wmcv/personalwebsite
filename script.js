const YEAR = document.getElementById("year");

if (YEAR) {
  YEAR.textContent = new Date().getFullYear();
}


const THEME_STORAGE_KEY = "wmcv-theme";

const getStoredTheme = () => {
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    return theme === "light" || theme === "dark" ? theme : "dark";
  } catch {
    return "dark";
  }
};

const setSiteTheme = (theme) => {
  document.documentElement.dataset.theme = theme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Persistence is optional; the theme still updates for this page load.
  }

  window.dispatchEvent(new Event("resize"));
};

const toggleSiteTheme = () => {
  const nextTheme =
    document.documentElement.dataset.theme === "light" ? "dark" : "light";

  setSiteTheme(nextTheme);
};

window.toggleSiteTheme = toggleSiteTheme;
setSiteTheme(getStoredTheme());

const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
};

const initCommandPalette = () => {
  const getHref = (selector, fallback) =>
    document.querySelector(selector)?.getAttribute("href") || fallback;
  const commands = [
    {
      label: "About",
      keywords: "home william mcvicar",
      run: () => {
        window.location.href = getHref(".topbar nav a[href='/']", "/");
      },
    },
    {
      label: "Projects",
      keywords: "work portfolio builds",
      run: () => {
        window.location.href = getHref(".topbar nav a[href='/projects/']", "/projects/");
      },
    },
    {
      label: "Blog",
      keywords: "writing posts articles",
      run: () => {
        window.location.href = getHref(".topbar nav a[href='/blog/']", "/blog/");
      },
    },
    {
      label: "GitHub",
      keywords: "code repos wmcv",
      run: () => {
        window.open(
          getHref("a[href='https://github.com/wmcv']", "https://github.com/wmcv"),
          "_blank",
          "noopener,noreferrer",
        );
      },
    },
    {
      label: "X / Twitter",
      keywords: "x twitter social wmcvicar",
      run: () => {
        window.open(
          getHref("a[href='https://x.com/wmcvicar_']", "https://x.com/wmcvicar_"),
          "_blank",
          "noopener,noreferrer",
        );
      },
    },
    {
      label: "LinkedIn",
      keywords: "profile work resume",
      run: () => {
        window.open(
          getHref(
            "a[href='https://www.linkedin.com/in/william-mcvicar-0531a7324/']",
            "https://www.linkedin.com/in/william-mcvicar-0531a7324/",
          ),
          "_blank",
          "noopener,noreferrer",
        );
      },
    },
    {
      label: "Email",
      keywords: "contact mail",
      run: () => {
        window.location.href = getHref(
          "a[href='mailto:wmcvicar@uwaterloo.ca']",
          "mailto:wmcvicar@uwaterloo.ca",
        );
      },
    },
    {
      label: "Toggle theme",
      keywords: "light dark mode appearance",
      run: () => window.toggleSiteTheme(),
    },
  ];

  let filteredCommands = [...commands];
  let selectedIndex = 0;
  let previousFocus = null;

  const palette = document.createElement("div");
  palette.className = "command-palette";
  palette.hidden = true;
  palette.setAttribute("role", "dialog");
  palette.setAttribute("aria-modal", "true");
  palette.setAttribute("aria-label", "Command palette");
  palette.innerHTML = `
    <div class="command-panel" role="document">
      <div class="command-input-wrap">
        <input
          class="command-input"
          type="text"
          aria-label="Search commands"
          aria-controls="command-list"
          aria-activedescendant="command-option-0"
          autocomplete="off"
          spellcheck="false"
          placeholder="type a command..."
        />
        <span class="command-shortcut" aria-hidden="true">⌘K</span>
      </div>
      <div class="command-list" id="command-list" role="listbox" aria-label="Commands"></div>
    </div>
  `;
  document.body.appendChild(palette);

  const input = palette.querySelector(".command-input");
  const list = palette.querySelector(".command-list");

  const commandMatches = (command, query) => {
    if (!query) return true;

    const haystack = `${command.label} ${command.keywords}`.toLowerCase();
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((part) => haystack.includes(part));
  };

  const renderCommands = () => {
    list.innerHTML = "";

    if (!filteredCommands.length) {
      const empty = document.createElement("div");
      empty.className = "command-empty";
      empty.textContent = "no commands";
      list.appendChild(empty);
      input.removeAttribute("aria-activedescendant");
      return;
    }

    filteredCommands.forEach((command, index) => {
      const option = document.createElement("button");
      option.className = "command-option";
      option.type = "button";
      option.id = `command-option-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === selectedIndex));
      option.textContent = command.label;
      option.addEventListener("mouseenter", () => {
        selectedIndex = index;
        renderCommands();
      });
      option.addEventListener("click", () => activateSelectedCommand(index));
      list.appendChild(option);
    });

    input.setAttribute("aria-activedescendant", `command-option-${selectedIndex}`);
  };

  const filterCommands = () => {
    filteredCommands = commands.filter((command) =>
      commandMatches(command, input.value.trim()),
    );
    selectedIndex = Math.min(selectedIndex, Math.max(filteredCommands.length - 1, 0));
    renderCommands();
  };

  const openPalette = () => {
    if (!palette.hidden) return;

    previousFocus = document.activeElement;
    input.value = "";
    filteredCommands = [...commands];
    selectedIndex = 0;
    renderCommands();
    palette.hidden = false;
    document.body.classList.add("command-palette-open");
    window.requestAnimationFrame(() => input.focus());
  };

  const closePalette = () => {
    if (palette.hidden) return;

    palette.hidden = true;
    document.body.classList.remove("command-palette-open");

    if (previousFocus instanceof HTMLElement) {
      previousFocus.focus({ preventScroll: true });
    }
  };

  const activateSelectedCommand = (index = selectedIndex) => {
    const command = filteredCommands[index];
    if (!command) return;

    closePalette();
    command.run();
  };

  input.addEventListener("input", filterCommands);

  palette.addEventListener("mousedown", (event) => {
    if (event.target === palette) closePalette();
  });

  palette.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filteredCommands.length) {
        selectedIndex = (selectedIndex + 1) % filteredCommands.length;
        renderCommands();
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filteredCommands.length) {
        selectedIndex =
          (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
        renderCommands();
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      activateSelectedCommand();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      input.focus();
    }
  });

  document.addEventListener("keydown", (event) => {
    const commandShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
    const slashShortcut = event.key === "/" && !isEditableTarget(event.target);

    if (!commandShortcut && !slashShortcut) return;
    if (commandShortcut && isEditableTarget(event.target)) return;

    event.preventDefault();
    openPalette();
  });
};

initCommandPalette();

const slugCounts = new Map();

const slugify = (text) => {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const slug = base || "section";
  const count = slugCounts.get(slug) || 0;

  slugCounts.set(slug, count + 1);

  return count ? `${slug}-${count + 1}` : slug;
};

const buildTableOfContents = () => {
  const article = document.querySelector(".article");
  const toc = document.getElementById("table-of-contents");

  if (!article || !toc) return;

  const headings = [...article.querySelectorAll("h2, h3")];

  if (!headings.length) {
    const tocWrapper = toc.closest(".toc");
    if (tocWrapper) tocWrapper.hidden = true;
    return;
  }

  headings.forEach((heading) => {
    if (!heading.id) {
      heading.id = slugify(heading.textContent || "");
    }

    const link = document.createElement("a");
    link.className = "toc-link";
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;
    link.dataset.level = heading.tagName === "H3" ? "3" : "2";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", `#${heading.id}`);
    });

    toc.appendChild(link);
  });

  const links = [...toc.querySelectorAll(".toc-link")];
  const activate = (id) => {
    links.forEach((link) => {
      link.classList.toggle("is-active", link.hash === `#${id}`);
    });
  };

  activate(headings[0].id);

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible[0]) {
        activate(visible[0].target.id);
      }
    },
    {
      rootMargin: "-100px 0px -65% 0px",
      threshold: 0,
    },
  );

  headings.forEach((heading) => observer.observe(heading));
};

buildTableOfContents();
