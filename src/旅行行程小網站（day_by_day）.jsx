import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ExternalLink, MapPin, UtensilsCrossed, Route } from "lucide-react";

/**
 * 旅行行程小網站（簡單、不花俏）
 * - 以 Day 1 / Day 2 / ... 分頁
 * - 每天可新增「早餐/景點/距離/移動方式/連結」條目
 * - 自動儲存到 localStorage（關掉再開也在）
 */

type MoveMode = "walk" | "taxi" | "transit" | "other";

type TravelLine = {
  id: string;
  name: string; // 人名 / 住宿名稱
  mode: MoveMode; // 走路 / 叫車 / 大眾運輸
  time: string; // 幾分鐘 / 距離
};

type PlanItem = {
  id: string;
  meal: string; // 早餐 / 午餐 / 晚餐（或任意文字）
  spot: string; // 景點/地點
  travels: TravelLine[]; // 不同住宿/人 的移動方式
  link: string; // Google Maps / 官網 / Klook / whatever
};

type DayPlan = {
  day: number;
  title?: string;
  items: PlanItem[];
};

const STORAGE_KEY = "trip_planner_simple_v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function safeUrl(raw: string) {
  const v = (raw || "").trim();
  if (!v) return "";
  // 如果使用者沒輸入 http(s)，嘗試自動補上
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v;
}

function modeLabel(mode: MoveMode) {
  switch (mode) {
    case "walk":
      return "走路";
    case "taxi":
      return "叫車";
    case "transit":
      return "大眾運輸";
    default:
      return "其他";
  }
}

const DEFAULT_DAYS = 3;

export default function TripPlannerSimple() {
  const [daysCount, setDaysCount] = useState<number>(DEFAULT_DAYS);
  const [plans, setPlans] = useState<DayPlan[]>(() => {
    // 初始先給空，之後用 useEffect 讀 localStorage
    return Array.from({ length: DEFAULT_DAYS }, (_, i) => ({ day: i + 1, items: [] }));
  });

  const dayTabs = useMemo(() => plans.map((p) => `day-${p.day}`), [plans]);
  const [activeTab, setActiveTab] = useState<string>(`day-1`);

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { daysCount: number; plans: DayPlan[]; activeTab?: string };
      if (parsed?.plans?.length) {
        setDaysCount(parsed.daysCount ?? parsed.plans.length);
        setPlans(parsed.plans);
        setActiveTab(parsed.activeTab ?? `day-1`);
      }
    } catch {
      // ignore
    }
  }, []);

  // save
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ daysCount, plans, activeTab })
      );
    } catch {
      // ignore
    }
  }, [daysCount, plans, activeTab]);

  // ensure plans length matches daysCount
  useEffect(() => {
    setPlans((prev) => {
      const next = [...prev];
      if (next.length === daysCount) return next;
      if (next.length < daysCount) {
        const start = next.length + 1;
        for (let d = start; d <= daysCount; d++) next.push({ day: d, items: [] });
      } else {
        next.splice(daysCount);
      }
      // fix day numbering
      return next.map((p, i) => ({ ...p, day: i + 1 }));
    });

    setActiveTab((prev) => {
      const m = prev.match(/^day-(\d+)$/);
      const n = m ? Number(m[1]) : 1;
      const safe = Math.min(Math.max(1, n), daysCount);
      return `day-${safe}`;
    });
  }, [daysCount]);

  const currentDay = useMemo(() => {
    const m = activeTab.match(/^day-(\d+)$/);
    const n = m ? Number(m[1]) : 1;
    return plans[n - 1];
  }, [activeTab, plans]);

  function updateDayTitle(day: number, title: string) {
    setPlans((prev) =>
      prev.map((p) => (p.day === day ? { ...p, title } : p))
    );
  }

  function addItem(day: number) {
    const item: PlanItem = {
      id: uid(),
      meal: "早餐",
      spot: "",
      travels: [
        { id: uid(), name: "住宿A", mode: "taxi", time: "" },
      ],
      link: "",
    };
    setPlans((prev) =>
      prev.map((p) => (p.day === day ? { ...p, items: [...p.items, item] } : p))
    );
  };
    setPlans((prev) =>
      prev.map((p) => (p.day === day ? { ...p, items: [...p.items, item] } : p))
    );
  }

  function removeItem(day: number, id: string) {
    setPlans((prev) =>
      prev.map((p) =>
        p.day === day ? { ...p, items: p.items.filter((x) => x.id !== id) } : p
      )
    );
  }

  function updateItem(day: number, id: string, patch: Partial<PlanItem>) {
    setPlans((prev) =>
      prev.map((p) =>
        p.day === day
          ? {
              ...p,
              items: p.items.map((x) => (x.id === id ? { ...x, ...patch } : x)),
            }
          : p
      )
    );
  }

  function resetAll() {
    const fresh = Array.from({ length: daysCount }, (_, i) => ({ day: i + 1, items: [] as PlanItem[] }));
    setPlans(fresh);
    setActiveTab("day-1");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">旅行行程</h1>
            <p className="text-sm text-muted-foreground">簡單、清楚：按 Day 切換，每天紀錄餐點 / 景點 / 距離 / 移動方式 / 連結</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Label className="text-sm">天數</Label>
              <Input
                className="w-24"
                type="number"
                min={1}
                max={30}
                value={daysCount}
                onChange={(e) => setDaysCount(Math.min(30, Math.max(1, Number(e.target.value || 1))))}
              />
            </div>
            <Button variant="outline" onClick={resetAll}>
              清空全部
            </Button>
          </div>
        </div>

        <Separator className="my-6" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full flex-wrap justify-start">
            {plans.map((p) => (
              <TabsTrigger key={p.day} value={`day-${p.day}`} className="rounded-xl">
                Day {p.day}
              </TabsTrigger>
            ))}
          </TabsList>

          {plans.map((p) => (
            <TabsContent key={p.day} value={`day-${p.day}`} className="mt-6">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">Day {p.day}</CardTitle>
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">（可選）這一天的主題 / 城市 / 備註</Label>
                        <Input
                          placeholder="例如：台中市區散步 / 日月潭一日 / 香港中環"
                          value={p.title ?? ""}
                          onChange={(e) => updateDayTitle(p.day, e.target.value)}
                        />
                      </div>
                    </div>
                    <Button onClick={() => addItem(p.day)} className="rounded-2xl">
                      <Plus className="mr-2 h-4 w-4" /> 新增一筆
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  {p.items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      目前還沒有內容。點「新增一筆」開始建立你的 Day {p.day} 行程。
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {p.items.map((item, idx) => (
                        <div key={item.id} className="rounded-2xl border p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="text-sm font-medium">#{idx + 1}</div>
                            <Button
                              variant="ghost"
                              onClick={() => removeItem(p.day, item.id)}
                              className="rounded-2xl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-sm">
                                <Route className="h-4 w-4" /> 距離 / 時間（依住宿 / 人）
                              </Label>
                              <div className="space-y-2">
                                {item.travels.map((t) => (
                                  <div key={t.id} className="flex flex-col gap-2 sm:flex-row">
                                    <Input
                                      className="sm:w-32"
                                      placeholder="名字 / 住宿"
                                      value={t.name}
                                      onChange={(e) =>
                                        updateItem(p.day, item.id, {
                                          travels: item.travels.map((x) =>
                                            x.id === t.id ? { ...x, name: e.target.value } : x
                                          ),
                                        })
                                      }
                                    />
                                    <Select
                                      value={t.mode}
                                      onValueChange={(v) =>
                                        updateItem(p.day, item.id, {
                                          travels: item.travels.map((x) =>
                                            x.id === t.id ? { ...x, mode: v as MoveMode } : x
                                          ),
                                        })
                                      }
                                    >
                                      <SelectTrigger className="rounded-2xl sm:w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="walk">走路</SelectItem>
                                        <SelectItem value="taxi">叫車</SelectItem>
                                        <SelectItem value="transit">大眾運輸</SelectItem>
                                        <SelectItem value="other">其他</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      placeholder="幾分鐘 / 距離"
                                      value={t.time}
                                      onChange={(e) =>
                                        updateItem(p.day, item.id, {
                                          travels: item.travels.map((x) =>
                                            x.id === t.id ? { ...x, time: e.target.value } : x
                                          ),
                                        })
                                      }
                                    />
                                    <Button
                                      variant="ghost"
                                      onClick={() =>
                                        updateItem(p.day, item.id, {
                                          travels: item.travels.filter((x) => x.id !== t.id),
                                        })
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-2xl"
                                  onClick={() =>
                                    updateItem(p.day, item.id, {
                                      travels: [
                                        ...item.travels,
                                        { id: uid(), name: "", mode: "taxi", time: "" },
                                      ],
                                    })
                                  }
                                >
                                  + 新增一位 / 住宿
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm">移動方式</Label>
                              <Select
                                value={item.mode}
                                onValueChange={(v) => updateItem(p.day, item.id, { mode: v as MoveMode })}
                              >
                                <SelectTrigger className="rounded-2xl">
                                  <SelectValue placeholder="選擇" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="walk">走路</SelectItem>
                                  <SelectItem value="taxi">叫車</SelectItem>
                                  <SelectItem value="transit">大眾運輸</SelectItem>
                                  <SelectItem value="other">其他</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="text-xs text-muted-foreground">目前：{modeLabel(item.mode)}</div>
                            </div>

                            <div className="sm:col-span-2 space-y-2">
                              <Label className="flex items-center gap-2 text-sm">
                                <ExternalLink className="h-4 w-4" /> 連結（Google Maps / 官網 / 訂票）
                              </Label>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                  placeholder="貼上連結（可不含 https://）"
                                  value={item.link}
                                  onChange={(e) => updateItem(p.day, item.id, { link: e.target.value })}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-2xl"
                                  onClick={() => {
                                    const url = safeUrl(item.link);
                                    if (!url) return;
                                    window.open(url, "_blank", "noopener,noreferrer");
                                  }}
                                >
                                  打開
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                小提醒：建議貼 Google Maps 的分享連結，行程會更順。
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-8 text-xs text-muted-foreground">
          ＊資料儲存在你的瀏覽器（localStorage），不會上傳到任何地方。
        </div>
      </div>
    </div>
  );
}
