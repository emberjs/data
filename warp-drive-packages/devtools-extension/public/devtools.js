// Runs in the extension's devtools page. Its only job is to register the panel,
// whose UI is the Ember app built from `index.html`.
chrome.devtools.panels.create('WarpDrive', '', 'index.html');
