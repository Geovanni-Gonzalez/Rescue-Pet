export function isPushSupported(): boolean {
  return 'Notification' in window;
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function showBrowserNotification(title: string, options?: NotificationOptions): void {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  new Notification(title, {
    icon: '/favicon.svg',
    ...options,
  });
}
