const EventEmitter = require('node:events');
const { Server } = require('socket.io');
const LAST_LINES = 10;
const fs = require('fs').promises;

class Watcher extends EventEmitter {
    constructor(server, filePath) {
        super();
        this.io = new Server(server);
        this.filePath = filePath;
        this.lastLines = 10;
        this.queue = [];
    }

    async keep_an_eye() {
        let file = null;
        try {
            const fileStats = await fs.stat(this.filePath);
            if (fileStats.size > this.lastLines) {
                file = await fs.open(this.filePath, 'r');
                const buffer = Buffer.alloc(fileStats.size - this.lastLines);
                await file.read(buffer, 0, fileStats.size - this.lastLines, this.lastLines);
                await file.close();

                const newLogs = buffer.toString().trim().split('\n');
                this.updateQueue(newLogs);
                this.lastLines = fileStats.size;

                this.emit('update', newLogs);
            }
        } catch (error) {
            console.log("Error while keeping an eye on the file", error);
        } finally {
            if (file) await file.close();
        }
    }

    updateQueue(newLogs) {
        this.queue = [...this.queue, ...newLogs].filter(log => log.length > 0).slice(-LAST_LINES);
    }

    getLastLogs() {
        return this.queue;
    }

    async init() {
        try {
            const file = await fs.open(this.filePath, 'r');
            const fileStats = await file.stat();

            const buffer = Buffer.alloc(Math.min(1024, fileStats.size));
            const { buffer: readBuffer } = await file.read(buffer, 0, buffer.length, Math.max(0, fileStats.size - buffer.length));
            const lines = readBuffer.toString().split('\n').slice(-LAST_LINES);
            this.updateQueue(lines);
            file.close();

            setInterval(() => this.keep_an_eye(), 1000);

            this.io.on('connection', (socket) => {
                console.log("WebSocket connection established.");
                socket.emit('init', this.getLastLogs());
                this.on('update', (data) => {
                    console.log("WebSocket updates.");
                    socket.emit('update-log', data);
                });
            });

        } catch (error) {
            console.log("Error while initializing...", error);
        }
    }
}

module.exports = Watcher;
