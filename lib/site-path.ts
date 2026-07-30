const configuredBasePath = process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? "";

export const siteBasePath = configuredBasePath.replace(/\/$/, "");

export function sitePath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  return `${siteBasePath}${path}`;
}
