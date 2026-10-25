"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const response_envelope_interceptor_1 = require("./common/interceptors/response-envelope.interceptor");
const backendRoot = (0, path_1.resolve)(__dirname, '..');
for (const name of ['.env', '.env.local']) {
    const envPath = (0, path_1.resolve)(backendRoot, name);
    if ((0, fs_1.existsSync)(envPath)) {
        (0, dotenv_1.config)({ path: envPath, override: name === '.env.local' });
    }
}
function isTransientPgCrash(err) {
    const msg = err instanceof Error ? err.message : String(err ?? '');
    return (/Connection terminated unexpectedly/i.test(msg) ||
        /Connection terminated due to connection timeout/i.test(msg) ||
        /Client network socket disconnected before secure TLS/i.test(msg) ||
        /ECONNRESET/i.test(msg));
}
process.on('uncaughtException', (err) => {
    if (isTransientPgCrash(err)) {
        common_1.Logger.warn(`Ignoring transient PostgreSQL crash: ${err.message}`, 'Bootstrap');
        return;
    }
    common_1.Logger.error(err.stack || err.message, undefined, 'Bootstrap');
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    if (isTransientPgCrash(reason)) {
        const msg = reason instanceof Error ? reason.message : String(reason);
        common_1.Logger.warn(`Ignoring transient PostgreSQL rejection: ${msg}`, 'Bootstrap');
        return;
    }
});
function errnoOf(err) {
    if (err && typeof err === 'object' && 'code' in err) {
        return String(err.code);
    }
    return undefined;
}
function parseCommaSeparatedOrigins(...values) {
    const origins = [];
    for (const v of values) {
        if (!v)
            continue;
        for (const part of v.split(',')) {
            const t = part.trim();
            if (t)
                origins.push(t);
        }
    }
    return origins;
}
function buildAllowedCorsOrigins() {
    const fromEnv = parseCommaSeparatedOrigins(process.env.CORS_ORIGINS, process.env.FRONTEND_ORIGINS);
    const builtIn = [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://lightslategrey-hamster-508054.hostingersite.com',
        'https://lightslategray-hamster-508054.hostingersite.com',
    ];
    return [...new Set([...fromEnv, ...builtIn])];
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    const allowedOrigins = buildAllowedCorsOrigins();
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Tenant-Id',
            'Idempotency-Key',
            'X-Idempotency-Key',
        ],
    });
    app.useGlobalFilters(new http_exception_filter_1.HttpErrorFilter());
    app.useGlobalInterceptors(new response_envelope_interceptor_1.ResponseEnvelopeInterceptor());
    const preferred = Number(process.env.PORT) || 3000;
    const maxAttempts = Math.max(1, Math.min(50, Number(process.env.PORT_FALLBACK_ATTEMPTS) || 15));
    const logger = new common_1.Logger('Bootstrap');
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const port = preferred + attempt;
        try {
            await app.listen(port);
            process.env.PORT = String(port);
            logger.log(`MediFlow API listening on http://localhost:${port}/api`);
            if (port !== preferred) {
                logger.warn(`Port ${preferred} was busy (another backend?). Using ${port}. Update mediflow .env VITE_API_BASE_URL or set PORT=${port} here.`);
            }
            return;
        }
        catch (err) {
            lastError = err;
            if (errnoOf(err) === 'EADDRINUSE' && attempt < maxAttempts - 1) {
                logger.warn(`Port ${port} in use (${errnoOf(err)}), trying ${port + 1}...`);
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}
bootstrap();
//# sourceMappingURL=main.js.map