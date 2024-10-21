# SyncMarks Extension
[![Translation status](https://translate.codeberg.org/widget/syncmarks/browser-extension/svg-badge.svg)](https://translate.codeberg.org/engage/syncmarks/) [![Issues](https://img.shields.io/gitea/issues/open/Offerel/SyncMarks-Extension?gitea_url=https%3A%2F%2Fcodeberg.org%2F)](https://codeberg.org/Offerel/SyncMarks-Extension/issues) ![License](https://img.shields.io/github/license/Offerel/SyncMarks-Extension) [![Version](https://img.shields.io/amo/v/davmarks%40example.org?label=version)](https://codeberg.org/Offerel/SyncMarks-Extension/releases/latest)  
This is a Webextension for Browsers to sync and backup your bookmarks via the SyncMarks Backend. You can simply install the AddOn for Firefox via [AMO](https://addons.mozilla.org/firefox/addon/syncmarks/) or for Microsoft Edge via [Edge Store](https://microsoftedge.microsoft.com/addons/detail/ffobakhdlfhmnnkmimkbnbmnplihhphg). The Addon will work also on other Chromium derivates, including [Kiwi Browser](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser). You can use this plugin to export, import and sync your bookmarks to your backend.

Currently there is no bookmark API for Firefox on Android available, but most other features should work there. The AddOn can be installed and work with alls features in Kiwi Browser.

The bookmarks can be synced manually or automatically. There are corresponding options in the addon settings. The sync process is compatible with Browser internal Sync.

## Contribution
### Find issues
If you want to help, there are several things you can do for me. If you find a bug, please use the issue tracker and create a report so that I can fix it.

### Translate
You can also contribute to the translation. This is very easy to do via Weblate. Some languages are already predefined, but you can add more languages at any time.
[![Translation status](https://translate.codeberg.org/widget/syncmarks/browser-extension/multi-auto.svg)](https://translate.codeberg.org/engage/syncmarks/)

## Issue Tracker
Since the main repository is on Codeberg.org, please use the [issue tracker at Codeberg.org](https://codeberg.org/Offerel/SyncMarks-Extension/issues). Github.com is only a mirror for compatibility reason.

## Used Permissions

There are some permissions needed.

### Read and modify bookmarks

Since you export and import all your bookmarks, the AddOn needs access to them. Currently this API is supported on the desktop and on Kiwi on mobile. If the Mozilla implements this finally on mobile, it will work there to.

### Storage

This is to save the AddOn options. 

### Notifications

The AddOn uses notifications to alert you about error occured or to notify you about pushes send from other clients.

### Context menus

On desktop you can right click on a empty space at the page or on a link and can push this link as notification to other clients, including the Webapp. Since this API is not available on mobile, you can't use this feature there. On mobile you can use the toolbar button to send a page as notification.
 
## Current open issues
There are some open browser issue, where i must use a workaround or if no workaround is possible, we have to wait for a upstream fix in Fennec/Chromium. This is a list of a issues im aware as of now:
- Bookmark API isn't supported on Android. There is hope, that this will be supported in the upcoming future, but currently it's unsupported at least on Android. In Kiwi Browser its working as expected. You can follow the Firefox bug at https://bugzilla.mozilla.org/show_bug.cgi?id=1625231. As some sort of workaround, the Addon displays the bookmarks from the WebApp in the popup page, when you click on the AddOn button.
- Context menu isn't supported on Firefox Android. The only workaround so far is to use the toolbar button.  
- Clicking the notification is not working on Android. The bug for this is now open since months. You can follow at https://github.com/mozilla-mobile/android-components/issues/7477 
- The settings page will not opened correctly in Firefox Android. The settings page will be opened invisible in a tab in the background, some other times it will opened multiple times. You can follow the bugreport at https://github.com/mozilla-mobile/fenix/issues/15742
