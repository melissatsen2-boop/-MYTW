import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import {
  MapPin,
  PencilLine,
  CalendarDays,
  UtensilsCrossed,
  Mountain,
  Candy,
  Route,
} from "lucide-react";

// ✅ 可直接在畫面上點文字編輯（contentEditable）
// ✅ 「全部」= 依行程表順序顯示（不分類）
// ✅ 點分類才會以分類呈現
// ✅ 單一行程以「2x2 四方格」呈現：左邊名稱（跨兩列）、右上 icon、右下地圖
// ✅ 點整個行程卡片即可開 Google Maps（編輯文字時不會誤觸開地圖）

const COLORS = {
  bg: "#F7F6F2",
  primary: "#1F3A5F",     // 深藍（保留給非分類時的通用）
  textMain: "#2F2F2F",
  textSub: "#8A8F98",
};

const TYPE_COLORS = {
  食物: "#FEFFAF",
  景點: "#78A2D2",
  點心: "#F8A8B9",
  行程: "#DDE6D5",
};

const STROKES = {
  "#FEFFAF": "#78A2D2",
  "#78A2D2": "#FEFFAF",
  "#F8A8B9": "#FAFFC7",
  "#DDE6D5": "#1F3A5F",
};

const TYPES = ["行程", "食物", "景點", "點心"];

function safeTrim(s) {
  // 注意：這裡用 RegExp 字元避免在 canvas 替換時遇到跳脫問題
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

function EditableText({
  value,
  onChange,
  className,
  as = "div",
  placeholder,
  spellCheck = false,
  disabled = false,
  ...rest
}) {
  const Tag = as;

  // view 模式：純顯示（不可編輯）
  if (disabled) {
    return (
      <Tag
        {...rest}
        className={className}
        style={{ whiteSpace: "pre-wrap", ...(rest.style || {}) }}
      >
        {value || ""}
      </Tag>
    );
  }

  // edit 模式：可直接點文字編輯
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
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
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

function ItineraryTile({
  item,
  onChangeLabel,
  onChangeUrl,
  onCycleType,
  onDelete,
  dragEnabled = false,
}) {
  const Icon = typeIcon(item.type);
  const controls = useDragControls();
  const holdRef = React.useRef(null);

  // 顏色規則（依你最新指定）
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
        {/* icon 方塊：主色 + 細線框 */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{
            background: bg,
            border: border ? `1.5px solid ${border}` : "none",
            color: "#FFFFFF",
          }}
        >
          <Icon size={22} />
        </div>

        {/* 右側文字：只留 行程名稱 + Google Map */}
        <div className="flex-1 min-w-0">
          <EditableText disabled={isView}
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

                  {/* ✅ C1：編輯模式可快速貼上/更新連結；朋友版不顯示 */}
                  {isEdit && (
                    <button
                      type="button"
                      className="ml-2 text-[12px] underline opacity-70 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = window.prompt(
                          "貼上/更新 Google Maps 連結（留空 = 清除）",
                          item.url || ""
                        );
                        if (next === null) return;
                        onChangeUrl(next);
                      }}
                    >
                      更新連結
                    </button>
                  )}
                </div>

                {/* 只在編輯模式顯示連結網域提示，避免朋友版太雜/暴露網址 */}
                {isEdit && (
                  <div className="text-[11px] opacity-60 truncate">
                    {item.url
                      .replace(/^https?:\/\//, "")
                      .replace(/\/.*$/, "")}
                  </div>
                )}
              </>
            ) : isView ? null : (
              <div className="flex items-center gap-2">
                <MapPin size={13} className="opacity-60" />
                <span
                  className="underline cursor-pointer opacity-80 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = window.prompt(
                      "貼上 Google Maps 連結（可留空先當候補）",
                      ""
                    );
                    if (next === null) return;
                    onChangeUrl(next);
                  }}
                >
                  貼上 Google Maps 連結
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 操作列（極輕） */}
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
  // ⚠️ 重要：編輯資料會自動儲存到 localStorage，避免重新整理或改版遺失
  const STORAGE_KEY = "trip-preview-autosave";

  // ─────────────────────────────────────────────────────────
  // 模式：
  // - 編輯版：?mode=edit（預設）
  // - 發佈版：?mode=view（關閉編輯/新增/拖曳，方便傳給朋友）
  // 分享資料：?data=（URL 內含行程資料，朋友打開即可看到你的版本）
  // ─────────────────────────────────────────────────────────
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const mode = params.get("mode") || "edit";
  const isView = mode === "view";
  const isEdit = !isView;

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
    // 1) URL 分享資料（最高優先）
    if (sharedPayload?.meta) return sharedPayload.meta;
    // 2) localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).meta || { title: "馬上發福陽光團", dates: "2月11日至2月13日", note: "" };
    } catch (e) {}
    // 3) 預設
    return { title: "馬上發福陽光團", dates: "2月11日至2月13日", note: "" };
  });

  const [activeDay, setActiveDay] = useState(1);
  const [dayDir, setDayDir] = useState(0);
  const [activeTab, setActiveTab] = useState("全部");

  const [addType, setAddType] = useState("行程");

  const [days, setDays] = useState(() => {
    // 1) URL 分享資料（最高優先）
    if (sharedPayload?.days) return sharedPayload.days;
    // 2) localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).days || [];
    } catch (e) {}
    // 3) 預設
    // ⚠️ 安全備份：舊版預設行程（不使用，只保留避免你擔心「被刪掉」）
    // const LEGACY_DEFAULT_DAYS = [
    //   {
    //     day: 1,
    //     label: "第一天",
    //     itinerary: [
    //       { type: "食物", label: "早餐—镒记茶餐室", url: "" },
    //       { type: "景點", label: "聖瑪利亞教堂", url: "" },
    //       { type: "景點", label: "獨立廣場", url: "" },
    //       { type: "景點", label: "中央市場", url: "" },
    //       { type: "食物", label: "午餐—自由尋吃（金蓮記福建麵 / 麗豐啦啦米）", url: "" },
    //       { type: "景點", label: "Pavilion", url: "" },
    //       { type: "景點", label: "雙峰塔", url: "" },
    //       { type: "食物", label: "飲料—霸王茶姬", url: "" },
    //       { type: "點心", label: "點心—Dury Dury Durian", url: "" },
    //       { type: "食物", label: "晚餐—肉骨茶 / 瓦煲雞飯", url: "" },
    //     ],
    //   },
    //   {
    //     day: 2,
    //     label: "第二天",
    //     itinerary: [
    //       { type: "食物", label: "早餐—ICC pudu / 魚頭米粉", url: "" },
    //       { type: "景點", label: "黑風洞（要搭車）", url: "" },
    //       { type: "食物", label: "午餐—Kiara 163 nls 椰漿飯", url: "" },
    //       { type: "景點", label: "Hextar World", url: "" },
    //       { type: "景點", label: "Desa Park City", url: "" },
    //       { type: "食物", label: "晚餐—（待定）", url: "" },
    //       { type: "景點", label: "（晚餐後景點：待補）", url: "" },
    //     ],
    //   },
    //   {
    //     day: 3,
    //     label: "第三天",
    //     itinerary: [
    //       { type: "食物", label: "早餐—何久茶室", url: "" },
    //       { type: "景點", label: "Taman Eko Rimba", url: "" },
    //       { type: "景點", label: "Perdana Botanical Garden（大自然）", url: "" },
    //       { type: "食物", label: "午餐—恩記海南雞飯", url: "" },
    //       { type: "食物", label: "晚餐—待定（hop on hop off）", url: "" },
    //       { type: "行程", label: "唱歌", url: "" },
    //     ],
    //   },
    // ];

    // ✅ 目前最終正本（含地圖連結；沒有的維持候補/空白）
    return [
      {
        day: 1,
        label: "第一天",
        itinerary: [
          {
            type: "食物",
            label: "早餐—镒记茶餐室",
            url: "https://www.google.com/maps/place/镒记茶餐室/data=!4m2!3m1!1s0x31cc482c1e868c0d:0xb674598b12ad056?sa=X&ved=1t:242&ictx=111",
          },
          {
            type: "景點",
            label: "聖瑪利亞教堂",
            url: "https://www.google.com/maps/place/St+Mary's+Cathedral/@3.150278,101.6934342,17z/data=!3m1!4b1!4m6!3m5!1s0x31cc49cd3d6d5231:0x8d3f1ce01df008ce!8m2!3d3.150278!4d101.6934342!16s/m/02q90wx?entry=ttu&g_ep=EgoyMDI2MDIwMy4wIKXMDSoASAFQAw==",
          },
          {
            type: "景點",
            label: "獨立廣場",
            url: "https://www.google.com/maps/place/Dataran+Merdeka/data=!4m2!3m1!1s0x31cc49cd98881539:0x340bf906bc763359?sa=X&ved=1t:155783&ictx=111",
          },
          {
            type: "景點",
            label: "中央市場",
            url: "https://www.google.com/maps/place/Central+Market/data=!4m2!3m1!1s0x0:0xfcb30d4a9ca26002?sa=X&ved=1t:2428&ictx=111",
          },
          {
            type: "食物",
            label: "午餐—自由尋吃（金蓮記福建麵）",
            url: "https://www.google.com/maps/place/金蓮記福建麵+馬來西亞/data=!4m2!3m1!1s0x31cc49d1b22732cb:0x8aafb3c5a4931138?sa=X&ved=1t:242&ictx=111",
          },
          {
            type: "景點",
            label: "景點—雙峰塔",
            url: "https://www.google.com/maps/search/KLCC/@3.1566815,101.7131746,17z?entry=s&sa=X&ved=1t:199789",
          },
          { type: "食物", label: "飲料—霸王茶姬", url: "" },
          {
            type: "食物",
            label: "晚餐—瓦煲雞飯",
            url: "https://www.google.com/maps/place/Restoran+Gafan/data=!4m2!3m1!1s0x31cc35a52810ac59:0x7ab327a7bdcb7d86?sa=X&ved=1t:242&ictx=111",
          },
        ],
      },
      {
        day: 2,
        label: "第二天",
        itinerary: [
          {
            type: "食物",
            label: "早餐—ICC Pudu",
            url: "https://www.google.com/maps/place/ICC+Pudu/data=!4m2!3m1!1s0x31cc36243c03ec4b:0xabc6c127472ea5a4?sa=X&ved=1t:242&ictx=111",
          },
          {
            type: "景點",
            label: "黑風洞（需搭車）",
            url: "https://www.google.com/maps/place/黑風洞/data=!4m2!3m1!1s0x31cc470c8949a805:0xf2bfebb2b36f9ef9?sa=X&ved=1t:155783&ictx=111",
          },
          {
            type: "食物",
            label: "午餐—Kiara 163 NLS 椰漿飯",
            url: "https://www.google.com/maps/place/Nasi+Lemak+Shop+@+Sunway+163+Mall/data=!4m2!3m1!1s0x0:0x97b6cd937335fb31?sa=X&ved=1t:2428&ictx=111",
          },
          {
            type: "景點",
            label: "景點—Hextar World",
            url: "https://www.google.com/maps/place/Hextar+World+at+Empire+City/data=!4m2!3m1!1s0x0:0x274122fa6a84be99?sa=X&ved=1t:2428&ictx=111",
          },
          {
            type: "食物",
            label: "晚餐—Neighbourhood Food Court",
            url: "https://www.google.com/maps/place/Neighbourhood+Food+Court/data=!4m2!3m1!1s0x31cc4edff1ed1703:0x852080c5759f684e?sa=X&ved=1t:242&ictx=111",
          },
          { type: "景點", label: "晚餐後景點—（待補）可能可以移步回去", url: "" },
        ],
      },
      {
        day: 3,
        label: "第三天",
        itinerary: [
          { type: "點心", label: "港式點心—候補", url: "" },
          {
            type: "景點",
            label: "景點—Taman Eko Rimba",
            url: "https://www.google.com/maps/place/Taman+Eko+Rimba+KL/data=!4m2!3m1!1s0x31cc35127ffc0bbf:0x91b0444f75621d44?sa=X&ved=1t:155783&ictx=111",
          },
          {
            type: "食物",
            label: "午餐—雞飯（或其他選擇）",
            url: "https://www.google.com/maps/place/Nasi+Ayam+Hainan+Chee+Meng+(Bukit+Bintang)/data=!4m2!3m1!1s0x31cc3629992893d5:0xc1468ecfd7d4d4b5?sa=X&ved=1t:242&ictx=111",
          },
          {
            type: "景點",
            label: "景點—Pavilion",
            url: "https://www.google.com/maps/place/Pavilion+Kuala+Lumpur/data=!4m2!3m1!1s0x0:0xed966c50b0a79fb4?sa=X&ved=1t:2428&ictx=111",
          },
          {
            type: "點心",
            label: "點心—Dury Dury Durian",
            url: "https://www.google.com/maps/place/Dury+Dury+Durian/data=!4m2!3m1!1s0x31cc490048d071c1:0x6ab0a76c8753f1d3?sa=X&ved=1t:242&ictx=111",
          },
          { type: "食物", label: "晚餐—待定（Hop On Hop Off）", url: "" },
          {
            type: "行程",
            label: "行程—唱歌",
            url: "https://www.google.com/maps/place/a+quiet+place+bukit+bintang/data=!4m2!3m1!1s0x31cc3703634f24f1:0x77c04813dc17142b?sa=X&ved=1t:242&ictx=111",
          },
        ],
      },
    ];
  });

  // ✅ 確保每個行程都有穩定 id（拖曳排序需要）
  useEffect(() => {
    // 確保每個行程都有穩定 id（拖曳排序需要）
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        itinerary: d.itinerary.map((it, i) =>
          it.id
            ? it
            : {
                ...it,
                id: `d${d.day}-${i}-${Math.random().toString(16).slice(2)}`,
              }
        ),
      }))
    );
  }, []);

  // 🔒 自動存檔：任何變更都存到 localStorage
  useEffect(() => {
    // 🔒 自動存檔：只有編輯模式才寫入 localStorage（避免朋友的 view 版覆蓋你的編輯資料）
    if (isView) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ days, meta }));
    } catch (e) {}
  }, [days, meta, isView]);

  const dayIndex = useMemo(
    () => days.findIndex((d) => d.day === activeDay),
    [days, activeDay]
  );
  const len = days.length;
  const leftDay = days[(dayIndex - 1 + len) % len];
  const centerDay = days[dayIndex] || days[0];
  const rightDay = days[(dayIndex + 1) % len];

  const tabs = ["全部", ...TYPES];

  const visibleItems = useMemo(() => {
    if (activeTab === "全部") return centerDay.itinerary;
    return centerDay.itinerary.filter((it) => it.type === activeTab);
  }, [centerDay, activeTab]);

  function updateMeta(key, v) {
    setMeta((m) => ({ ...m, [key]: safeTrim(v) }));
  }

  function updateDayLabel(day, v) {
    setDays((prev) =>
      prev.map((d) => (d.day === day ? { ...d, label: safeTrim(v) || d.label } : d))
    );
  }

  function updateItem(day, idx, patch) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        const next = d.itinerary.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        return { ...d, itinerary: next };
      })
    );
  }

  function cycleType(day, idx) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        const next = d.itinerary.map((it, i) =>
          i === idx ? { ...it, type: nextType(it.type) } : it
        );
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
            ...d.itinerary,
            {
              id: `d${day}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              type: addType,
              label: "（新增項目）",
              url: "",
            },
          ],
        };
      })
    );
  }

  function removeItem(day, idx) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        return { ...d, itinerary: d.itinerary.filter((_, i) => i !== idx) };
      })
    );
  }

  // 將 visibleItems 的 idx 對回原 itinerary idx（分類時需要）
  const indexMap = useMemo(() => {
    if (activeTab === "全部") return centerDay.itinerary.map((_, i) => i);
    const map = [];
    centerDay.itinerary.forEach((it, i) => {
      if (it.type === activeTab) map.push(i);
    });
    return map;
  }, [centerDay, activeTab]);

  return (
    <div
      className="min-h-screen w-full flex justify-center"
      style={{
        background:
          "repeating-linear-gradient(90deg, rgba(0,0,0,.02) 0px, rgba(0,0,0,.02) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(0deg, rgba(0,0,0,.015) 0px, rgba(0,0,0,.015) 1px, transparent 1px, transparent 4px), " +
          COLORS.bg,
      }}
    >
      {/* subtle noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.11] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E)",
        }}
      />

      <div className="w-[420px] max-w-full px-4 py-8 pb-24 relative">
        {/* Header */}
        <div className="text-center mb-6">
          <EditableText disabled={isView}
            value={meta.title}
            onChange={(v) => updateMeta("title", v)}
            as="h1"
            className="text-[28px] font-semibold tracking-wide text-[#7B2A26]"
            placeholder="輸入主題"
          />
          <div className="mt-2 flex items-center justify-center gap-2 text-[#A39384]">
            <CalendarDays size={16} />
            <EditableText disabled={isView}
              value={meta.dates}
              onChange={(v) => updateMeta("dates", v)}
              as="p"
              className="text-[14px]"
              placeholder="輸入日期"
            />
          </div>
        </div>

        {/* Day Switcher */}
        <div className="mb-5">
          <div
            className="rounded-3xl border border-white/45 bg-white/25 backdrop-blur-[14px] shadow-[0_14px_40px_rgba(0,0,0,.08)]"
            style={{ WebkitBackdropFilter: "blur(14px)" }}
          >
            <div className="flex items-center justify-between px-3 py-3">
              {/* Left */}
              <button
                type="button"
                disabled={false}
                onClick={() => { setDayDir(-1); leftDay && setActiveDay(leftDay.day); }}
                className={
                  "flex-1 text-left px-2 py-2 rounded-2xl transition " +
                  "opacity-40 hover:opacity-80"
                }
              >
                <div className="text-[12px] text-[#A39384]">{leftDay ? "←" : ""}</div>
                <EditableText disabled={isView}
                  value={leftDay?.label || ""}
                  onChange={(v) => leftDay && updateDayLabel(leftDay.day, v)}
                  className="text-[13px] text-[#525C44]"
                  placeholder=""
                />
              </button>

              {/* Center */}
              <motion.button
                type="button"
                onClick={() => setActiveDay(centerDay.day)}
                className="flex-[1.1] text-center px-2 py-2 rounded-2xl bg-white/35 border border-white/60 shadow-[0_10px_25px_rgba(0,0,0,.08)]"
                whileTap={{ scale: 0.98 }}
              >
                <EditableText disabled={isView}
                  value={centerDay.label}
                  onChange={(v) => updateDayLabel(centerDay.day, v)}
                  className="text-[18px] font-semibold text-[#7B2A26]"
                  placeholder="天數"
                />
              </motion.button>

              {/* Right */}
              <button
                type="button"
                disabled={!rightDay}
                onClick={() => { setDayDir(1); rightDay && setActiveDay(rightDay.day); }}
                className={
                  "flex-1 text-right px-2 py-2 rounded-2xl transition " +
                  (rightDay ? "opacity-70 hover:opacity-100" : "opacity-25 cursor-not-allowed")
                }
              >
                <div className="text-[12px] text-[#A39384]">{rightDay ? "→" : ""}</div>
                <EditableText disabled={isView}
                  value={rightDay?.label || ""}
                  onChange={(v) => rightDay && updateDayLabel(rightDay.day, v)}
                  className="text-[13px] text-[#525C44]"
                  placeholder=""
                />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {tabs.map((t) => (
              <Tab key={t} active={activeTab === t} onClick={() => setActiveTab(t)}>
                {t}
              </Tab>
            ))}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait" custom={dayDir}>
          <motion.div
            key={centerDay.day + "-" + activeTab}
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
                {activeTab === "全部"
                  ? "依行程表順序（不分類）"
                  : `分類：${activeTab}（只顯示此分類）`}
              </div>

              <div className="flex items-center gap-2">
                {!isView && (
                  <>
                    <select
                      value={addType}
                      onChange={(e) => setAddType(e.target.value)}
                      className="text-[12px] rounded-xl bg-white/20 border border-white/40 px-2 py-1 text-[#525C44] outline-none"
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => addItem(centerDay.day)}
                      className="text-[12px] rounded-xl bg-white/22 border border-white/45 px-3 py-1.5 text-[#525C44] hover:bg-white/30"
                    >
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
                    setDays((prev) =>
                      prev.map((d) =>
                        d.day === centerDay.day ? { ...d, itinerary: newOrder } : d
                      )
                    )
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
              <div className="text-[13px] text-[#A39384] bg-white/16 border border-white/30 rounded-2xl px-3 py-3">
                {isView ? "這個分類目前沒有內容。" : "這個分類目前沒有內容。你可以按「＋新增」。"}
              </div>
            )}

            {!isView && (
              <div className="mt-6 text-center text-[12px] text-[#A39384]">
                小提示：點整個行程卡片會開地圖；要改字就直接點文字。
              </div>
            )}

            {/* 使用者自訂溫馨提醒（只在編輯模式顯示） */}
            {!isView && (
              <div className="mt-8 px-3">
                <EditableText
                  disabled={isView}
                  value={meta.note}
                  onChange={(v) => updateMeta("note", v)}
                  as="p"
                  className="text-[13px] text-center leading-relaxed"
                  style={{ color: "#B00020" }}
                  placeholder="在這裡輸入你的溫馨提醒（例如：記得帶雨傘、集合時間請準時）"
                />
              </div>
            )}

            {/* 分享連結（只在編輯模式顯示） */}
            {!isView && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const payload = { days, meta };
                    const data = b64UrlEncode(payload);
                    const url = `${window.location.origin}${window.location.pathname}?mode=view&data=${data}`;
                    // 一定會出現的複製框（最穩，不依賴 clipboard API）
                    window.prompt("複製這個發佈連結給朋友（只能看，不能改）：", url);
                  }}
                  className="text-[12px] rounded-xl bg-white/22 border border-white/45 px-3 py-2 text-[#525C44] hover:bg-white/30"
                >
                  複製分享連結（發佈版）
                </button>

                {/* 永遠可見的備用複製框（避免 prompt 被擋） */}
                <div className="w-full max-w-[360px] rounded-2xl border border-white/40 bg-white/18 px-3 py-3">
                  <div className="text-[12px] mb-2 text-[#A39384] text-center">
                    發佈版連結（朋友只能看，不能編輯）
                  </div>
                  <input
                    readOnly
                    value={`${window.location.origin}${window.location.pathname}?mode=view&data=${b64UrlEncode({ days, meta })}`}
                    onFocus={(e) => e.target.select()}
                    className="w-full text-[12px] rounded-xl px-2 py-2 bg-white/25 border border-white/40 outline-none"
                    style={{ color: COLORS.textMain }}
                  />
                  <div className="mt-2 text-center text-[11px] text-[#A39384]">
                    點一下上方欄位即可全選，Ctrl / Cmd + C 複製
                  </div>
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