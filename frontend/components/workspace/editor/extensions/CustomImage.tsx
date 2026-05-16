import { mergeAttributes } from '@tiptap/core'
import Image from '@tiptap/extension-image'

const CustomImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      wrapType: {
        default: 'inline', // 默认内联模式
      },
      imgAlign: {
        default: 'left', // 默认左对齐
      },
      borderWidthPt: {
        default: 0,
      },
      showBorder: {
        default: false,
      },
      borderColor: {
        default: '#000000',
      },
      marginTopCm: {
        default: 0,
      },
      marginBottomCm: {
        default: 0,
      },
      marginLeftCm: {
        default: 0,
      },
      marginRightCm: {
        default: 0,
      },
      // 图片效果
      brightness: {
        default: 0,
      },
      contrast: {
        default: 0,
      },
      // 图片基础设置
      sizeMode: {
        default: 'original',
      },
      maxWidthCm: {
        default: null,
      },
      maxHeightCm: {
        default: null,
      },
      keepAspectRatio: {
        default: true,
      },
      // 行间距
      lineSpacing: {
        default: 1.0,
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImage:
        (options: {
          src: string;
          alt?: string;
          title?: string;
          wrapType?: string;
          imgAlign?: string;
          borderWidthPt?: number;
          showBorder?: boolean;
          borderColor?: string;
          marginTopCm?: number;
          marginBottomCm?: number;
          marginLeftCm?: number;
          marginRightCm?: number;
          brightness?: number;
          contrast?: number;
          sizeMode?: string;
          maxWidthCm?: number;
          maxHeightCm?: number;
          keepAspectRatio?: boolean;
          lineSpacing?: number;
        }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              alt: options.alt ?? '',
              title: options.title ?? '',
              wrapType: options.wrapType ?? 'inline',
              imgAlign: options.imgAlign ?? 'left',
              borderWidthPt: options.borderWidthPt ?? 0,
              showBorder: options.showBorder ?? false,
              borderColor: options.borderColor ?? '#000000',
              marginTopCm: options.marginTopCm ?? 0,
              marginBottomCm: options.marginBottomCm ?? 0,
              marginLeftCm: options.marginLeftCm ?? 0,
              marginRightCm: options.marginRightCm ?? 0,
              brightness: options.brightness ?? 0,
              contrast: options.contrast ?? 0,
              sizeMode: options.sizeMode ?? 'original',
              maxWidthCm: options.maxWidthCm ?? null,
              maxHeightCm: options.maxHeightCm ?? null,
              keepAspectRatio: options.keepAspectRatio ?? true,
              lineSpacing: options.lineSpacing ?? 1.0,
            },
          })
        },
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs: Record<string, string | number | boolean> = {
      'data-wrap-type': node.attrs.wrapType ?? 'inline',
      'data-img-align': node.attrs.imgAlign ?? 'left',
    }

    // 边框
    if (node.attrs.borderWidthPt > 0) {
      attrs['data-border-width'] = node.attrs.borderWidthPt
    }
    if (node.attrs.showBorder) {
      attrs['data-show-border'] = 'true'
    }
    if (node.attrs.borderColor) {
      attrs['data-border-color'] = node.attrs.borderColor
    }

    // 间距
    if (node.attrs.marginTopCm) {
      attrs['data-margin-top-cm'] = node.attrs.marginTopCm
    }
    if (node.attrs.marginBottomCm) {
      attrs['data-margin-bottom-cm'] = node.attrs.marginBottomCm
    }
    if (node.attrs.marginLeftCm) {
      attrs['data-margin-left-cm'] = node.attrs.marginLeftCm
    }
    if (node.attrs.marginRightCm) {
      attrs['data-margin-right-cm'] = node.attrs.marginRightCm
    }

    // 图片效果
    if (node.attrs.brightness !== 0) {
      attrs['data-brightness'] = node.attrs.brightness
    }
    if (node.attrs.contrast !== 0) {
      attrs['data-contrast'] = node.attrs.contrast
    }

    // 图片基础设置
    if (node.attrs.sizeMode && node.attrs.sizeMode !== 'original') {
      attrs['data-size-mode'] = node.attrs.sizeMode
    }
    if (node.attrs.maxWidthCm) {
      attrs['data-max-width-cm'] = node.attrs.maxWidthCm
    }
    if (node.attrs.maxHeightCm) {
      attrs['data-max-height-cm'] = node.attrs.maxHeightCm
    }
    if (!node.attrs.keepAspectRatio) {
      attrs['data-keep-aspect-ratio'] = 'false'
    }

    // 行间距
    if (node.attrs.lineSpacing && node.attrs.lineSpacing !== 1.0) {
      attrs['data-line-spacing'] = node.attrs.lineSpacing
    }

    return ['img', mergeAttributes(HTMLAttributes, attrs)]
  },
})

export default CustomImage
