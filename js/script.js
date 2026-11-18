(function () {
    'use strict';

    var THEME_KEY = 'autohubTheme';
    var USER_KEY = 'autohubUser';

    function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function write(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ } }
    function remove(key) { try { localStorage.removeItem(key); } catch (e) { /* storage blocked */ } }
    function getUser() {
        try { return JSON.parse(read(USER_KEY)); } catch (e) { return null; }
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        var btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
            btn.setAttribute('aria-pressed', String(theme === 'dark'));
        }
    }

    // Theme
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

    // Registration
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

        nameInput.addEventListener('input', validName);
        emailInput.addEventListener('input', validEmail);

        var password = document.getElementById('si-password');
        var confirm = document.getElementById('si-confirm');
        function validPassword() {
            var value = password.value;
            var score = 0;
            if (value.length > 0) {
                score = 1;
            }
            if (value.length >= 8) {
                score = 2;
                var hasLowercase = /[a-z]/.test(value);
                var hasUppercase = /[A-Z]/.test(value);
                var hasNumber = /[0-9]/.test(value);
                if (hasLowercase && hasUppercase && hasNumber) {
                    score = 3;
                }
            }
            document.getElementById('password-meter').value = score;
            document.getElementById('password-strength').textContent = ['Enter a password', 'Weak', 'Medium', 'Strong'][score];
            return setFieldError(password, score < 3 ? 'Use 8+ characters with uppercase, lowercase and a number.' : '');
        }
        function validConfirm() {
            if (!confirm.value || confirm.value !== password.value) {
                return setFieldError(confirm, 'Passwords must match.');
            }
            return setFieldError(confirm, '');
        }
        password.addEventListener('input', function () { validPassword(); if (confirm.value) validConfirm(); });
        confirm.addEventListener('input', validConfirm);
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var okName = validName();
            var okEmail = validEmail();
            var okPassword = validPassword();
            var okConfirm = validConfirm();
            if (!okPassword || !okConfirm) { (okPassword ? confirm : password).focus(); return; }
            if (!okName || !okEmail) { (okName ? emailInput : nameInput).focus(); return; }
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

    // FAQ
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

    // Car API
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
            var list = [];
            for (var make of makes) {
                if (q && make.includes(q)) {
                    list.push(make);
                } else if (!q && POPULAR.includes(make)) {
                    list.push(make);
                }
            }
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
            var id = ++requestId;
            var year = yearInput.value.trim();
            if (year && (!/^\d{4}$/.test(year) || +year < 1980 || +year > maxYear)) {
                setStatus('Enter a model year between 1980 and ' + maxYear + ', or leave it empty.', 'error');
                return;
            }
            var makeName = encodeURIComponent(selectedMake);
            var url = BASE + 'GetModelsForMake/' + makeName + '?format=json';
            if (year) {
                url = BASE + 'GetModelsForMakeYear/make/' + makeName + '/modelyear/' + year + '?format=json';
            }
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

    // Search and filters
    function initSearch() {
        var input = document.getElementById('car-search');
        if (!input) return;
        var category = 'All';
        function filter() {
            var count = 0;
            document.querySelectorAll('#car-listings > div').forEach(function (item) {
                var searchText = input.value.trim().toLowerCase();
                var carText = item.textContent.toLowerCase();
                var carCategory = item.querySelector('.car-label').textContent;
                var matchesSearch = carText.includes(searchText);
                var matchesCategory = category === 'All' || carCategory === category;
                var matches = matchesSearch && matchesCategory;
                item.hidden = !matches;
                if (matches) count++;
            });
            document.getElementById('car-count').textContent = count ? count + ' cars found' : 'No matching cars. Try another search or category.';
        }
        input.addEventListener('input', filter);
        document.querySelectorAll('[data-category]').forEach(function (button) {
            button.addEventListener('click', function () {
                category = button.dataset.category;
                document.querySelectorAll('[data-category]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
                filter();
            });
        });
        filter();
    }

    // Inventory table
    function initInventory() {
        var form = document.getElementById('inventory-form');
        if (!form) return;
        var key = 'autohubInventory';
        var records;
        try { records = JSON.parse(read(key)); } catch (e) { records = null; }
        if (!Array.isArray(records)) records = [{id: 'sample', name: 'City Sedan', category: 'Sedan', price: 12500000}];
        records = records.filter(function (r) { return r && typeof r.id === 'string' && typeof r.name === 'string' && ['Sedan','SUV','Hatchback'].includes(r.category) && Number.isFinite(r.price) && r.price > 0; });
        var editing = null;
        var name = document.getElementById('inventory-name');
        var category = document.getElementById('inventory-category');
        var price = document.getElementById('inventory-price');
        var cancel = document.getElementById('inventory-cancel');
        var status = document.getElementById('inventory-status');
        function reset() { editing = null; form.reset(); cancel.hidden = true; document.getElementById('inventory-save').textContent = 'Add car'; }
        function save(message) {
            write(key, JSON.stringify(records));
            status.textContent = message + (read(key) === JSON.stringify(records) ? '' : ' Browser storage is unavailable; changes last only on this page.');
            render();
        }
        function render() {
            var body = document.getElementById('inventory-body');
            body.textContent = '';
            records.forEach(function (record) {
                var row = document.createElement('tr');
                [record.name, record.category, record.price.toLocaleString('en-US')].forEach(function (value) { var cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
                var actions = document.createElement('td');
                ['Edit', 'Delete'].forEach(function (action) {
                    var button = document.createElement('button');
                    button.type = 'button'; button.className = 'btn btn-outline-primary btn-sm me-2'; button.textContent = action;
                    button.setAttribute('aria-label', action + ' ' + record.name);
                    button.addEventListener('click', function () {
                        if (action === 'Edit') {
                            editing = record.id; name.value = record.name; category.value = record.category; price.value = record.price; cancel.hidden = false; document.getElementById('inventory-save').textContent = 'Save changes'; name.focus();
                        } else if (window.confirm('Delete ' + record.name + '?')) {
                            records = records.filter(function (r) { return r.id !== record.id; });
                            if (editing === record.id) reset();
                            save('Car deleted.');
                        }
                    });
                    actions.appendChild(button);
                });
                row.appendChild(actions); body.appendChild(row);
            });
            if (!records.length) { var row = body.insertRow(); var cell = row.insertCell(); cell.colSpan = 4; cell.textContent = 'No cars yet. Add your first car above.'; }
        }
        name.addEventListener('input', function () { name.setCustomValidity(''); });
        form.addEventListener('submit', function (event) {
            event.preventDefault(); name.setCustomValidity(name.value.trim() ? '' : 'Enter a car name.');
            if (!form.reportValidity()) return;
            var record = {id: editing || crypto.randomUUID(), name: name.value.trim(), category: category.value, price: Number(price.value)};
            if (editing) {
                for (var i = 0; i < records.length; i++) {
                    if (records[i].id === editing) {
                        records[i] = record;
                        break;
                    }
                }
            } else {
                records.push(record);
            }
            save(editing ? 'Car updated.' : 'Car added.'); reset();
        });
        cancel.addEventListener('click', reset); render();
    }

    // Photo gallery
    function initGallery() {
        if (!document.getElementById('home-title') || !window.jQuery) return;
        var $ = window.jQuery;
        var images = Array.from(document.querySelectorAll('main .car-image'));
        if (!images.length) return;
        var dialog = document.createElement('dialog');
        dialog.className = 'gallery-dialog';
        dialog.setAttribute('aria-label', 'Car photo gallery');
        dialog.innerHTML = '<button type="button" class="btn btn-primary" data-close>Close</button><figure><img alt=""><figcaption aria-live="polite"></figcaption></figure><button type="button" class="btn btn-outline-primary" data-prev>← Previous</button> <button type="button" class="btn btn-outline-primary" data-next>Next →</button>';
        document.body.appendChild(dialog);
        var position = 0; var opener;
        function show(index) {
            position = index;
            if (position < 0) {
                position = images.length - 1;
            }
            if (position >= images.length) {
                position = 0;
            }
            var image = dialog.querySelector('img');
            $(image).stop(true, true).fadeOut(120, function () { image.src = images[position].src; image.alt = images[position].alt; $(image).fadeIn(180); });
            dialog.querySelector('figcaption').textContent = (position + 1) + ' / ' + images.length + ' — ' + images[position].alt;
        }
        images.forEach(function (image, index) {
            var button = document.createElement('button'); button.type = 'button'; button.className = 'gallery-trigger'; button.setAttribute('aria-label', 'Enlarge: ' + image.alt);
            image.parentNode.insertBefore(button, image); button.appendChild(image);
            button.addEventListener('click', function () { opener = button; dialog.showModal(); show(index); });
        });
        function close() { $(dialog).stop(true, true).fadeOut(160, function () { dialog.close(); dialog.style.display = ''; if (opener) opener.focus(); }); }
        dialog.querySelector('[data-close]').addEventListener('click', close);
        dialog.querySelector('[data-prev]').addEventListener('click', function () { show(position - 1); });
        dialog.querySelector('[data-next]').addEventListener('click', function () { show(position + 1); });
        dialog.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
        dialog.addEventListener('keydown', function (event) { if (event.key === 'ArrowLeft') show(position - 1); if (event.key === 'ArrowRight') show(position + 1); });
    }

    // Contact form
    function initContact() {
        var form = document.getElementById('contact-form');
        if (!form) return;
        form.noValidate = true;
        var status = document.createElement('p'); status.setAttribute('role', 'status'); form.appendChild(status);
        var inputs = Array.from(form.querySelectorAll('input, select, textarea'));
        inputs.forEach(function (input) {
            var error = document.createElement('div'); error.id = input.id + '-error'; error.className = 'invalid-feedback'; input.after(error); input.setAttribute('aria-describedby', error.id);
            input.addEventListener('input', function () { validate(input); status.textContent = ''; });
        });
        function validate(input) {
            input.setCustomValidity('');
            if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) input.setCustomValidity('Enter a valid email address.');
            var isTextField = input.tagName === 'TEXTAREA' || input.type === 'text';
            var minimumLength = Math.max(input.minLength, 1);
            if (isTextField && input.value.trim().length < minimumLength) {
                input.setCustomValidity('Please complete this field with the required number of characters.');
            }
            return setFieldError(input, input.validationMessage);
        }
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var firstInvalidInput = null;
            for (var input of inputs) {
                var valid = validate(input);
                if (!valid && firstInvalidInput === null) {
                    firstInvalidInput = input;
                }
            }
            if (firstInvalidInput) {
                firstInvalidInput.focus();
                return;
            }
            status.textContent = 'Your demo enquiry is valid. No message has been sent.';
            form.reset();
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initSearch();
        initInventory();
        initGallery();
        initContact();
        initTheme();
        initSignIn();
        renderUserUI();
        initFaq();
        initCarApi();
    });
}());
