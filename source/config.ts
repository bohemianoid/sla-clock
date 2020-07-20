import Store = require('electron-store');

type StoreType = {
  mailboxFolderURL: string;
  timerView: boolean;
  hideClock: boolean;
  sla: number;
  slaStart: {
    hours: number;
    minutes: number;
  };
  slaEnd: {
    hours: number;
    minutes: number;
  };
  filterPending: boolean;
};

const schema: {[Key in keyof StoreType]} = {
  mailboxFolderURL: {
    type: 'string',
    default: 'https://secure.helpscout.net/'
  },
  timerView: {
    type: 'boolean',
    default: true
  },
  hideClock: {
    type: 'boolean',
    default: false
  },
  sla: {
    type: 'number',
    default: 3
  },
  slaStart: {
    type: 'object',
    properties: {
      hours: {
        type: 'number'
      },
      minutes: {
        type: 'number'
      }
    },
    default: {
      hours: 9,
      minutes: 0
    }
  },
  slaEnd: {
    type: 'object',
    properties: {
      hours: {
        type: 'number'
      },
      minutes: {
        type: 'number'
      }
    },
    default: {
      hours: 17,
      minutes: 0
    }
  },
  filterPending: {
    type: 'boolean',
    default: true
  }
}

export default new Store<StoreType>({ schema });
