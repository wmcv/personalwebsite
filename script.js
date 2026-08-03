const YEAR = document.getElementById("year");

if (YEAR) {
  YEAR.textContent = new Date().getFullYear();
}

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
