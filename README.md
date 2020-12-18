# SyncMarks Extension
This is a Webextension for Browsers to sync and backup your bookmarks via PHP or WebDAV. You can simply install the AddOn for Firefox via [AMO](https://addons.mozilla.org/addon/davmarks/) or for Microsoft Edge via [Edge Store](https://microsoftedge.microsoft.com/addons/detail/ffobakhdlfhmnnkmimkbnbmnplihhphg). The Addon will work also on other Chromium derivates, including [Kiwi Browser](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser). You can use this plugin to export, import and sync your bookmarks to your backend (WebDAV share / or [SyncMarks-Webapp](https://github.com/Offerel/SyncMarks).

Currently there is no bookmark API for Firefox on Android, but other features should work there. The AddOns can be installed in Kiwi Browser.

The bookmarks can be exported manually or automatically. There are corresponding options in the addon settings. The Export/Import process is compatible with Browser internal Sync. The bookmarks are also be compatible with the corresponding [Roundcube plugin](https://github.com/Offerel/roundcube_ffbookmarks), so that they can also be used in Roundcube.

### Permissions

There are some permissions needed.

##### Access your data for all https sites

The WebDAV share or PHP backend can theoretically be located on any https url. Since I don't know beforehand which one this will be, the AddOn needs the permission to communicate with any https url. However, the data is only exchanged with the server specified in the settings.

##### Read and modify bookmarks

Since you export and import all your bookmarks, the AddOn needs access to them. Currently this API is supported on the desktop and on Kiwi on mobile. If the Mozilla implements this finally on mobile, it will work there to.

##### Storage

This is to save the AddOn options. All data are only saved localy in your profile.

##### Notifications

The AddOn uses notifications to alert you about error occured or to notify you about pushes send from other clients.

##### Context menus

On desktop you can right click on a empty space at the page or on a link and can push this link as notification to other clients, including the Webapp. Since this API is not available on mobile, you can't use this feature there. On mobile you can use the toolbar button to send a page as notification.
 
### Current open bugs
There are some open browser issue, where i must use a workaround or if no workaround is possible, we have to wait for a upstream fix in Fennec/Chromium. This is a list of a issues im aware as of now:
* Bookmark API isn't supported on Android. There is hope, that this will be supported in the upcoming future, but currently it's unsupported at least on Android. In Kiwi Browser its working as expected. You can follow the Firefox bug at https://bugzilla.mozilla.org/show_bug.cgi?id=1625231
* Context menu isn't supported on Firefox Android. The only workaround so far is to use the toolbar button.
* ~~Notifications are completely broken in Fennec Android. As a workaround, i have added pushed urls also the logfile. You can follow the bug report at https://github.com/mozilla-mobile/fenix/issues/14993~~ Fixed at least in current Nightly. However clicking the notification is not working.
* activeTabs permission is missing url properties on Firefox Android. As a workaround i have re-added the tabs permission, to get the current url of the active tab. You can follow this bug at https://github.com/mozilla-mobile/fenix/issues/14093
* The settings page will not opened correctly in Firefox Android. The settings page will be opened invisible in a tab in the background, some other times it will opened multiple times. You can follow the bugreport at https://github.com/mozilla-mobile/fenix/issues/15742
* Startup sync can lead to unexpected nehavior. I have tried to fix that but there are situations, where the sync will not work as expected:
  * If the parentfolder can not be identified, a synced bookmark will not be removed, moved or added. I try to find a way to fallback to at least create a bookmark in folder "Other bookmarks".
  * If the bookmark or folder cant be identified, this may lead to bookmark/folder duplication. 
