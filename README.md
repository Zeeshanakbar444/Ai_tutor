# How to run the School AI Assistant properly

Modern browsers have strict security rules when you open a file directly (`file://`). To fix the "Unsafe attempt" and "404" errors, you should run this using a local server.

### Option 1: Using VS Code (Recommended)
1. Open the folder `d:\muneeb` in VS Code.
2. Install the **"Live Server"** extension by Ritwick Dey.
3. Click **"Go Live"** at the bottom right of VS Code.

### Option 2: Using Terminal (Node.js)
If you have Node.js installed, run:
```bash
npx serve
```
Then open the provided `localhost` link.

### Option 3: Using Python
If you have Python installed, run:
```bash
python -m http.server 8000
```
Then go to `http://localhost:8000` in your browser.

Running it this way removes the security restrictions and allows the Gemini API to connect properly! 😊
