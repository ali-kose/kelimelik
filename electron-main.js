import { app, BrowserWindow } from "electron";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess;
let mainWindow;

function startServer() {
    serverProcess = spawn(
        process.platform === "win32" ? "node.exe" : "node",
        [path.join(__dirname, "server.js")],
        {
            cwd: __dirname,
            stdio: "inherit"
        }
    );
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1000,
        minHeight: 700,
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadURL("http://localhost:3001");
}

app.whenReady().then(() => {
    startServer();

    setTimeout(() => {
        createWindow();
    }, 1000);
});

app.on("window-all-closed", () => {
    if (serverProcess) {
        serverProcess.kill();
    }

    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("before-quit", () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});