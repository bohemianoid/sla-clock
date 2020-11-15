import {
  app,
  Menu,
  MenuItemConstructorOptions,
  shell
} from 'electron';
import debug = require('electron-debug');
import {
  appMenu,
  debugInfo,
  is,
  openNewGitHubIssue,
  openUrlMenuItem
} from 'electron-util';
import checkUpdate from './check-update';
import config from './config';
import {
  getWindow,
  sendAction
} from './util';

export function getHelpScoutMenuItem(): MenuItemConstructorOptions {
  return openUrlMenuItem({
    label: 'Open Help Scout',
    url: config.get('mailboxFolderURL')
  });
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
      }
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
      }
    },
    {
      label: `Hide ${config.get('timerView') ? 'Timer' : 'Clock'}`,
      type: 'checkbox',
      checked: config.get('hideClock'),
      click(menuItem) {
        config.set('hideClock', menuItem.checked);
        updateMenu();
        sendAction('send-ticket-list');
      }
    }
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
      }
    },
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click(menuItem) {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked
        });
        updateMenu();
        sendAction('send-ticket-list');
      }
    }
  ];
}

export const logOutMenuItem: MenuItemConstructorOptions = {
  label: 'Log Out',
  click() {
    sendAction('log-out');
  }
};

export const aboutMenuItem: MenuItemConstructorOptions = {
  label: `${app.getName()} ${app.getVersion()}`,
  enabled: false
};

export const helpSubmenu: MenuItemConstructorOptions[] = [
  openUrlMenuItem({
    label: 'Website',
    url: 'https://github.com/simonroth/sla-clock'
  }),
  openUrlMenuItem({
    label: 'Source Code',
    url: 'https://github.com/simonroth/sla-clock'
  }),
  {
    label: 'Report an Issue…',
    click() {
      const body = `
<!-- Please succinctly describe your issue and steps to reproduce it. -->


---

${debugInfo()}`;

      openNewGitHubIssue({
        user: 'simonroth',
        repo: 'sla-clock',
        body
      });
    }
  }
];

export const checkUpdateMenuItem: MenuItemConstructorOptions = {
  label: 'Check for Update',
  click() {
    checkUpdate();
  }
};

export const debugSubmenu: MenuItemConstructorOptions[] = [
  {
    label: 'Open DevTools',
    click() {
      debug.openDevTools(getWindow());
    }
  },
  {
    type: 'separator'
  },
  {
    label: 'Show Window',
    click() {
      getWindow().show();
    }
  },
  {
    label: 'Show Settings',
    click() {
      config.openInEditor();
    }
  },
  {
    label: 'Show App Data',
    click() {
      shell.openPath(app.getPath('userData'));
    }
  },
  {
    type: 'separator'
  },
  {
    label: 'Delete Settings',
    click() {
      config.clear();

      app.relaunch();
      app.quit();
    }
  },
  {
    label: 'Delete App Data',
    click() {
      shell.moveItemToTrash(app.getPath('userData'));

      app.relaunch();
      app.quit();
    }
  }
];

export default function updateMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    appMenu([
      {
        label: 'SLA Clock Preferences',
        submenu: [
          ...getQuickPreferencesSubmenu(),
          ...getPreferencesSubmenu()
        ]
      },
      checkUpdateMenuItem,
      {
        type: 'separator'
      },
      getHelpScoutMenuItem(),
      logOutMenuItem
    ]),
    {
      role: 'editMenu'
    },
    {
      role: 'help',
      submenu: helpSubmenu
    }
  ];

  if (is.development) {
    template.push({
      label: 'Debug',
      submenu: debugSubmenu
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  return menu;
}
