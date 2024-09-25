"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const ioredis_1 = __importDefault(require("ioredis"));
const redisClient = new ioredis_1.default({
    host: '192.168.0.104',
    port: 6379,
});
const SUB_DOMAIN = process.env.SUB_DOMAIN;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const publishLog = (log) => {
    redisClient.rpush('build-logs', JSON.stringify({ deploymentId: DEPLOYMENT_ID, log, time: Date.now() }));
    console.log(log);
};
function init() {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        publishLog('Finished cloning repository');
        console.log('Executing script.js');
        const outDirPath = path_1.default.join(__dirname, 'output');
        const p = (0, child_process_1.exec)(`cd ${outDirPath} && npm install && ${process.env.BUILD_COMMAND || 'npm run build'}`);
        (_a = p === null || p === void 0 ? void 0 : p.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => __awaiter(this, void 0, void 0, function* () {
            publishLog(data.toString());
        }));
        (_b = p === null || p === void 0 ? void 0 : p.stdout) === null || _b === void 0 ? void 0 : _b.on('error', (data) => __awaiter(this, void 0, void 0, function* () {
            publishLog('Error: ' + data.toString());
        }));
        (_c = p === null || p === void 0 ? void 0 : p.stdout) === null || _c === void 0 ? void 0 : _c.on('close', () => __awaiter(this, void 0, void 0, function* () {
            var _d;
            publishLog('Build Completed');
            yield redisClient.lpush('builds', JSON.stringify({ SUB_DOMAIN, containerId: process.env.HOSTNAME }));
            // @ts-ignore
            (_d = p === null || p === void 0 ? void 0 : p.stdin) === null || _d === void 0 ? void 0 : _d.resume(); // to allow workers to copy files before container closes
        }));
    });
}
init();
