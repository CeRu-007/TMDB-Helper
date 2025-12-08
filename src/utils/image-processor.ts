/**
 * 图像处理工具 - 提取图像主色调并生成适合的文本颜色
 */

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

interface ExtractedColors {
  primary: string;
  textColor: string;
  isDark: boolean;
}

/**
 * 从图像URL提取主色调
 * @param imageUrl 图像URL
 * @returns 包含主色调、文本颜色和亮度信息的Promise
 */
export async function extractImageColors(imageUrl: string): Promise<ExtractedColors> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      img.onload = () => {
        try {
          // 创建canvas
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            reject(new Error("无法创建canvas上下文"));
            return;
          }

          // 设置canvas大小为图像的缩略图大小
          const maxSize = 100; // 限制处理大小，提高性能
          const scale = Math.min(maxSize / img.width, maxSize / img.height);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          // 绘制图像到canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // 获取像素数据
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;
          
          // 提取主色调
          const dominantColor = getDominantColor(pixels);
          
          // 转换为十六进制颜色
          const primaryColor = rgbToHex(dominantColor);
          
          // 计算亮度并确定文本颜色
          const isDark = calculateLuminance(dominantColor) < 0.5;
          const textColor = isDark ? "#ffffff" : "#000000";
          
          resolve({
            primary: primaryColor,
            textColor,
            isDark
          });
      } catch (error) {
          
        reject(error);
      }
      };
      
      img.onerror = () => {
        reject(new Error("加载图像失败"));
      };
      
      img.src = imageUrl;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 从像素数据中提取主色调
 */
function getDominantColor(pixels: Uint8ClampedArray): ColorRGB {
  // 使用简化的颜色量化算法
  // 将颜色空间分成若干个桶
  const colorBuckets: Record<string, { count: number; r: number; g: number; b: number }> = {};
  
  // 遍历所有像素
  for (let i = 0; i < pixels.length; i += 4) {
    // 忽略完全透明的像素
    if (pixels[i + 3] < 128) continue;
    
    // 量化颜色，将RGB值分组到桶中（每16个值一组）
    const r = Math.floor(pixels[i] / 16) * 16;
    const g = Math.floor(pixels[i + 1] / 16) * 16;
    const b = Math.floor(pixels[i + 2] / 16) * 16;
    
    // 忽略接近黑色和白色的颜色
    if ((r + g + b < 80) || (r + g + b > 680)) continue;
    
    const key = `${r},${g},${b}`;
    
    if (!colorBuckets[key]) {
      colorBuckets[key] = { count: 0, r, g, b };
    }
    
    colorBuckets[key].count++;
  }
  
  // 找出出现次数最多的颜色
  let maxCount = 0;
  let dominantColor: ColorRGB = { r: 0, g: 0, b: 0 };
  
  for (const key in colorBuckets) {
    if (colorBuckets[key].count > maxCount) {
      maxCount = colorBuckets[key].count;
      dominantColor = {
        r: colorBuckets[key].r,
        g: colorBuckets[key].g,
        b: colorBuckets[key].b
      };
    }
  }
  
  // 如果没有找到有效的颜色，返回默认颜色
  if (maxCount === 0) {
    return { r: 100, g: 100, b: 100 };
  }
  
  return dominantColor;
}

/**
 * 将RGB颜色转换为十六进制颜色
 */
function rgbToHex(color: ColorRGB): string {
  const toHex = (value: number) => {
    const hex = value.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

/**
 * 计算颜色亮度
 * 使用相对亮度公式: 0.2126*R + 0.7152*G + 0.0722*B
 */
function calculateLuminance(color: ColorRGB): number {
  const { r, g, b } = color;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * 生成适合背景色的UI调色板
 * @param backgroundColor 背景色（十六进制）
 * @returns 包含各种UI元素颜色的对象
 */
export function generateColorPalette(backgroundColor: string) {
  // 将十六进制颜色转换为RGB
  const hexToRgb = (hex: string): ColorRGB => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  };
  
  const rgb = hexToRgb(backgroundColor);
  const isDark = calculateLuminance(rgb) < 0.5;
  
  // 根据背景色是深色还是浅色生成不同的调色板
    return {
    backgroundColor,
    textColor: isDark ? "#ffffff" : "#000000",
    primaryColor: backgroundColor,
    secondaryColor: isDark 
      ? `rgba(${rgb.r + 30}, ${rgb.g + 30}, ${rgb.b + 30}, 0.8)`
      : `rgba(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)}, 0.8)`,
    accentColor: isDark
      ? `hsl(${(rgb.r + rgb.g + rgb.b) % 360}, 70%, 60%)`
      : `hsl(${(rgb.r + rgb.g + rgb.b) % 360}, 70%, 40%)`,
    isDark
  };
} 