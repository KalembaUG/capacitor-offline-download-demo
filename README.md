# Capacitor offline download demo: ship a small app, download content after install

A working Capacitor (Ionic) example of keeping a mobile app small: the app ships only its core screen, downloads extra images **after install while the app is open**, shows progress, resumes after a failed download, and keeps everything on the phone for **offline use**.

Built by [Kalemba Jamil](https://appscounty.com/authors/kalemba-jamil) at [AppsCounty](https://appscounty.com) as the demo for an article on staying under the App Store's 200 MB mobile-data download limit.

| Core ready on first launch | Downloading extra content | Saved for offline use | Paused, resumes on retry |
|---|---|---|---|
| ![App home screen with the bundled lesson ready](screenshots/simulator/1-core-ready.png) | ![Placeholders and a progress bar while guides download](screenshots/simulator/2-downloading.png) | ![Downloaded crop guides shown as photos, saved offline](screenshots/simulator/3-saved-offline.png) | ![Download paused with 5 of 11 guides saved and a retry button](screenshots/simulator/4-paused-retry.png) |

*Screenshots: iPhone 15 Pro simulator, iOS 17.4, Capacitor 8.*

## Contents

- [Why download content after install?](#why-download-content-after-install)
- [How it works](#how-it-works)
- [Capacitor iOS: "TypeError: Request url is not HTTP/HTTPS"](#capacitor-ios-typeerror-request-url-is-not-httphttps)
- [IndexedDB or the Filesystem plugin?](#indexeddb-or-the-filesystem-plugin)
- [Run the demo](#run-the-demo)
- [FAQ](#faq)
- [Credits and licence](#credits-and-licence)

## Why download content after install?

Large apps lose installs. On iPhone, apps over **200 MB** ask for confirmation before downloading on mobile data, and many people simply wait for Wi-Fi or give up. On Google Play the main download is limited to 200 MB, and anything bigger has to be split into feature modules or asset packs.

A common fix is to ship only what the first screen needs and download the rest later: lesson media, maps, product images, offline content. This demo shows that pattern in plain JavaScript inside a Capacitor app, so it also works for apps built with Lovable, Bolt, Base44 or any React/Vite web app wrapped with Capacitor.

## How it works

All the code is in [`www/main.js`](www/main.js) (about 160 lines, no framework).

1. **Core first.** Today's lesson and its photo are bundled inside the app, so the first screen works offline with no download.
2. **Download on demand, while the app is open.** The 11 crop guides (about 0.6 MB) download only when the user taps Download. There are no background downloads, so the app needs no extra permissions, background services or notifications.
3. **Never a blank screen.** Shimmering placeholders and a progress bar ("Downloading 5 of 11") tell the user they can keep using the app.
4. **Resume, don't restart.** Each file is saved as soon as it arrives. On retry, files already saved are skipped, so a dropped connection costs only the missing files.
5. **Offline afterwards.** Saved files are read from the device, so the guides open without a connection.

## Capacitor iOS: "TypeError: Request url is not HTTP/HTTPS"

The first version saved files with the browser's **Cache Storage API** (`caches.open()` and `cache.put()`). It worked in Chrome and Safari, then failed inside the iOS app:

```
TypeError: Request url is not HTTP/HTTPS
```

**Why:** on iOS, Capacitor serves your app from `capacitor://localhost`. Cache Storage only accepts requests with `http` or `https` URLs, so `cache.put()` rejects every file loaded from the app's own `capacitor://` origin. On Android, Capacitor's default scheme is `https`, so the same code can work there and fail only on iPhone.

You can't configure your way out of it: Capacitor's `iosScheme` option can't be set to `http` or `https`, because WKWebView already handles those schemes.

**Fix used here:** store the downloaded files in **IndexedDB** as blobs, which works in the browser, on Android and on iOS.

## IndexedDB or the Filesystem plugin?

IndexedDB keeps this demo short and dependency-free. For a production app with large packs, prefer the [`@capacitor/filesystem`](https://capacitorjs.com/docs/apis/filesystem) plugin and save files in the app's data directory. Capacitor's [storage guide](https://capacitorjs.com/docs/guides/storage) warns that iOS can clear web storage, including IndexedDB, when the device runs low on space.

| | IndexedDB | `@capacitor/filesystem` |
|---|---|---|
| Works in browser too | Yes | No (native only) |
| Extra dependency | None | One plugin |
| Can iOS clear it when storage is low? | Yes | No, files live in the app's own folder |
| Good for | Demos, small caches | Large media and offline packs |

## Run the demo

Requirements: Node.js 18+ and Xcode for iOS.

```bash
git clone https://github.com/KalembaUG/capacitor-offline-download-demo.git
cd capacitor-offline-download-demo
npm install
npx cap sync ios
npx cap open ios
```

Run it from Xcode on a simulator or device. To try the web version only:

```bash
python3 -m http.server 4173 --directory www
```

### Hidden demo controls

There are no visible debug buttons, so screenshots show only the app:

- Tap **the status badge** ("Not downloaded", "Saved offline") to delete the saved guides.
- Tap **"Farm Lessons"** to toggle a slow connection.
- Tap **"Good morning"** to toggle a connection that drops halfway through the download.

## FAQ

**Does downloading after install get around the 200 MB limit?**
The limit applies to the app download from the store. Content your app fetches later is not part of that size, but keep it reasonable, and make the app useful before the extra content arrives.

**Why not download in the background when the app is closed?**
Background transfers bring extra rules: on Android a foreground service with a visible notification (or WorkManager), and on iOS background URL sessions. Downloading while the app is open keeps the app simple and is enough for many apps.

**Does this work on Android?**
Yes. The code is plain web code and runs the same in Capacitor's Android WebView. Add the platform with `npm install @capacitor/android && npx cap add android`.

**Can I use this in a Lovable or Bolt app?**
Yes. Wrap the app with Capacitor, then adapt `download()` in `www/main.js` to fetch your content from your server or CDN instead of the bundled `pack/` folder.

## Credits and licence

- Code: [MIT](LICENSE), by [Kalemba Jamil](https://appscounty.com/authors/kalemba-jamil), [AppsCounty](https://appscounty.com). We fix vibe-coded apps and ship web apps to the App Store and Google Play.
- Photos: from Unsplash under the [Unsplash License](https://unsplash.com/license), not covered by the MIT licence. Sources are listed in [PHOTOS.md](PHOTOS.md).
