// Receives the quote form from samwitte.com and emails it to Sam through
// Proton's SMTP server. Nothing is stored; the only hops are Cloudflare
// (this Worker, Turnstile) and Proton.
//
// Every request runs the same gauntlet before anything is sent:
// origin check → size cap → rate limits → honeypot → field validation → Turnstile.

import { WorkerMailer } from 'worker-mailer';

const STAGES = {
    idea: 'Just an idea',
    breadboard: 'Breadboard or prototype',
    schematic: 'Schematic done, needs layout',
    review: 'Layout done, needs a review',
};

const MAX_LEN = { name: 100, email: 254, project: 4000, timeline: 200 };
const MAX_BODY_BYTES = 16 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname !== '/quote') return json({ error: 'not_found' }, 404);

        const cors = corsHeaders(request, env);
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: cors ? 204 : 403, headers: cors ?? {} });
        }
        if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);
        if (!cors) return json({ error: 'forbidden' }, 403);

        const length = Number(request.headers.get('Content-Length') ?? 0);
        if (length > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413, cors);

        // the visitor's address only ever lives in this request: it keys the
        // rate limit and goes to Turnstile, and is never logged or emailed
        const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
        const [perIp, global] = await Promise.all([
            env.PER_IP_LIMITER.limit({ key: ip }),
            env.GLOBAL_LIMITER.limit({ key: 'quote' }),
        ]);
        if (!perIp.success || !global.success) return json({ error: 'rate_limited' }, 429, cors);

        let form;
        try {
            form = await request.formData();
        } catch {
            return json({ error: 'bad_request' }, 400, cors);
        }

        // bots fill in every field, including the one people never see
        if (field(form, 'website')) return json({ ok: true }, 200, cors);

        const data = {
            name: field(form, 'name'),
            email: field(form, 'email'),
            stage: field(form, 'stage'),
            project: field(form, 'project', true),
            timeline: field(form, 'timeline'),
        };

        const invalid = validate(data);
        if (invalid.length) return json({ error: 'invalid', fields: invalid }, 400, cors);

        const human = await verifyTurnstile(field(form, 'cf-turnstile-response'), ip, env);
        if (!human) return json({ error: 'turnstile' }, 403, cors);

        try {
            await sendMail(data, request.cf?.country, env);
        } catch (err) {
            console.error('mail failed:', err?.message ?? err);
            return json({ error: 'mail_failed' }, 502, cors);
        }

        return json({ ok: true }, 200, cors);
    },
};

function corsHeaders(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
    if (!origin || !allowed.includes(origin)) return null;
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
    };
}

// Trimmed string value. Single-line fields also lose any line breaks, so
// nothing a visitor types can smuggle extra headers into the email.
function field(form, name, multiline = false) {
    const value = form.get(name);
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return multiline ? trimmed.replace(/\r\n?/g, '\n') : trimmed.replace(/[\r\n]+/g, ' ');
}

function validate(d) {
    const bad = [];
    if (!d.name || d.name.length > MAX_LEN.name) bad.push('name');
    if (!EMAIL_RE.test(d.email) || d.email.length > MAX_LEN.email) bad.push('email');
    if (!(d.stage in STAGES)) bad.push('stage');
    if (d.project.length < 10 || d.project.length > MAX_LEN.project) bad.push('project');
    if (d.timeline.length > MAX_LEN.timeline) bad.push('timeline');
    return bad;
}

async function verifyTurnstile(token, ip, env) {
    if (!token) return false;
    const body = new FormData();
    body.append('secret', env.TURNSTILE_SECRET);
    body.append('response', token);
    body.append('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body,
    });
    if (!res.ok) return false;
    const result = await res.json();
    return result.success === true;
}

async function sendMail(d, country, env) {
    const text = [
        'New quote request from samwitte.com',
        '',
        `Name:      ${d.name}`,
        `Email:     ${d.email}`,
        `Stage:     ${STAGES[d.stage]}`,
        `Timeline:  ${d.timeline || '(not given)'}`,
        '',
        "What they're building:",
        '',
        d.project,
        '',
        '--',
        `Sent from the quote form${country ? ` (visitor in ${country})` : ''}. Reply to answer them directly.`,
    ].join('\n');

    const email = {
        from: { name: 'samwitte.com', email: env.SMTP_USER },
        to: env.MAIL_TO,
        reply: { name: d.name, email: d.email },
        subject: `Quote request: ${d.name}`,
        text,
    };

    if (env.MAIL_DRY_RUN === 'true') {
        console.log('[dry run] would send:\n' + text);
        return;
    }

    await WorkerMailer.send(
        {
            host: env.SMTP_HOST,
            port: Number(env.SMTP_PORT),
            secure: false,
            startTls: true,
            credentials: { username: env.SMTP_USER, password: env.SMTP_TOKEN },
            authType: 'plain',
            socketTimeoutMs: 10000,
            responseTimeoutMs: 10000,
        },
        email,
    );
}

function json(body, status, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    });
}
