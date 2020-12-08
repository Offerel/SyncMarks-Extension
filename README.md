# SyncMarks Extension
This is a Webextension for Browsers to sync and backup your bookmarks via PHP or WebDAV. You can simply install the AddOn for Firefox via [AMO](https://addons.mozilla.org/addon/davmarks/) or for Microsoft Edge via [Edge Store](https://microsoftedge.microsoft.com/addons/detail/ffobakhdlfhmnnkmimkbnbmnplihhphg). The Addon will work also on other Chromium derivates, including [Kiwi Browser](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser). You can use this plugin to export, import and sync your bookmarks to a WebDAV share of your choice or my [PHP Backend](https://github.com/Offerel/SyncMarks).

Currently there is no bookmark API for Firefox on Android, but other features should work there. The AddOns can be installed in Kiwi Browser.

The bookmarks can be exported manually or optionally fully automatically. There are corresponding options in the addon settings. The Export/Import process is compatible with Browser internal Sync. The bookmarks are also be compatible with the corresponding [Roundcube plugin](https://github.com/Offerel/roundcube_ffbookmarks), so that they can also be used in Roundcube.

### Permissions

There are some permissions needed, so that SyncMarks can work properly.

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
=======
If the AddOn finds some problems or would like to tell you how many bookmarks are imported, this is done with a notification.
 
### Current open bugs
There are some open issue, where i must use currently a workaround or if no workaround is possible, we have to wait for a upstream fix in Fennec project. THis is a list of a issues im aware as of now:
* Bookmark API isn't supported on Android. There is hope, that this will be supported in the upcoming future, but currently it's unsupported at least on Android. In Kiwi Browser its working as expected. You can follow the bug at https://bugzilla.mozilla.org/show_bug.cgi?id=1625231
* Context menu isn't supported on Fennec Android. The only workaround so far is to use again the popup view. That's why this function is now re-added again.
* ~~Notifications are completely broken in Fennec Android. As a workaround, i have added pushed urls also the logfile. You can follow the bug report at https://github.com/mozilla-mobile/fenix/issues/14993~~ Fixed at least in current Nightly
* activeTabs permission does not include url propertie on Fennec Android. As a workaround i have re-added the tabs permission, to get the url of an active tab. You can follow this bug at https://github.com/mozilla-mobile/fenix/issues/14093
* The settings will not opened correctly in Fennec Android. So the settings page will be opened sometimes invisible in a tab in the background, some other times it will opened multiple times. You can follow the bugreport at https://github.com/mozilla-mobile/fenix/issues/15742
