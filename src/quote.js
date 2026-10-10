// "Request a quote" opens a form in a dialog and posts it to the Cloudflare
// Worker in /worker. Without JS the button is still a plain mailto link.
// Parcel 1's minifier can't parse ?. or ??, so this sticks to older syntax.
(() => {
    const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

    const CONFIG = LOCAL
        ? {
            endpoint: 'http://localhost:8787/quote',
            siteKey: '1x00000000000000000000AA', // Cloudflare's always-pass test key
        }
        : {
            endpoint: 'https://api.samwitte.com/quote',
            siteKey: '0x4AAAAAAFTPNs2RRN9q9YUF',
        };

    const FALLBACK = 'sam@samwitte.com';

    const dialog = document.querySelector('dialog.quote');
    const opener = document.querySelector('[data-quote]');
    if (!dialog || !opener || typeof dialog.showModal !== 'function') return;

    const form = dialog.querySelector('.quote-form');
    const submit = form.querySelector('[type="submit"]');
    const status = form.querySelector('.quote-status');
    const done = dialog.querySelector('.quote-done');
    const slot = form.querySelector('.quote-turnstile');

    // --- open / close ---

    opener.addEventListener('click', (e) => {
        e.preventDefault();
        dialog.showModal();
        loadTurnstile();
    });

    dialog.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]') || e.target === dialog) dialog.close();
    });

    dialog.addEventListener('close', () => {
        // start fresh next time, unless they're halfway through typing
        if (!done.hidden) {
            form.reset();
            form.hidden = false;
            done.hidden = true;
            resetTurnstile();
        }
    });

    // --- Turnstile: only loaded once someone opens the form ---

    let widget = null;
    let turnstileLoading = null;

    function loadTurnstile() {
        if (turnstileLoading) return turnstileLoading;
        submit.disabled = true;
        turnstileLoading = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        }).then(() => {
            widget = window.turnstile.render(slot, {
                sitekey: CONFIG.siteKey,
                theme: 'auto',
                size: 'flexible',
                callback: () => { submit.disabled = false; },
                'expired-callback': () => { submit.disabled = true; },
                'error-callback': () => {
                    setStatus(`Couldn't load the spam check. You can email me at ${FALLBACK} instead.`, true);
                },
            });
        }).catch(() => {
            turnstileLoading = null;
            setStatus(`Couldn't load the spam check. You can email me at ${FALLBACK} instead.`, true);
        });
        return turnstileLoading;
    }

    function resetTurnstile() {
        if (widget !== null && window.turnstile) {
            submit.disabled = true;
            window.turnstile.reset(widget);
        }
    }

    // --- submit ---

    const ERRORS = {
        invalid: 'Some fields need another look.',
        turnstile: "Couldn't confirm you're human. Give it another try.",
        rate_limited: "That's a few tries in a row. Wait a minute, then send again.",
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;

        submit.disabled = true;
        setStatus('Sending…');

        let result;
        try {
            const res = await fetch(CONFIG.endpoint, { method: 'POST', body: new FormData(form) });
            result = await res.json().catch(() => ({ error: 'unknown' }));
            if (res.ok && result.ok) {
                dialog.querySelector('.quote-done-email').textContent = form.elements.email.value;
                form.hidden = true;
                done.hidden = false;
                setStatus('');
                return;
            }
        } catch (err) {
            result = { error: 'network' };
        }

        if (result.fields) {
            for (const name of result.fields) {
                const input = form.elements[name];
                if (input) input.setAttribute('aria-invalid', 'true');
            }
        }
        setStatus(ERRORS[result.error] || `Something went wrong sending that. You can email me at ${FALLBACK} instead.`, true);
        resetTurnstile();
    });

    form.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));

    function setStatus(message, isError = false) {
        status.textContent = message;
        status.classList.toggle('is-error', isError);
    }
})();
