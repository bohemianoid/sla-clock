import * as path from 'path';
import {
  app,
  Menu,
  MenuItemConstructorOptions,
  Tray
} from 'electron';
import {is} from 'electron-util';
import isURL = require('is-url-superb');
import config from './config';
import {
  checkUpdateMenuItem,
  debugSubmenu,
  getPreferencesSubmenu,
  getQuickPreferencesSubmenu,
  getHelpScoutMenuItem,
  helpSubmenu,
  logOutMenuItem
} from './menu';
import {getWindow} from './util';

let tray: Tray | undefined;
let isIdle = false;
let animation: NodeJS.Timer | null = null;

function getMenuItems(): MenuItemConstructorOptions[] {
  const menuItems = [
    getHelpScoutMenuItem(),
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
    checkUpdateMenuItem,
    {
      role: 'help',
      submenu: helpSubmenu
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
  create: () => {
    if (tray) {
      return;
    }

    tray = new Tray(getIconPath(isIdle));
    tray.setContextMenu(getContextMenu(getMenuItems()));

    app.dock.hide();

    tray.on('drag-enter', () => {
      tray.setImage(getIconPath(!isIdle));
    });

    tray.on('drag-leave', () => {
      tray.setImage(getIconPath(isIdle));
    });

    tray.on('drag-end', () => {
      tray.setImage(getIconPath(isIdle));
    });

    tray.on('drop-text', (event: Event, text: string) => {
      if (isURL(text)) {
        getWindow().loadURL(text);
        config.set('mailboxFolderURL', text);
      }
    });
  },

  setTitle: (title: string) => {
    tray.setTitle(title);
  },

  setIdle: (idle: boolean) => {
    tray.setImage(getIconPath(idle));
    isIdle = idle;
  },

  updateMenu: (menuItems: MenuItemConstructorOptions[]) => {
    tray.setContextMenu(getContextMenu([
      ...menuItems,
      {
        type: 'separator'
      },
      ...getMenuItems()
    ]));
  },

  startAnimation: () => {
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
        }, 400);
      })(frames);
    }
  },

  stopAnimation: () => {
    if (animation !== null) {
      clearTimeout(animation);
      animation = null;
    }
  }
};

function getIconPath(idle: boolean): string {
  const icon = idle ? 'iconIdleTemplate.png' : 'iconTemplate.png';

  return path.join(__dirname, '..', 'static', icon);
}
