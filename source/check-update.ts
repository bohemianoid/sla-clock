import {
  app,
  dialog,
  net,
  shell
} from 'electron';

async function showUpdateAvailableDialog(
  version: string, url: string
): Promise<void> {
  const result = await dialog.showMessageBox({
    message: 'An update is available',
    detail: `Version ${version} is available on GitHub.`,
    buttons: [
      'GitHub...',
      'Later'
    ],
    defaultId: 0,
    cancelId: 1
  });

  if (result.response === 0) {
    shell.openExternal(url);
  }
}

function showNoUpdateDialog(): void {
  dialog.showMessageBox({
    message: 'No update available',
    detail: `Version ${app.getVersion()} is the latest version.`,
    buttons: [
      'OK'
    ]
  });
}

function showOfflineDialog(): void {
  dialog.showMessageBox({
    message: 'You appear to be offline.',
    detail: `${app.name} requires a working internet connection.`,
    buttons: [
      'OK'
    ]
  })
}

export default (): void => {
  let latestRelease: any;

  const request = net.request(
    'https://api.github.com/repos/simonroth/sla-clock/releases/latest'
  );

  request.on('response', (response) => {
    response.on('data', (data) => {
      latestRelease = JSON.parse(data.toString());
    });

    response.on('end', () => {
      const url = latestRelease.html_url;
      const version = latestRelease.tag_name.substring(1);

      if (app.getVersion() !== version) {
        showUpdateAvailableDialog(version, url);
      } else {
        showNoUpdateDialog();
      }
    });
  });

  request.on('error', () => {
    showOfflineDialog();
  });

  request.end();
}
