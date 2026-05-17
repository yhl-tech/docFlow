'use client'

import type { TemplateConfig, TemplateDefinition, FontInfo } from '@/types/editor-template'
import type { EditSection } from './TemplateEditNav'
import { StyleEditor } from '@/components/workspace/editor/template/StyleEditor'
import { HeadingStyleEditor } from '@/components/workspace/editor/template/HeadingStyleEditor'
import { ParagraphStyleEditor } from '@/components/workspace/editor/template/ParagraphStyleEditor'
import { ListStyleEditor } from '@/components/workspace/editor/template/ListStyleEditor'
import { LayoutEditor } from '@/components/workspace/editor/template/LayoutEditor'
import { HeaderFooterEditor } from '@/components/workspace/editor/template/HeaderFooterEditor'
import { PageNumberEditor } from '@/components/workspace/editor/template/PageNumberEditor'
import { TableStyleEditor } from '@/components/workspace/editor/template/TableStyleEditor'
import { ImageStyleEditor } from '@/components/workspace/editor/template/ImageStyleEditor'
import { CodeBlockEditor } from '@/components/workspace/editor/template/CodeBlockEditor'

interface TemplateEditPanelProps {
  section: EditSection
  template: TemplateDefinition
  config: TemplateConfig
  fonts: FontInfo[]
  disabled: boolean
  onChange: (patch: Partial<TemplateConfig>) => void
}

export function TemplateEditPanel({ section, template, config, fonts, disabled, onChange }: TemplateEditPanelProps) {
  const patchStyle = (slotKey: string, patch: Record<string, unknown>) => {
    if (slotKey === '__englishFont__') {
      onChange({ englishFont: { ...(config as any).englishFont, ...patch } } as any)
    } else {
      onChange({ styles: { ...config.styles, [slotKey]: { ...(config.styles as any)?.[slotKey], ...patch } } } as any)
    }
  }

  const patchLayout = (patch: Record<string, unknown>) => {
    onChange({ layout: { ...config.layout, ...patch } as any })
  }

  const patchHeading = (level: string, patch: Record<string, unknown>) => {
    onChange({
      headingStyles: {
        ...config.headingStyles,
        [level]: { ...(config.headingStyles as any)?.[level], ...patch },
      },
    } as any)
  }

  return (
    <div className="template-panel-scroll min-w-0 flex-1 overflow-y-auto">
      <div className="px-6 py-5">
        {section === 'styles' && (
          <StyleEditor
            template={template as any}
            config={config as any}
            fonts={fonts}
            onStyleChange={(key, patch) => patchStyle(key, patch)}
          />
        )}
        {section === 'headingStyles' && (
          <HeadingStyleEditor
            headingStyles={(config as any).headingStyles}
            fonts={fonts}
            disabled={disabled}
            onChange={(level, patch) => patchHeading(level, patch)}
          />
        )}
        {section === 'paragraph' && (
          <ParagraphStyleEditor
            paragraphStyles={(config as any).paragraphStyles}
            layout={config.layout as any}
            editable={!disabled}
            onParagraphChange={(patch) => onChange({ paragraphStyles: { ...(config as any).paragraphStyles, ...patch } } as any)}
            onLayoutChange={patchLayout}
          />
        )}
        {section === 'listStyles' && (
          <ListStyleEditor
            listStyles={(config as any).listStyles}
            fonts={fonts}
            onChange={(patch) => onChange({ listStyles: { ...(config as any).listStyles, ...patch } } as any)}
            disabled={disabled}
          />
        )}
        {section === 'layout' && (
          <>
            <LayoutEditor
              template={template as any}
              layout={config.layout as any}
              onLayoutChange={patchLayout}
            />
            <div className="mt-6">
              <HeaderFooterEditor
                headerFooter={(config.layout as any)?.headerFooter}
                fonts={fonts}
                onChange={(patch) => patchLayout({ headerFooter: { ...(config.layout as any)?.headerFooter, ...patch } })}
                disabled={disabled}
              />
            </div>
          </>
        )}
        {section === 'pageNumber' && (
          <PageNumberEditor
            pageNumber={(config.layout as any)?.pageNumber}
            onChange={(patch) => patchLayout({ pageNumber: { ...(config.layout as any)?.pageNumber, ...patch } })}
            disabled={disabled}
          />
        )}
        {section === 'table' && (
          <TableStyleEditor
            tableStyles={(config as any).tableStyles}
            fonts={fonts}
            onChange={(patch) => onChange({ tableStyles: { ...(config as any).tableStyles, ...patch } } as any)}
            disabled={disabled}
          />
        )}
        {section === 'image' && (
          <ImageStyleEditor
            imageStyles={(config as any).imageStyles}
            onChange={(patch) => onChange({ imageStyles: { ...(config as any).imageStyles, ...patch } } as any)}
            disabled={disabled}
          />
        )}
        {section === 'codeBlock' && (
          <CodeBlockEditor
            codeBlockStyles={(config as any).codeBlockStyles}
            fonts={fonts}
            onChange={(patch) => onChange({ codeBlockStyles: { ...(config as any).codeBlockStyles, ...patch } } as any)}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  )
}
