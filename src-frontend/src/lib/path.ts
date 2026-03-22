/**
 * 从文件路径中获取文件扩展名
 * @param filePath 文件路径
 * @returns 文件扩展名，若无扩展名则返回 null
 */
export function getFileExtension(filePath: string): string | null {
  const fileName = filePath.split(/[\\/]/).pop() ?? "";
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex <= 0) return null;

  return fileName.slice(dotIndex + 1);
}
