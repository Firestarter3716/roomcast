"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateDisplayConfig, updateDisplay } from "../actions";
import { THEME_PALETTES, FONT_OPTIONS } from "../palettes";
import {
  type ThemeConfig,
  type BrandingConfig,
  type BackgroundConfig,
  type ScreenConfig,
  type DisplayConfig,
  type RoomBookingConfig,
  type AgendaConfig,
  type DayGridConfig,
  type WeekGridConfig,
  type InfoDisplayConfig,
  LAYOUT_OPTIONS,
  ORIENTATION_OPTIONS,
  RESOLUTION_PRESETS,
  DEFAULT_THEME,
  DEFAULT_BRANDING,
  DEFAULT_BACKGROUND,
  DEFAULT_SCREEN,
  getDefaultLayoutConfig,
} from "../types";
import { toast } from "sonner";
import { Save, Palette, Layout, Image, Tag, Shield, ChevronDown, ChevronRight, Monitor, Smartphone } from "lucide-react";

interface DisplayEditorProps {
  displayId: string;
  displayToken: string;
  layoutType: string;
  initialConfig: DisplayConfig;
  orientation?: string;
  roomName?: string;
  initialIpWhitelist?: string[];
}

type EditorTab = "layout" | "theme" | "branding";

export function DisplayEditor({ displayId, displayToken, layoutType, initialConfig, orientation, roomName, initialIpWhitelist }: DisplayEditorProps) {
  const t = useTranslations("displays");
  const tc = useTranslations("common");
  const [config, setConfig] = useState<DisplayConfig>({
    theme: { ...DEFAULT_THEME, ...initialConfig?.theme },
    branding: { ...DEFAULT_BRANDING, ...initialConfig?.branding },
    background: { ...DEFAULT_BACKGROUND, ...initialConfig?.background },
    screen: { ...DEFAULT_SCREEN, ...initialConfig?.screen },
    layout: { ...getDefaultLayoutConfig(layoutType), ...initialConfig?.layout },
  });
  const [activeTab, setActiveTab] = useState<EditorTab>("layout");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [securityOpen, setSecurityOpen] = useState((initialIpWhitelist ?? []).length > 0);
  const [ipWhitelistText, setIpWhitelistText] = useState((initialIpWhitelist ?? []).join("\n"));
  const ipSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [currentLayoutType, setCurrentLayoutType] = useState(layoutType);
  const [currentOrientation, setCurrentOrientation] = useState(orientation || "LANDSCAPE");
  const [previewStatus, setPreviewStatus] = useState<"live" | "free" | "busy" | "endingSoon">("live");
  const [previewSize, setPreviewSize] = useState<"S" | "M" | "L">("L");
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function changeOrientation(value: string) {
    const prev = currentOrientation;
    setCurrentOrientation(value);
    // Swap resolution width/height when switching between landscape and portrait
    const isNowPortrait = value === "PORTRAIT";
    const wasPortrait = prev === "PORTRAIT";
    if (isNowPortrait !== wasPortrait) {
      const { width, height, preset, zoom } = config.screen;
      const newScreen: ScreenConfig = { preset, width: height, height: width, zoom };
      const newConfig = { ...config, screen: newScreen };
      setConfig(newConfig);
      autoSave(newConfig);
    }
    try {
      await updateDisplay(displayId, { orientation: value as "LANDSCAPE" | "PORTRAIT" | "AUTO" });
      setPreviewKey((k) => k + 1);
    } catch {
      toast.error(t("editor.updateOrientationFailed"));
    }
  }

  async function changeLayoutType(value: string) {
    setCurrentLayoutType(value);
    // Reset layout config to defaults for the new layout type
    const newLayout = getDefaultLayoutConfig(value);
    const newConfig = { ...config, layout: newLayout };
    setConfig(newConfig);
    try {
      await updateDisplay(displayId, { layoutType: value as "ROOM_BOOKING" | "AGENDA" | "DAY_GRID" | "WEEK_GRID" | "INFO_DISPLAY" });
      autoSave(newConfig);
      setPreviewKey((k) => k + 1);
    } catch {
      toast.error(t("editor.updateLayoutFailed"));
    }
  }

  function updateScreen(partial: Partial<ScreenConfig>) {
    const newConfig = { ...config, screen: { ...config.screen, ...partial } };
    setConfig(newConfig);
    autoSave(newConfig);
  }

  function selectResolutionPreset(label: string) {
    const preset = RESOLUTION_PRESETS.find((p) => p.label === label);
    if (!preset) return;
    const isPortrait = currentOrientation === "PORTRAIT";
    const w = isPortrait ? preset.height : preset.width;
    const h = isPortrait ? preset.width : preset.height;
    updateScreen({ preset: label, width: w, height: h });
  }

  const autoSave = useCallback((newConfig: DisplayConfig) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await updateDisplayConfig(displayId, newConfig as unknown as Record<string, unknown>);
        // Config updates are pushed to the iframe via SSE — no reload needed
      } catch {
        toast.error(t("editor.autoSaveFailed"));
      }
    }, 1000);
  }, [displayId, t]);

  const validateIpEntry = useCallback((entry: string): boolean => {
    const trimmed = entry.trim();
    if (!trimmed) return true; // empty lines are filtered out
    if (trimmed.includes("/")) {
      // CIDR: e.g. 192.168.1.0/24
      const [network, prefixStr] = trimmed.split("/");
      if (!network || !prefixStr) return false;
      const prefix = Number(prefixStr);
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
      const parts = network.split(".");
      if (parts.length !== 4) return false;
      return parts.every((p) => { const n = Number(p); return Number.isInteger(n) && n >= 0 && n <= 255; });
    } else {
      // Plain IPv4
      const parts = trimmed.split(".");
      if (parts.length !== 4) return false;
      return parts.every((p) => { const n = Number(p); return Number.isInteger(n) && n >= 0 && n <= 255; });
    }
  }, []);

  const autoSaveIpWhitelist = useCallback((text: string) => {
    if (ipSaveTimer.current) clearTimeout(ipSaveTimer.current);
    ipSaveTimer.current = setTimeout(async () => {
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const invalid = lines.filter((l) => !validateIpEntry(l));
      if (invalid.length > 0) {
        toast.warning(t("editor.invalidIpEntries", { entries: invalid.join(", ") }));
        return;
      }
      try {
        await updateDisplay(displayId, { ipWhitelist: lines });
      } catch {
        toast.error(t("editor.ipWhitelistFailed"));
      }
    }, 1500);
  }, [displayId, validateIpEntry, t]);

  function updateTheme(partial: Partial<ThemeConfig>) {
    const newConfig = { ...config, theme: { ...config.theme, ...partial } };
    setConfig(newConfig);
    autoSave(newConfig);
  }

  function updateBranding(partial: Partial<BrandingConfig>) {
    const newConfig = { ...config, branding: { ...config.branding, ...partial } };
    setConfig(newConfig);
    autoSave(newConfig);
  }

  function updateBackground(partial: Partial<BackgroundConfig>) {
    const newConfig = { ...config, background: { ...config.background, ...partial } };
    setConfig(newConfig);
    autoSave(newConfig);
  }

  function updateLayout(partial: Record<string, unknown>) {
    const newConfig = { ...config, layout: { ...config.layout, ...partial } };
    setConfig(newConfig);
    autoSave(newConfig);
  }

  async function manualSave() {
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (ipSaveTimer.current) clearTimeout(ipSaveTimer.current);
    try {
      // Validate IP whitelist entries before saving
      const ipLines = ipWhitelistText.split("\n").map((l) => l.trim()).filter(Boolean);
      const invalidEntries = ipLines.filter((l) => !validateIpEntry(l));
      if (invalidEntries.length > 0) {
        toast.warning(t("editor.invalidIpEntries", { entries: invalidEntries.join(", ") }));
      }
      const validIpLines = ipLines.filter((l) => validateIpEntry(l));

      await Promise.all([
        updateDisplayConfig(displayId, config as unknown as Record<string, unknown>),
        updateDisplay(displayId, { ipWhitelist: validIpLines }),
      ]);
      toast.success(t("editor.saved"));
    } catch {
      toast.error(t("editor.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (ipSaveTimer.current) clearTimeout(ipSaveTimer.current);
    };
  }, []);

  const tabs: { id: EditorTab; label: string; icon: typeof Layout }[] = [
    { id: "layout", label: t("layout"), icon: Layout },
    { id: "theme", label: t("editor.theme"), icon: Palette },
    { id: "branding", label: t("editor.branding"), icon: Tag },
  ];

  const inputClass = "w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/40";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--color-foreground)]";
  const checkboxClass = "flex items-center gap-2 text-sm text-[var(--color-foreground)]";

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-2/5 space-y-6">
        <div role="tablist" className="flex gap-1 rounded-lg bg-[var(--color-muted)]/10 p-1">
          {tabs.map((tab) => (
            <button key={tab.id} role="tab" id={`tab-${tab.id}`} aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${activeTab === tab.id ? "bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm" : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"}`}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "layout" && (
          <div role="tabpanel" aria-labelledby="tab-layout" className="space-y-4">
            <div>
              <label className={labelClass}>{t("editor.displayView")}</label>
              <div className="grid grid-cols-2 gap-2">
                {LAYOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={currentLayoutType === opt.value}
                    onClick={() => changeLayoutType(opt.value)}
                    className={`rounded-lg border p-3 text-left transition-colors ${currentLayoutType === opt.value ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"}`}
                  >
                    <p className={`text-xs font-medium ${currentLayoutType === opt.value ? "text-[var(--color-primary)]" : "text-[var(--color-foreground)]"}`}>{t(`layouts.${opt.value}`)}</p>
                    <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">{t(`layoutDescriptions.${opt.value}`)}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>{t("orientation")}</label>
              <div className="flex gap-2">
                {ORIENTATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={currentOrientation === opt.value}
                    onClick={() => changeOrientation(opt.value)}
                    className={`flex items-center gap-1.5 flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${currentOrientation === opt.value ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"}`}
                  >
                    {opt.value === "PORTRAIT" ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
                    {t(`orientations.${opt.value}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>{t("editor.screenResolution")}</label>
              <div className="grid grid-cols-3 gap-2">
                {RESOLUTION_PRESETS.map((preset) => {
                  const isPortrait = currentOrientation === "PORTRAIT";
                  const w = isPortrait ? preset.height : preset.width;
                  const h = isPortrait ? preset.width : preset.height;
                  const isActive = config.screen.preset === preset.label;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => selectResolutionPreset(preset.label)}
                      className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${isActive ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"}`}
                    >
                      <div className="font-medium">{preset.label}</div>
                      <div className="text-[10px] opacity-70">{w}x{h}</div>
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={config.screen.preset === "Custom"}
                  onClick={() => updateScreen({ preset: "Custom" })}
                  className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${config.screen.preset === "Custom" ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"}`}
                >
                  <div className="font-medium">{t("editor.custom")}</div>
                  <div className="text-[10px] opacity-70">{config.screen.width}x{config.screen.height}</div>
                </button>
              </div>
              {config.screen.preset === "Custom" && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="editor-screen-w" className="mb-1 block text-xs text-[var(--color-muted-foreground)]">{t("editor.widthPx")}</label>
                    <input id="editor-screen-w" type="number" min="320" max="7680" value={config.screen.width} onChange={(e) => updateScreen({ width: Number(e.target.value) })} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="editor-screen-h" className="mb-1 block text-xs text-[var(--color-muted-foreground)]">{t("editor.heightPx")}</label>
                    <input id="editor-screen-h" type="number" min="240" max="4320" value={config.screen.height} onChange={(e) => updateScreen({ height: Number(e.target.value) })} className={inputClass} />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="editor-zoom" className={labelClass}>
                {t("editor.contentZoom", { value: config.screen.zoom ?? 100 })}
              </label>
              <input
                id="editor-zoom"
                type="range"
                min="50"
                max="200"
                step="5"
                value={config.screen.zoom ?? 100}
                onChange={(e) => updateScreen({ zoom: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-[var(--color-muted-foreground)]">
                <span>50%</span>
                <button type="button" onClick={() => updateScreen({ zoom: 100 })} className="hover:text-[var(--color-foreground)] transition-colors">{t("editor.reset")}</button>
                <span>200%</span>
              </div>
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{t("editor.layoutOptions")}</h3>
            {currentLayoutType === "ROOM_BOOKING" && <RoomBookingOptions config={config.layout as RoomBookingConfig} onChange={updateLayout} labelClass={labelClass} checkboxClass={checkboxClass} inputClass={inputClass} />}
            {currentLayoutType === "AGENDA" && <AgendaOptions config={config.layout as AgendaConfig} onChange={updateLayout} labelClass={labelClass} checkboxClass={checkboxClass} inputClass={inputClass} />}
            {currentLayoutType === "DAY_GRID" && <DayGridOptions config={config.layout as DayGridConfig} onChange={updateLayout} labelClass={labelClass} checkboxClass={checkboxClass} inputClass={inputClass} />}
            {currentLayoutType === "WEEK_GRID" && <WeekGridOptions config={config.layout as WeekGridConfig} onChange={updateLayout} checkboxClass={checkboxClass} />}
            {currentLayoutType === "INFO_DISPLAY" && <InfoDisplayOptions config={config.layout as InfoDisplayConfig} onChange={updateLayout} labelClass={labelClass} checkboxClass={checkboxClass} inputClass={inputClass} />}
          </div>
        )}

        {activeTab === "theme" && (
          <ThemePanel
            config={config}
            updateTheme={updateTheme}
            updateBackground={updateBackground}
            labelClass={labelClass}
            inputClass={inputClass}
            checkboxClass={checkboxClass}
          />
        )}

        {activeTab === "branding" && (
          <div role="tabpanel" aria-labelledby="tab-branding" className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{t("editor.branding")}</h3>
            <div>
              <label htmlFor="editor-logo-url" className={labelClass}>{t("editor.logoUrl")}</label>
              <input id="editor-logo-url" type="text" value={config.branding.logoUrl} onChange={(e) => updateBranding({ logoUrl: e.target.value })} className={inputClass} placeholder="https://example.com/logo.svg" />
            </div>
            <div>
              <label className={labelClass}>{t("editor.logoPosition")}</label>
              <div className="flex gap-2">
                {(["top-left", "top-center", "top-right"] as const).map((pos) => (
                  <button key={pos} type="button" aria-pressed={config.branding.logoPosition === pos} onClick={() => updateBranding({ logoPosition: pos })} className={`flex-1 rounded-md border px-3 py-2 text-xs transition-colors ${config.branding.logoPosition === pos ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"}`}>
                    {pos === "top-left" ? t("editor.posLeft") : pos === "top-center" ? t("editor.posCenter") : t("editor.posRight")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>{t("editor.logoSize")}</label>
              <div className="flex gap-2">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button key={size} type="button" aria-pressed={config.branding.logoSize === size} onClick={() => updateBranding({ logoSize: size })} className={`flex-1 rounded-md border px-3 py-2 text-xs transition-colors ${config.branding.logoSize === size ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"}`}>
                    {size === "small" ? t("editor.sizeSmall") : size === "medium" ? t("editor.sizeMedium") : t("editor.sizeLarge")}
                  </button>
                ))}
              </div>
            </div>
            <label className={checkboxClass}>
              <input type="checkbox" checked={config.branding.showPoweredBy} onChange={(e) => updateBranding({ showPoweredBy: e.target.checked })} />
              {t("editor.showFooter")}
            </label>
          </div>
        )}

        <div className="rounded-lg border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setSecurityOpen(!securityOpen)}
            aria-expanded={securityOpen}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/10 transition-colors rounded-lg"
          >
            <Shield className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            {t("editor.security")}
            {securityOpen ? <ChevronDown className="ml-auto h-4 w-4 text-[var(--color-muted-foreground)]" /> : <ChevronRight className="ml-auto h-4 w-4 text-[var(--color-muted-foreground)]" />}
          </button>
          {securityOpen && (
            <div className="border-t border-[var(--color-border)] px-4 py-4 space-y-2">
              <label htmlFor="editor-ip-whitelist" className={labelClass}>{t("editor.ipWhitelist")}</label>
              <textarea
                id="editor-ip-whitelist"
                value={ipWhitelistText}
                onChange={(e) => {
                  setIpWhitelistText(e.target.value);
                  autoSaveIpWhitelist(e.target.value);
                }}
                rows={4}
                className={inputClass}
                placeholder={"192.168.1.0/24\n10.0.0.1\n172.16.0.0/16"}
              />
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {t("editor.ipWhitelistHelp")}
              </p>
            </div>
          )}
        </div>

        <button onClick={manualSave} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50">
          <Save className="h-4 w-4" />
          {saving ? tc("loading") : t("editor.saveConfiguration")}
        </button>
      </div>

      <div className="w-full lg:w-3/5">
        <div className="sticky top-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
              {t("editor.livePreview")}
              <span className="ml-2 text-xs font-normal text-[var(--color-muted-foreground)]">
                {config.screen.width} x {config.screen.height}
              </span>
            </h3>
          </div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-[var(--color-muted)]/10 p-1">
              {([
                { value: "live", label: t("editor.previewLive") },
                { value: "free", label: t("editor.previewFree"), color: "#22C55E" },
                { value: "busy", label: t("editor.previewBusy"), color: "#EF4444" },
                { value: "endingSoon", label: t("editor.previewEndingSoon"), color: "#F59E0B" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setPreviewStatus(opt.value); setPreviewKey((k) => k + 1); }}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${previewStatus === opt.value ? "bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm" : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"}`}
                >
                  {"color" in opt && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: opt.color }} />}
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-1 rounded-md bg-[var(--color-muted)]/10 p-1">
              {([
                { value: "S", label: "S" },
                { value: "M", label: "M" },
                { value: "L", label: "L" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPreviewSize(opt.value)}
                  className={`rounded px-2.5 py-1 text-[10px] font-semibold transition-colors ${previewSize === opt.value ? "bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm" : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div ref={previewContainerRef} className="w-full">
            {containerWidth > 0 && (() => {
              const screenW = config.screen.width || 1920;
              const screenH = config.screen.height || 1080;
              const sizeFactor = previewSize === "S" ? 0.5 : previewSize === "M" ? 0.75 : 1;
              const previewW = containerWidth * sizeFactor;
              const scale = previewW / screenW;
              const statusParam = previewStatus !== "live" ? `&status=${previewStatus}` : "";
              return (
                <div
                  className="overflow-hidden rounded-lg border border-[var(--color-border)]"
                  style={{
                    width: previewW,
                    height: screenH * scale,
                    margin: sizeFactor < 1 ? "0 auto" : undefined,
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    key={previewKey}
                    src={`/display/${displayToken}?preview=1${statusParam}`}
                    style={{
                      width: screenW,
                      height: screenH,
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                      border: "none",
                      pointerEvents: "none",
                    }}
                    title={t("editor.displayPreview")}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemePanel({ config, updateTheme, updateBackground, labelClass, inputClass, checkboxClass }: {
  config: DisplayConfig;
  updateTheme: (partial: Partial<ThemeConfig>) => void;
  updateBackground: (partial: Partial<BackgroundConfig>) => void;
  labelClass: string;
  inputClass: string;
  checkboxClass: string;
}) {
  const t = useTranslations("displays");
  const [customOpen, setCustomOpen] = useState(config.theme.preset === "custom");
  const [bgOpen, setBgOpen] = useState(config.background.type !== "solid" || config.background.color !== "#0F172A");

  return (
    <div role="tabpanel" aria-labelledby="tab-theme" className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{t("editor.themePreset")}</h3>
      <div className="grid grid-cols-2 gap-2">
        {THEME_PALETTES.map((palette) => (
          <button
            key={palette.id}
            aria-pressed={config.theme.preset === palette.id}
            onClick={() => updateTheme(palette.theme)}
            className={`rounded-lg border p-3 text-left transition-colors ${config.theme.preset === palette.id ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"}`}
          >
            <div className="flex gap-1 mb-2">
              {[palette.theme.background, palette.theme.free, palette.theme.endingSoon || "#F59E0B", palette.theme.busy].map((c, i) => (
                <span key={i} className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: c }} />
              ))}
            </div>
            <p className="text-xs font-medium text-[var(--color-foreground)]">{palette.name}</p>
            <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">{palette.description}</p>
          </button>
        ))}
      </div>

      {config.theme.statusBackground && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/5 p-3">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {t("editor.statusBgInfo")}
          </p>
        </div>
      )}

      <label className={checkboxClass}>
        <input
          type="checkbox"
          checked={config.theme.statusBackground ?? false}
          onChange={(e) => updateTheme({ statusBackground: e.target.checked, preset: "custom" })}
        />
        {t("editor.statusBgLabel")}
      </label>

      <div>
        <label htmlFor="editor-font-family" className={labelClass}>{t("editor.fontFamily")}</label>
        <select id="editor-font-family" value={config.theme.fontFamily} onChange={(e) => updateTheme({ fontFamily: e.target.value })} className={inputClass}>
          {FONT_OPTIONS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
        </select>
      </div>
      <div>
        <label htmlFor="editor-font-size" className={labelClass}>{t("editor.baseFontSize", { size: config.theme.baseFontSize })}</label>
        <input id="editor-font-size" type="range" min="12" max="24" value={config.theme.baseFontSize} onChange={(e) => updateTheme({ baseFontSize: Number(e.target.value) })} className="w-full" />
      </div>

      <div className="rounded-lg border border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setCustomOpen(!customOpen)}
          aria-expanded={customOpen}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/10 transition-colors rounded-lg"
        >
          <Palette className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          {t("editor.customColors")}
          {customOpen ? <ChevronDown className="ml-auto h-4 w-4 text-[var(--color-muted-foreground)]" /> : <ChevronRight className="ml-auto h-4 w-4 text-[var(--color-muted-foreground)]" />}
        </button>
        {customOpen && (
          <div className="border-t border-[var(--color-border)] px-4 py-4 space-y-3">
            {(["background", "foreground", "primary", "secondary", "free", "busy", "endingSoon", "muted"] as const).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <input type="color" value={config.theme[key] || "#000000"} onChange={(e) => updateTheme({ [key]: e.target.value, preset: "custom" })} className="h-8 w-8 cursor-pointer rounded border border-[var(--color-border)]" aria-label={`${key} color picker`} />
                <span className="text-xs text-[var(--color-muted-foreground)] capitalize w-24">{key === "endingSoon" ? t("editor.colorEndingSoon") : key}</span>
                <input id={`editor-theme-${key}`} type="text" value={config.theme[key] || ""} onChange={(e) => updateTheme({ [key]: e.target.value, preset: "custom" })} className="flex-1 rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-foreground)]" aria-label={`${key} color hex value`} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setBgOpen(!bgOpen)}
          aria-expanded={bgOpen}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/10 transition-colors rounded-lg"
        >
          <Image className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          {t("editor.background")}
          {bgOpen ? <ChevronDown className="ml-auto h-4 w-4 text-[var(--color-muted-foreground)]" /> : <ChevronRight className="ml-auto h-4 w-4 text-[var(--color-muted-foreground)]" />}
        </button>
        {bgOpen && (
          <div className="border-t border-[var(--color-border)] px-4 py-4 space-y-4">
            <div>
              <label className={labelClass}>{t("editor.bgType")}</label>
              <div className="flex gap-2">
                {(["solid", "gradient", "image"] as const).map((bgType) => (
                  <button key={bgType} type="button" aria-pressed={config.background.type === bgType} onClick={() => updateBackground({ type: bgType })} className={`flex-1 rounded-md border px-3 py-2 text-xs transition-colors ${config.background.type === bgType ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"}`}>
                    {bgType === "solid" ? t("editor.bgSolid") : bgType === "gradient" ? t("editor.bgGradient") : t("editor.bgImage")}
                  </button>
                ))}
              </div>
            </div>
            {config.background.type === "solid" && (
              <div className="flex items-center gap-3">
                <input type="color" value={config.background.color} onChange={(e) => updateBackground({ color: e.target.value })} className="h-8 w-8 cursor-pointer rounded border border-[var(--color-border)]" aria-label="Background color picker" />
                <input id="editor-bg-color" type="text" value={config.background.color} onChange={(e) => updateBackground({ color: e.target.value })} className={inputClass} aria-label="Background color hex value" />
              </div>
            )}
            {config.background.type === "gradient" && (
              <>
                <div className="flex items-center gap-3">
                  <label htmlFor="editor-gradient-start" className="text-xs text-[var(--color-muted-foreground)] w-12">{t("editor.gradientStart")}</label>
                  <input type="color" value={config.background.gradientStart} onChange={(e) => updateBackground({ gradientStart: e.target.value })} className="h-8 w-8 cursor-pointer rounded border border-[var(--color-border)]" aria-label="Gradient start color picker" />
                  <input id="editor-gradient-start" type="text" value={config.background.gradientStart} onChange={(e) => updateBackground({ gradientStart: e.target.value })} className={inputClass} />
                </div>
                <div className="flex items-center gap-3">
                  <label htmlFor="editor-gradient-end" className="text-xs text-[var(--color-muted-foreground)] w-12">{t("editor.gradientEnd")}</label>
                  <input type="color" value={config.background.gradientEnd} onChange={(e) => updateBackground({ gradientEnd: e.target.value })} className="h-8 w-8 cursor-pointer rounded border border-[var(--color-border)]" aria-label="Gradient end color picker" />
                  <input id="editor-gradient-end" type="text" value={config.background.gradientEnd} onChange={(e) => updateBackground({ gradientEnd: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="editor-gradient-angle" className={labelClass}>{t("editor.gradientAngle", { angle: config.background.gradientAngle })}</label>
                  <input id="editor-gradient-angle" type="range" min="0" max="360" value={config.background.gradientAngle} onChange={(e) => updateBackground({ gradientAngle: Number(e.target.value) })} className="w-full" />
                </div>
              </>
            )}
            {config.background.type === "image" && (
              <>
                <div>
                  <label htmlFor="editor-image-url" className={labelClass}>{t("editor.imageUrl")}</label>
                  <input id="editor-image-url" type="text" value={config.background.imageUrl} onChange={(e) => updateBackground({ imageUrl: e.target.value })} className={inputClass} placeholder="https://example.com/bg.jpg" />
                </div>
                <div>
                  <label htmlFor="editor-image-opacity" className={labelClass}>{t("editor.opacity", { value: Math.round(config.background.imageOpacity * 100) })}</label>
                  <input id="editor-image-opacity" type="range" min="0" max="1" step="0.05" value={config.background.imageOpacity} onChange={(e) => updateBackground({ imageOpacity: Number(e.target.value) })} className="w-full" />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomBookingOptions({ config, onChange, labelClass, checkboxClass, inputClass }: { config: RoomBookingConfig; onChange: (p: Record<string, unknown>) => void; labelClass: string; checkboxClass: string; inputClass: string }) {
  const t = useTranslations("displays");
  return (
    <div className="space-y-3">
      <label className={checkboxClass}><input type="checkbox" checked={config.showOrganizer} onChange={(e) => onChange({ showOrganizer: e.target.checked })} /> {t("editor.showOrganizer")}</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.showAttendeeCount} onChange={(e) => onChange({ showAttendeeCount: e.target.checked })} /> {t("editor.showAttendeeCount")}</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.showProgressBar} onChange={(e) => onChange({ showProgressBar: e.target.checked })} /> {t("editor.showProgressBar")}</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.showFreeSlots} onChange={(e) => onChange({ showFreeSlots: e.target.checked })} /> {t("editor.showFreeSlots")}</label>
      <div><label htmlFor="editor-rb-future-events" className={labelClass}>{t("editor.upcomingEvents")}</label><input id="editor-rb-future-events" type="number" min="1" max="10" value={config.futureEventCount} onChange={(e) => onChange({ futureEventCount: Number(e.target.value) })} className={inputClass} /></div>
      <div><label htmlFor="editor-rb-next-cards" className={labelClass}>{t("editor.nextEventCards")}</label><input id="editor-rb-next-cards" type="number" min="0" max="5" value={config.nextEventCards ?? 2} onChange={(e) => onChange({ nextEventCards: Number(e.target.value) })} className={inputClass} /></div>
      <div><label htmlFor="editor-rb-clock-format" className={labelClass}>{t("editor.clockFormat")}</label><select id="editor-rb-clock-format" value={config.clockFormat} onChange={(e) => onChange({ clockFormat: e.target.value })} className={inputClass}><option value="24h">{t("editor.clock24h")}</option><option value="12h">{t("editor.clock12h")}</option></select></div>
    </div>
  );
}

function AgendaOptions({ config, onChange, labelClass, checkboxClass, inputClass }: { config: AgendaConfig; onChange: (p: Record<string, unknown>) => void; labelClass: string; checkboxClass: string; inputClass: string }) {
  const t = useTranslations("displays");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="editor-agenda-start-hour" className={labelClass}>{t("editor.startHour")}</label><input id="editor-agenda-start-hour" type="number" min="0" max="23" value={config.timeRangeStart} onChange={(e) => onChange({ timeRangeStart: Number(e.target.value) })} className={inputClass} /></div>
        <div><label htmlFor="editor-agenda-end-hour" className={labelClass}>{t("editor.endHour")}</label><input id="editor-agenda-end-hour" type="number" min="1" max="24" value={config.timeRangeEnd} onChange={(e) => onChange({ timeRangeEnd: Number(e.target.value) })} className={inputClass} /></div>
      </div>
      <label className={checkboxClass}><input type="checkbox" checked={config.showRoomName} onChange={(e) => onChange({ showRoomName: e.target.checked })} /> {t("editor.showRoomName")}</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.highlightCurrent} onChange={(e) => onChange({ highlightCurrent: e.target.checked })} /> {t("editor.highlightCurrent")}</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.autoScroll} onChange={(e) => onChange({ autoScroll: e.target.checked })} /> {t("editor.autoScroll")}</label>
      {config.autoScroll && (
        <div>
          <label htmlFor="editor-agenda-scroll-speed" className={labelClass}>{t("editor.autoScrollSpeed", { speed: config.autoScrollSpeed ?? 1 })}</label>
          <input id="editor-agenda-scroll-speed" type="range" min="1" max="10" step="1" value={config.autoScrollSpeed ?? 1} onChange={(e) => onChange({ autoScrollSpeed: Number(e.target.value) })} className="w-full" />
          <div className="flex justify-between text-xs text-[var(--color-muted-foreground)]"><span>{t("editor.slow")}</span><span>{t("editor.fast")}</span></div>
        </div>
      )}
      <div><label htmlFor="editor-agenda-max-events" className={labelClass}>{t("editor.maxEvents")}</label><input id="editor-agenda-max-events" type="number" min="5" max="50" value={config.maxEvents} onChange={(e) => onChange({ maxEvents: Number(e.target.value) })} className={inputClass} /></div>
    </div>
  );
}

function DayGridOptions({ config, onChange, labelClass, checkboxClass, inputClass }: { config: DayGridConfig; onChange: (p: Record<string, unknown>) => void; labelClass: string; checkboxClass: string; inputClass: string }) {
  const t = useTranslations("displays");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="editor-daygrid-start-hour" className={labelClass}>{t("editor.startHour")}</label><input id="editor-daygrid-start-hour" type="number" min="0" max="23" value={config.timeRangeStart} onChange={(e) => onChange({ timeRangeStart: Number(e.target.value) })} className={inputClass} /></div>
        <div><label htmlFor="editor-daygrid-end-hour" className={labelClass}>{t("editor.endHour")}</label><input id="editor-daygrid-end-hour" type="number" min="1" max="24" value={config.timeRangeEnd} onChange={(e) => onChange({ timeRangeEnd: Number(e.target.value) })} className={inputClass} /></div>
      </div>
      <label className={checkboxClass}><input type="checkbox" checked={config.showCurrentTimeLine} onChange={(e) => onChange({ showCurrentTimeLine: e.target.checked })} /> {t("editor.showCurrentTimeLine")}</label>
    </div>
  );
}

function WeekGridOptions({ config, onChange, checkboxClass }: { config: WeekGridConfig; onChange: (p: Record<string, unknown>) => void; checkboxClass: string }) {
  const t = useTranslations("displays");
  return (
    <div className="space-y-3">
      <label className={checkboxClass}><input type="checkbox" checked={config.showWeekends} onChange={(e) => onChange({ showWeekends: e.target.checked })} /> {t("editor.showWeekends")}</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.showCurrentDayHighlight} onChange={(e) => onChange({ showCurrentDayHighlight: e.target.checked })} /> {t("editor.highlightCurrentDay")}</label>
    </div>
  );
}

function InfoDisplayOptions({ config, onChange, labelClass, checkboxClass, inputClass }: { config: InfoDisplayConfig; onChange: (p: Record<string, unknown>) => void; labelClass: string; checkboxClass: string; inputClass: string }) {
  const t = useTranslations("displays");
  const tickerSpeedLabel = config.tickerSpeed <= 30 ? t("editor.tickerSlow") : config.tickerSpeed <= 60 ? t("editor.tickerMedium") : t("editor.tickerFast");
  return (
    <div className="space-y-3">
      <label className={checkboxClass}><input type="checkbox" checked={config.showClock} onChange={(e) => onChange({ showClock: e.target.checked })} /> {t("editor.showClock")}</label>
      {config.showClock && (
        <>
          <div><label htmlFor="editor-info-clock-format" className={labelClass}>{t("editor.clockFormat")}</label><select id="editor-info-clock-format" value={config.clockFormat} onChange={(e) => onChange({ clockFormat: e.target.value })} className={inputClass}><option value="24h">{t("editor.clock24h")}</option><option value="12h">{t("editor.clock12h")}</option></select></div>
          <label className={checkboxClass}><input type="checkbox" checked={config.showSeconds ?? false} onChange={(e) => onChange({ showSeconds: e.target.checked })} /> {t("editor.showSeconds")}</label>
          <div><label htmlFor="editor-info-clock-position" className={labelClass}>{t("editor.clockPosition")}</label><select id="editor-info-clock-position" value={config.clockPosition ?? "top-right"} onChange={(e) => onChange({ clockPosition: e.target.value })} className={inputClass}><option value="top-right">{t("editor.clockTopRight")}</option><option value="center">{t("editor.clockCenter")}</option></select></div>
        </>
      )}
      <label className={checkboxClass}><input type="checkbox" checked={config.showDate} onChange={(e) => onChange({ showDate: e.target.checked })} /> {t("editor.showDate")}</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.showTodayEvents} onChange={(e) => onChange({ showTodayEvents: e.target.checked })} /> {t("editor.showTodayEvents")}</label>
      <div><label htmlFor="editor-info-upcoming-days" className={labelClass}>{t("editor.upcomingDays")}</label><input id="editor-info-upcoming-days" type="number" min="1" max="14" value={config.upcomingDaysCount} onChange={(e) => onChange({ upcomingDaysCount: Number(e.target.value) })} className={inputClass} /></div>
      <label className={checkboxClass}><input type="checkbox" checked={config.tickerEnabled} onChange={(e) => onChange({ tickerEnabled: e.target.checked })} /> {t("editor.enableTicker")}</label>
      {config.tickerEnabled && (
        <>
          <div><label htmlFor="editor-info-ticker-messages" className={labelClass}>{t("editor.tickerMessages")}</label><textarea id="editor-info-ticker-messages" value={(config.tickerMessages || []).join("\n")} onChange={(e) => onChange({ tickerMessages: e.target.value.split("\n").filter(Boolean) })} rows={3} className={inputClass} /></div>
          <div>
            <label htmlFor="editor-info-ticker-speed" className={labelClass}>{t("editor.tickerSpeed", { speed: tickerSpeedLabel })}</label>
            <select id="editor-info-ticker-speed" value={config.tickerSpeed <= 30 ? "30" : config.tickerSpeed <= 60 ? "60" : "120"} onChange={(e) => onChange({ tickerSpeed: Number(e.target.value) })} className={inputClass}>
              <option value="30">{t("editor.tickerSlow")}</option>
              <option value="60">{t("editor.tickerMedium")}</option>
              <option value="120">{t("editor.tickerFast")}</option>
            </select>
          </div>
          <div>
            <label htmlFor="editor-info-ticker-separator" className={labelClass}>{t("editor.tickerSeparator")}</label>
            <input id="editor-info-ticker-separator" type="text" value={config.tickerSeparator ?? " \u2022\u2022\u2022 "} onChange={(e) => onChange({ tickerSeparator: e.target.value })} className={inputClass} placeholder="\u00b7 or | or \u2022\u2022\u2022" />
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{t("editor.tickerSeparatorHelp")}</p>
          </div>
        </>
      )}
    </div>
  );
}
