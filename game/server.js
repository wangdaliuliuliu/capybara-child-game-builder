const http = require('http');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');

const ROOT_DIR = __dirname;
const DATA_DIR = process.env.GAME_DATA_DIR
    ? path.resolve(process.env.GAME_DATA_DIR)
    : path.join(ROOT_DIR, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const PORT = Number(process.env.PORT || 8001);
const HOST = process.env.HOST || '127.0.0.1';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 1024 * 1024;

// 这是本地首次运行和当前测试使用的固定账号。密码按公开试玩版约定显示在前端。
// 密码只用于生成哈希，不会写入 accounts.json。
const DEFAULT_ACCOUNT_SEEDS = [
    { id: 'child-1', nickname: '小月', password: process.env.GAME_PASSWORD_1 || '1010' },
    { id: 'child-2', nickname: '小溪', password: process.env.GAME_PASSWORD_2 || '2020' },
    { id: 'child-3', nickname: '小曦', password: process.env.GAME_PASSWORD_3 || '3030' },
    { id: 'child-4', nickname: '小伊', password: process.env.GAME_PASSWORD_4 || '4040' },
];

const sessions = new Map();
let accounts = [];

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (error, derivedKey) => {
            if (error) {
                reject(error);
                return;
            }
            resolve({ salt, hash: derivedKey.toString('hex') });
        });
    });
}

function verifyPassword(password, account) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, account.passwordSalt, 64, (error, derivedKey) => {
            if (error) {
                reject(error);
                return;
            }

            const expected = Buffer.from(account.passwordHash, 'hex');
            resolve(
                expected.length === derivedKey.length &&
                crypto.timingSafeEqual(expected, derivedKey)
            );
        });
    });
}

async function saveAccounts() {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

async function ensureAccounts() {
    await fsp.mkdir(DATA_DIR, { recursive: true });

    try {
        const saved = JSON.parse(await fsp.readFile(ACCOUNTS_FILE, 'utf8'));
        if (Array.isArray(saved) && saved.length === DEFAULT_ACCOUNT_SEEDS.length) {
            const namesById = Object.fromEntries(DEFAULT_ACCOUNT_SEEDS.map(seed => [seed.id, seed.nickname]));
            const renamed = saved.map(account => ({
                ...account,
                nickname: namesById[account.id] || account.nickname,
            }));
            if (renamed.some((account, index) => account.nickname !== saved[index].nickname)) {
                await fsp.writeFile(ACCOUNTS_FILE, JSON.stringify(renamed, null, 2), 'utf8');
            }
            return renamed;
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn('账号文件无法读取，将重新生成占位账号：', error.message);
        }
    }

    const generated = [];
    for (const seed of DEFAULT_ACCOUNT_SEEDS) {
        const password = await hashPassword(seed.password);
        generated.push({
            id: seed.id,
            nickname: seed.nickname,
            passwordSalt: password.salt,
            passwordHash: password.hash,
            highestScore: 0,
            highestLevel: 1,
        });
    }

    accounts = generated;
    await saveAccounts();
    return generated;
}

function publicAccount(account) {
    return {
        id: account.id,
        nickname: account.nickname,
        highestScore: account.highestScore || 0,
        highestLevel: account.highestLevel || 1,
    };
}

function sendJson(response, statusCode, payload) {
    const body = JSON.stringify(payload);
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
    });
    response.end(body);
}

function sendError(response, statusCode, message) {
    sendJson(response, statusCode, { ok: false, message });
}

function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        let body = '';

        request.setEncoding('utf8');
        request.on('data', chunk => {
            body += chunk;
            if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
                reject(new Error('请求内容过大'));
                request.destroy();
            }
        });
        request.on('end', () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error('请求格式不是有效的 JSON'));
            }
        });
        request.on('error', reject);
    });
}

function getSessionAccount(request) {
    const header = request.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const session = sessions.get(token);

    if (!session || session.expiresAt <= Date.now()) {
        if (token) sessions.delete(token);
        return null;
    }

    const account = accounts.find(item => item.id === session.accountId);
    return account || null;
}

function leaderboard() {
    return accounts
        .map(publicAccount)
        .sort((a, b) => {
            if (b.highestScore !== a.highestScore) return b.highestScore - a.highestScore;
            if (b.highestLevel !== a.highestLevel) return b.highestLevel - a.highestLevel;
            return a.nickname.localeCompare(b.nickname, 'zh-CN');
        });
}

async function handleApi(request, response, pathname) {
    if (request.method === 'OPTIONS') {
        response.writeHead(204, {
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        });
        response.end();
        return;
    }

    if (request.method === 'GET' && pathname === '/api/health') {
        sendJson(response, 200, { ok: true, service: 'capybara-bubble-tea-catcher' });
        return;
    }

    if (request.method === 'POST' && pathname === '/api/login') {
        const body = await readJsonBody(request);
        const account = accounts.find(item => item.id === body.accountId);
        const password = typeof body.password === 'string' ? body.password : '';

        if (!account || password.length < 1 || password.length > 64 || !(await verifyPassword(password, account))) {
            sendError(response, 401, '昵称或密码不正确，请再试一次。');
            return;
        }

        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, {
            accountId: account.id,
            expiresAt: Date.now() + SESSION_TTL_MS,
        });
        sendJson(response, 200, { ok: true, token, account: publicAccount(account) });
        return;
    }

    const account = getSessionAccount(request);
    if (!account) {
        sendError(response, 401, '请先登录。');
        return;
    }

    if (request.method === 'GET' && pathname === '/api/me') {
        sendJson(response, 200, { ok: true, account: publicAccount(account) });
        return;
    }

    if (request.method === 'GET' && pathname === '/api/leaderboard') {
        sendJson(response, 200, { ok: true, leaderboard: leaderboard() });
        return;
    }

    if (request.method === 'POST' && pathname === '/api/scores') {
        const body = await readJsonBody(request);
        const score = Number(body.score);
        const level = Number(body.level);

        if (!Number.isInteger(score) || score < 0 || score > 100000000 ||
            !Number.isInteger(level) || level < 1 || level > 1000000) {
            sendError(response, 400, '分数或关卡数据不正确。');
            return;
        }

        const previousScore = account.highestScore || 0;
        if (score > previousScore) {
            account.highestScore = score;
            account.highestLevel = level;
            await saveAccounts();
        } else if (score === previousScore && level > (account.highestLevel || 1)) {
            account.highestLevel = level;
            await saveAccounts();
        }

        sendJson(response, 200, { ok: true, account: publicAccount(account) });
        return;
    }

    sendError(response, 404, '接口不存在。');
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown; charset=utf-8',
};

async function serveStatic(request, response, pathname) {
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathname);
    } catch (error) {
        sendError(response, 400, '地址格式不正确。');
        return;
    }

    if (decodedPath === '/') decodedPath = '/index.html';
    const filePath = path.resolve(ROOT_DIR, `.${decodedPath}`);
    const relativePath = path.relative(ROOT_DIR, filePath);
    const isOutsideRoot = relativePath.startsWith('..') || path.isAbsolute(relativePath);
    const isPrivatePath = relativePath === 'server.js' ||
        relativePath === 'package.json' ||
        relativePath.startsWith(`data${path.sep}`) ||
        relativePath.startsWith(`scripts${path.sep}`) ||
        relativePath.startsWith('.git');

    if (isOutsideRoot || isPrivatePath) {
        sendError(response, 404, '文件不存在。');
        return;
    }

    try {
        const stat = await fsp.stat(filePath);
        if (!stat.isFile()) {
            sendError(response, 404, '文件不存在。');
            return;
        }

        const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        response.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        });

        if (request.method === 'HEAD') {
            response.end();
            return;
        }

        response.end(await fsp.readFile(filePath));
    } catch (error) {
        if (error.code === 'ENOENT') {
            sendError(response, 404, '文件不存在。');
            return;
        }
        throw error;
    }
}

async function requestHandler(request, response) {
    let url;
    try {
        url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    } catch (error) {
        sendError(response, 400, '请求地址不正确。');
        return;
    }

    try {
        if (url.pathname.startsWith('/api/')) {
            await handleApi(request, response, url.pathname);
            return;
        }

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            sendError(response, 405, '该请求方法不支持。');
            return;
        }

        await serveStatic(request, response, url.pathname);
    } catch (error) {
        console.error('请求处理失败：', error);
        if (!response.headersSent) {
            sendError(response, 500, '服务器暂时遇到问题，请稍后再试。');
        } else {
            response.end();
        }
    }
}

async function startServer() {
    accounts = await ensureAccounts();
    const server = http.createServer(requestHandler);
    server.listen(PORT, HOST, () => {
        console.log(`水豚奶茶接接乐已启动：http://${HOST}:${PORT}`);
        console.log(`数据文件：${ACCOUNTS_FILE}`);
    });
}

startServer().catch(error => {
    console.error('服务器启动失败：', error);
    process.exitCode = 1;
});
