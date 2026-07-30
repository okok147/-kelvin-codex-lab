const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function sitePath(path: string) {
  if (!path.startsWith("/")) return path;
  return `${configuredBasePath}${path}`;
}
