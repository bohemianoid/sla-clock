import * as path from 'path';
import {
  app,
  BrowserWindow,
  Menu,
  MenuItemConstructorOptions,
  Tray
} from 'electron'
import {
  is,
  showAboutWindow
} from 'electron-util';
import isURL = require('is-url-superb');
import config from './config';
import {
  debugSubmenu,
  getPreferencesSubmenu,
  getQuickPreferencesSubmenu,
  helpSubmenu,
  logOutMenuItem
} from './menu';

let tray: Tray | null = null;

function getMenuItems(): MenuItemConstructorOptions[] {
  const menuItems = [
    ...getQuickPreferencesSubmenu(),
    {
      type: 'separator'
    },
    logOutMenuItem,
    {
      type: 'separator'
    },
    {
      label: 'Preferences',
      submenu: getPreferencesSubmenu()
    },
    {
      role: 'help',
      submenu: helpSubmenu
    },
    {
      label: 'About',
      click() {
        showAboutWindow({});
      }
    }
  ];

  if (is.development) {
    menuItems.push({
      label: 'Debug',
      submenu: debugSubmenu
    });
  }

  return menuItems as MenuItemConstructorOptions[];
}

function getContextMenu(menuItems: MenuItemConstructorOptions[]): Menu {
  return Menu.buildFromTemplate([
    ...menuItems,
    {
      type: 'separator'
    },
    {
      role: 'quit'
    }
  ]);
}

export default {
  create: (win: BrowserWindow): void => {
    if (tray) {
      return;
    }

    tray = new Tray(getIconPath());
    tray.setContextMenu(getContextMenu(getMenuItems()));

    app.dock.hide();

    tray.on('drag-enter', () => {
      tray.setImage(getDropIconPath());
    });

    tray.on('drag-leave', () => {
      tray.setImage(getIconPath());
    });

    tray.on('drag-end', () => {
      tray.setImage(getIconPath());
    });

    tray.on('drop-text', (event: Event, text: string) => {
      if (isURL(text)) {
        win.loadURL(text);
        config.set('mailboxFolderURL', text);
      }
    });
  },

  setTitle: (title: string): void => {
    tray.setTitle(title);
  },

  updateMenu: (): void => {
    tray.setContextMenu(getContextMenu(getMenuItems()));
  },

  addMenuItems: (menuItems: MenuItemConstructorOptions[]): void => {
    tray.setContextMenu(getContextMenu([
      ...menuItems,
      {
        type: 'separator'
      },
      ...getMenuItems()
    ]));
  }
}

function getIconPath(): string {
  return path.join(__dirname, '..', 'static', 'iconTemplate.png');
}

function getDropIconPath(): string {
  return path.join(__dirname, '..', 'static', 'iconDropTemplate.png');
}
