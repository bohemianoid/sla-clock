import Store = require('electron-store');

type StoreType = {
  mailboxFolderURL: string;
  timerView: boolean;
  hideClock: boolean;
  slaGeneral: {
    hours: number;
    minutes: number;
  };
  slaPriority: {
    hours: number;
    minutes: number;
  };
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

const schema: Store.Schema<StoreType> = {
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
  slaGeneral: {
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
      hours: 3,
      minutes: 0
    }
  },
  slaPriority: {
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
      hours: 0,
      minutes: 30
    }
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
};

function updateSLASetting(store: Store<StoreType>): void {
  if (store.has('sla')) {
    store.set('slaGeneral.hours', store.get('sla'));
    // @ts-expect-error
    store.delete('sla');
  }
}

function migrate(store: Store<StoreType>): void {
  updateSLASetting(store);
}

const store = new Store<StoreType>({schema});
migrate(store);

export default store;
