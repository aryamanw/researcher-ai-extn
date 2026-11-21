export function hasHostPermission(host) {
  return chrome.permissions.contains({ origins: [host] });
}

export function requestHostPermission(host) {
  return chrome.permissions.request({ origins: [host] });
}
