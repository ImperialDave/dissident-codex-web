const IN_APP_BROWSER_PATTERN =
  /FBAN|FBAV|Instagram|Twitter|Line\/|LinkedInApp|Snapchat|GSA\/|DuckDuckGo|MicroMessenger/i;

export function isInAppBrowser(userAgent?: string): boolean {
  if (typeof userAgent !== "string" || !userAgent) return false;
  return IN_APP_BROWSER_PATTERN.test(userAgent);
}