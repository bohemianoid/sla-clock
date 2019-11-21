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
  helpScoutMenuItem,
  helpSubmenu,
  logOutMenuItem
} from './menu';

let tray: Tray | null = null;
let animation: NodeJS.Timer | null = null;

function getMenuItems(): MenuItemConstructorOptions[] {
  const menuItems = [
    helpScoutMenuItem,
    {
      type: 'separator'
    },
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

    tray = new Tray(getIconPath(false));
    tray.setContextMenu(getContextMenu(getMenuItems()));

    app.dock.hide();

    tray.on('drag-enter', () => {
      tray.setImage(getIconPath(true));
    });

    tray.on('drag-leave', () => {
      tray.setImage(getIconPath(false));
    });

    tray.on('drag-end', () => {
      tray.setImage(getIconPath(false));
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
  },

  startAnimation: (): void => {
    const frames = [
      getIconPath(true),
      path.join(__dirname, '..', 'static', 'iconFrame01Template.png'),
      path.join(__dirname, '..', 'static', 'iconFrame02Template.png'),
      path.join(__dirname, '..', 'static', 'iconFrame03Template.png')
    ];

    if (animation === null) {
      (function animate(frames) {
        animation = setTimeout(() => {
          tray.setImage(frames[0]);
          frames.push(frames.shift());

          animate(frames);
        }, 400)
      })(frames);
    }
  },

  stopAnimation: (isIdle: boolean): void => {
    if (animation !== null) {
      clearTimeout(animation);
      animation = null;

      tray.setImage(getIconPath(isIdle));
    }
  }
}

function getIconPath(isIdle: boolean): string {
  return isIdle ?
    path.join(__dirname, '..', 'static', 'iconIdleTemplate.png') :
    path.join(__dirname, '..', 'static', 'iconTemplate.png');
}
