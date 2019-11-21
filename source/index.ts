import { readFileSync } from 'fs';
import * as path from 'path';
import {
  addDays,
  addHours,
  min,
  set
} from 'date-fns';
import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell
} from 'electron';
import debug = require('electron-debug');
import {
  formatTimer,
  stopClock,
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

function createHiddenWindow(): BrowserWindow {
  const folderURL = config.get('mailboxFolderURL');

  const win = new BrowserWindow({
    title: app.name,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'browser.js'),
      contextIsolation: true
    }
  });

  win.loadURL(folderURL);

  return win;
}

(async () => {
  await app.whenReady();

  createAppMenu();
  hiddenWindow = createHiddenWindow();
  tray.create(hiddenWindow);
  tray.startAnimation();

  ipcMain.on('tickets', (event: Event, tickets: Ticket[]) => {
    const slaTickets = tickets
                         .filter(({ noSLA }) => {
                           if (config.get('filterNoSLA')) {
                             return !noSLA;
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
        label: `${number.toString()} — ${formatTimer(sla)}`,
        click() {
          shell.openExternal(`https://secure.helpscout.net/conversation/${id}`);
        }
      }
    });
    tray.addMenuItems([
      {
        label: hiddenWindow.getTitle().split(' - ')[0],
        enabled: false
      },
      ...ticketItems
    ]);
  });

  ipcMain.on('huzzah', (event: Event, huzzah: Huzzah) => {
    console.log(huzzah);

    stopClock();
    tray.setTitle(
      config.get('hideClock')
      ? ''
      : `${huzzah.title.charAt(0)}${huzzah.title.slice(1).toLowerCase()}`
    );
    tray.addMenuItems([
      {
        label: huzzah.body,
        enabled: Boolean(huzzah.url),
        click() {
          shell.openExternal(huzzah.url);
        }
      }
    ]);
  });

  const { webContents } = hiddenWindow;

  webContents.on('did-start-loading', () => {
    tray.startAnimation();
  });

  webContents.on('did-fail-load', () => {
    tray.stopAnimation(true);
  });

  webContents.on('dom-ready', async () => {
    const url = webContents.getURL();

    const isLogin = (url: string): boolean => {
      const loginURL = 'https://secure.helpscout.net/members/login';
      return url.startsWith(loginURL);
    };

    const isDashboard = (url: string): boolean => {
      const dashboardURL = 'https://secure.helpscout.net/';
      return url === dashboardURL;
    }

    if (isLogin(url)) {
      stopClock();
      tray.setTitle('');
      tray.addMenuItems([]);
      app.dock.show();
      hiddenWindow.show();
    }

    if (isDashboard(url)) {
      tray.addMenuItems([
        {
          label: 'Drop Mailbox Folder',
          enabled: false
        }
      ]);
    }

    await webContents.executeJavaScript(
      readFileSync(path.join(__dirname, 'tickets-isolated.js'), 'utf8')
    );

    tray.stopAnimation(false);
  });

  webContents.on('will-navigate', (event, url) => {
    const isDashboard = (url: string): boolean => {
      const dashboardURL = 'https://secure.helpscout.net/dashboard/';
      return url.startsWith(dashboardURL);
    }

    const isMailbox = (url: string): boolean => {
      const mailboxURL = 'https://secure.helpscout.net/mailbox';
      return url.startsWith(mailboxURL);
    }

    if (isDashboard(url) || isMailbox(url)) {
      hiddenWindow.hide();
      app.dock.hide();
    }

    if (isDashboard(url)) {
      tray.addMenuItems([
        {
          label: 'Drop Mailbox Folder',
          enabled: false
        }
      ]);
    }
  });
})();
