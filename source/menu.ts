import os from 'node:os';
import process from 'node:process';
import {
  app,
  Menu,
  MenuItemConstructorOptions,
  shell,
} from 'electron';
import debug from 'electron-debug';
import newGithubIssueUrl from 'new-github-issue-url';
import checkUpdate from './check-update.js';
import config from './config.js';
import {
  getWindow,
  sendAction,
} from './util.js';

export function getHelpScoutMenuItem(): MenuItemConstructorOptions {
  return {
    label: 'Open Help Scout',
    click() {
      shell.openExternal(config.get('mailboxFolderUrl'));
    },
  };
}

export function getQuickPreferencesSubmenu(): MenuItemConstructorOptions[] {
  return [
    {
      label: 'View as Timer',
      type: 'radio',
      enabled: !config.get('hideClock'),
      checked: config.get('timerView'),
      click(menuItem) {
        config.set('timerView', menuItem.checked);
        updateMenu();
        sendAction('send-ticket-list');
      },
    },
    {
      label: 'View as Clock',
      type: 'radio',
      enabled: !config.get('hideClock'),
      checked: !config.get('timerView'),
      click(menuItem) {
        config.set('timerView', !menuItem.checked);
        updateMenu();
        sendAction('send-ticket-list');
      },
    },
    {
      label: `Hide ${config.get('timerView') ? 'Timer' : 'Clock'}`,
      type: 'checkbox',
      checked: config.get('hideClock'),
      click(menuItem) {
        config.set('hideClock', menuItem.checked);
        updateMenu();
        sendAction('send-ticket-list');
      },
    },
  ];
}

export function getPreferencesSubmenu(): MenuItemConstructorOptions[] {
  return [
    {
      label: 'Filter Status Pending',
      type: 'checkbox',
      checked: config.get('filterPending'),
      click(menuItem) {
        config.set('filterPending', menuItem.checked);
        updateMenu();
        sendAction('send-ticket-list');
      },
    },
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click(menuItem) {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
        });
        updateMenu();
        sendAction('send-ticket-list');
      },
    },
  ];
}

export const logOutMenuItem: MenuItemConstructorOptions = {
  label: 'Log Out',
  click() {
    sendAction('log-out');
  },
};

export const aboutMenuItem: MenuItemConstructorOptions = {
  label: `${app.getName()} ${app.getVersion()}`,
  enabled: false,
};

export const helpSubmenu: MenuItemConstructorOptions[] = [
  {
    label: 'Website',
    click() {
      shell.openExternal('https://github.com/bohemianoid/sla-clock');
    },
  },
  {
    label: 'Source Code',
    click() {
      shell.openExternal('https://github.com/bohemianoid/sla-clock');
    },
  },
  {
    label: 'Report an Issue…',
    click() {
      const body = `
<!-- Please succinctly describe your issue and steps to reproduce it. -->


---

${app.getName()} ${app.getVersion()}
Electron ${process.versions.electron}
${process.platform} ${os.release()}
Locale: ${app.getLocale()}`;

      const url = newGithubIssueUrl({
        user: 'bohemianoid',
        repo: 'sla-clock',
        body,
      });

      shell.openExternal(url);
    },
  },
];

export const checkUpdateMenuItem: MenuItemConstructorOptions = {
  label: 'Check for Update',
  click() {
    checkUpdate();
  },
};

export const debugSubmenu: MenuItemConstructorOptions[] = [
  {
    label: 'Open DevTools',
    click() {
      debug.openDevTools(getWindow());
    },
  },
  {
    type: 'separator',
  },
  {
    label: 'Show Window',
    click() {
      getWindow().show();
    },
  },
  {
    label: 'Show Settings',
    click() {
      config.openInEditor();
    },
  },
  {
    label: 'Show App Data',
    click() {
      shell.openPath(app.getPath('userData'));
    },
  },
  {
    type: 'separator',
  },
  {
    label: 'Delete Settings',
    click() {
      config.clear();

      app.relaunch();
      app.quit();
    },
  },
  {
    label: 'Delete App Data',
    click() {
      shell.trashItem(app.getPath('userData'));

      app.relaunch();
      app.quit();
    },
  },
];

export function getAppMenu(): MenuItemConstructorOptions[] {
  return [
    {
      label: app.getName(),
      submenu: [
        {
          role: 'about',
        },
        {
          type: 'separator',
        },
        {
          label: 'SLA Clock Preferences',
          submenu: [
            ...getQuickPreferencesSubmenu(),
            ...getPreferencesSubmenu(),
          ],
        },
        checkUpdateMenuItem,
        {
          type: 'separator',
        },
        getHelpScoutMenuItem(),
        logOutMenuItem,
        {
          type: 'separator',
        },
        {
          role: 'services',
        },
        {
          type: 'separator',
        },
        {
          role: 'hide',
        },
        {
          role: 'hideOthers',
        },
        {
          role: 'unhide',
        },
        {
          type: 'separator',
        },
        {
          role: 'quit',
        },
      ],
    },
  ];
}

export default function updateMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    ...getAppMenu(),
    {
      role: 'editMenu',
    },
    {
      role: 'help',
      submenu: helpSubmenu,
    },
  ];

  if (!app.isPackaged) {
    template.push({
      label: 'Debug',
      submenu: debugSubmenu,
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  return menu;
}
