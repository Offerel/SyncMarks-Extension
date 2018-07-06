# DAVMarks (Firefox)
This is a Webextension for Mozilla Firefox to share your bookmarks across WebDAV Shares. You can simply install the AddOn via Mozillas [AMO](https://addons.mozilla.org/addon/davmarks/) site.

You can use this plugin to export and import your bookmarks to a WebDAV share of your choice. This works with known solutions like NextCloud, OwnCloud, SabreDAV or any other WebDAV providers. To logon, the most used authentication, http-basic, is supported.

The bookmarks can be exported manually or optionally fully automatically. There are corresponding options in the addon settings.

The Export/Import process should be compatible with Firefox Sync since version 1.0 of this AddOn. But as you might know, sometimes the devils is a squirrel. So please take always a bookmark backup.

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
