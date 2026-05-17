"use client"

import type { ImageStyleConfig } from "@/types/editor-template"
import { ColorPicker, NumberInput } from "./StyleSlotRow"
import { Switch } from "@/components/ui/Switch"

interface ImageStyleEditorProps {
  imageStyles: ImageStyleConfig | undefined
  onChange: (patch: Partial<ImageStyleConfig>) => void
  disabled?: boolean
}

const WRAP_TYPES = [
  { value: "inline", label: "嵌入式" },
  { value: "square", label: "四周型" },
  { value: "tight", label: "紧密型" },
  { value: "through", label: "穿越型" },
  { value: "topAndBottom", label: "上下型" },
  { value: "behind", label: "衬于文字下方" },
]

const ALIGN_OPTIONS = [
  { value: "left", label: "左对齐" },
  { value: "center", label: "居中" },
  { value: "right", label: "右对齐" },
]

const WRAP_TEXT_OPTIONS = [
  { value: "max", label: "最多文字" },
  { value: "left", label: "只在左侧" },
  { value: "right", label: "只在右侧" },
  { value: "min", label: "最少文字" },
]

interface FlatState {
  wrapType: string
  horizontalAlign: string
  borderColor: string
  borderWidthPt: number
  brightness: number
  contrast: number
  wrapTextBy: string
  distanceLeft: number
  distanceRight: number
  distanceTop: number
  distanceBottom: number
  showBorder: boolean
  spacingMarginTop: number
  spacingMarginBottom: number
  spacingMarginLeft: number
  spacingMarginRight: number
  sizeMode: string
  maxWidthCm: number
  maxHeightCm: number
  keepAspectRatio: boolean
  lineSpacing: number
}

function mapToFlat(cfg: ImageStyleConfig | undefined): FlatState {
  const pos = cfg?.position ?? {}
  const sty = cfg?.style ?? {}
  const tw = cfg?.textWrap ?? {}
  const dist = tw?.distanceMm ?? {}
  const spacing = cfg?.spacing ?? {}
  const border = cfg?.border ?? {}
  const borderWidthPt = border.widthPt ?? pos.borderWidthPt ?? 0
  const borderColor = border.color ?? pos.borderColor ?? ""
  return {
    wrapType: pos.wrapType ?? "inline",
    horizontalAlign: pos.horizontalAlign ?? "center",
    borderColor,
    borderWidthPt,
    brightness: sty.brightness ?? 0,
    contrast: sty.contrast ?? 0,
    wrapTextBy: tw.wrapTextBy ?? "max",
    distanceLeft: dist.left ?? 0,
    distanceRight: dist.right ?? 0,
    distanceTop: dist.top ?? 0,
    distanceBottom: dist.bottom ?? 0,
    showBorder: border.showBorder ?? false,
    spacingMarginTop: spacing.marginTopCm ?? 0.21,
    spacingMarginBottom: spacing.marginBottomCm ?? 0.21,
    spacingMarginLeft: spacing.marginLeftCm ?? 0,
    spacingMarginRight: spacing.marginRightCm ?? 0,
    sizeMode: pos.sizeMode ?? "original",
    maxWidthCm: pos.maxWidthCm ?? 12.7,
    maxHeightCm: pos.maxHeightCm ?? 12.7,
    keepAspectRatio: pos.keepAspectRatio !== false,
    lineSpacing: cfg?.lineSpacing ?? 1.0,
  }
}

function mapToNested(flat: FlatState): Partial<ImageStyleConfig> {
  return {
    position: {
      wrapType: flat.wrapType as any,
      horizontalAlign: flat.horizontalAlign as any,
      sizeMode: flat.sizeMode as "original" | "maxLimit",
      maxWidthCm: flat.sizeMode === "maxLimit" ? flat.maxWidthCm : undefined,
      maxHeightCm: flat.sizeMode === "maxLimit" ? flat.maxHeightCm : undefined,
      keepAspectRatio: flat.keepAspectRatio,
    },
    style: {
      brightness: flat.brightness || undefined,
      contrast: flat.contrast || undefined,
    },
    textWrap: {
      wrapTextBy: flat.wrapTextBy as "max" | "left" | "right" | "min",
      distanceMm: {
        left: flat.distanceLeft || undefined,
        right: flat.distanceRight || undefined,
        top: flat.distanceTop || undefined,
        bottom: flat.distanceBottom || undefined,
      },
    },
    border: {
      color: flat.borderColor || undefined,
      widthPt: flat.borderWidthPt || undefined,
      showBorder: flat.showBorder,
    },
    spacing: {
      marginTopCm: flat.spacingMarginTop,
      marginBottomCm: flat.spacingMarginBottom,
      marginLeftCm: flat.spacingMarginLeft,
      marginRightCm: flat.spacingMarginRight,
    },
    lineSpacing: flat.lineSpacing,
  }
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3.5">
      <h4 className="mb-3 text-xs font-semibold text-slate-600">{title}</h4>
      {children}
    </div>
  )
}

export function ImageStyleEditor({
  imageStyles,
  onChange,
  disabled,
}: ImageStyleEditorProps) {
  const flat = mapToFlat(imageStyles)

  const update = (patch: Partial<FlatState>) => {
    onChange(mapToNested({ ...flat, ...patch }))
  }

  return (
    <div className="space-y-3">
      <SectionCard title="位置与环绕">
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">文字环绕</label>
            <select
              value={flat.wrapType}
              onChange={(e) => update({ wrapType: e.target.value })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {WRAP_TYPES.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">水平对齐</label>
            <select
              value={flat.horizontalAlign}
              onChange={(e) => update({ horizontalAlign: e.target.value })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {ALIGN_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="图片边框设置">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">显示边框</span>
          <Switch
            checked={flat.showBorder}
            onChange={(v) => update({ showBorder: v })}
            disabled={disabled}
          />
        </div>
        {flat.showBorder && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">颜色</label>
              <ColorPicker
                value={flat.borderColor}
                onChange={(v) => update({ borderColor: v })}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">宽度 (pt)</label>
              <NumberInput
                value={flat.borderWidthPt}
                onChange={(v) => update({ borderWidthPt: v })}
                min={0}
                max={12}
                step={0.5}
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="图片编号设置">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">启用图片编号</span>
          <Switch
            checked={imageStyles?.numbering?.enabled ?? false}
            onChange={(v) =>
              onChange({ numbering: { ...imageStyles?.numbering, enabled: v } })
            }
            disabled={disabled}
          />
        </div>
      </SectionCard>

      <SectionCard title="图片间距设置">
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              key: "spacingMarginTop",
              label: "上方",
              value: flat.spacingMarginTop,
            },
            {
              key: "spacingMarginBottom",
              label: "下方",
              value: flat.spacingMarginBottom,
            },
            {
              key: "spacingMarginLeft",
              label: "左侧",
              value: flat.spacingMarginLeft,
            },
            {
              key: "spacingMarginRight",
              label: "右侧",
              value: flat.spacingMarginRight,
            },
          ].map(({ key, label, value }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-slate-500">{label} (cm)</label>
              <NumberInput
                value={value}
                onChange={(v) => {
                  const patch: Record<string, number | string | boolean> = { ...flat, [key]: v }
                  update(patch as any)
                }}
                min={0}
                max={10}
                step={0.05}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="图片基础设置">
        <div className="space-y-3">
          {/* 尺寸模式 */}
          <div className="space-y-1">
            <label className="text-xs text-slate-500">尺寸模式</label>
            <select
              value={flat.sizeMode}
              onChange={(e) => update({ sizeMode: e.target.value })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              <option value="original">固定尺寸</option>
              <option value="maxLimit">最大尺寸限制</option>
            </select>
          </div>

          {flat.sizeMode === "maxLimit" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">最大宽度 (cm)</label>
                <NumberInput
                  value={flat.maxWidthCm}
                  onChange={(v) => update({ maxWidthCm: v })}
                  min={1}
                  max={50}
                  step={0.1}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">最大高度 (cm)</label>
                <NumberInput
                  value={flat.maxHeightCm}
                  onChange={(v) => update({ maxHeightCm: v })}
                  min={1}
                  max={50}
                  step={0.1}
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          {/* 保持宽高比 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">保持宽高比</span>
              <Switch
                checked={flat.keepAspectRatio}
                onChange={(v) => update({ keepAspectRatio: v })}
                disabled={disabled}
              />
            </div>
            <p className="text-xs text-slate-400">仅影响 Word 导出，预览不体现</p>
          </div>

          {/* 行间距 */}
          <div className="space-y-1">
            <label className="text-xs text-slate-500">行间距</label>
            <select
              value={flat.lineSpacing}
              onChange={(e) => update({ lineSpacing: parseFloat(e.target.value) })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {[1.0, 1.15, 1.5, 2.0, 2.5, 3.0].map((v) => (
                <option key={v} value={v}>
                  {v}x{v === 1.0 ? "（单倍）" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="图片效果">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-500">亮度</label>
              <span className="text-xs font-medium text-slate-600">
                {flat.brightness}%
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={flat.brightness}
              onChange={(e) => update({ brightness: Number(e.target.value) })}
              disabled={disabled}
              className="w-full accent-slate-700"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-500">对比度</label>
              <span className="text-xs font-medium text-slate-600">
                {flat.contrast}%
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={flat.contrast}
              onChange={(e) => update({ contrast: Number(e.target.value) })}
              disabled={disabled}
              className="w-full accent-slate-700"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="文字环绕距离">
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">环绕方式</label>
            <select
              value={flat.wrapTextBy}
              onChange={(e) => update({ wrapTextBy: e.target.value })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {WRAP_TEXT_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "distanceLeft", label: "左侧" },
              { key: "distanceRight", label: "右侧" },
              { key: "distanceTop", label: "顶部" },
              { key: "distanceBottom", label: "底部" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-slate-500">{label} (mm)</label>
                <NumberInput
                  value={(flat as any)[key]}
                  onChange={(v) => update({ [key]: v })}
                  min={0}
                  max={50}
                  step={1}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
