import {
  BrowserWindow
} from 'electron';

export function getWindow(): BrowserWindow {
  const [win] = BrowserWindow.getAllWindows();
  return win;
}

export function sendAction<T>(action: string, args?: T): void {
  const win = getWindow();
  win.webContents.send(action, args);
}

export function reloadWindow(): void {
  const win = getWindow();
  win.webContents.reload();
}
