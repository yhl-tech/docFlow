"use client"

import { Info } from "lucide-react"
import type {
  LayoutConfig,
  ParagraphStyleConfig,
} from "@/types/editor-template"
import { NumberInput } from "./StyleSlotRow"

const INDENT_OPTIONS = [
  { value: 0, label: "无" },
  { value: 2, label: "2字符" },
  { value: 4, label: "4字符" },
]

type AlignType = "left" | "center" | "right" | "justify"

const ALIGN_BUTTONS: {
  value: AlignType
  label: string
  icon: React.ReactNode
}[] = [
  {
    value: "left",
    label: "左对齐",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <line x1="2" y1="3" x2="12" y2="3" />
        <line x1="2" y1="7" x2="8" y2="7" />
        <line x1="2" y1="11" x2="10" y2="11" />
      </svg>
    ),
  },
  {
    value: "center",
    label: "居中",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <line x1="2" y1="3" x2="12" y2="3" />
        <line x1="4" y1="7" x2="10" y2="7" />
        <line x1="3" y1="11" x2="11" y2="11" />
      </svg>
    ),
  },
  {
    value: "right",
    label: "右对齐",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <line x1="2" y1="3" x2="12" y2="3" />
        <line x1="6" y1="7" x2="12" y2="7" />
        <line x1="4" y1="11" x2="12" y2="11" />
      </svg>
    ),
  },
  {
    value: "justify",
    label: "两端对齐",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <line x1="2" y1="3" x2="12" y2="3" />
        <line x1="2" y1="7" x2="12" y2="7" />
        <line x1="2" y1="11" x2="12" y2="11" />
      </svg>
    ),
  },
]

interface AlignButtonGroupProps {
  value: AlignType | undefined
  onChange: (v: AlignType) => void
  disabled?: boolean
}

/**
 * 段落对齐按钮组
 */
function AlignButtonGroup({
  value,
  onChange,
  disabled,
}: AlignButtonGroupProps) {
  return (
    <div className="gap-1  p-1">
      <div className="flex w-min border rounded-lg  border-slate-200 bg-white">
        {ALIGN_BUTTONS.map((btn) => (
          <button
            key={btn.value}
            type="button"
            title={btn.label}
            disabled={disabled}
            onClick={() => onChange(btn.value)}
            className={`flex h-6 w-6 items-center justify-center rounded text-slate-600 transition-colors ${
              value === btn.value
                ? "bg-slate-700 text-white"
                : "hover:bg-slate-100 disabled:opacity-50"
            }`}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ParagraphStyleEditorProps {
  paragraphStyles: ParagraphStyleConfig | undefined
  layout: LayoutConfig
  editable: boolean
  onParagraphChange: (patch: Record<string, unknown>) => void
  onLayoutChange: (patch: Record<string, unknown>) => void
}

export function ParagraphStyleEditor({
  paragraphStyles,
  layout,
  editable,
  onParagraphChange,
  onLayoutChange,
}: ParagraphStyleEditorProps) {
  return (
    <div>
      {editable === false && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          内置模板不可直接修改，请先复制为自己的模板再调整
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">行间距</label>
            <NumberInput
              value={paragraphStyles?.lineHeight ?? layout.defaultLineHeight}
              onChange={(v) => onParagraphChange({ lineHeight: v })}
              min={1}
              max={5}
              step={0.1}
              unit="倍"
              disabled={!editable}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">对齐方式</label>
            <AlignButtonGroup
              value={paragraphStyles?.align}
              disabled={!editable}
              onChange={(v) => onParagraphChange({ align: v })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">段前间距</label>
            <NumberInput
              value={
                paragraphStyles?.spacingBeforePt ??
                layout.defaultParagraphSpacingBeforePt
              }
              onChange={(v) => onParagraphChange({ spacingBeforePt: v })}
              min={0}
              max={72}
              step={1}
              unit="pt"
              disabled={!editable}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">段后间距</label>
            <NumberInput
              value={
                paragraphStyles?.spacingAfterPt ??
                layout.defaultParagraphSpacingAfterPt
              }
              onChange={(v) => onParagraphChange({ spacingAfterPt: v })}
              min={0}
              max={72}
              step={1}
              unit="pt"
              disabled={!editable}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-500">首行缩进</label>
          <select
            value={
              paragraphStyles?.firstLineIndentChars ??
              layout.defaultFirstLineIndentChars ??
              0
            }
            onChange={(e) =>
              onParagraphChange({
                firstLineIndentChars: Number(e.target.value),
              })
            }
            disabled={!editable}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          >
            {INDENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
