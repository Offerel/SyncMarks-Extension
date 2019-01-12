# SyncMarks (Firefox)
This is a Webextension for Mozilla Firefox to share your bookmarks across WebDAV Shares. You can simply install the AddOn via Mozillas [AMO](https://addons.mozilla.org/addon/davmarks/) site. There is also a [Chrome version](https://github.com/Offerel/firefox_syncmarks/tree/chrome_n) available. The Chrome version is experimental at this time, i couldnt test it, since i didnt use Chrome.

You can use this plugin to export, import and sync your bookmarks to a WebDAV share of your choice or my [PHP Backend](https://github.com/Offerel/SyncMarks).

The bookmarks can be exported manually or optionally fully automatically. There are corresponding options in the addon settings.

The Export/Import process is compatible with Firefox Sync.

The exported bookmarks are also be compatible with the corresponding [Roundcube plugin](https://github.com/Offerel/roundcube_ffbookmarks), so that they can also be used in Roundcube.

### Permissions

There are some permissions needed, so that DAVMarks can work properly.

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
