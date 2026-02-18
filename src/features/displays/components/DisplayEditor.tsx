"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { updateDisplayConfig, updateDisplay } from "../actions";
import { THEME_PALETTES, FONT_OPTIONS } from "../palettes";
import {
  type ThemeConfig,
  type BrandingConfig,
  type BackgroundConfig,
  type DisplayConfig,
  type RoomBookingConfig,
  type AgendaConfig,
  type DayGridConfig,
  type WeekGridConfig,
  type InfoDisplayConfig,
  DEFAULT_THEME,
  DEFAULT_BRANDING,
  DEFAULT_BACKGROUND,
  getDefaultLayoutConfig,
} from "../types";
import { toast } from "sonner";
import { Save, Palette, Layout, Image, Tag, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { DisplayPreview } from "./DisplayPreview";

interface DisplayEditorProps {
  displayId: string;
  layoutType: string;
  initialConfig: DisplayConfig;
  orientation?: string;
  roomName?: string;
  initialIpWhitelist?: string[];
}

type EditorTab = "layout" | "theme" | "branding" | "background";

export function DisplayEditor({ displayId, layoutType, initialConfig, orientation, roomName, initialIpWhitelist }: DisplayEditorProps) {
  const [config, setConfig] = useState<DisplayConfig>({
    theme: { ...DEFAULT_THEME, ...initialConfig?.theme },
    branding: { ...DEFAULT_BRANDING, ...initialConfig?.branding },
    background: { ...DEFAULT_BACKGROUND, ...initialConfig?.background },
    layout: { ...getDefaultLayoutConfig(layoutType), ...initialConfig?.layout },
  });
  const [activeTab, setActiveTab] = useState<EditorTab>("layout");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [securityOpen, setSecurityOpen] = useState((initialIpWhitelist ?? []).length > 0);
  const [ipWhitelistText, setIpWhitelistText] = useState((initialIpWhitelist ?? []).join("\n"));
  const ipSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoSave = useCallback((newConfig: DisplayConfig) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await updateDisplayConfig(displayId, newConfig as unknown as Record<string, unknown>);
      } catch {
        toast.error("Auto-save failed");
      }
    }, 1000);
  }, [displayId]);

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
        toast.warning(`Invalid IP/CIDR entries: ${invalid.join(", ")}`);
        return;
      }
      try {
        await updateDisplay(displayId, { ipWhitelist: lines });
      } catch {
        toast.error("Failed to save IP whitelist");
      }
    }, 1500);
  }, [displayId, validateIpEntry]);

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
        toast.warning(`Invalid IP/CIDR entries: ${invalidEntries.join(", ")}`);
      }
      const validIpLines = ipLines.filter((l) => validateIpEntry(l));

      await Promise.all([
        updateDisplayConfig(displayId, config as unknown as Record<string, unknown>),
        updateDisplay(displayId, { ipWhitelist: validIpLines }),
      ]);
      toast.success("Configuration saved");
    } catch {
      toast.error("Failed to save");
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
    { id: "layout", label: "Layout", icon: Layout },
    { id: "theme", label: "Theme", icon: Palette },
    { id: "branding", label: "Branding", icon: Tag },
    { id: "background", label: "Background", icon: Image },
  ];

  const inputClass = "w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--color-foreground)]";
  const checkboxClass = "flex items-center gap-2 text-sm text-[var(--color-foreground)]";

  return (
    <div className="flex gap-6">
      <div className="w-2/5 space-y-6">
        <div className="flex gap-1 rounded-lg bg-[var(--color-muted)]/10 p-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${activeTab === tab.id ? "bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm" : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"}`}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "layout" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Layout Options</h3>
            {layoutType === "ROOM_BOOKING" && <RoomBookingOptions config={config.layout as RoomBookingConfig} onChange={updateLayout} labelClass={labelClass} checkboxClass={checkboxClass} inputClass={inputClass} />}
            {layoutType === "AGENDA" && <AgendaOptions config={config.layout as AgendaConfig} onChange={updateLayout} labelClass={labelClass} checkboxClass={checkboxClass} inputClass={inputClass} />}
            {layoutType === "DAY_GRID" && <DayGridOptions config={config.layout as DayGridConfig} onChange={updateLayout} labelClass={labelClass} checkboxClass={checkboxClass} inputClass={inputClass} />}
            {layoutType === "WEEK_GRID" && <WeekGridOptions config={config.layout as WeekGridConfig} onChange={updateLayout} checkboxClass={checkboxClass} />}
            {layoutType === "INFO_DISPLAY" && <InfoDisplayOptions config={config.layout as InfoDisplayConfig} onChange={updateLayout} labelClass={labelClass} checkboxClass={checkboxClass} inputClass={inputClass} />}
          </div>
        )}

        {activeTab === "theme" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Theme Preset</h3>
            <div className="grid grid-cols-2 gap-2">
              {THEME_PALETTES.map((palette) => (
                <button key={palette.id} onClick={() => updateTheme(palette.theme)} className={`rounded-lg border p-3 text-left transition-colors ${config.theme.preset === palette.id ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"}`}>
                  <div className="flex gap-1 mb-2">
                    {[palette.theme.background, palette.theme.primary, palette.theme.free, palette.theme.busy].map((c, i) => (
                      <span key={i} className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className="text-xs font-medium text-[var(--color-foreground)]">{palette.name}</p>
                </button>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-foreground)] pt-2">Custom Colors</h3>
            {(["background", "foreground", "primary", "secondary", "free", "busy", "muted"] as const).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <input type="color" value={config.theme[key]} onChange={(e) => updateTheme({ [key]: e.target.value, preset: "custom" })} className="h-8 w-8 cursor-pointer rounded border border-[var(--color-border)]" />
                <span className="text-xs text-[var(--color-muted-foreground)] capitalize w-20">{key}</span>
                <input type="text" value={config.theme[key]} onChange={(e) => updateTheme({ [key]: e.target.value, preset: "custom" })} className="flex-1 rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-foreground)]" />
              </div>
            ))}
            <div>
              <label className={labelClass}>Font Family</label>
              <select value={config.theme.fontFamily} onChange={(e) => updateTheme({ fontFamily: e.target.value })} className={inputClass}>
                {FONT_OPTIONS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Base Font Size: {config.theme.baseFontSize}px</label>
              <input type="range" min="12" max="24" value={config.theme.baseFontSize} onChange={(e) => updateTheme({ baseFontSize: Number(e.target.value) })} className="w-full" />
            </div>
          </div>
        )}

        {activeTab === "branding" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Branding</h3>
            <div>
              <label className={labelClass}>Logo URL</label>
              <input type="text" value={config.branding.logoUrl} onChange={(e) => updateBranding({ logoUrl: e.target.value })} className={inputClass} placeholder="https://example.com/logo.svg" />
            </div>
            <div>
              <label className={labelClass}>Logo Position</label>
              <div className="flex gap-2">
                {(["top-left", "top-center", "top-right"] as const).map((pos) => (
                  <button key={pos} type="button" onClick={() => updateBranding({ logoPosition: pos })} className={`flex-1 rounded-md border px-3 py-2 text-xs transition-colors ${config.branding.logoPosition === pos ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"}`}>
                    {pos.replace("top-", "").charAt(0).toUpperCase() + pos.replace("top-", "").slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Logo Size</label>
              <div className="flex gap-2">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button key={size} type="button" onClick={() => updateBranding({ logoSize: size })} className={`flex-1 rounded-md border px-3 py-2 text-xs transition-colors ${config.branding.logoSize === size ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"}`}>
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <label className={checkboxClass}>
              <input type="checkbox" checked={config.branding.showPoweredBy} onChange={(e) => updateBranding({ showPoweredBy: e.target.checked })} />
              Show &quot;Powered by RoomCast&quot;
            </label>
          </div>
        )}

        {activeTab === "background" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Background</h3>
            <div>
              <label className={labelClass}>Type</label>
              <div className="flex gap-2">
                {(["solid", "gradient", "image"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => updateBackground({ type: t })} className={`flex-1 rounded-md border px-3 py-2 text-xs transition-colors ${config.background.type === t ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"}`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {config.background.type === "solid" && (
              <div className="flex items-center gap-3">
                <input type="color" value={config.background.color} onChange={(e) => updateBackground({ color: e.target.value })} className="h-8 w-8 cursor-pointer rounded border border-[var(--color-border)]" />
                <input type="text" value={config.background.color} onChange={(e) => updateBackground({ color: e.target.value })} className={inputClass} />
              </div>
            )}
            {config.background.type === "gradient" && (
              <>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-[var(--color-muted-foreground)] w-12">Start</label>
                  <input type="color" value={config.background.gradientStart} onChange={(e) => updateBackground({ gradientStart: e.target.value })} className="h-8 w-8 cursor-pointer rounded border border-[var(--color-border)]" />
                  <input type="text" value={config.background.gradientStart} onChange={(e) => updateBackground({ gradientStart: e.target.value })} className={inputClass} />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-[var(--color-muted-foreground)] w-12">End</label>
                  <input type="color" value={config.background.gradientEnd} onChange={(e) => updateBackground({ gradientEnd: e.target.value })} className="h-8 w-8 cursor-pointer rounded border border-[var(--color-border)]" />
                  <input type="text" value={config.background.gradientEnd} onChange={(e) => updateBackground({ gradientEnd: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Angle: {config.background.gradientAngle}&deg;</label>
                  <input type="range" min="0" max="360" value={config.background.gradientAngle} onChange={(e) => updateBackground({ gradientAngle: Number(e.target.value) })} className="w-full" />
                </div>
              </>
            )}
            {config.background.type === "image" && (
              <>
                <div>
                  <label className={labelClass}>Image URL</label>
                  <input type="text" value={config.background.imageUrl} onChange={(e) => updateBackground({ imageUrl: e.target.value })} className={inputClass} placeholder="https://example.com/bg.jpg" />
                </div>
                <div>
                  <label className={labelClass}>Opacity: {Math.round(config.background.imageOpacity * 100)}%</label>
                  <input type="range" min="0" max="1" step="0.05" value={config.background.imageOpacity} onChange={(e) => updateBackground({ imageOpacity: Number(e.target.value) })} className="w-full" />
                </div>
              </>
            )}
          </div>
        )}

        <div className="rounded-lg border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setSecurityOpen(!securityOpen)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/10 transition-colors rounded-lg"
          >
            <Shield className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            Security
            {securityOpen ? <ChevronDown className="ml-auto h-4 w-4 text-[var(--color-muted-foreground)]" /> : <ChevronRight className="ml-auto h-4 w-4 text-[var(--color-muted-foreground)]" />}
          </button>
          {securityOpen && (
            <div className="border-t border-[var(--color-border)] px-4 py-4 space-y-2">
              <label className={labelClass}>IP Whitelist (optional)</label>
              <textarea
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
                Restrict access to specific IPs or CIDR ranges. One per line. Leave empty for unrestricted access.
              </p>
            </div>
          )}
        </div>

        <button onClick={manualSave} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>

      <div className="w-3/5">
        <div className="sticky top-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">Live Preview</h3>
          <DisplayPreview
            displayId={displayId}
            layoutType={layoutType}
            config={config}
            orientation={orientation}
            roomName={roomName}
          />
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            Preview is scaled to fit. The actual display renders at full resolution.
          </p>
        </div>
      </div>
    </div>
  );
}

function RoomBookingOptions({ config, onChange, labelClass, checkboxClass, inputClass }: { config: RoomBookingConfig; onChange: (p: Record<string, unknown>) => void; labelClass: string; checkboxClass: string; inputClass: string }) {
  return (
    <div className="space-y-3">
      <label className={checkboxClass}><input type="checkbox" checked={config.showOrganizer} onChange={(e) => onChange({ showOrganizer: e.target.checked })} /> Show organizer name</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.showAttendeeCount} onChange={(e) => onChange({ showAttendeeCount: e.target.checked })} /> Show attendee count</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.showProgressBar} onChange={(e) => onChange({ showProgressBar: e.target.checked })} /> Show progress bar</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.showFreeSlots} onChange={(e) => onChange({ showFreeSlots: e.target.checked })} /> Show free time slots</label>
      <div><label className={labelClass}>Upcoming events</label><input type="number" min="1" max="10" value={config.futureEventCount} onChange={(e) => onChange({ futureEventCount: Number(e.target.value) })} className={inputClass} /></div>
      <div><label className={labelClass}>Clock format</label><select value={config.clockFormat} onChange={(e) => onChange({ clockFormat: e.target.value })} className={inputClass}><option value="24h">24-hour</option><option value="12h">12-hour</option></select></div>
    </div>
  );
}

function AgendaOptions({ config, onChange, labelClass, checkboxClass, inputClass }: { config: AgendaConfig; onChange: (p: Record<string, unknown>) => void; labelClass: string; checkboxClass: string; inputClass: string }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Start hour</label><input type="number" min="0" max="23" value={config.timeRangeStart} onChange={(e) => onChange({ timeRangeStart: Number(e.target.value) })} className={inputClass} /></div>
        <div><label className={labelClass}>End hour</label><input type="number" min="1" max="24" value={config.timeRangeEnd} onChange={(e) => onChange({ timeRangeEnd: Number(e.target.value) })} className={inputClass} /></div>
      </div>
      <label className={checkboxClass}><input type="checkbox" checked={config.showRoomName} onChange={(e) => onChange({ showRoomName: e.target.checked })} /> Show room name</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.highlightCurrent} onChange={(e) => onChange({ highlightCurrent: e.target.checked })} /> Highlight current event</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.autoScroll} onChange={(e) => onChange({ autoScroll: e.target.checked })} /> Auto-scroll</label>
      {config.autoScroll && (
        <div>
          <label className={labelClass}>Auto-scroll speed: {config.autoScrollSpeed ?? 1}</label>
          <input type="range" min="1" max="10" step="1" value={config.autoScrollSpeed ?? 1} onChange={(e) => onChange({ autoScrollSpeed: Number(e.target.value) })} className="w-full" />
          <div className="flex justify-between text-[10px] text-[var(--color-muted-foreground)]"><span>Slow</span><span>Fast</span></div>
        </div>
      )}
      <div><label className={labelClass}>Max events</label><input type="number" min="5" max="50" value={config.maxEvents} onChange={(e) => onChange({ maxEvents: Number(e.target.value) })} className={inputClass} /></div>
    </div>
  );
}

function DayGridOptions({ config, onChange, labelClass, checkboxClass, inputClass }: { config: DayGridConfig; onChange: (p: Record<string, unknown>) => void; labelClass: string; checkboxClass: string; inputClass: string }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Start hour</label><input type="number" min="0" max="23" value={config.timeRangeStart} onChange={(e) => onChange({ timeRangeStart: Number(e.target.value) })} className={inputClass} /></div>
        <div><label className={labelClass}>End hour</label><input type="number" min="1" max="24" value={config.timeRangeEnd} onChange={(e) => onChange({ timeRangeEnd: Number(e.target.value) })} className={inputClass} /></div>
      </div>
      <label className={checkboxClass}><input type="checkbox" checked={config.showCurrentTimeLine} onChange={(e) => onChange({ showCurrentTimeLine: e.target.checked })} /> Show current time line</label>
    </div>
  );
}

function WeekGridOptions({ config, onChange, checkboxClass }: { config: WeekGridConfig; onChange: (p: Record<string, unknown>) => void; checkboxClass: string }) {
  return (
    <div className="space-y-3">
      <label className={checkboxClass}><input type="checkbox" checked={config.showWeekends} onChange={(e) => onChange({ showWeekends: e.target.checked })} /> Show weekends</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.showCurrentDayHighlight} onChange={(e) => onChange({ showCurrentDayHighlight: e.target.checked })} /> Highlight current day</label>
    </div>
  );
}

function InfoDisplayOptions({ config, onChange, labelClass, checkboxClass, inputClass }: { config: InfoDisplayConfig; onChange: (p: Record<string, unknown>) => void; labelClass: string; checkboxClass: string; inputClass: string }) {
  const tickerSpeedLabel = config.tickerSpeed <= 30 ? "Slow" : config.tickerSpeed <= 60 ? "Medium" : "Fast";
  return (
    <div className="space-y-3">
      <label className={checkboxClass}><input type="checkbox" checked={config.showClock} onChange={(e) => onChange({ showClock: e.target.checked })} /> Show clock</label>
      {config.showClock && (
        <>
          <div><label className={labelClass}>Clock format</label><select value={config.clockFormat} onChange={(e) => onChange({ clockFormat: e.target.value })} className={inputClass}><option value="24h">24-hour</option><option value="12h">12-hour</option></select></div>
          <label className={checkboxClass}><input type="checkbox" checked={config.showSeconds ?? false} onChange={(e) => onChange({ showSeconds: e.target.checked })} /> Show seconds</label>
          <div><label className={labelClass}>Clock position</label><select value={config.clockPosition ?? "top-right"} onChange={(e) => onChange({ clockPosition: e.target.value })} className={inputClass}><option value="top-right">Top Right</option><option value="center">Center</option></select></div>
        </>
      )}
      <label className={checkboxClass}><input type="checkbox" checked={config.showDate} onChange={(e) => onChange({ showDate: e.target.checked })} /> Show date</label>
      <label className={checkboxClass}><input type="checkbox" checked={config.showTodayEvents} onChange={(e) => onChange({ showTodayEvents: e.target.checked })} /> Show today&apos;s events</label>
      <div><label className={labelClass}>Upcoming days</label><input type="number" min="1" max="14" value={config.upcomingDaysCount} onChange={(e) => onChange({ upcomingDaysCount: Number(e.target.value) })} className={inputClass} /></div>
      <label className={checkboxClass}><input type="checkbox" checked={config.tickerEnabled} onChange={(e) => onChange({ tickerEnabled: e.target.checked })} /> Enable ticker tape</label>
      {config.tickerEnabled && (
        <>
          <div><label className={labelClass}>Ticker messages (one per line)</label><textarea value={(config.tickerMessages || []).join("\n")} onChange={(e) => onChange({ tickerMessages: e.target.value.split("\n").filter(Boolean) })} rows={3} className={inputClass} /></div>
          <div>
            <label className={labelClass}>Ticker speed: {tickerSpeedLabel}</label>
            <select value={config.tickerSpeed <= 30 ? "30" : config.tickerSpeed <= 60 ? "60" : "120"} onChange={(e) => onChange({ tickerSpeed: Number(e.target.value) })} className={inputClass}>
              <option value="30">Slow</option>
              <option value="60">Medium</option>
              <option value="120">Fast</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Ticker separator</label>
            <input type="text" value={config.tickerSeparator ?? " \u2022\u2022\u2022 "} onChange={(e) => onChange({ tickerSeparator: e.target.value })} className={inputClass} placeholder="\u00b7 or | or \u2022\u2022\u2022" />
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Character(s) between ticker messages (e.g. &quot;\u00b7&quot; or &quot;|&quot;)</p>
          </div>
        </>
      )}
    </div>
  );
}
