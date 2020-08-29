# SyncMarks (Firefox)
This is a Webextension for Mozilla Firefox to share your bookmarks across WebDAV Shares. Since Version 1.x you can also the [PHP Backend](https://github.com/Offerel/SyncMarks) to sync bookmarks. You can simply install the AddOn via Mozillas [AMO](https://addons.mozilla.org/addon/davmarks/) site. Since version 1.14, the AddOn can also be used in Chromium and derivates (Google Chrome, Microsoft Edge, Chromium and others). Bookmarks can be synchronized accross this browsers. You can use this plugin to export, import and sync your bookmarks to a WebDAV share of your choice or my [PHP Backend](https://github.com/Offerel/SyncMarks).

In latest Firefox Mobile (> v79.x) the bookmark API seems to be also supported at least on Android. I didnt found a way to activate this AddOn currently, but there will be a way to get this to work in future also on Android. The AddOns can be installed in Kiwi Browser, but something prevent from using the settings. I have to investigate this issue, when i have more time, but basically the AddOn will work there.

The bookmarks can be exported manually or optionally fully automatically. There are corresponding options in the addon settings. The Export/Import process is compatible with Firefox Sync. The bookmarks are also be compatible with the corresponding [Roundcube plugin](https://github.com/Offerel/roundcube_ffbookmarks), so that they can also be used in Roundcube.

### Permissions

There are some permissions needed, so that SyncMarks can work properly.

##### access your data for all sites

The WebDAV share can theoretically be located on any website. Since I don't know beforehand which one this can be, the AddOn needs the permission to store the data on any page. However, the data is only exchanged with the server specified in the settings.

##### read and modify bookmarks

Since you export and import all your bookmarks, the AddOn needs access to them.

##### access browser tabs

This is needed since you can open the settings panel from within the AddOn

##### storage

Here all the settings you specify are saved.

##### notifications

If the AddOn finds some problems or would like to tell you how many bookmarks are imported, this is done with a notification.

##### webRequest

The bookmarks are imported and exported with a webRequest. Only https connections other http-basic-authentications are supported.
