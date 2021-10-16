import {readFileSync} from 'fs';
import * as path from 'path';
import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell
} from 'electron';
import debug = require('electron-debug');
import {enforceMacOSAppLocation} from 'electron-util';
import isOnline = require('is-online');
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
let isOffline = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function blockNotifications(): void {
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === 'notifications') {
        callback(false);
      } else {
        callback(true);
      }
    }
  );
}

function updateTray(url: string): void {
  const isLogin = (url: string): boolean => {
    const loginURL = 'https://secure.helpscout.net/members/login';
    return url.startsWith(loginURL);
  };

  const isTwoFactorAuth = (url: string): boolean => {
    const twoFactorAuthURL = 'https://secure.helpscout.net/members/2fa/';
    return url.startsWith(twoFactorAuthURL);
  };

  const isDashboard = (url: string): boolean => {
    const dashboardURL = 'https://secure.helpscout.net/';
    return url === dashboardURL;
  };

  const isMailbox = (url: string): boolean => {
    const mailboxURL = 'https://secure.helpscout.net/mailbox/';
    return url.startsWith(mailboxURL);
  };

  if (isLogin(url) || isTwoFactorAuth(url)) {
    tray.stopAnimation();
    tray.setIdle(true);
    tray.setTitle('');
    tray.updateMenu([
      {
        label: 'Log In',
        click() {
          hiddenWindow.show();
        }
      }
    ]);
    app.dock.show();
    hiddenWindow.show();
  }

  if (isDashboard(url) || isMailbox(url)) {
    hiddenWindow.hide();
    app.dock.hide();
  }

  if (isDashboard(url)) {
    if (url === config.get('mailboxFolderURL')) {
      tray.stopAnimation();
      tray.setIdle(true);
      tray.setTitle('');
      tray.updateMenu([
        {
          label: 'Drop a mailbox folder up here.',
          enabled: false
        }
      ]);
    } else {
      hiddenWindow.loadURL(config.get('mailboxFolderURL'));
    }
  }

  if (isMailbox(url)) {
    // eslint-disable-next-line unicorn/no-lonely-if
    if (!url.endsWith('/')) {
      hiddenWindow.loadURL(url + '/');
    }
  }
}

async function offlineTray(): Promise<void> {
  if (!(await isOnline())) {
    isOffline = true;

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
    isOffline = false;

    tray.startAnimation();
  }

  hiddenWindow.loadURL(config.get('mailboxFolderURL'));
}

function createHiddenWindow(): BrowserWindow {
  const win = new BrowserWindow({
    title: app.name,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'browser.js'),
      enableRemoteModule: false,
      contextIsolation: true,
      worldSafeExecuteJavaScript: true
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
  tray.create();
  tray.startAnimation();
  await offlineTray();

  ipcMain.on('tickets', (event: Event, tickets: Ticket[]) => {
    if (isOffline) {
      return;
    }

    const slaTickets = tickets
      .filter(({status}) => {
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
        return a.waitingSince.getTime() - b.waitingSince.getTime();
      })
      .sort((a, b) => {
        return a.sla.getTime() - b.sla.getTime();
      });

    console.log(slaTickets);

    tray.stopAnimation();
    tray.setIdle(false);

    if (slaTickets.length > 0) {
      updateClock(slaTickets[0].sla);
    } else {
      tray.setTitle(
        config.get('hideClock') ?
          '' :
          'No SLA'
      );
    }

    const ticketItems = slaTickets.slice(0, 3).map(({id, number, sla}) => {
      return {
        icon: getStatusIcon(sla),
        label: `${number.toString()} — ${formatTimer(sla)}`,
        click() {
          shell.openExternal(`https://secure.helpscout.net/conversation/${id}`);
        }
      };
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
    if (isOffline) {
      return;
    }

    console.log(huzzah);

    tray.stopAnimation();
    tray.setIdle(false);
    tray.setTitle(
      config.get('hideClock') ?
        '' :
        `${huzzah.title.charAt(0)}${huzzah.title.slice(1).toLowerCase()}`
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

  ipcMain.on('is-offline', async () => {
    await offlineTray();
  });

  const {webContents} = hiddenWindow;

  webContents.on('did-start-loading', () => {
    tray.startAnimation();
  });

  webContents.on('did-fail-load', async () => {
    await offlineTray();
  });

  webContents.on('did-stop-loading', () => {
    const url = webContents.getURL();

    updateTray(url);
  });

  webContents.on('dom-ready', async () => {
    await webContents.executeJavaScript(
      readFileSync(path.join(__dirname, 'tickets-isolated.js'), 'utf8')
    );
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
});
