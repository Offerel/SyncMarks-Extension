# SyncMarks Extension
**Synchronize Firefox, Edge and Chrome bookmarks using your own self-hosted server.**  
No cloud service.  
No account.  
No tracking.  
Your server, your data.  
  
[![Translation status](https://translate.codeberg.org/widget/syncmarks/browser-extension/svg-badge.svg)](https://translate.codeberg.org/engage/syncmarks/) [![Issues](https://img.shields.io/gitea/issues/open/Offerel/SyncMarks-Extension?gitea_url=https%3A%2F%2Fcodeberg.org%2F)](https://codeberg.org/Offerel/SyncMarks-Extension/issues) ![License](https://img.shields.io/github/license/Offerel/SyncMarks-Extension) [![Version](https://img.shields.io/amo/v/davmarks%40example.org?label=version)](https://codeberg.org/Offerel/SyncMarks-Extension/releases/latest)  
This is a Webextension for Browsers to sync and backup your bookmarks via the SyncMarks Backend. You can simply install the AddOn for Firefox via [AMO](https://addons.mozilla.org/firefox/addon/syncmarks/) or for Microsoft Edge via [Edge Store](https://microsoftedge.microsoft.com/addons/detail/ffobakhdlfhmnnkmimkbnbmnplihhphg). The Addon will work also on other Chromium derivates, including [Kiwi Browser](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser). You can use this plugin to export, import and sync your bookmarks to your backend.

Currently there is no bookmark API for Firefox on Android available, but most other features should work there. The AddOn can be installed and work with alls features in Kiwi Browser.

The bookmarks can be synced manually or automatically. There are corresponding options in the addon settings. The sync process is compatible with Browser internal Sync.

## Contribution
### Finding issues
If you want to help, there are several things you can do for me. If you find a bug, please use the [issue tracker](https://codeberg.org/Offerel/SyncMarks-Extension/issues) and create a report so that I can fix it. Github.com is only a mirror for compatibility reason.

### Translate
You can also contribute to the translation. This is very easy to do via Weblate. Some languages are already predefined, but you can add more languages at any time.
[![Translation status](https://translate.codeberg.org/widget/syncmarks/browser-extension/multi-auto.svg)](https://translate.codeberg.org/engage/syncmarks/)


## Used Permissions
There are some permissions needed for the Extension, to work properly.

### Read and modify bookmarks
Since this AddOn primary sync your bookmarks, it should be able to read, write, modify and delete bookmarks. 
### storage
The Addon has some options. These options needs to be saved somewhere. The options are saved only localy, but can be backed up to the server, if needed.
### notifications
In case of a important error or warning, this permission ensures, that can be notified about important issues or warnings.
### contextMenus
You can rightclick on links and tabs to send them to the server, without to open the side and bookmark it. The menu which apears on rightclick is a contextmenu. To build this menu with its entries, this permission is needed.
### tabs
To read the state of the current tab and to check if a similar tab is already opened. 
### optional host permissions
Since the Extenstion doesnt know about your server url, this is to ensure, that your server can be accessed. All data will be transmitted only via your own url. I choosed optional permission here, because in this case, you will get asked, if you want to allow communication between your client and only this specific url.
 
## Current open issues
There are some open browser issue, where i must use a workaround or if no workaround is possible, we have to wait for a upstream fix in Fennec/Chromium. This is a list of a issues im aware as of now:
- Bookmark API isn't supported on Android. There is hope, that this will be supported in the upcoming future, but currently it's unsupported at least on Android. In Kiwi Browser its working as expected. You can follow the Firefox bug at https://bugzilla.mozilla.org/show_bug.cgi?id=1625231. As some sort of workaround, the Addon displays the bookmarks from the WebApp in the popup page, when you click on the AddOn button.
- Context menu isn't supported on Firefox Android. The only workaround so far is to use the toolbar button.   