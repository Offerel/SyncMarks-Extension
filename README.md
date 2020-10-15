# SyncMarks (Firefox)
This is a Webextension for Mozilla Firefox to share your bookmarks across WebDAV Shares. You can simply install the AddOn via Mozillas [AMO](https://addons.mozilla.org/addon/davmarks/) site. There is also a [Chrome version](https://github.com/Offerel/firefox_syncmarks/tree/chrome_n) available. The Chrome version is experimental at this time, i couldnt test it, since i didnt use Chrome.

You can use this plugin to export, import and sync your bookmarks to a WebDAV share of your choice or my [PHP Backend](https://github.com/Offerel/SyncMarks).

The bookmarks can be exported manually or optionally fully automatically. There are corresponding options in the addon settings.

The Export/Import process is compatible with Firefox Sync.

The exported bookmarks are also be compatible with the corresponding [Roundcube plugin](https://github.com/Offerel/roundcube_ffbookmarks), so that they can also be used in Roundcube.

### Permissions

There are some permissions needed, so that DAVMarks can work properly.

##### Access your data for all https sites

The WebDAV share or PHP backend can theoretically be located on any https url. Since I don't know beforehand which one this can be, the AddOn needs the permission to communicate with any https url. However, the data is only exchanged with the server specified in the settings.

##### Read and modify bookmarks

Since you export and import all your bookmarks, the AddOn needs access to them. Currently this API is supported on the desktop and on Kiwi on mobile. If the Mozilla implements this finally on mobile, it will work there to.

##### Storage

Here all the settings you specify are saved. This is only saved locally in your profile.

##### Notifications

If the AddOn finds some problems or would like to tell you how many bookmarks are imported, this is done with a notification. To a bug in Firefox mobile, notifications will not be displayed on Android. It will work again, when bug is fixed in Fennec.

##### Context menus

On desktop you can right click on a empty space at the page or on a link and cand push this link as notification  to another client. Since this API is not available on mobile, you cant use this feature there.
