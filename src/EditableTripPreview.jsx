import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { MapPin, CalendarDays, UtensilsCrossed, Mountain, Candy, Route } from "lucide-react";

const COLORS = {
  bg: "#F7F6F2",
  primary: "#1F3A5F",
  textMain: "#2F2F2F",
  textSub: "#8A8F98",
};

const TYPES = ["行程", "食物", "景點", "點心"];

function safeTrim(s) {
  return (s ?? "").toString().replace(new RegExp("\\s+", "g"), " ").trim();
}

function mapsSearchUrl(q) {
  const t = safeTrim(q);
  if (!t) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/${encodeURIComponent(t)}`;
}

function openMap(urlOrEmpty, label) {
  const href = safeTrim(urlOrEmpty) || mapsSearchUrl(label);
  window.open(href, "_blank", "noopener,noreferrer");
}

function typeIcon(type) {
  switch (type) {
    case "食物":
      return UtensilsCrossed;
    case "景點":
      return Mountain;
    case "點心":
      return Candy;
    default:
      return Route;
  }
}

function nextType(t) {
  const i = TYPES.indexOf(t);
  return TYPES[(i + 1 + TYPES.length) % TYPES.length] || "行程";
}

function EditableText({ value, onChange, className, as = "div", placeholder, spellCheck = false, ...rest }) {
  const Tag = as;
  return (
    <Tag
      {...rest}
      className={
        "outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent rounded-md px-1 -mx-1 " +
        (className || "")
      }
      contentEditable
      suppressContentEditableWarning
      spellCheck={spellCheck}
      data-placeholder={placeholder}
      onInput={(e) => onChange(e.currentTarget.textContent || "")}
      onBlur={(e) => onChange(safeTrim(e.currentTarget.textContent || ""))}
      style={{ WebkitUserSelect: "text", userSelect: "text", ...(rest.style || {}) }}
    >
      {value}
    </Tag>
  );
}

function Tab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-full text-[13px] transition border " +
        (active
          ? "bg-white/40 border-white/60 text-[#7B2A26]"
          : "bg-white/15 border-white/35 text-[#525C44] hover:bg-white/25")
      }
      type="button"
    >
      {children}
    </button>
  );
}

function ItineraryTile({ item, onChangeLabel, onChangeUrl, onCycleType, onDelete, dragEnabled = false }) {
  const Icon = typeIcon(item.type);
  const controls = useDragControls();
  const holdRef = React.useRef(null);

  let bg = COLORS.primary;
  let border = null;

  if (item.type === "食物") {
    bg = "#70020F";
    border = null;
  }
  if (item.type === "景點") {
    bg = "#00311F";
    border = "#00311F";
  }
  if (item.type === "點心") {
    bg = "#CD5C5C";
    border = "#CD5C5C";
  }

  function clearHold() {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  }

  const Row = dragEnabled ? Reorder.Item : "div";

  return (
    <Row
      value={dragEnabled ? item : undefined}
      drag={dragEnabled}
      dragListener={false}
      dragControls={controls}
      dragElastic={0.12}
      whileDrag={{ scale: 1.01 }}
      className="cursor-pointer select-none"
      style={{ marginBottom: "0.5cm" }}
      title={dragEnabled ? "長按整列即可拖曳排序" : ""}
      onPointerDown={(e) => {
        if (!dragEnabled) return;
        const el = e.target;
        if (el && typeof el.closest === "function" && el.closest('[contenteditable="true"]')) return;
        clearHold();
        holdRef.current = setTimeout(() => {
          controls.start(e);
        }, 220);
      }}
      onPointerUp={() => clearHold()}
      onPointerCancel={() => clearHold()}
      onPointerLeave={() => clearHold()}
      onClick={() => openMap(item.url, item.label)}
      onMouseDownCapture={(e) => {
        const el = e.target;
        if (el && typeof el.closest === "function" && el.closest('[contenteditable="true"]')) {
          e.stopPropagation();
        }
      }}
      onClickCapture={(e) => {
        const el = e.target;
        if (el && typeof el.closest === "function" && el.closest('[contenteditable="true"]')) {
          e.stopPropagation();
        }
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{
            background: bg,
            border: border ? `1.5px solid ${border}` : "none",
            color: "#FFFFFF",
          }}
        >
          <Icon size={22} color="#FFFFFF" />
        </div>

        <div className="flex-1 min-w-0">
          <EditableText
            value={item.label}
            onChange={onChangeLabel}
            className="text-[17px] leading-6 font-medium"
            style={{ color: COLORS.textMain }}
            placeholder="輸入行程名稱"
          />

          <div className="mt-1 flex flex-col gap-1 text-[12px]" style={{ color: COLORS.textSub }}>
            {item.url ? (
              <>
                <div className="flex items-center gap-2">
                  <MapPin size={13} />
                  <span
                    className="underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMap(item.url, item.label);
                    }}
                  >
                    在地圖中開啟
                  </span>
                </div>
                <div className="text-[11px] opacity-60 truncate">
                  {item.url.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
                </div>
              </>
            ) : (
              <EditableText value={item.url} onChange={onChangeUrl} className="text-[12px] italic" placeholder="貼上 Google Maps 連結（尚未設定）" />
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex justify-between items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCycleType();
          }}
          className="text-[12px] opacity-40 hover:opacity-80"
          style={{ color: COLORS.textSub }}
        >
          切換分類
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-[12px] opacity-40 hover:opacity-80"
          style={{ color: COLORS.textSub }}
        >
          刪除
        </button>
      </div>
    </Row>
  );
}

export default function EditableTripPreview() {
  const STORAGE_KEY = "trip-preview-autosave";

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const mode = params.get("mode") || "edit";
  const isView = mode === "view";

  function b64UrlEncode(obj) {
    const json = JSON.stringify(obj);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  function b64UrlDecode(str) {
    const s = (str || "").replace(/-/g, "+").replace(/_/g, "/");
    const pad = "===".slice((s.length + 3) % 4);
    const json = decodeURIComponent(escape(atob(s + pad)));
    return JSON.parse(json);
  }
  function getSharedPayload() {
    const data = params.get("data");
    if (!data) return null;
    try {
      return b64UrlDecode(data);
    } catch (e) {
      return null;
    }
  }
  const sharedPayload = getSharedPayload();

  const [meta, setMeta] = useState(() => {
    if (sharedPayload?.meta) return sharedPayload.meta;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).meta || { title: "馬上發福陽光團", dates: "2月11日至2月13日", note: "" };
    } catch (e) {}
    return { title: "馬上發福陽光團", dates: "2月11日至2月13日", note: "" };
  });

  const [activeDay, setActiveDay] = useState(1);
  const [dayDir, setDayDir] = useState(0);
  const [activeTab, setActiveTab] = useState("全部");
  const [addType, setAddType] = useState("行程");

  const [days, setDays] = useState(() => {
    if (sharedPayload?.days) return sharedPayload.days;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).days || [];
    } catch (e) {}
    return [
      { day: 1, label: "第一天", itinerary: [] },
      { day: 2, label: "第二天", itinerary: [] },
      { day: 3, label: "第三天", itinerary: [] },
    ];
  });

  useEffect(() => {
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        itinerary: d.itinerary.map((it, i) =>
          it.id ? it : { ...it, id: `d${d.day}-${i}-${Math.random().toString(16).slice(2)}` }
        ),
      }))
    );
  }, []);

  useEffect(() => {
    if (isView) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ days, meta }));
    } catch (e) {}
  }, [days, meta, isView]);

  const dayIndex = useMemo(() => days.findIndex((d) => d.day === activeDay), [days, activeDay]);
  const len = days.length || 1;
  const leftDay = days[(dayIndex - 1 + len) % len];
  const centerDay = days[dayIndex] || days[0];
  const rightDay = days[(dayIndex + 1) % len];

  const tabs = ["全部", ...TYPES];

  const visibleItems = useMemo(() => {
    if (!centerDay) return [];
    if (activeTab === "全部") return centerDay.itinerary || [];
    return (centerDay.itinerary || []).filter((it) => it.type === activeTab);
  }, [centerDay, activeTab]);

  function updateMeta(key, v) {
    setMeta((m) => ({ ...m, [key]: safeTrim(v) }));
  }

  function updateDayLabel(day, v) {
    setDays((prev) => prev.map((d) => (d.day === day ? { ...d, label: safeTrim(v) || d.label } : d)));
  }

  function updateItem(day, idx, patch) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        const next = (d.itinerary || []).map((it, i) => (i === idx ? { ...it, ...patch } : it));
        return { ...d, itinerary: next };
      })
    );
  }

  function cycleType(day, idx) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        const next = (d.itinerary || []).map((it, i) => (i === idx ? { ...it, type: nextType(it.type) } : it));
        return { ...d, itinerary: next };
      })
    );
  }

  function addItem(day) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        return {
          ...d,
          itinerary: [
            ...(d.itinerary || []),
            { id: `d${day}-${Date.now()}-${Math.random().toString(16).slice(2)}`, type: addType, label: "（新增項目）", url: "" },
          ],
        };
      })
    );
  }

  function removeItem(day, idx) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        return { ...d, itinerary: (d.itinerary || []).filter((_, i) => i !== idx) };
      })
    );
  }

  const indexMap = useMemo(() => {
    if (!centerDay) return [];
    if (activeTab === "全部") return (centerDay.itinerary || []).map((_, i) => i);
    const map = [];
    (centerDay.itinerary || []).forEach((it, i) => {
      if (it.type === activeTab) map.push(i);
    });
    return map;
  }, [centerDay, activeTab]);

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: COLORS.bg }}>
      <div className="w-[420px] max-w-full px-4 py-8 pb-24 relative">
        <div className="text-center mb-6">
          <EditableText value={meta.title} onChange={(v) => updateMeta("title", v)} as="h1" className="text-[28px] font-semibold tracking-wide text-[#7B2A26]" placeholder="輸入主題" />
          <div className="mt-2 flex items-center justify-center gap-2 text-[#A39384]">
            <CalendarDays size={16} />
            <EditableText value={meta.dates} onChange={(v) => updateMeta("dates", v)} as="p" className="text-[14px]" placeholder="輸入日期" />
          </div>
        </div>

        <div className="mb-5">
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {tabs.map((t) => (
              <Tab key={t} active={activeTab === t} onClick={() => setActiveTab(t)}>
                {t}
              </Tab>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" custom={dayDir}>
          <motion.div
            key={(centerDay?.day || 0) + "-" + activeTab}
            custom={dayDir}
            initial={(d) => ({ opacity: 0, x: d * 18 })}
            animate={{ opacity: 1, x: 0 }}
            exit={(d) => ({ opacity: 0, x: -d * 18 })}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="rounded-[22px] border border-white/50 bg-white/28 backdrop-blur-[16px] shadow-[0_16px_44px_rgba(0,0,0,.10)] p-5"
            style={{ WebkitBackdropFilter: "blur(16px)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13px] text-[#A39384]">
                {activeTab === "全部" ? "依行程表順序（不分類）" : `分類：${activeTab}（只顯示此分類）`}
              </div>

              <div className="flex items-center gap-2">
                {!isView && (
                  <>
                    <select value={addType} onChange={(e) => setAddType(e.target.value)} className="text-[12px] rounded-xl bg-white/20 border border-white/40 px-2 py-1 text-[#525C44] outline-none">
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => addItem(centerDay.day)} className="text-[12px] rounded-xl bg-white/22 border border-white/45 px-3 py-1.5 text-[#525C44] hover:bg-white/30">
                      ＋新增
                    </button>
                  </>
                )}
              </div>
            </div>

            {visibleItems?.length ? (
              activeTab === "全部" ? (
                <Reorder.Group
                  axis="y"
                  values={centerDay.itinerary}
                  onReorder={(newOrder) =>
                    setDays((prev) => prev.map((d) => (d.day === centerDay.day ? { ...d, itinerary: newOrder } : d)))
                  }
                  className="space-y-3"
                >
                  {centerDay.itinerary.map((it, i) => (
                    <ItineraryTile
                      key={it.id}
                      item={it}
                      dragEnabled={true}
                      onChangeLabel={(v) => updateItem(centerDay.day, i, { label: v })}
                      onChangeUrl={(v) => updateItem(centerDay.day, i, { url: v })}
                      onCycleType={() => cycleType(centerDay.day, i)}
                      onDelete={() => removeItem(centerDay.day, i)}
                    />
                  ))}
                </Reorder.Group>
              ) : (
                <div className="space-y-3">
                  {visibleItems.map((it, j) => {
                    const idx = indexMap[j];
                    return (
                      <ItineraryTile
                        key={it.id || idx}
                        item={it}
                        dragEnabled={false}
                        onChangeLabel={(v) => updateItem(centerDay.day, idx, { label: v })}
                        onChangeUrl={(v) => updateItem(centerDay.day, idx, { url: v })}
                        onCycleType={() => cycleType(centerDay.day, idx)}
                        onDelete={() => removeItem(centerDay.day, idx)}
                      />
                    );
                  })}
                </div>
              )
            ) : (
              <div className="text-[13px] text-[#A39384] bg-white/16 border border-white/30 rounded-2xl px-3 py-3">這個分類目前沒有內容。你可以按「＋新增」。</div>
            )}

            <div className="mt-6 text-center text-[12px] text-[#A39384]">小提示：點整個行程卡片會開地圖；要改字就直接點文字。</div>

            <div className="mt-8 px-3">
              <EditableText value={meta.note} onChange={(v) => updateMeta("note", v)} as="p" className="text-[13px] text-center leading-relaxed" style={{ color: "#B00020" }} placeholder="在這裡輸入你的溫馨提醒（例如：記得帶雨傘、集合時間請準時）" />
            </div>

            {!isView && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const payload = { days, meta };
                    const data = b64UrlEncode(payload);
                    const url = `${window.location.origin}${window.location.pathname}?mode=view&data=${data}`;
                    window.prompt("複製這個發佈連結給朋友（只能看，不能改）：", url);
                  }}
                  className="text-[12px] rounded-xl bg-white/22 border border-white/45 px-3 py-2 text-[#525C44] hover:bg-white/30"
                >
                  複製分享連結（發佈版）
                </button>

                <div className="w-full max-w-[360px] rounded-2xl border border-white/40 bg-white/18 px-3 py-3">
                  <div className="text-[12px] mb-2 text-[#A39384] text-center">發佈版連結（朋友只能看，不能編輯）</div>
                  <input
                    readOnly
                    value={`${window.location.origin}${window.location.pathname}?mode=view&data=${b64UrlEncode({ days, meta })}`}
                    onFocus={(e) => e.target.select()}
                    className="w-full text-[12px] rounded-xl px-2 py-2 bg-white/25 border border-white/40 outline-none"
                    style={{ color: COLORS.textMain }}
                  />
                  <div className="mt-2 text-center text-[11px] text-[#A39384]">點一下上方欄位即可全選，Ctrl / Cmd + C 複製</div>
                </div>
              </div>
            )}

            <div className="mt-10 text-center text-[11px] opacity-70" style={{ color: "#A39384" }}>
              ⓘ 行程與地址可依實際狀況彈性調整，請以當日現場與交通狀況為準。
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="h-10" />
      </div>

      <style>{`
        [contenteditable][data-placeholder]:empty:before{
          content: attr(data-placeholder);
          color: rgba(163,147,132,.95);
        }
        [contenteditable]:focus{
          box-shadow: 0 0 0 2px rgba(123,42,38,.25);
          background: rgba(255,255,255,.25);
        }
        select{
          appearance: none;
          -webkit-appearance: none;
        }
      `}</style>
    </div>
  );
}
