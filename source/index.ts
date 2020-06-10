import { readFileSync } from 'fs';
import * as path from 'path';
import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell
} from 'electron';
import debug = require('electron-debug');
import { enforceMacOSAppLocation } from 'electron-util';
import isOnline from 'is-online';
import pWaitFor from 'p-wait-for';
import {
  formatTimer,
  getStatusIcon,
  updateClock
} from './clock';
import config from './config';
import createAppMenu from './menu';
import tray from './tray';

debug({
  devToolsMode: 'undocked'
});

let hiddenWindow: BrowserWindow;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function blockNotifications(): void {
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === 'notifications') {
        return callback(false);
      }

      callback(true);
    }
  );
}

function updateTray(url: string): void {
  const isLogin = (url: string): boolean => {
    const loginURL = 'https://secure.helpscout.net/members/login';
    return url.startsWith(loginURL);
  };

  const isDashboard = (url: string): boolean => {
    const dashboardURL = 'https://secure.helpscout.net/dashboard/';
    return url.startsWith(dashboardURL);
  }

  const isMailbox = (url: string): boolean => {
    const mailboxURL = 'https://secure.helpscout.net/mailbox';
    return url.startsWith(mailboxURL);
  }

  if (isLogin(url)) {
    tray.stopAnimation();
    tray.setIdle(true);
    tray.setTitle('');
    tray.updateMenu([]);
    app.dock.show();
    hiddenWindow.show();
  }

  if (isDashboard(url) || isMailbox(url)) {
    hiddenWindow.hide();
    app.dock.hide();
  }

  if (isDashboard(url)) {
    tray.stopAnimation();
    tray.setIdle(true);
    tray.updateMenu([
      {
        label: 'Drop a mailbox folder up here.',
        enabled: false
      }
    ]);
  }
}

async function offlineTray(): Promise<void> {
  tray.stopAnimation();
  tray.setIdle(true);
  tray.setTitle('');
  tray.updateMenu([
    {
      label: 'You appear to be offline.',
      enabled: false
    }
  ]);

  await pWaitFor(isOnline, {interval: 1000});
  hiddenWindow.loadURL(config.get('mailboxFolderURL'));
  tray.startAnimation();
}

function createHiddenWindow(): BrowserWindow {
  const win = new BrowserWindow({
    title: app.name,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'browser.js'),
      enableRemoteModule: false,
      contextIsolation: true
    }
  });

  blockNotifications();

  win.loadURL(config.get('mailboxFolderURL'));

  return win;
}

(async () => {
  await app.whenReady();

  enforceMacOSAppLocation();

  createAppMenu();
  hiddenWindow = createHiddenWindow();
  tray.create(hiddenWindow);
  tray.startAnimation();

  ipcMain.on('tickets', (event: Event, tickets: Ticket[]) => {
    const slaTickets = tickets
                         .filter(({ status }) => {
                           if (config.get('filterPending')) {
                             return status !== 2;
                           }

                           return true;
                         })
                         .map(ticket => {
                           ticket.waitingSince = new Date(ticket.waitingSince);
                           ticket.sla = new Date(ticket.sla);

                           return ticket;
                         })
                         .sort((a, b) => {
                           return a.waitingSince.getTime()
                                  - b.waitingSince.getTime();
                         });

    console.log(slaTickets);

    tray.stopAnimation();
    tray.setIdle(false);

    if (slaTickets.length) {
      updateClock(slaTickets[0].sla);
    } else {
      tray.setTitle(
        config.get('hideClock')
        ? ''
        : 'No SLA'
      );
    }

    const ticketItems = slaTickets.slice(0, 3).map(({ id, number, sla }) => {
      return {
        icon: getStatusIcon(sla),
        label: `${number.toString()} — ${formatTimer(sla)}`,
        click() {
          shell.openExternal(`https://secure.helpscout.net/conversation/${id}`);
        }
      }
    });
    tray.updateMenu([
      {
        label: hiddenWindow.getTitle().split(' - ')[0],
        enabled: false
      },
      ...ticketItems
    ]);
  });

  ipcMain.on('huzzah', (event: Event, huzzah: Huzzah) => {
    console.log(huzzah);

    tray.stopAnimation();
    tray.setIdle(false);
    tray.setTitle(
      config.get('hideClock')
      ? ''
      : `${huzzah.title.charAt(0)}${huzzah.title.slice(1).toLowerCase()}`
    );
    tray.updateMenu([
      {
        label: hiddenWindow.getTitle().split(' - ')[0],
        enabled: false
      },
      {
        label: huzzah.body,
        enabled: Boolean(huzzah.url),
        click() {
          shell.openExternal(huzzah.url);
        }
      }
    ]);
  });

  ipcMain.on('is-offline', async (event: Event) => {
    await offlineTray();
  });

  const { webContents } = hiddenWindow;

  webContents.on('did-start-loading', () => {
    tray.startAnimation();
  });

  webContents.on('did-fail-load', async () => {
    await offlineTray();
  });

  webContents.on('dom-ready', async () => {
    const url = webContents.getURL();

    updateTray(url);

    await webContents.executeJavaScript(
      readFileSync(path.join(__dirname, 'tickets-isolated.js'), 'utf8')
    );
  });

  webContents.on('will-navigate', (event, url) => {
    updateTray(url);
  });

  webContents.on('page-title-updated', () => {
    webContents.send('send-ticket-list');
  });
})();

ipcMain.handle('config-get', (event, key) => {
	return config.get(key);
});

ipcMain.handle('config-reset', (event, key) => {
  config.reset(key);
	return;
});
