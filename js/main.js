/* =========================================================
   视频作品集 · 交互逻辑
   分类筛选 / 搜索 / 懒加载 / 悬停预览 / 弹窗播放
   ========================================================= */

const state = { category: "全部", query: "" };

const gridEl = document.getElementById("grid");
const filtersEl = document.getElementById("filters");
const emptyEl = document.getElementById("empty");
const emptyResetEl = document.getElementById("empty-reset");
const searchEl = document.getElementById("search");
const resultCountEl = document.getElementById("result-count");

const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalClose = document.getElementById("modal-close");
const modalVideo = document.getElementById("modal-video");
const modalTag = document.getElementById("modal-tag");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");

/* ---------- 工具 ---------- */

function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getFiltered() {
  const q = state.query.trim().toLowerCase();
  return VIDEOS.filter((v) => {
    const inCategory = state.category === "全部" || v.category === state.category;
    const inQuery = !q || `${v.title} ${v.category} ${v.description || ""}`.toLowerCase().includes(q);
    return inCategory && inQuery;
  });
}

/* ---------- 渲染 ---------- */

function renderFilters() {
  const cats = ["全部", ...new Set(VIDEOS.map((v) => v.category))];
  filtersEl.innerHTML = cats
    .map(
      (c) =>
        `<button class="chip${c === state.category ? " active" : ""}" data-cat="${c}">${c}</button>`
    )
    .join("");
}

function cardHTML(v, i) {
  return `
    <article class="card" data-id="${v.id}" style="animation-delay:${i * 60}ms">
      <div class="thumb">
        <video muted loop playsinline preload="none" data-src="${v.src}#t=0.1"></video>
        <div class="play-badge">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>
        </div>
        <span class="duration" hidden></span>
      </div>
      <div class="card-body">
        <span class="tag">${v.category}</span>
        <h3>${v.title}</h3>
        <p>${v.description || ""}</p>
      </div>
    </article>`;
}

function renderGrid() {
  const list = getFiltered();
  resultCountEl.textContent = `${list.length} 个视频`;
  emptyEl.hidden = list.length > 0;
  gridEl.innerHTML = list.map(cardHTML).join("");

  // 直接加载视频元数据（首帧即封面；Range 请求开销很小）
  gridEl.querySelectorAll(".thumb video").forEach((vid) => {
    vid.preload = "metadata";
    vid.src = vid.dataset.src;
    vid.addEventListener("loadedmetadata", () => {
      const badge = vid.closest(".thumb").querySelector(".duration");
      const text = formatDuration(vid.duration);
      if (badge && text) {
        badge.textContent = text;
        badge.hidden = false;
      }
    });
  });
}

/* ---------- 悬停预览 ---------- */

function preview(card, on) {
  const vid = card.querySelector(".thumb video");
  if (!vid) return;
  if (on) {
    if (vid.readyState === 0) vid.preload = "auto";
    if (vid.readyState >= 2) vid.play().catch(() => {});
  } else {
    vid.pause();
    if (vid.readyState >= 1) {
      try { vid.currentTime = 0; } catch (e) { /* 忽略 */ }
    }
  }
}

gridEl.addEventListener("mouseover", (e) => {
  const card = e.target.closest(".card");
  if (card) preview(card, true);
});

gridEl.addEventListener("mouseout", (e) => {
  const card = e.target.closest(".card");
  if (card && !card.contains(e.relatedTarget)) preview(card, false);
});

/* ---------- 打开 / 关闭弹窗 ---------- */

function openModal(id) {
  const v = VIDEOS.find((item) => item.id === id);
  if (!v) return;
  modalVideo.src = v.src;
  modalTag.textContent = v.category;
  modalTitle.textContent = v.title;
  modalDesc.textContent = v.description || "";
  modal.hidden = false;
  document.body.classList.add("modal-open");
  // 用户点击后通常允许有声播放；若被自动播放策略拦截则静音起播
  modalVideo.play().catch(() => {
    modalVideo.muted = true;
    return modalVideo.play();
  }).catch(() => {});
}

function closeModal() {
  modalVideo.pause();
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

gridEl.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) openModal(card.dataset.id);
});

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeModal();
});

/* ---------- 筛选与搜索 ---------- */

filtersEl.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state.category = chip.dataset.cat;
  renderFilters();
  renderGrid();
});

searchEl.addEventListener("input", () => {
  state.query = searchEl.value;
  renderGrid();
});

emptyResetEl.addEventListener("click", () => {
  state.category = "全部";
  state.query = "";
  searchEl.value = "";
  renderFilters();
  renderGrid();
});

/* ---------- 初始化 ---------- */

renderFilters();
renderGrid();
