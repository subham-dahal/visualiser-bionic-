## Read this first if you're pulling the `react-ts-restruct` branch

**After pulling, you must run `npm install`.** The app will not start otherwise.
 
```bash
git pull
npm install
npm run dev
```

Then open **http://localhost:5173/** for working on UI.
Then open **http://localhost:5173/docs/prototype/index.html** for working on render.

If not working do a clean reinstall:
 
```bash
# macOS / Linux
rm -rf node_modules package-lock.json && npm install
 
# Windows 
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm install
```


---