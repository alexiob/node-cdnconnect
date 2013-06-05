# CDNConncet.com Node.js client

Simple client for [www.cdconnect.com](http://www.cdnconnect.com) API.

## Install

	npm install node-cdnconnect

## Usage

Usage is quite simple, so just follow the examples below:

```javascript
CDNConnectClient = require('node-cdnconnect');

cdnClient = new CDNConnectClient({
   	appName: 'YOUR_CDN_APP_NAME'
    apiKey: 'YOUR_CDN_API_KEY',
});

// create a folder with a sub folder in the root: /testFolder/subFolder
cdnClient.mkdir('/testFolder/subfolder', function(err, data) {});

// upload a file to CDN folder. The PATH_TO_FILE basename will be used as the CDN file name.
cdnClient.writeFile('PATH_TO_FILE', '/testFolder', function(err, data) {});
// ask for stats about a file or folder
cdnClient.stat('/testFolder', function(err, data) {});
// rename a file or a folder
cdnClient.rename('/testFolder/subFolder', 'renamedSubFolder', function(err, data) {});

// delete a file or folder:
var moveToTrash = true; // false to delete permanently, otherwise send to the CND trash folder
cdnClient.unlink(newFile, moveToTrash, function(err, data) {});
```

For a complete descriptions of the `data` returned to your callback functions look at the [CDNConnect.com documentation](http://www.cdnconnect.com/docs/api/v1).