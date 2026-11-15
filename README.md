# GIFTvision

A static, mobile-friendly classroom attendance demo for GitHub Pages.

## Publish on GitHub Pages
1. Create a GitHub repository (for example, `giftvision`).
2. Upload `index.html` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)`, then Save.
6. Open the Pages URL after GitHub finishes publishing.

## Camera and face recognition
- Camera access requires HTTPS. GitHub Pages provides HTTPS.
- Allow camera permission in your browser.
- Face recognition uses face-api.js and its model files from public CDNs, so internet access is required.
- Front/back selection uses browser camera constraints. For external cameras, choose the external option and allow the browser to select an available camera; device-specific selection can vary by browser.

## ESP32
The connection tester calls `GET <base-url>/status`. ESP32 firmware must expose that endpoint and enable CORS for your GitHub Pages origin. This UI does not flash firmware or perform face recognition on the ESP32.

## Data and privacy
This is a frontend-only starter. Account details, face descriptors and attendance records are stored in the current browser's localStorage. They do not sync between devices and can be lost when browser storage is cleared. The local password is not server-side authentication. Obtain informed consent before collecting biometric data and provide a non-biometric alternative. Do not use this as a high-stakes or sole attendance mechanism without appropriate security, accuracy, accessibility and legal review.

## Files
- `index.html` — complete app (HTML, CSS and JavaScript in one file).
