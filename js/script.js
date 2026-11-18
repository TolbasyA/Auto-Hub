(function () {
    'use strict';

    var THEME_KEY = 'autohubTheme';
    var USER_KEY = 'autohubUser';

    /* ---------- safe localStorage helpers ---------- */
    function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function write(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ } }
    function remove(key) { try { localStorage.removeItem(key); } catch (e) { /* storage blocked */ } }
    function getUser() {
        try { return JSON.parse(read(USER_KEY)); } catch (e) { return null; }
    }

    /* ---------- 1. Theme ---------- */
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        var btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
            btn.setAttribute('aria-pressed', String(theme === 'dark'));
        }
    }

    function initTheme() {
        applyTheme(read(THEME_KEY) === 'dark' ? 'dark' : 'light');
        var btn = document.getElementById('theme-toggle');
        if (!btn) { return; }
        btn.addEventListener('click', function () {
            var next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
            write(THEME_KEY, next);
            applyTheme(next);
        });
    }

    /* ---------- 2. Sign-in ---------- */
    function renderAuthArea() {
        var area = document.getElementById('auth-area');
        if (!area) { return; }
        var user = getUser();
        area.textContent = '';
        if (user && user.name) {
            var hello = document.createElement('span');
            hello.className = 'auth-hello';
            hello.textContent = 'Hi, ' + user.name;
            var out = document.createElement('button');
            out.type = 'button';
            out.className = 'btn btn-outline-primary btn-sm';
            out.textContent = 'Sign out';
            out.addEventListener('click', signOut);
            area.appendChild(hello);
            area.appendChild(out);
        } else {
            var link = document.createElement('a');
            link.href = 'signin.html';
            link.className = 'btn btn-primary btn-sm';
            link.textContent = 'Sign in';
            area.appendChild(link);
        }
    }

    // Everything on the page that depends on the signed-in state.
    function renderUserUI() {
        var user = getUser();
        var signedIn = !!(user && user.name);
        renderAuthArea();

        var title = document.getElementById('home-title');
        if (title) {
            if (!title.dataset.original) { title.dataset.original = title.textContent; }
            title.textContent = signedIn ? 'Welcome back, ' + user.name : title.dataset.original;
        }

        if (signedIn) {
            var nameInput = document.getElementById('full-name');
            var emailInput = document.getElementById('email');
            if (nameInput && !nameInput.value) { nameInput.value = user.name; }
            if (emailInput && !emailInput.value && user.email) { emailInput.value = user.email; }
        }

        var formPanel = document.getElementById('signin-panel');
        var signedPanel = document.getElementById('signed-panel');
        if (formPanel && signedPanel) {
            formPanel.hidden = signedIn;
            signedPanel.hidden = !signedIn;
            var info = document.getElementById('signed-info');
            if (info && signedIn) { info.textContent = user.name + ' (' + user.email + ')'; }
        }
    }

    function signOut() {
        remove(USER_KEY);
        renderUserUI();
    }

    function setFieldError(input, message) {
        var box = document.getElementById(input.id + '-error');
        input.classList.toggle('is-invalid', !!message);
        input.setAttribute('aria-invalid', message ? 'true' : 'false');
        if (box) { box.textContent = message || ''; }
        return !message;
    }

    function initSignIn() {
        var form = document.getElementById('signin-form');
        if (!form) { return; }
        var nameInput = document.getElementById('si-name');
        var emailInput = document.getElementById('si-email');

        function validName() {
            var v = nameInput.value.trim();
            if (v.length < 2) { return setFieldError(nameInput, 'Enter at least 2 characters.'); }
            if (!/^[\p{L}][\p{L} .'-]*$/u.test(v)) { return setFieldError(nameInput, 'Use letters, spaces, dots, apostrophes, or hyphens only.'); }
            return setFieldError(nameInput, '');
        }
        function validEmail() {
            var v = emailInput.value.trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { return setFieldError(emailInput, 'Enter a valid email, for example name@example.com.'); }
            return setFieldError(emailInput, '');
        }

        nameInput.addEventListener('blur', validName);
        emailInput.addEventListener('blur', validEmail);

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var okName = validName();
            var okEmail = validEmail();
            if (!okName || !okEmail) { (okName ? emailInput : nameInput).focus(); return; }
            // Only non-sensitive data is stored. No password.
            write(USER_KEY, JSON.stringify({
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                signedInAt: new Date().toISOString()
            }));
            form.reset();
            renderUserUI();
        });

        var outBtn = document.getElementById('signed-out-btn');
        if (outBtn) { outBtn.addEventListener('click', signOut); }
    }

    /* ---------- 3. FAQ (jQuery) ---------- */
    function initFaq() {
        if (!window.jQuery) { return; }
        var $ = window.jQuery;
        $('.faq-question').on('click', function () {
            var $q = $(this);
            var opening = $q.attr('aria-expanded') !== 'true';
            $q.attr('aria-expanded', opening ? 'true' : 'false');
            $q.find('.faq-icon').text(opening ? '\u2212' : '+');
            $q.next('.faq-answer').stop(true, true).slideToggle(300);
        });
    }

    /* ---------- 4. API: NHTSA vPIC (brands and models) ---------- */
    function initCarApi() {
        var root = document.getElementById('car-api');
        if (!root) { return; }

        var BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles/';
        var POPULAR = ['TOYOTA', 'HYUNDAI', 'KIA', 'HONDA', 'BMW', 'MERCEDES-BENZ', 'AUDI', 'FORD', 'VOLKSWAGEN', 'NISSAN', 'LEXUS', 'CHEVROLET'];
        var searchInput = document.getElementById('brand-search');
        var yearInput = document.getElementById('model-year');
        var refreshBtn = document.getElementById('api-refresh');
        var statusEl = document.getElementById('api-status');
        var brandList = document.getElementById('brand-list');
        var modelList = document.getElementById('model-list');
        var modelTitle = document.getElementById('model-title');

        var makes = [];
        var selectedMake = '';
        var requestId = 0;
        var maxYear = new Date().getFullYear() + 1;
        yearInput.max = String(maxYear);

        function setStatus(text, kind) {
            statusEl.textContent = text;
            statusEl.className = 'api-status' + (kind ? ' ' + kind : '');
        }

        async function getJSON(url) {
            var response = await fetch(url);
            if (!response.ok) { throw new Error('HTTP ' + response.status); }
            return response.json();
        }

        function renderBrands() {
            var q = searchInput.value.trim().toUpperCase();
            var list = q
                ? makes.filter(function (m) { return m.indexOf(q) !== -1; })
                : makes.filter(function (m) { return POPULAR.indexOf(m) !== -1; });
            brandList.textContent = '';
            if (!list.length) {
                brandList.textContent = 'No brands match "' + searchInput.value.trim() + '". Try another name.';
                return;
            }
            list.slice(0, 40).forEach(function (make) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'chip' + (make === selectedMake ? ' selected' : '');
                b.textContent = make;
                b.setAttribute('aria-pressed', String(make === selectedMake));
                b.addEventListener('click', function () { selectedMake = make; renderBrands(); loadModels(); });
                brandList.appendChild(b);
            });
            if (list.length > 40) {
                var more = document.createElement('p');
                more.className = 'small mb-0 w-100';
                more.textContent = 'Showing 40 of ' + list.length + ' brands. Type more letters to narrow the list.';
                brandList.appendChild(more);
            }
        }

        async function loadMakes() {
            var id = ++requestId;
            setStatus('Loading brands...', 'loading');
            try {
                var data = await getJSON(BASE + 'GetMakesForVehicleType/car?format=json');
                if (id !== requestId) { return; }
                var names = (data.Results || []).map(function (r) { return (r.MakeName || '').trim().toUpperCase(); }).filter(Boolean);
                makes = Array.from(new Set(names)).sort();
                if (!makes.length) { throw new Error('No data'); }
                renderBrands();
                setStatus('Loaded ' + makes.length + ' brands. Select one to see its models.', 'ok');
            } catch (err) {
                if (id !== requestId) { return; }
                brandList.textContent = '';
                setStatus('Could not load brands (' + err.message + '). Check your connection, then press Refresh data.', 'error');
            }
        }

        async function loadModels() {
            if (!selectedMake) { return; }
            var year = yearInput.value.trim();
            if (year && (!/^\d{4}$/.test(year) || +year < 1980 || +year > maxYear)) {
                setStatus('Enter a model year between 1980 and ' + maxYear + ', or leave it empty.', 'error');
                return;
            }
            var id = ++requestId;
            var url = year
                ? BASE + 'GetModelsForMakeYear/make/' + encodeURIComponent(selectedMake) + '/modelyear/' + year + '?format=json'
                : BASE + 'GetModelsForMake/' + encodeURIComponent(selectedMake) + '?format=json';
            modelTitle.textContent = 'Models: ' + selectedMake + (year ? ' (' + year + ')' : '');
            modelList.textContent = '';
            setStatus('Loading models...', 'loading');
            try {
                var data = await getJSON(url);
                if (id !== requestId) { return; }
                var names = (data.Results || []).map(function (r) { return (r.Model_Name || '').trim(); }).filter(Boolean);
                var models = Array.from(new Set(names)).sort();
                if (!models.length) {
                    setStatus('No models found for ' + selectedMake + (year ? ' in ' + year : '') + '. Try another year or brand.', 'error');
                    return;
                }
                models.forEach(function (name) {
                    var li = document.createElement('li');
                    li.textContent = name;
                    modelList.appendChild(li);
                });
                setStatus(models.length + ' models found.', 'ok');
            } catch (err) {
                if (id !== requestId) { return; }
                setStatus('Could not load models (' + err.message + '). Press Refresh data to try again.', 'error');
            }
        }

        searchInput.addEventListener('input', renderBrands);
        yearInput.addEventListener('change', loadModels);
        refreshBtn.addEventListener('click', function () { return selectedMake ? loadModels() : loadMakes(); });
        loadMakes();
    }

    /* ---------- start ---------- */
    document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        initSignIn();
        renderUserUI();
        initFaq();
        initCarApi();
    });
}());
