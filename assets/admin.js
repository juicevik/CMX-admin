(function () {
  const authState = {
    csrfToken: '',
    sessionId: '',
    actor: null
  };
  const adminState = {
    actionContracts: null,
    authContract: null,
    manifest: null,
    adminUsers: [],
    agentKeys: [],
    activeSiteId: ''
  };
  const draftActionState = {
    dryRun: null
  };
  const editorialState = {
    config: null,
    visibleFields: [],
    editFieldValues: {},
    editMedia: {},
    media: {},
    lastQueuePayload: null
  };
  const productCardState = {
    visibleFields: [],
    editFieldValues: {},
    editMedia: {},
    media: {},
    lastQueuePayload: null
  };
  const moduleEditorState = {
    resource: '',
    moduleId: '',
    props: null,
    valid: false
  };
  const pageSeoEditorState = {
    resource: '',
    values: null,
    valid: false
  };
  const designState = {
    booted: false,
    dirty: false,
    lastPayload: null,
    uploads: {},
    assetPaths: {
      logo: '/assets/media/design/logo.svg',
      favicon: '/assets/media/design/favicon.svg'
    },
    assetModes: {
      logo: 'generated',
      favicon: 'generated'
    },
    inFlight: false
  };
  const githubState = {
    token: '',
    config: null,
    connected: false,
    actorLogin: '',
    actorProfile: null,
    rateLimitMessage: 'Лимиты не загружены',
    rateLimitVisible: false
  };
  const adminThemeStorageKey = 'cms.admin.theme';

  function readJsonScript(id, errorLabel) {
    const node = document.getElementById(id);

    if (!node || !node.textContent) {
      return null;
    }

    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      console.error(errorLabel, error);
      return null;
    }
  }

  function readContracts() {
    return adminState.actionContracts || readJsonScript('admin-action-contracts', 'Unable to parse admin-action-contracts');
  }

  function readAuthContract() {
    return adminState.authContract || readJsonScript('admin-auth-contract', 'Unable to parse admin-auth-contract');
  }

  function readGithubConfig() {
    if (githubState.config) {
      return githubState.config;
    }

    githubState.config = readJsonScript('admin-github-config', 'Unable to parse admin-github-config') || {};

    return githubState.config;
  }

  function isGithubMode() {
    return document.body && document.body.dataset.adminPage === 'github-pages';
  }

  function preferredAdminTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function readStoredAdminTheme() {
    try {
      return localStorage.getItem(adminThemeStorageKey);
    } catch (error) {
      return null;
    }
  }

  function writeStoredAdminTheme(mode) {
    try {
      if (mode === 'dark' || mode === 'light') {
        localStorage.setItem(adminThemeStorageKey, mode);
      } else {
        localStorage.removeItem(adminThemeStorageKey);
      }
    } catch (error) {
      // Browser privacy settings may block localStorage; system theme still works.
    }
  }

  function updateAdminThemeToggle(theme, automatic) {
    const toggle = document.querySelector('[data-admin-theme-toggle]');
    const icon = document.querySelector('[data-admin-theme-icon]');
    const label = document.querySelector('[data-admin-theme-label]');
    const isDark = theme === 'dark';

    if (toggle) {
      toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      toggle.setAttribute('aria-label', isDark ? 'Переключить светлую тему' : 'Переключить темную тему');
      toggle.setAttribute('title', automatic ? 'Тема по системе' : 'Тема задана вручную');
    }

    if (icon) {
      icon.textContent = isDark ? '☾' : '☀';
    }

    if (label) {
      label.textContent = isDark ? 'Темная' : 'Светлая';
    }
  }

  function applyAdminTheme(mode, persist) {
    const root = document.documentElement;
    const normalized = mode === 'dark' || mode === 'light' ? mode : 'system';
    const theme = normalized === 'system' ? preferredAdminTheme() : normalized;

    if (normalized === 'system') {
      delete root.dataset.adminTheme;
      if (persist) {
        writeStoredAdminTheme('system');
      }
    } else {
      root.dataset.adminTheme = normalized;
      if (persist) {
        writeStoredAdminTheme(normalized);
      }
    }

    updateAdminThemeToggle(theme, normalized === 'system');
  }

  function bootAdminTheme() {
    const stored = readStoredAdminTheme();

    applyAdminTheme(stored || 'system', false);

    document.querySelectorAll('[data-admin-theme-toggle]').forEach((toggle) => {
      if (toggle.dataset.adminThemeBound === 'true') {
        return;
      }

      toggle.dataset.adminThemeBound = 'true';
      toggle.addEventListener('click', () => {
        const current = document.documentElement.dataset.adminTheme || preferredAdminTheme();
        applyAdminTheme(current === 'dark' ? 'light' : 'dark', true);
      });
    });

    if (window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const syncSystemTheme = () => {
        if (!readStoredAdminTheme()) {
          applyAdminTheme('system', false);
        }
      };

      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', syncSystemTheme);
      } else if (typeof media.addListener === 'function') {
        media.addListener(syncSystemTheme);
      }
    }
  }

  function githubSessionKey() {
    const config = readGithubConfig();
    const repository = config && config.repository ? String(config.repository) : 'cms';

    return 'cms.github.token.' + repository;
  }

  function setGithubStatus(message) {
    const status = document.querySelector('[data-github-status]');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function setGithubRateLimit(message, visible) {
    const panels = document.querySelectorAll('[data-github-rate-limit]');
    const values = document.querySelectorAll('[data-github-rate-limit-value]');

    githubState.rateLimitMessage = message;
    githubState.rateLimitVisible = visible !== false;

    values.forEach((value) => {
      value.textContent = message;
    });

    panels.forEach((panel) => {
      panel.hidden = false;
      panel.dataset.rateState = visible === false ? 'pending' : 'ready';
    });
  }

  async function fetchGithubJson(path) {
    const response = await fetch(githubApiUrl(path), {
      method: 'GET',
      headers: githubHeaders()
    });
    const payload = await readResponseJson(response);

    return { response, payload };
  }

  function formatMinutes(value) {
    const minutes = Math.max(0, Math.round(Number(value) || 0));

    return minutes + 'м';
  }

  function currentMonthStartIso() {
    const now = new Date();

    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString();
  }

  function repoActionsFallbackLabel(payload) {
    const runs = payload && Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
    const totalCount = payload && Number.isFinite(Number(payload.total_count)) ? Number(payload.total_count) : runs.length;
    const wallMinutes = runs.reduce((sum, run) => {
      if (!run || !run.run_started_at || !run.updated_at) {
        return sum;
      }

      const started = Date.parse(run.run_started_at);
      const updated = Date.parse(run.updated_at);

      if (!Number.isFinite(started) || !Number.isFinite(updated) || updated <= started) {
        return sum;
      }

      return sum + ((updated - started) / 60000);
    }, 0);

    return 'Act ~' + formatMinutes(wallMinutes) + ' / ' + totalCount + ' run';
  }

  async function loadRepoActionsRuns(repository) {
    const since = encodeURIComponent('>=' + currentMonthStartIso());
    const workflowRuns = [];
    let totalCount = 0;

    for (let page = 1; page <= 3; page += 1) {
      const runs = await fetchGithubJson('/repos/' + repository + '/actions/runs?per_page=100&page=' + page + '&created=' + since);

      if (!runs.response.ok || !runs.payload) {
        return null;
      }

      const pageRuns = Array.isArray(runs.payload.workflow_runs) ? runs.payload.workflow_runs : [];

      totalCount = Number(runs.payload.total_count || totalCount || pageRuns.length);
      workflowRuns.push(...pageRuns);

      if (workflowRuns.length >= totalCount || pageRuns.length === 0) {
        break;
      }
    }

    return { total_count: totalCount || workflowRuns.length, workflow_runs: workflowRuns };
  }

  async function loadGithubActionsUsage() {
    const config = readGithubConfig();
    const owner = config && config.owner ? String(config.owner) : '';
    const repository = config && config.repository ? String(config.repository) : '';

    if (!owner || !repository) {
      return 'Act n/a';
    }

    try {
      const billing = await fetchGithubJson('/users/' + encodeURIComponent(owner) + '/settings/billing/actions');

      if (billing.response.ok && billing.payload) {
        const used = Number(billing.payload.total_minutes_used || 0);
        const included = Number(billing.payload.included_minutes || 0);

        if (included > 0) {
          return 'Act ' + formatMinutes(used) + '/' + formatMinutes(included);
        }

        return 'Act ' + formatMinutes(used);
      }
    } catch (error) {
      // Billing requires account-level scope; repo workflow data below is the safe fallback.
    }

    try {
      const runs = await loadRepoActionsRuns(repository);

      if (runs) {
        return repoActionsFallbackLabel(runs);
      }
    } catch (error) {
      // Keep the widget useful even when Actions read access is not available.
    }

    return 'Act n/a';
  }

  function githubToken() {
    return githubState.token || sessionStorage.getItem(githubSessionKey()) || '';
  }

  function githubApiUrl(path) {
    const config = readGithubConfig();
    const base = config.api_base || 'https://api.github.com';

    return String(base).replace(/\/+$/, '') + path;
  }

  function githubHeaders() {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + githubToken(),
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  async function loadGithubRateLimit() {
    if (!githubToken()) {
      setGithubRateLimit('Лимиты не загружены', false);
      return;
    }

    try {
      const { response, payload } = await fetchGithubJson('/rate_limit');

      if (!response.ok || !payload || !payload.resources) {
        setGithubRateLimit('Лимиты GitHub API недоступны', true);
        return;
      }

      const core = payload.resources.core || {};
      const actionsLabel = await loadGithubActionsUsage();
      const resetAt = core.reset ? new Date(Number(core.reset) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'n/a';
      const parts = [
        'API ' + (core.remaining ?? '?') + '/' + (core.limit ?? '?'),
        actionsLabel,
        'R ' + resetAt
      ];

      setGithubRateLimit(parts.join(' · '), true);
    } catch (error) {
      setGithubRateLimit('Лимиты GitHub API недоступны', true);
    }
  }

  const editableRoleCapabilities = ['write', 'publish', 'config', 'media', 'archive', 'site_rebrand', 'deploy'];

  function roleDefaultCapabilities(role) {
    if (role === 'admin') {
      return { read: true, write: true, publish: true, config: true, media: true, archive: true, site_rebrand: true, deploy: true, roles: true };
    }

    if (role === 'editor') {
      return { read: true, write: true, publish: true, config: true, media: true, archive: true, site_rebrand: true, deploy: true, roles: false };
    }

    return { read: true, write: false, publish: false, config: false, media: false, archive: false, site_rebrand: false, deploy: false, roles: false };
  }

  function githubRolesConfig() {
    const config = readGithubConfig();

    return config && config.roles ? config.roles : { default_role: 'viewer', users: {} };
  }

  function githubProfileForLogin(login) {
    const roles = githubRolesConfig();
    const users = roles && roles.users ? roles.users : {};
    const normalizedLogin = String(login || '').trim();
    const userKey = Object.keys(users).find((key) => key.toLowerCase() === normalizedLogin.toLowerCase());
    const profile = userKey ? users[userKey] || {} : {};
    const role = profile.role === 'admin' || profile.role === 'editor' ? profile.role : (roles.default_role || 'viewer');
    const defaultCapabilities = roleDefaultCapabilities(role);
    const capabilities = Object.assign({}, defaultCapabilities, profile.capabilities || {});

    if (role === 'admin') {
      capabilities.roles = true;
    }

    if (role === 'editor') {
      capabilities.roles = false;
    }

    return {
      login: userKey || normalizedLogin || 'unknown-github-user',
      role,
      status: profile.status === 'disabled' ? 'disabled' : 'active',
      capabilities
    };
  }

  function applyGithubActor(login) {
    const profile = githubProfileForLogin(login);

    githubState.actorLogin = profile.login;
    githubState.actorProfile = profile;
    authState.actor = {
      id: 'github:' + profile.login,
      username: profile.login,
      role: profile.status === 'active' ? profile.role : 'viewer',
      capabilities: profile.capabilities
    };
    setAccountLabel(authState.actor.role);
    applyRolePermissionsVisibility(authState.actor);

    return authState.actor;
  }

  function githubRoleUsers() {
    const roles = githubRolesConfig();
    const users = roles && roles.users ? roles.users : {};

    return Object.entries(users).map(([login, profile]) => ({
      id: login,
      username: login,
      role: profile && profile.role ? profile.role : 'viewer',
      status: profile && profile.status ? profile.status : 'active',
      password_hint: 'GitHub token account',
      capabilities: profile && profile.capabilities ? profile.capabilities : {}
    }));
  }

  function activeAuthContract(fallback) {
    return adminState.authContract || fallback || readAuthContract() || {};
  }

  const protectedEndpointFallbacks = {
    editorial_queue: '/admin/editorial/queue',
    editorial_validate: '/admin/editorial/validate',
    editorial_media: '/admin/editorial/media',
    editorial_deploy: '/admin/editorial/deploy',
    editorial_archive: '/admin/editorial/archive',
    role_permissions: '/admin/roles/editor-permissions',
    admin_users: '/admin/roles/users',
    site_rebrand: '/admin/site-profile/rebrand'
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function option(value, label) {
    const item = document.createElement('option');
    item.value = value;
    item.textContent = label;
    return item;
  }

  function fillSelect(select, items) {
    if (!select) {
      return;
    }

    select.innerHTML = '';
    items.forEach((item) => select.appendChild(option(item.value, item.label)));
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function siteProfiles(manifest) {
    const source = manifest || adminState.manifest || {};

    return Array.isArray(source.sites) ? source.sites : [];
  }

  function siteProfileById(siteId) {
    const profiles = siteProfiles();
    const normalized = String(siteId || '').trim();

    return profiles.find((profile) => String(profile.site_id || '') === normalized) || profiles[0] || null;
  }

  function activeSiteProfile() {
    return siteProfileById(adminState.activeSiteId);
  }

  function siteRouteNamespace(profile, type) {
    const routes = profile && profile.route_namespaces && typeof profile.route_namespaces === 'object'
      ? profile.route_namespaces
      : {};

    return String(routes[type] || '');
  }

  function profileDeployLabel(profile) {
    const deploy = profile && profile.deploy_profile && typeof profile.deploy_profile === 'object'
      ? profile.deploy_profile
      : {};
    const provider = String(deploy.provider || 'static_vps');
    const environment = String(deploy.environment || 'production');

    return provider + ' / ' + environment;
  }

  function syncSiteScopedDefaults(profile) {
    if (!profile) {
      return;
    }

    const domain = String(profile.domain || '').trim();
    const baseUrl = String(profile.base_url || (domain ? 'https://' + domain : '')).trim();
    const locale = String(profile.root_locale || '').trim();
    const title = String(profile.display_name || domain || '').trim();

    [
      ['admin-medgen-site-domain', domain],
      ['admin-medgen-site-name', title],
      ['admin-medgen-locale', locale],
      ['admin-domain-name', domain],
      ['admin-domain-base-url', baseUrl],
      ['admin-domain-default-locale', locale],
      ['admin-domain-supplement-prefix', siteRouteNamespace(profile, 'supplement')],
      ['admin-domain-author-prefix', siteRouteNamespace(profile, 'author')],
      ['admin-domain-article-prefix', siteRouteNamespace(profile, 'article')]
    ].forEach(([id, value]) => {
      const field = byId(id);

      if (field && value && (!field.value || field.dataset.siteScopedAutofill === 'true')) {
        field.value = value;
        field.dataset.siteScopedAutofill = 'true';
      }
    });
  }

  function allSecretRefs(profile) {
    const refs = {};
    const collect = (prefix, block) => {
      const secretRefs = block && block.secret_refs && typeof block.secret_refs === 'object' ? block.secret_refs : {};

      Object.entries(secretRefs).forEach(([key, value]) => {
        refs[prefix + '.' + key] = value;
      });
    };

    collect('deploy', profile && profile.deploy_profile);
    collect('medgen', profile && profile.medgen_profile);

    return refs;
  }

  function setActiveSite(siteId) {
    const profile = siteProfileById(siteId);

    adminState.activeSiteId = profile ? String(profile.site_id || '') : '';
    syncSiteScopedDefaults(profile);
    renderSiteWorkflow(adminState.manifest || {});
    renderSiteFleet(adminState.manifest || {});
  }

  function siteProfileOptions(manifest) {
    const profiles = siteProfiles(manifest);

    return profiles.map((profile) => ({
      value: String(profile.site_id || ''),
      label: String(profile.display_name || profile.domain || profile.site_id || 'Site')
    }));
  }

  function renderSiteWorkflow(manifest) {
    const profiles = siteProfiles(manifest);
    const select = document.querySelector('[data-active-site-select]');
    const status = document.querySelector('[data-active-site-status]');
    const profile = activeSiteProfile() || profiles[0] || null;

    if (!adminState.activeSiteId && profile) {
      adminState.activeSiteId = String(profile.site_id || '');
    }

    if (select) {
      fillSelect(select, siteProfileOptions(manifest));
      select.value = adminState.activeSiteId;

      if (select.dataset.activeSiteBound !== 'true') {
        select.dataset.activeSiteBound = 'true';
        select.addEventListener('change', () => setActiveSite(select.value));
      }
    }

    const fieldValue = {
      domain: profile ? String(profile.domain || '-') : '-',
      locale: profile ? String(profile.root_locale || '-') + (profile.geo_country ? ' / ' + String(profile.geo_country) : '') : '-',
      deploy: profile ? profileDeployLabel(profile) : '-',
      content: profile ? String(profile.content_mode || 'manual') : '-'
    };

    Object.entries(fieldValue).forEach(([key, value]) => {
      document.querySelectorAll('[data-site-workflow-field="' + key + '"]').forEach((node) => {
        node.textContent = value;
      });
    });

    if (status) {
      status.value = profile
        ? 'Активный сайт: ' + String(profile.domain || profile.site_id || 'site')
        : 'Нет профилей сайтов. Создайте профиль перед генерацией и редактурой.';
      status.textContent = status.value;
    }

    syncSiteScopedDefaults(profile);
  }

  function renderSiteFleet(manifest) {
    const profiles = siteProfiles(manifest);
    const select = document.querySelector('[data-site-fleet-select]');
    const status = document.querySelector('[data-site-fleet-status]');
    const cards = document.querySelector('[data-site-fleet-cards]');
    const secrets = document.querySelector('[data-site-fleet-secret-refs]');
    const profile = activeSiteProfile() || profiles[0] || null;

    if (select) {
      fillSelect(select, siteProfileOptions(manifest));
      select.value = profile ? String(profile.site_id || '') : '';

      if (select.dataset.siteFleetBound !== 'true') {
        select.dataset.siteFleetBound = 'true';
        select.addEventListener('change', () => setActiveSite(select.value));
      }
    }

    if (status) {
      const count = profiles.length;
      status.value = count ? 'Загружено профилей: ' + count : 'Профили сайтов не найдены.';
      status.textContent = status.value;
    }

    if (cards) {
      cards.innerHTML = profiles.map((item) => {
        const isActive = profile && String(profile.site_id || '') === String(item.site_id || '');
        return '<article class="site-fleet-card" data-site-fleet-card="' + escapeHtml(item.site_id || '') + '" data-active="' + (isActive ? 'true' : 'false') + '">'
          + '<span>' + escapeHtml(item.status || 'draft') + '</span>'
          + '<h3>' + escapeHtml(item.display_name || item.domain || item.site_id || 'Site') + '</h3>'
          + '<dl>'
          + '<dt>Domain</dt><dd>' + escapeHtml(item.domain || '-') + '</dd>'
          + '<dt>Locale</dt><dd>' + escapeHtml(item.root_locale || '-') + '</dd>'
          + '<dt>Deploy</dt><dd>' + escapeHtml(profileDeployLabel(item)) + '</dd>'
          + '<dt>SEO</dt><dd>' + escapeHtml((item.seo && item.seo.hreflang_policy) || 'single_locale_only') + '</dd>'
          + '</dl>'
          + '</article>';
      }).join('');
    }

    if (secrets) {
      secrets.textContent = JSON.stringify(allSecretRefs(profile), null, 2);
    }

    populateSiteFleetForm(profile);
    wireSiteFleetPanel();
  }

  function setSiteFleetFormStatus(message) {
    const status = document.querySelector('[data-site-fleet-form-status]');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function setSiteFleetOutput(payload) {
    const output = document.querySelector('[data-site-fleet-output]');

    if (output) {
      output.value = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    }
  }

  function setSiteFleetField(selector, value) {
    const field = document.querySelector(selector);

    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
      field.value = String(value || '');
    }
  }

  function populateSiteFleetForm(profile) {
    if (!document.querySelector('[data-site-fleet-field]')) {
      return;
    }

    if (!profile) {
      document.querySelectorAll('[data-site-fleet-field], [data-site-fleet-market-field], [data-site-fleet-route-prefix], [data-site-fleet-deploy-field]').forEach((field) => {
        if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
          field.value = '';
        }
      });
      setSiteFleetField('[data-site-fleet-medgen-field="enabled"]', 'true');
      return;
    }

    setSiteFleetField('[data-site-fleet-field="site_id"]', profile.site_id || '');
    setSiteFleetField('[data-site-fleet-field="display_name"]', profile.display_name || '');
    setSiteFleetField('[data-site-fleet-field="domain"]', profile.domain || '');
    setSiteFleetField('[data-site-fleet-field="base_url"]', profile.base_url || '');
    setSiteFleetField('[data-site-fleet-field="root_locale"]', profile.root_locale || '');
    setSiteFleetField('[data-site-fleet-field="geo_country"]', profile.geo_country || '');
    setSiteFleetField('[data-site-fleet-field="status"]', profile.status || 'draft');
    setSiteFleetField('[data-site-fleet-market-field="currency"]', profile.market && profile.market.currency ? profile.market.currency : 'USD');
    setSiteFleetField('[data-site-fleet-route-prefix="supplement"]', siteRouteNamespace(profile, 'supplement') || '/bady/');
    setSiteFleetField('[data-site-fleet-route-prefix="author"]', siteRouteNamespace(profile, 'author') || '/experts/');
    setSiteFleetField('[data-site-fleet-route-prefix="article"]', siteRouteNamespace(profile, 'article') || '/guides/');
    setSiteFleetField('[data-site-fleet-deploy-field="public_root"]', profile.deploy_profile && profile.deploy_profile.public_root ? profile.deploy_profile.public_root : '');
    setSiteFleetField('[data-site-fleet-deploy-field="environment"]', profile.deploy_profile && profile.deploy_profile.environment ? profile.deploy_profile.environment : 'production');
    setSiteFleetField('[data-site-fleet-medgen-field="enabled"]', profile.medgen_profile && profile.medgen_profile.enabled === false ? 'false' : 'true');
  }

  function collectSiteFleetPayload(operation) {
    const profile = {
      market: {},
      route_namespaces: {},
      deploy_profile: {
        provider: 'static_vps',
        secret_refs: {
          ssh_host: 'CMX_PRODUCTION_SSH_HOST',
          ssh_port: 'CMX_PRODUCTION_SSH_PORT',
          ssh_user: 'CMX_PRODUCTION_SSH_USER',
          ssh_private_key: 'CMX_PRODUCTION_SSH_PRIVATE_KEY',
          deploy_root: 'CMX_PRODUCTION_DEPLOY_ROOT',
          tls_email: 'CMX_PRODUCTION_TLS_EMAIL'
        }
      },
      medgen_profile: {
        enabled: true,
        secret_refs: {
          api_base_url: 'MEDGEN_API_PUBLIC_BASE_URL',
          api_token: 'MEDGEN_API_TOKEN'
        }
      }
    };

    document.querySelectorAll('[data-site-fleet-field]').forEach((field) => {
      const key = field.getAttribute('data-site-fleet-field') || '';

      if (key && (field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) {
        profile[key] = field.value.trim();
      }
    });

    document.querySelectorAll('[data-site-fleet-market-field]').forEach((field) => {
      const key = field.getAttribute('data-site-fleet-market-field') || '';

      if (key && field instanceof HTMLInputElement && field.value.trim()) {
        profile.market[key] = field.value.trim().toUpperCase();
      }
    });

    if (profile.geo_country) {
      profile.market.country = String(profile.geo_country).trim().toUpperCase();
    }

    document.querySelectorAll('[data-site-fleet-route-prefix]').forEach((field) => {
      const key = field.getAttribute('data-site-fleet-route-prefix') || '';

      if (key && field instanceof HTMLInputElement && field.value.trim()) {
        profile.route_namespaces[key] = field.value.trim();
      }
    });

    document.querySelectorAll('[data-site-fleet-deploy-field]').forEach((field) => {
      const key = field.getAttribute('data-site-fleet-deploy-field') || '';

      if (key && field instanceof HTMLInputElement && field.value.trim()) {
        profile.deploy_profile[key] = field.value.trim();
      }
    });

    document.querySelectorAll('[data-site-fleet-medgen-field]').forEach((field) => {
      const key = field.getAttribute('data-site-fleet-medgen-field') || '';

      if (key && field instanceof HTMLSelectElement) {
        profile.medgen_profile[key] = field.value === 'true';
      }
    });

    return {
      operation,
      site_id: String(profile.site_id || ''),
      profile
    };
  }

  async function runSiteFleetAction(operation, dryRun) {
    if (!isGithubMode()) {
      setSiteFleetFormStatus('Site Fleet сохраняется через CMS-admin_v2 на GitHub Pages.');
      setSiteFleetOutput({ ok: false, issues: ['github_pages_admin_required'] });
      return;
    }

    if (!dryRun && !window.confirm(operation === 'archive_site' ? 'Архивировать профиль сайта?' : 'Сохранить профиль сайта через GitHub Actions?')) {
      setSiteFleetFormStatus('Операция отменена');
      return;
    }

    setSiteFleetFormStatus(dryRun ? 'Проверяю профиль сайта...' : 'Запускаю сохранение профиля сайта...');
    setStatusBusy('admin-site-fleet-status', true);

    try {
      const result = await githubDispatchCommand('site_fleet', collectSiteFleetPayload(operation), dryRun);

      setSiteFleetOutput(result);
      setSiteFleetFormStatus(result.ok ? 'Команда site_fleet отправлена. После завершения Actions обновите админку.' : 'Команда site_fleet не отправлена.');
    } finally {
      setStatusBusy('admin-site-fleet-status', false);
    }
  }

  function wireSiteFleetPanel() {
    const dryRunButton = document.querySelector('[data-site-fleet-dry-run]');
    const saveButton = document.querySelector('[data-site-fleet-save]');
    const newButton = document.querySelector('[data-site-fleet-new]');
    const archiveButton = document.querySelector('[data-site-fleet-archive]');

    if (dryRunButton && dryRunButton.dataset.siteFleetBound !== 'true') {
      dryRunButton.dataset.siteFleetBound = 'true';
      dryRunButton.addEventListener('click', () => runSiteFleetAction('upsert_site', true));
    }

    if (saveButton && saveButton.dataset.siteFleetBound !== 'true') {
      saveButton.dataset.siteFleetBound = 'true';
      saveButton.addEventListener('click', () => runSiteFleetAction('upsert_site', false));
    }

    if (newButton && newButton.dataset.siteFleetBound !== 'true') {
      newButton.dataset.siteFleetBound = 'true';
      newButton.addEventListener('click', () => {
        populateSiteFleetForm(null);
        setSiteFleetField('[data-site-fleet-field="status"]', 'draft');
        setSiteFleetFormStatus('Заполните новый профиль сайта.');
        setSiteFleetOutput('');
      });
    }

    if (archiveButton && archiveButton.dataset.siteFleetBound !== 'true') {
      archiveButton.dataset.siteFleetBound = 'true';
      archiveButton.addEventListener('click', () => runSiteFleetAction('archive_site', false));
    }
  }

  function setAdminBootStatus(message) {
    const status = document.querySelector('[data-admin-boot-status]');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function setGatedVisible(visible) {
    const gate = document.querySelector('[data-auth-gate]');
    const gated = document.querySelector('[data-admin-gated]');
    const authTopbar = document.querySelector('[data-auth-topbar]');

    if (gate) {
      gate.hidden = visible;
    }

    if (gated) {
      gated.hidden = !visible;
    }

    if (authTopbar) {
      authTopbar.hidden = !visible;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function replacePlaceholders(value, replacements) {
    if (Array.isArray(value)) {
      return value.map((item) => replacePlaceholders(item, replacements));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, replacePlaceholders(item, replacements)])
      );
    }

    if (typeof value !== 'string') {
      return value;
    }

    return Object.entries(replacements).reduce(
      (output, [token, replacement]) => output.split(token).join(String(replacement)),
      value
    );
  }

  function currentFormValues() {
    return {
      '{{request_id}}': byId('admin-payload-request') ? byId('admin-payload-request').value : '',
      '{{actor_id}}': byId('admin-payload-actor-id') ? byId('admin-payload-actor-id').value : '',
      '{{actor_role}}': byId('admin-payload-role') ? byId('admin-payload-role').value : '',
      '{{session_id}}': byId('admin-payload-session') ? byId('admin-payload-session').value : '',
      '{{csrf_token}}': byId('admin-payload-csrf') ? byId('admin-payload-csrf').value : ''
    };
  }

  function pageOptionLabel(page) {
    const suffix = page && page.create_mode ? ' (new draft)' : '';

    return (page.route || page.resource || '') + ' - ' + (page.title || page.id || 'Untitled') + suffix;
  }

  function refreshPageSelect(contracts, selectedResource) {
    const pageSelect = byId('admin-payload-page');

    if (!pageSelect || !Array.isArray(contracts.pages)) {
      return;
    }

    const current = selectedResource || pageSelect.value;
    fillSelect(pageSelect, contracts.pages.map((page) => ({
      value: page.resource,
      label: pageOptionLabel(page)
    })));

    if (current && contracts.pages.some((page) => page.resource === current)) {
      pageSelect.value = current;
    }
  }

  function transliterate(value) {
    const map = {
      а: 'a',
      б: 'b',
      в: 'v',
      г: 'g',
      д: 'd',
      е: 'e',
      ё: 'e',
      ж: 'zh',
      з: 'z',
      и: 'i',
      й: 'y',
      к: 'k',
      л: 'l',
      м: 'm',
      н: 'n',
      о: 'o',
      п: 'p',
      р: 'r',
      с: 's',
      т: 't',
      у: 'u',
      ф: 'f',
      х: 'h',
      ц: 'c',
      ч: 'ch',
      ш: 'sh',
      щ: 'sch',
      ы: 'y',
      э: 'e',
      ю: 'yu',
      я: 'ya',
      ъ: '',
      ь: ''
    };

    return String(value || '').toLowerCase().split('').map((char) => map[char] || char).join('');
  }

  function normalizeSlug(value) {
    const slug = transliterate(value)
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug) {
      return '';
    }

    return /^[a-z]/.test(slug) ? slug : 'page-' + slug;
  }

  function truncateText(value, maxLength) {
    const text = String(value || '').trim();

    if (text.length <= maxLength) {
      return text;
    }

    return text.slice(0, maxLength - 1).trim();
  }

  function normalizeRoutePath(value) {
    const raw = String(value || '').trim();

    if (raw === '' || raw === '/') {
      return '/';
    }

    const normalized = transliterate(raw)
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/[^a-z0-9а-яё/_-]+/gu, '-')
      .replace(/\/+/g, '/')
      .replace(/-+/g, '-')
      .replace(/^\/?/, '/')
      .replace(/\/?$/, '/');

    return normalized === '//' ? '/' : normalized;
  }

  function routeSlug(route) {
    const segments = normalizeRoutePath(route).split('/').filter(Boolean);

    return normalizeSlug(segments[segments.length - 1] || '');
  }

  function seoTitleFor(title, kind) {
    const suffixes = {
      supplement: ': обзор и проверка состава',
      author: ': профиль автора NutriScope',
      article: ': гайд NutriScope'
    };
    let value = (title || '').trim();

    if (value.length < 10) {
      value = value + ' NutriScope';
    }

    value = value + (suffixes[kind] || '');

    return truncateText(value, 70);
  }

  function seoDescriptionFor(description, title) {
    let value = (description || '').trim();

    if (!value) {
      value = 'Стартовый черновик страницы "' + title + '" для CMS NutriScope: SEO-поля, маршрут, модули и публикация через draft workflow.';
    }

    if (value.length < 50) {
      value = value + ' Материал нужно дополнить фактами, источниками и редакционной проверкой перед публикацией.';
    }

    return truncateText(value, 180);
  }

  function humanDate(date) {
    try {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (error) {
      return date.toISOString().slice(0, 10);
    }
  }

  function localeForLanguageFolder(languageFolder) {
    const localization = adminState.manifest && adminState.manifest.localization
      ? adminState.manifest.localization
      : {};
    const locales = Array.isArray(localization.locales) ? localization.locales : [];
    const normalizedFolder = String(languageFolder || '').trim();

    if (normalizedFolder === '') {
      const defaultCode = String(localization.default_locale || '').trim();
      const defaultEntry = locales.find((entry) => entry && entry.code === defaultCode)
        || locales.find((entry) => entry && entry.folder === '');

      return defaultEntry && defaultEntry.html_locale ? defaultEntry.html_locale : 'en-US';
    }

    const folderEntry = locales.find((entry) => entry && entry.folder === normalizedFolder)
      || locales.find((entry) => entry && entry.code === normalizedFolder);

    return folderEntry && folderEntry.html_locale
      ? folderEntry.html_locale
      : normalizedFolder + '-' + normalizedFolder.toUpperCase();
  }

  function setCreatePageStatus(message) {
    const status = byId('admin-create-status');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function selectedCreateTemplate(contracts) {
    const kindSelect = byId('admin-create-kind');
    const templates = contracts && Array.isArray(contracts.create_templates) ? contracts.create_templates : [];

    if (!kindSelect) {
      return templates[0] || null;
    }

    return templates.find((template) => template.kind === kindSelect.value) || templates[0] || null;
  }

  function readCreateValues(template) {
    const title = byId('admin-create-title') ? byId('admin-create-title').value.trim() : '';
    const slugInput = byId('admin-create-slug');
    const slug = normalizeSlug(slugInput && slugInput.value ? slugInput.value : title);
    const now = new Date();
    const route = replacePlaceholders(template.route_template || '', { '{{slug}}': slug });
    const resource = replacePlaceholders(template.resource_template || '', { '{{slug}}': slug });
    const kind = template.kind || 'article';
    const brand = byId('admin-create-brand') && byId('admin-create-brand').value.trim()
      ? byId('admin-create-brand').value.trim()
      : 'Требует заполнения';
    const role = byId('admin-create-role') && byId('admin-create-role').value.trim()
      ? byId('admin-create-role').value.trim()
      : 'Редакционный автор';
    const seoDescription = seoDescriptionFor(
      byId('admin-create-description') ? byId('admin-create-description').value : '',
      title
    );
    const languageFolder = '';
    const locale = localeForLanguageFolder(languageFolder);

    return {
      title,
      slug,
      route,
      resource,
      kind,
      brand,
      role,
      seoTitle: seoTitleFor(title, kind),
      seoDescription,
      updatedAt: now.toISOString(),
      updatedDate: humanDate(now),
      locale,
      languageFolder
    };
  }

  function createReplacements(values) {
    return {
      '{{slug}}': values.slug,
      '{{title}}': values.title,
      '{{route}}': values.route,
      '{{resource}}': values.resource,
      '{{seo_title}}': values.seoTitle,
      '{{seo_description}}': values.seoDescription,
      '{{brand}}': values.brand,
      '{{role}}': values.role,
      '{{updated_at}}': values.updatedAt,
      '{{updated_date}}': values.updatedDate,
      '{{locale}}': values.locale,
      '{{language_folder}}': values.languageFolder
    };
  }

  function draftPathForResource(resource) {
    return resource && resource.startsWith('content/pages/')
      ? 'content/drafts/pages/' + resource.slice('content/pages/'.length)
      : '';
  }

  function previewPathForResource(resource) {
    if (!resource || !resource.startsWith('content/pages/') || !resource.endsWith('.json')) {
      return '';
    }

    return 'build/admin/previews/pages/' + resource.slice('content/pages/'.length, -'.json'.length) + '/index.html';
  }

  function buildCreatedPageContract(template, values) {
    const payloadTemplates = replacePlaceholders(clone(template.payload_templates || {}), createReplacements(values));
    const savePayload = payloadTemplates.draft_save || {};
    const page = savePayload.page || {};
    const resource = savePayload.resource || values.resource;

    return {
      resource,
      draft_path: draftPathForResource(resource),
      preview_path: previewPathForResource(resource),
      id: page.id || values.slug,
      title: page.title || values.title,
      route: page.route || values.route,
      locale: page.locale || values.locale,
      locale_folder: values.languageFolder,
      page_type: page.page_type || template.page_type || '',
      create_mode: true,
      payload_templates: payloadTemplates
    };
  }

  function addCreatedPageToContracts(contracts, page) {
    if (!Array.isArray(contracts.pages)) {
      contracts.pages = [];
    }

    const existing = contracts.pages.find((item) => item.resource === page.resource);

    if (existing && existing.create_mode !== true) {
      return false;
    }

    contracts.pages = contracts.pages.filter((item) => item.resource !== page.resource);
    contracts.pages.push(page);
    contracts.pages.sort((a, b) => String(a.route || '').localeCompare(String(b.route || '')));

    return true;
  }

  function createPageFromTemplate(contracts) {
    const template = selectedCreateTemplate(contracts);

    if (!template) {
      setCreatePageStatus('Create templates are unavailable');
      return;
    }

    const values = readCreateValues(template);

    if (!values.title || !values.slug) {
      setCreatePageStatus('Заголовок и slug обязательны для новой страницы');
      return;
    }

    const page = buildCreatedPageContract(template, values);

    if (!addCreatedPageToContracts(contracts, page)) {
      setCreatePageStatus('Страница с таким resource уже существует. Выберите другой slug или редактируйте существующую страницу.');
      return;
    }

    refreshPageSelect(contracts, page.resource);

    const actionSelect = byId('admin-payload-action');

    if (actionSelect) {
      actionSelect.value = 'draft_save';
    }

    syncPageSeoEditor(contracts);
    syncModuleEditor(contracts);
    resetDraftActionState();
    updateComposer(contracts);
    renderWorkflowPages(contracts);
    scrollToAdminSection('workflow', 'workflow');
    setCreatePageStatus('Черновик собран: сначала выполните draft save, затем preview и publish.');
  }

  function renderCreateTemplates(contracts) {
    const kindSelect = byId('admin-create-kind');
    const templates = contracts && Array.isArray(contracts.create_templates) ? contracts.create_templates : [];

    if (!kindSelect) {
      return;
    }

    fillSelect(kindSelect, templates.map((template) => ({
      value: template.kind || '',
      label: template.label || template.kind || ''
    })));
    setCreatePageStatus(templates.length > 0 ? 'Выберите тип и заполните заголовок.' : 'Create templates are unavailable');
  }

  function actionToTemplateKey(actionKey) {
    return actionKey || 'draft_save';
  }

  function selectedPageContract(contracts) {
    const pageSelect = byId('admin-payload-page');

    if (!pageSelect || !Array.isArray(contracts.pages)) {
      return null;
    }

    return contracts.pages.find((item) => item.resource === pageSelect.value) || contracts.pages[0] || null;
  }

  function draftSavePage(page) {
    return page
      && page.payload_templates
      && page.payload_templates.draft_save
      && page.payload_templates.draft_save.page
      ? page.payload_templates.draft_save.page
      : null;
  }

  function pageSeoValues(page) {
    const draftPage = draftSavePage(page) || {};
    const seo = draftPage.seo || {};

    return {
      title: draftPage.title || '',
      route: draftPage.route || page.route || '',
      original_route: page.route || draftPage.route || '',
      locale_folder: '',
      seo_title: seo.title || '',
      seo_description: seo.description || '',
      seo_robots: seo.robots || 'index,follow'
    };
  }

  function setPageSeoEditorStatus(message) {
    const status = byId('admin-page-editor-status');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function readPageSeoEditorValues() {
    return {
      title: byId('admin-page-editor-title') ? byId('admin-page-editor-title').value.trim() : '',
      route: byId('admin-page-editor-route') ? normalizeRoutePath(byId('admin-page-editor-route').value) : '',
      seo_title: byId('admin-page-editor-seo-title') ? byId('admin-page-editor-seo-title').value.trim() : '',
      seo_description: byId('admin-page-editor-seo-description') ? byId('admin-page-editor-seo-description').value.trim() : '',
      locale_folder: '',
      seo_robots: byId('admin-page-editor-seo-robots') ? byId('admin-page-editor-seo-robots').value : 'index,follow'
    };
  }

  function writePageSeoEditorValues(values) {
    if (byId('admin-page-editor-title')) {
      byId('admin-page-editor-title').value = values.title || '';
    }

    if (byId('admin-page-editor-route')) {
      byId('admin-page-editor-route').value = values.route || '';
    }

    if (byId('admin-page-editor-seo-title')) {
      byId('admin-page-editor-seo-title').value = values.seo_title || '';
    }

    if (byId('admin-page-editor-seo-description')) {
      byId('admin-page-editor-seo-description').value = values.seo_description || '';
    }

    if (byId('admin-page-editor-locale-folder')) {
      byId('admin-page-editor-locale-folder').value = '';
    }

    if (byId('admin-page-editor-seo-robots')) {
      byId('admin-page-editor-seo-robots').value = values.seo_robots || 'index,follow';
    }

    pageSeoEditorState.values = clone(values);
    pageSeoEditorState.valid = Boolean(values.title && values.route && values.seo_title && values.seo_description);
    setPageSeoEditorStatus(pageSeoEditorState.valid ? 'Page SEO and route ready for draft save payload' : 'Page title, route, SEO title, and SEO description are required');
  }

  function syncPageSeoEditor(contracts) {
    const editor = document.querySelector('[data-page-seo-editor]');
    const page = selectedPageContract(contracts);

    if (!editor || !page) {
      return;
    }

    pageSeoEditorState.resource = page.resource;
    writePageSeoEditorValues(pageSeoValues(page));
  }

  function refreshPageSeoEditor(contracts) {
    const page = selectedPageContract(contracts);

    if (!page) {
      pageSeoEditorState.resource = '';
      pageSeoEditorState.values = null;
      pageSeoEditorState.valid = false;
      setPageSeoEditorStatus('Choose a page');
      return;
    }

    pageSeoEditorState.resource = page.resource;
    writePageSeoEditorValues(readPageSeoEditorValues());
    resetDraftActionState();
    updateComposer(contracts);
  }

  function applyPageSeoEditorToPayload(selection) {
    if (
      !selection
      || !pageSeoEditorState.valid
      || pageSeoEditorState.resource !== selection.page.resource
    ) {
      return;
    }

    const values = pageSeoEditorState.values || {};
    const nextRoute = normalizeRoutePath(values.route || selection.page.route || '/');
    const previousRoute = values.original_route || selection.page.route || '';

    selection.payload.previous_route = previousRoute;
    selection.payload.route_rename_mode = nextRoute !== previousRoute;

    if (selection.actionKey !== 'draft_save' || !selection.payload.page) {
      return;
    }

    selection.payload.page.title = values.title;
    selection.payload.page.route = nextRoute;
    selection.payload.page.locale_folder = '';

    if (!selection.payload.page.seo || typeof selection.payload.page.seo !== 'object') {
      selection.payload.page.seo = {};
    }

    selection.payload.page.seo.title = values.seo_title;
    selection.payload.page.seo.description = values.seo_description;
    selection.payload.page.seo.robots = values.seo_robots;
    selection.payload.page.seo.canonical = selection.payload.page.route;

    if (selection.payload.page.seo.open_graph && typeof selection.payload.page.seo.open_graph === 'object') {
      selection.payload.page.seo.open_graph.title = values.seo_title;
      selection.payload.page.seo.open_graph.description = values.seo_description;
      selection.payload.page.seo.open_graph.url = selection.payload.page.route;
    }

    if (selection.payload.page.seo.twitter && typeof selection.payload.page.seo.twitter === 'object') {
      selection.payload.page.seo.twitter.title = values.seo_title;
      selection.payload.page.seo.twitter.description = values.seo_description;
    }

    if (Array.isArray(selection.payload.page.breadcrumbs) && selection.payload.page.breadcrumbs.length > 0) {
      const last = selection.payload.page.breadcrumbs[selection.payload.page.breadcrumbs.length - 1];

      if (last && typeof last === 'object') {
        last.title = values.title;
        last.route = selection.payload.page.route;
      }
    }

    if (selection.payload.create_mode === true) {
      selection.payload.page.id = routeSlug(selection.payload.page.route) || selection.payload.page.id;
    }
  }

  function pageModules(page) {
    const draftPage = draftSavePage(page);

    return draftPage && Array.isArray(draftPage.modules) ? draftPage.modules : [];
  }

  function moduleLabel(module) {
    return [
      module.slot || 'slot',
      module.type || 'module',
      module.id || 'module-id'
    ].join(' - ');
  }

  function scalarProp(value) {
    return ['string', 'number', 'boolean'].includes(typeof value);
  }

  function setModuleEditorStatus(message) {
    const status = byId('admin-module-editor-status');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function readModuleEditorProps() {
    const textarea = byId('admin-module-editor-props');

    if (!textarea) {
      return { valid: false, props: null };
    }

    try {
      const parsed = JSON.parse(textarea.value || '{}');

      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        return { valid: false, props: null };
      }

      return { valid: true, props: parsed };
    } catch (error) {
      return { valid: false, props: null };
    }
  }

  function writeModuleEditorProps(props) {
    const textarea = byId('admin-module-editor-props');

    if (textarea) {
      textarea.value = JSON.stringify(props || {}, null, 2);
    }

    moduleEditorState.props = clone(props || {});
    moduleEditorState.valid = true;
    setModuleEditorStatus('Module props ready for draft save payload');
  }

  function updateModulePropValue(key, value, originalValue, contracts) {
    const current = readModuleEditorProps();

    if (!current.valid) {
      moduleEditorState.valid = false;
      setModuleEditorStatus('Props JSON must be a valid object before editing fields');
      return;
    }

    if (typeof originalValue === 'number') {
      const numberValue = Number(value);
      current.props[key] = Number.isFinite(numberValue) ? numberValue : originalValue;
    } else if (typeof originalValue === 'boolean') {
      current.props[key] = Boolean(value);
    } else {
      current.props[key] = value;
    }

    writeModuleEditorProps(current.props);
    resetDraftActionState();
    updateComposer(contracts);
  }

  function renderModuleFields(props, contracts) {
    const fields = byId('admin-module-editor-fields');

    if (!fields) {
      return;
    }

    fields.innerHTML = '';
    const scalarEntries = Object.entries(props || {}).filter(([, value]) => scalarProp(value));

    if (scalarEntries.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'This module uses nested props; edit the JSON object below.';
      fields.appendChild(empty);
      return;
    }

    scalarEntries.forEach(([key, value]) => {
      const label = document.createElement('label');
      const caption = document.createElement('span');
      const input = document.createElement('input');
      caption.textContent = key;
      input.setAttribute('data-module-prop-field', key);

      if (typeof value === 'boolean') {
        input.type = 'checkbox';
        input.checked = value;
        input.addEventListener('change', () => updateModulePropValue(key, input.checked, value, contracts));
      } else {
        input.type = typeof value === 'number' ? 'number' : 'text';
        input.value = String(value);
        input.addEventListener('input', () => updateModulePropValue(key, input.value, value, contracts));
      }

      label.appendChild(caption);
      label.appendChild(input);
      fields.appendChild(label);
    });
  }

  function loadSelectedModuleProps(contracts) {
    const page = selectedPageContract(contracts);
    const moduleSelect = byId('admin-module-editor-module');
    const modules = page ? pageModules(page) : [];
    const selected = moduleSelect
      ? modules.find((module) => module.id === moduleSelect.value) || modules[0]
      : modules[0];

    if (!page || !selected) {
      moduleEditorState.resource = '';
      moduleEditorState.moduleId = '';
      moduleEditorState.props = null;
      moduleEditorState.valid = false;
      writeModuleEditorProps({});
      moduleEditorState.valid = false;
      renderModuleFields({}, contracts);
      setModuleEditorStatus('Selected page has no editable modules');
      return;
    }

    moduleEditorState.resource = page.resource;
    moduleEditorState.moduleId = selected.id || '';
    writeModuleEditorProps(clone(selected.props || {}));
    renderModuleFields(moduleEditorState.props, contracts);
  }

  function syncModuleEditor(contracts) {
    const editor = document.querySelector('[data-module-props-editor]');
    const moduleSelect = byId('admin-module-editor-module');
    const page = selectedPageContract(contracts);

    if (!editor || !moduleSelect || !page) {
      return;
    }

    const previousModuleId = moduleEditorState.resource === page.resource ? moduleEditorState.moduleId : '';
    const modules = pageModules(page);
    fillSelect(moduleSelect, modules.map((module) => ({
      value: module.id || '',
      label: moduleLabel(module)
    })));

    if (previousModuleId && modules.some((module) => module.id === previousModuleId)) {
      moduleSelect.value = previousModuleId;
    }

    loadSelectedModuleProps(contracts);
  }

  function applyModuleEditorToPayload(selection) {
    if (
      !selection
      || selection.actionKey !== 'draft_save'
      || !moduleEditorState.valid
      || moduleEditorState.resource !== selection.page.resource
      || !selection.payload.page
      || !Array.isArray(selection.payload.page.modules)
    ) {
      return;
    }

    const module = selection.payload.page.modules.find((item) => item.id === moduleEditorState.moduleId);

    if (module) {
      module.props = clone(moduleEditorState.props || {});
    }
  }

  function currentDraftSelection(contracts) {
    const actionSelect = byId('admin-payload-action');
    const page = selectedPageContract(contracts);
    const actionKey = actionToTemplateKey(actionSelect ? actionSelect.value : 'draft_save');
    const action = contracts.actions[actionKey] || contracts.actions.draft_save;

    if (!page || !action) {
      return null;
    }

    const template = page.payload_templates[actionKey] || page.payload_templates.draft_save;
    const payload = replacePlaceholders(clone(template), currentFormValues());
    const selection = { page, actionKey, action, payload };
    applyPageSeoEditorToPayload(selection);
    applyModuleEditorToPayload(selection);

    return selection;
  }

  function updateComposer(contracts) {
    const commandOutput = byId('admin-command-output');
    const payloadOutput = byId('admin-payload-output');
    const selection = currentDraftSelection(contracts);

    if (!selection) {
      commandOutput.value = '';
      payloadOutput.value = '';
      return;
    }

    commandOutput.value = [
      selection.action.command,
      selection.action.dry_run_command,
      'Payload path: ' + selection.action.payload_path
    ].join('\n');
    payloadOutput.value = JSON.stringify(selection.payload, null, 2);
  }

  function setPayloadShortcutStatus(message) {
    const status = byId('admin-payload-shortcut-status');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function openAdminSection(section) {
    const panel = document.querySelector('[data-section-panel="' + section + '"]')
      || byId(section)
      || byId('admin-' + section);

    if (panel && panel.tagName.toLowerCase() === 'details') {
      panel.open = true;

      let parent = panel.parentElement ? panel.parentElement.closest('details') : null;

      while (parent) {
        parent.open = true;
        parent = parent.parentElement ? parent.parentElement.closest('details') : null;
      }
    }

    return panel;
  }

  function scrollToAdminSection(section, fallbackId) {
    const panel = openAdminSection(section);
    const target = byId(fallbackId || '') || panel;

    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function closeAllAdminSpoilers() {
    document.querySelectorAll('main details[open]').forEach((panel) => {
      panel.open = false;
    });
  }

  function wireAdminBrandCollapse() {
    document.querySelectorAll('[data-admin-collapse-spoilers]').forEach((brand) => {
      if (brand.dataset.adminCollapseSpoilersBound === 'true') {
        return;
      }

      brand.dataset.adminCollapseSpoilersBound = 'true';
      brand.addEventListener('click', (event) => {
        event.preventDefault();
        closeAllAdminSpoilers();
        setAccountPanelOpen(false);

        const main = byId('admin-main');
        if (main && typeof main.focus === 'function') {
          try {
            main.focus({ preventScroll: true });
          } catch (error) {
            main.focus();
          }
        }
      });
    });
  }

  function wireAdminNavAnchors() {
    document.querySelectorAll('.admin-nav__item[href^="#admin-"]').forEach((anchor) => {
      if (anchor.dataset.adminNavBound === 'true') {
        return;
      }

      anchor.dataset.adminNavBound = 'true';
      anchor.addEventListener('click', (event) => {
        const hash = anchor.getAttribute('href') || '';
        const fallbackId = hash.slice(1);
        const section = fallbackId.replace(/^admin-/, '');

        event.preventDefault();
        scrollToAdminSection(section, fallbackId);

        if (window.history && fallbackId) {
          window.history.replaceState(null, '', '#' + fallbackId);
        }
      });
    });
  }

  function loadPageFromUrl(contracts) {
    const params = new URLSearchParams(window.location.search);
    const resource = params.get('resource') || '';

    if (!resource) {
      return false;
    }

    loadPageIntoComposer(contracts, resource);
    return true;
  }

  function loadPageIntoComposer(contracts, resource) {
    const pageSelect = byId('admin-payload-page');
    const actionSelect = byId('admin-payload-action');
    const page = Array.isArray(contracts.pages)
      ? contracts.pages.find((item) => item.resource === resource)
      : null;

    if (!pageSelect || !actionSelect || !page) {
      setPayloadShortcutStatus('Page shortcut is unavailable');
      return;
    }

    pageSelect.value = page.resource;
    scrollToAdminSection('workflow', 'workflow');

    if (contracts.actions && contracts.actions.draft_save) {
      actionSelect.value = 'draft_save';
    }

    syncPageSeoEditor(contracts);
    syncModuleEditor(contracts);
    resetDraftActionState();
    updateComposer(contracts);
    setPayloadShortcutStatus('Editing ' + page.route + ' in draft save');

    if (typeof pageSelect.focus === 'function') {
      pageSelect.focus({ preventScroll: true });
    }
  }

  function loadPageIntoEditorial(contracts, resource) {
    const modeSelect = document.querySelector('[data-editorial-mode]');
    const pageSelect = document.querySelector('[data-editorial-existing-page]');
    const page = Array.isArray(contracts.pages)
      ? contracts.pages.find((item) => item.resource === resource)
      : null;

    if (!modeSelect || !pageSelect || !page) {
      return false;
    }

    modeSelect.value = 'edit';
    pageSelect.value = page.resource;

    const titleInput = byId('admin-editorial-title');
    const slugInput = byId('admin-editorial-slug');
    const languageInput = document.querySelector('[data-editorial-language-folder]');

    if (titleInput) {
      titleInput.value = page.title || '';
    }

    if (slugInput) {
      slugInput.value = normalizeSlug((page.route || '').split('/').filter(Boolean).pop() || page.id || page.title || '');
      slugInput.dataset.manualSlug = 'true';
    }

    if (languageInput) {
      languageInput.value = '';
    }

    syncEditorialModeControls(contracts);
    editorialState.visibleFields = [];
    renderEditorialMatrix(contracts);
    setEditorialOutput(currentEditorialPayload(contracts));
    scrollToAdminSection('editorial', 'admin-editorial');
    setEditorialStatus('Редактирование страницы: ' + (page.route || page.resource));

    return true;
  }

  function wirePageEditShortcuts(contracts) {
    document.querySelectorAll('[data-edit-page]').forEach((button) => {
      if (button.dataset.editBound === 'true') {
        return;
      }

      button.dataset.editBound = 'true';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const resource = button.getAttribute('data-edit-page') || '';

        if (!loadPageIntoEditorial(contracts, resource) && byId('admin-payload-page')) {
          loadPageIntoComposer(contracts, resource);
        }
      });
    });
  }

  function setPageFilterStatus(message) {
    const status = byId('admin-page-filter-status');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function updatePageFilters() {
    const search = document.querySelector('[data-page-search]');
    const typeFilter = document.querySelector('[data-page-type-filter]');
    const rows = Array.from(document.querySelectorAll('[data-page-row]'));
    const query = search ? search.value.trim().toLowerCase() : '';
    const selectedType = typeFilter ? typeFilter.value : '';
    let visible = 0;

    rows.forEach((row) => {
      const route = row.getAttribute('data-page-route') || '';
      const title = row.getAttribute('data-page-title') || '';
      const type = row.getAttribute('data-page-type') || '';
      const haystack = (route + ' ' + title + ' ' + type).toLowerCase();
      const matchesQuery = query === '' || haystack.includes(query);
      const matchesType = selectedType === '' || type === selectedType;
      const matches = matchesQuery && matchesType;

      row.hidden = !matches;

      if (matches) {
        visible += 1;
      }
    });

    setPageFilterStatus('Showing ' + visible + ' of ' + rows.length + ' pages');
  }

  function wirePageFilters() {
    const search = document.querySelector('[data-page-search]');
    const typeFilter = document.querySelector('[data-page-type-filter]');

    if (!search || !typeFilter) {
      return;
    }

    if (search.dataset.filterBound !== 'true') {
      search.dataset.filterBound = 'true';
      search.addEventListener('input', updatePageFilters);
    }

    if (typeFilter.dataset.filterBound !== 'true') {
      typeFilter.dataset.filterBound = 'true';
      typeFilter.addEventListener('change', updatePageFilters);
    }

    updatePageFilters();
  }

  function setDraftActionStatus(message) {
    const status = byId('admin-draft-action-status');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function setStatusBusy(id, busy) {
    const status = byId(id);

    if (status) {
      status.setAttribute('aria-busy', busy ? 'true' : 'false');
    }
  }

  function setDraftActionOutput(payload) {
    const output = byId('admin-draft-action-output');

    if (!output) {
      return;
    }

    output.value = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  }

  function formatDraftActionSummary(payload) {
    if (!payload || typeof payload !== 'object') {
      return 'No action response yet';
    }

    const response = payload.response && typeof payload.response === 'object' ? payload.response : {};
    const writtenPaths = Array.isArray(response.written_paths) ? response.written_paths : [];
    const issues = Array.isArray(response.issues) ? response.issues : [];
    const parts = [
      (payload.action || response.action || 'draft_action') + ' HTTP ' + (payload.status || 0),
      payload.ok ? 'ok' : 'failed'
    ];

    if (payload.resource) {
      parts.push(payload.resource);
    }

    if (response.draft_path) {
      parts.push('draft: ' + response.draft_path);
    }

    if (response.preview_path) {
      parts.push('preview: ' + response.preview_path);
    }

    parts.push('writes: ' + writtenPaths.length);

    if (issues.length > 0) {
      parts.push('issues: ' + issues.slice(0, 2).join(' | '));
    }

    return parts.join(' · ');
  }

  function setDraftActionSummary(payload) {
    const summary = byId('admin-draft-action-summary');

    if (summary) {
      summary.value = formatDraftActionSummary(payload);
      summary.textContent = formatDraftActionSummary(payload);
    }
  }

  function setDraftExecuteEnabled(enabled) {
    const execute = document.querySelector('[data-draft-run-execute]');

    if (!execute) {
      return;
    }

    execute.disabled = !enabled;
    execute.setAttribute('aria-disabled', enabled ? 'false' : 'true');
  }

  function previewLinkHref(previewPath) {
    if (typeof previewPath !== 'string') {
      return '';
    }

    const trimmed = previewPath.trim();
    const relative = trimmed.startsWith('build/admin/') ? trimmed.slice('build/admin/'.length) : trimmed;

    if (!relative.startsWith('previews/') || relative.includes('..')) {
      return '';
    }

    return relative;
  }

  function updateDraftPreviewLink(payload) {
    const link = document.querySelector('[data-draft-preview-link]');

    if (!link) {
      return;
    }

    const response = payload && typeof payload === 'object' && payload.response ? payload.response : payload;
    const previewPath = response && typeof response.preview_path === 'string' ? response.preview_path : '';
    const href = previewLinkHref(previewPath);

    if (!href) {
      link.hidden = true;
      link.removeAttribute('href');
      link.textContent = 'Open preview';
      return;
    }

    link.href = href;
    link.hidden = false;
    link.textContent = 'Open preview: ' + previewPath;
  }

  function setDesignStatus(message) {
    const statuses = document.querySelectorAll('[data-design-status]');

    statuses.forEach((status) => {
      status.value = message;
      status.textContent = message;
    });
  }

  function setDesignOutput(payload) {
    const outputs = document.querySelectorAll('[data-design-output]');
    const value = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);

    outputs.forEach((output) => {
      output.value = value;
    });
  }

  function designEndpoint(name) {
    const authContract = readAuthContract();
    const contracted = name === 'design_generate'
      ? authEndpoint(authContract, 'design_generate')
      : authEndpoint(authContract, name);
    const fallback = {
      design_generate: '/admin/design/generate',
      design_save_draft: '/admin/design/save-draft',
      design_preview: '/admin/design/preview',
      design_apply: '/admin/design/apply',
      design_rollback: '/admin/design/rollback',
      design_upload: '/admin/design/upload',
      design_deploy_package: '/admin/design/deploy-package'
    };

    return contracted || fallback[name] || '';
  }

  function siteRebrandEndpoint(authContract, dryRun) {
    const endpoint = authContract
      && authContract.endpoints
      && authContract.endpoints.site_rebrand
      ? authContract.endpoints.site_rebrand
      : {};

    if (dryRun && endpoint.dry_run_path) {
      return endpoint.dry_run_path;
    }

    return endpoint.path || protectedEndpointFallbacks.site_rebrand || '';
  }

  function setDomainStatus(message) {
    const status = byId('admin-domain-status');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function setDomainOutput(payload) {
    const output = byId('admin-domain-output');

    if (output) {
      output.value = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    }
  }

  function setServerMaintenanceStatus(message) {
    const status = byId('admin-server-maintenance-status');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function setServerMaintenanceOutput(payload) {
    const output = byId('admin-server-maintenance-output');

    if (output) {
      output.value = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    }
  }

  function setMedGenStatus(message) {
    const status = byId('admin-medgen-status');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function setMedGenOutput(payload) {
    const output = byId('admin-medgen-output');

    if (output) {
      output.value = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    }
  }

  function collectMedGenPayload() {
    const payload = {};

    document.querySelectorAll('[data-medgen-field]').forEach((field) => {
      const key = field.getAttribute('data-medgen-field') || '';

      if (!key) {
        return;
      }

      if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) && field.value.trim() !== '') {
        payload[key] = field.value.trim();
      }
    });

    const site = {};
    document.querySelectorAll('[data-medgen-site-field]').forEach((field) => {
      const key = field.getAttribute('data-medgen-site-field') || '';

      if (key && field instanceof HTMLInputElement && field.value.trim() !== '') {
        site[key] = field.value.trim();
      }
    });
    if (Object.keys(site).length > 0) {
      payload.site = site;
    }

    const target = {};
    document.querySelectorAll('[data-medgen-target-field]').forEach((field) => {
      const key = field.getAttribute('data-medgen-target-field') || '';

      if (key && field instanceof HTMLInputElement && field.value.trim() !== '') {
        target[key] = field.value.trim();
      }
    });
    if (Object.keys(target).length > 0) {
      payload.target = target;
    }

    const product = {};
    document.querySelectorAll('[data-medgen-product-field]').forEach((field) => {
      const key = field.getAttribute('data-medgen-product-field') || '';

      if (key && field instanceof HTMLInputElement && field.value.trim() !== '') {
        product[key] = field.value.trim();
      }
    });
    if (Object.keys(product).length > 0) {
      payload.product = product;
    }

    const author = {};
    document.querySelectorAll('[data-medgen-author-field]').forEach((field) => {
      const key = field.getAttribute('data-medgen-author-field') || '';

      if (key && (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && field.value.trim() !== '') {
        author[key] = field.value.trim();
      }
    });
    if (Object.keys(author).length > 0) {
      payload.author = author;
    }

    const extra = {};
    document.querySelectorAll('[data-medgen-extra-field]').forEach((field) => {
      const key = field.getAttribute('data-medgen-extra-field') || '';

      if (!key) {
        return;
      }

      if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) && field.value.trim() !== '') {
        extra[key] = field.value.trim();
      }
    });
    if (Object.keys(extra).length > 0) {
      payload.extra = Object.assign(
        payload.extra && typeof payload.extra === 'object' && !Array.isArray(payload.extra) ? payload.extra : {},
        extra
      );
    }

    return {
      payload,
      publish: true
    };
  }

  async function runMedGenWorkflow(dryRun) {
    if (!isGithubMode()) {
      setMedGenStatus('MedGen доступен только в CMS-admin_v2 на GitHub Pages.');
      setMedGenOutput({ ok: false, issues: ['github_pages_admin_required'] });
      return;
    }

    if (!dryRun && !window.confirm('Запустить MedGen workflow? Генерация может занять до 30 минут.')) {
      setMedGenStatus('MedGen запуск отменен');
      return;
    }

    const config = readGithubConfig();
    const timeoutField = byId('admin-medgen-timeout');
    const intervalField = byId('admin-medgen-interval');
    const deployField = byId('admin-medgen-deploy');
    const workflow = config.medgen_workflow_id || 'medgen-content.yml';
    const payload = collectMedGenPayload();

    setMedGenStatus(dryRun ? 'Проверяю MedGen payload...' : 'Запускаю MedGen workflow...');
    setStatusBusy('admin-medgen-status', true);

    try {
      const result = await githubDispatchWorkflow(workflow, {
        medgen_payload_json: JSON.stringify(payload),
        dry_run: dryRun ? 'true' : 'false',
        poll_timeout_seconds: timeoutField && timeoutField.value.trim() ? timeoutField.value.trim() : '1800',
        poll_interval_seconds: intervalField && intervalField.value.trim() ? intervalField.value.trim() : '5',
        deploy_static_vps: deployField && deployField.checked && !dryRun ? 'true' : 'false',
        target: 'production'
      }, config.medgen_actions_url || '');

      setMedGenOutput(result);
      setMedGenStatus(result.ok ? 'MedGen workflow запущен. Следите за статусом в GitHub Actions.' : 'MedGen workflow не запущен.');
    } finally {
      setStatusBusy('admin-medgen-status', false);
    }
  }

  function slugFromDomainValue(value) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return /^[a-z]/.test(normalized) ? normalized.slice(0, 49) : ('site-' + normalized).slice(0, 49);
  }

  function fillDomainDefaults() {
    const domainField = byId('admin-domain-name');
    const baseUrlField = byId('admin-domain-base-url');
    const emailField = byId('admin-domain-email');
    const routeSeedField = byId('admin-domain-route-seed');
    const defaultLocaleField = byId('admin-domain-default-locale');

    if (!domainField) {
      return;
    }

    const domain = domainField.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();

    if (domainField.value !== domain) {
      domainField.value = domain;
    }

    if (domain && baseUrlField && !baseUrlField.value.trim()) {
      baseUrlField.value = 'https://' + domain;
    }

    if (domain && emailField && !emailField.value.trim()) {
      emailField.value = 'info@' + domain;
    }

    if (domain && routeSeedField && !routeSeedField.value.trim()) {
      routeSeedField.value = slugFromDomainValue(domain);
    }

    if (defaultLocaleField && !defaultLocaleField.value.trim()) {
      defaultLocaleField.value = 'en';
    }

    const seed = routeSeedField && routeSeedField.value.trim() ? routeSeedField.value.trim() : slugFromDomainValue(domain);
    const routeDefaults = {
      supplement: '/' + seed + '-reviews/',
      author: '/' + seed + '-experts/',
      article: '/' + seed + '-guides/'
    };

    document.querySelectorAll('[data-domain-route-prefix]').forEach((field) => {
      const kind = field.getAttribute('data-domain-route-prefix') || '';

      if (field instanceof HTMLInputElement && !field.value.trim() && routeDefaults[kind]) {
        field.value = routeDefaults[kind];
      }
    });
  }

  function collectDomainProfilePayload() {
    fillDomainDefaults();

    const payload = {};

    document.querySelectorAll('[data-domain-field]').forEach((field) => {
      const key = field.getAttribute('data-domain-field') || '';

      if (key && field instanceof HTMLInputElement) {
        payload[key] = field.value.trim();
      }
    });

    const routeNamespaces = {};

    document.querySelectorAll('[data-domain-route-prefix]').forEach((field) => {
      const key = field.getAttribute('data-domain-route-prefix') || '';

      if (key && field instanceof HTMLInputElement && field.value.trim()) {
        routeNamespaces[key] = field.value.trim();
      }
    });

    payload.route_namespaces = routeNamespaces;
    payload.deploy_target = collectDomainDeployTargetPayload();

    return payload;
  }

  function collectDomainDeployTargetPayload() {
    const target = {};

    document.querySelectorAll('[data-domain-deploy-field]').forEach((field) => {
      const key = field.getAttribute('data-domain-deploy-field') || '';

      if (!key) {
        return;
      }

      if (field instanceof HTMLInputElement && field.type === 'checkbox') {
        target[key] = field.checked;
        return;
      }

      if (field instanceof HTMLInputElement) {
        target[key] = field.value.trim();
      }
    });

    return target;
  }

  async function runSiteRebrandAction(authContract, dryRun) {
    const contract = activeAuthContract(authContract);
    const path = siteRebrandEndpoint(contract, dryRun);
    const payload = collectDomainProfilePayload();

    if (isGithubMode()) {
      if (!dryRun && !window.confirm('Запустить GitHub workflow для нового доменного профиля и последующего статического деплоя?')) {
        setDomainStatus('Применение отменено');
        return;
      }

      setDomainStatus(dryRun ? 'GitHub dry-run доменного профиля...' : 'Запускаю GitHub workflow доменного профиля...');
      setStatusBusy('admin-domain-status', true);

      try {
        const result = await githubDispatchCommand('site_rebrand', payload, dryRun);

        setDomainOutput(result);
        setDomainStatus(result.ok ? (dryRun ? 'GitHub dry-run профиля запущен.' : 'GitHub workflow профиля запущен.') : 'GitHub workflow профиля не запущен.');
      } finally {
        setStatusBusy('admin-domain-status', false);
      }

      return;
    }

    if (!path) {
      setDomainStatus('Site profile endpoint недоступен');
      setDomainOutput({ ok: false, issues: ['site profile endpoint unavailable'] });
      return;
    }

    if (!dryRun && !window.confirm('Применить новый доменный профиль локально? После этого нужен build, SEO audit и deploy.')) {
      setDomainStatus('Применение отменено');
      return;
    }

    setDomainStatus(dryRun ? 'Проверяю доменный профиль...' : 'Применяю доменный профиль...');
    setStatusBusy('admin-domain-status', true);

    try {
      const response = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          [contract.csrf_header || 'X-CSRF-Token']: authState.csrfToken || (byId('admin-payload-csrf') ? byId('admin-payload-csrf').value : '')
        },
        body: JSON.stringify(payload)
      });
      const payload = await readResponseJson(response);
      const wrapped = Object.assign({ ok: response.ok && payload.ok !== false, http_status: response.status }, payload);

      setDomainOutput(wrapped);
      setDomainStatus(wrapped.ok ? (dryRun ? 'Профиль валиден; можно применять.' : 'Профиль применен; выполните build, SEO audit и deploy.') : ((wrapped.issues || [wrapped.issue || 'Ошибка профиля']).join(' | ')));
    } catch (error) {
      setDomainOutput({ ok: false, issues: ['site profile endpoint unavailable'] });
      setDomainStatus('Site profile endpoint недоступен');
    } finally {
      setStatusBusy('admin-domain-status', false);
    }
  }

  async function runServerMaintenanceAction(action) {
    if (!isGithubMode()) {
      setServerMaintenanceStatus('Server maintenance доступен только в GitHub Pages-админке.');
      setServerMaintenanceOutput({ ok: false, issues: ['github_pages_admin_required'] });
      return;
    }

    const targetField = byId('admin-server-maintenance-target');
    const purgeField = byId('admin-server-maintenance-purge');
    const target = targetField && targetField.value.trim() ? targetField.value.trim() : 'production';
    const purgeRuntimePackages = purgeField ? purgeField.checked : true;
    const actionLabels = {
      backup: 'создать backup VPS',
      reset_static_host: 'очистить static host',
      backup_and_reset_static_host: 'создать backup и очистить static host'
    };

    if (action !== 'backup' && !window.confirm('Запустить обслуживание VPS: ' + (actionLabels[action] || action) + '? Это изменит состояние сервера.')) {
      setServerMaintenanceStatus('Операция обслуживания отменена');
      return;
    }

    setServerMaintenanceStatus('Запускаю server-maintenance workflow...');
    setStatusBusy('admin-server-maintenance-status', true);

    try {
      const config = readGithubConfig();
      const workflow = config.server_maintenance_workflow_id || 'server-maintenance.yml';
      const result = await githubDispatchWorkflow(workflow, {
        action,
        target,
        purge_runtime_packages: purgeRuntimePackages ? 'true' : 'false'
      }, config.server_maintenance_actions_url || '');

      setServerMaintenanceOutput(result);
      setServerMaintenanceStatus(result.ok ? 'Server maintenance workflow запущен.' : 'Server maintenance workflow не запущен.');
    } finally {
      setStatusBusy('admin-server-maintenance-status', false);
    }
  }

  function requestId(prefix) {
    return prefix + '-' + Date.now().toString(36);
  }

  function editorialConfig(contracts) {
    if (editorialState.config) {
      return editorialState.config;
    }

    editorialState.config = contracts && contracts.editorial_widget ? contracts.editorial_widget : null;

    return editorialState.config;
  }

  function setEditorialStatus(message) {
    const status = document.querySelector('[data-editorial-status]');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function resetEditorialWidgetState() {
    editorialState.config = null;
    editorialState.visibleFields = [];
    editorialState.editFieldValues = {};
    editorialState.editMedia = {};
    editorialState.media = {};
    editorialState.lastQueuePayload = null;
    productCardState.visibleFields = [];
    productCardState.editFieldValues = {};
    productCardState.editMedia = {};
    productCardState.media = {};
    productCardState.lastQueuePayload = null;
  }

  function editorialActorPayload() {
    const actor = authState.actor || {};

    return {
      id: actor.id || (byId('admin-payload-actor-id') ? byId('admin-payload-actor-id').value : 'editor-1'),
      role: actor.role || (byId('admin-payload-role') ? byId('admin-payload-role').value : 'editor')
    };
  }

  function selectedEditorialContentType(config) {
    const select = document.querySelector('[data-editorial-content-type]');
    const types = config && Array.isArray(config.content_types) ? config.content_types : [];

    return select && select.value ? select.value : types[0] || '';
  }

  function editorialContentTypeForPage(page) {
    const data = editorialPageData(page);
    const pageType = page && page.page_type ? page.page_type : '';
    const route = page && page.route ? String(page.route) : '';
    const schemaTypes = data && Array.isArray(data.schema_org) ? data.schema_org : [];

    if (pageType === 'supplement' || schemaTypes.includes('Product')) {
      return 'product';
    }

    if ((pageType === 'authors' && route !== '/experts/') || schemaTypes.includes('Person') || schemaTypes.includes('ProfilePage')) {
      return 'author';
    }

    if (pageType === 'category') {
      return 'category';
    }

    if ((route.startsWith('/guides/') && route !== '/guides/') || schemaTypes.includes('Article')) {
      return 'article';
    }

    return 'technical';
  }

  function editorialPageData(page) {
    return page && page.payload_templates && page.payload_templates.draft_save && page.payload_templates.draft_save.page
      ? page.payload_templates.draft_save.page
      : null;
  }

  function editorialModuleProps(pageData, type) {
    const modules = pageData && Array.isArray(pageData.modules) ? pageData.modules : [];

    for (const module of modules) {
      if (module && module.type === type && module.props && typeof module.props === 'object') {
        return module.props;
      }
    }

    return null;
  }

  function editorialSeoDescription(pageData) {
    return pageData && pageData.seo && typeof pageData.seo.description === 'string'
      ? pageData.seo.description
      : '';
  }

  function editorialString(value) {
    return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  }

  function editorialListText(value) {
    return Array.isArray(value)
      ? value.filter((item) => typeof item === 'string' || typeof item === 'number').map((item) => String(item).trim()).filter(Boolean).join('\n')
      : editorialString(value);
  }

  function editorialObjectRows(items, keys) {
    return Array.isArray(items)
      ? items.map((item) => {
          if (!item || typeof item !== 'object') {
            return '';
          }

          return keys.map((key) => editorialString(item[key])).filter(Boolean).join(' | ');
        }).filter(Boolean).join('\n')
      : '';
  }

  function editorialEditableFieldsForPage(page) {
    return page && Array.isArray(page.editable_fields) ? page.editable_fields : [];
  }

  function editorialMediaFromEditableFields(fields) {
    const media = {};
    const imageField = fields.find((field) => field && /^page\.modules\.\d+\.props\.image$/.test(field.key || ''));
    const altField = fields.find((field) => field && /^page\.modules\.\d+\.props\.image_alt$/.test(field.key || ''));

    if (imageField && typeof imageField.value === 'string') {
      media.path = imageField.value;
    }

    if (altField && typeof altField.value === 'string') {
      media.alt = altField.value;
    }

    return media;
  }

  function editorialExistingValues(page, contentType) {
    const pageData = editorialPageData(page);
    const values = {};
    const media = {};

    if (!pageData) {
      return { values, media };
    }

    values.title = editorialString(pageData.title || page.title || '');
    const editableFields = editorialEditableFieldsForPage(page);

    if (editableFields.length > 0) {
      editableFields.forEach((field) => {
        const key = field && field.key ? field.key : '';

        if (!key) {
          return;
        }

        values[key] = typeof field.value === 'string' || typeof field.value === 'number'
          ? String(field.value)
          : field.example || '';
      });

      return {
        values,
        media: Object.assign(media, editorialMediaFromEditableFields(editableFields))
      };
    }

    if (contentType === 'product') {
      const props = editorialModuleProps(pageData, 'supplement_profile') || {};
      values.brand = editorialString(props.brand);
      values.description = editorialString(props.summary || editorialSeoDescription(pageData));
      values.rating = editorialString(props.rating);
      values.price_range = editorialString(props.price);
      values.buy_button = editorialString(props.seller_label);
      values.buy_url = editorialString(props.seller_url);
      values.verdict = editorialString(props.verdict);
      values.availability = editorialString(props.availability);
      values.facts = editorialObjectRows(props.facts, ['label', 'value']);
      values.ingredients = editorialObjectRows(props.ingredients, ['name', 'amount', 'note']);
      values.safety_notes = editorialListText(props.safety_notes);
      values.pros = editorialListText(props.pros);
      values.cons = editorialListText(props.cons);
      values.sources = editorialObjectRows(props.sources, ['title', 'url', 'note']);
      media.path = editorialString(props.image);
      media.alt = editorialString(props.image_alt || values.title);
      return { values, media };
    }

    if (contentType === 'author') {
      const props = editorialModuleProps(pageData, 'author_profile') || {};
      values.author_name = editorialString(props.name || pageData.title);
      values.role = editorialString(props.role);
      values.credentials = editorialListText(props.credentials);
      values.bio = editorialString(props.bio || editorialSeoDescription(pageData));
      media.path = editorialString(props.image);
      media.alt = editorialString(props.image_alt || values.author_name);
      return { values, media };
    }

    const header = editorialModuleProps(pageData, 'page_header') || {};
    const richText = editorialModuleProps(pageData, 'rich_text') || {};
    const faq = editorialModuleProps(pageData, 'faq') || {};
    values.description = editorialString(header.lead || editorialSeoDescription(pageData));

    if (contentType === 'article' || contentType === 'review') {
      values.body_sections = Array.isArray(richText.content) ? richText.content.join('\n\n') : '';
      values.author_name = editorialString(pageData.author_name || 'Редакция NutriScope');
    }

    if (contentType === 'technical') {
      values.policy_sections = Array.isArray(richText.content) ? richText.content.join('\n\n') : '';
    }

    if (Array.isArray(faq.items)) {
      values.faq = faq.items.map((item) => {
        if (!item || typeof item !== 'object') {
          return '';
        }

        return editorialString(item.question) + ' | ' + editorialString(item.answer);
      }).filter(Boolean).join('\n');
    }

    media.path = editorialString(header.image);
    media.alt = editorialString(header.image_alt || values.title);

    return { values, media };
  }

  function editorialPageOptions(contracts) {
    return contracts && Array.isArray(contracts.pages)
      ? contracts.pages.filter((page) => page && page.resource && !page.create_mode)
      : [];
  }

  function selectedEditorialPage(contracts) {
    const select = document.querySelector('[data-editorial-existing-page]');
    const resource = select ? select.value : '';

    if (!resource) {
      return null;
    }

    return editorialPageOptions(contracts).find((page) => page.resource === resource) || null;
  }

  function fillEditorialPageSelects(contracts) {
    const pages = editorialPageOptions(contracts);
    const options = [{ value: '', label: 'Выберите страницу' }].concat(pages.map((page) => ({
      value: page.resource,
      label: (page.route || page.resource) + ' - ' + (page.title || page.id || 'Без названия')
    })));

    fillSelect(document.querySelector('[data-editorial-existing-page]'), options);
    fillSelect(document.querySelector('[data-editorial-delete-page]'), options);
  }

  function setEditorialSelectionSummary(page, contentType, values) {
    const target = document.querySelector('[data-editorial-selection-summary]');

    if (!target) {
      return;
    }

    if (!page) {
      target.hidden = true;
      target.textContent = '';
      return;
    }

    const fields = Object.keys(values || {}).filter((key) => key !== 'title' && editorialString(values[key]) !== '');
    target.hidden = false;
    target.innerHTML = '<strong>Загружена готовая страница: ' + escapeHtml(page.title || page.id || page.route || '') + '</strong>'
      + '<p>Тип редактора: <code>' + escapeHtml(contentType) + '</code>. Route: <code>' + escapeHtml(page.route || '') + '</code>. JSON: <code>' + escapeHtml(page.resource || '') + '</code>.</p>'
      + '<p>Можно редактировать выбранные поля матрицы; дополнительные поля включаются галочками и попадут в payload публикации. Сейчас распознано полей: ' + escapeHtml(String(fields.length)) + '.</p>';
  }

  function currentEditorialMode() {
    const mode = document.querySelector('[data-editorial-mode]');

    return mode && mode.value === 'edit' ? 'edit' : 'create';
  }

  function syncEditorialModeControls(contracts) {
    const mode = currentEditorialMode();
    const existingPage = document.querySelector('[data-editorial-existing-page]');
    const page = selectedEditorialPage(contracts);

    if (existingPage) {
      existingPage.disabled = mode !== 'edit';
    }

    if (mode === 'edit' && page) {
      const typeSelect = document.querySelector('[data-editorial-content-type]');
      const titleInput = byId('admin-editorial-title');
      const slugInput = byId('admin-editorial-slug');
      const languageInput = document.querySelector('[data-editorial-language-folder]');
      const mediaPath = byId('admin-editorial-media-path');
      const mediaAlt = byId('admin-editorial-media-alt');
      const contentType = editorialContentTypeForPage(page);
      const existing = editorialExistingValues(page, contentType);
      const config = editorialConfig(contracts);
      const preset = editorialPreset(config, contentType);
      const defaults = Array.isArray(preset.default_visible_fields) ? preset.default_visible_fields : [];
      const valueFields = Object.keys(existing.values).filter((key) => key !== 'title' && editorialString(existing.values[key]) !== '');
      const editableFieldKeys = editorialEditableFieldsForPage(page).map((field) => field.key || '').filter(Boolean);

      if (typeSelect) {
        typeSelect.value = contentType;
      }

      if (titleInput) {
        titleInput.value = existing.values.title || page.title || '';
      }

      if (slugInput) {
        slugInput.value = normalizeSlug((page.route || '').split('/').filter(Boolean).pop() || page.id || page.title || '');
        slugInput.dataset.manualSlug = 'false';
      }

      if (languageInput) {
        languageInput.value = '';
      }

      if (mediaPath) {
        mediaPath.value = existing.media.path || '';
      }

      if (mediaAlt) {
        mediaAlt.value = existing.media.alt || '';
      }

      editorialState.editFieldValues = existing.values;
      editorialState.editMedia = existing.media;
      editorialState.visibleFields = editableFieldKeys.length > 0
        ? editableFieldKeys
        : Array.from(new Set(defaults.concat(valueFields)));
      setEditorialSelectionSummary(page, contentType, existing.values);
      setEditorialStatus('Готовая страница загружена в редактор: тип ' + contentType + ', route ' + (page.route || ''));
      return;
    }

    editorialState.editFieldValues = {};
    editorialState.editMedia = {};
    setEditorialSelectionSummary(null, '', {});
  }

  function editorialPreset(config, contentType) {
    return config && config.presets && config.presets[contentType] ? config.presets[contentType] : {};
  }

  function editorialFieldsFor(config, contentType) {
    const fields = config && Array.isArray(config.fields) ? config.fields : [];

    return fields.filter((field) => Array.isArray(field.applies_to) && field.applies_to.includes(contentType));
  }

  function editorialActiveFields(contracts, contentType) {
    if (currentEditorialMode() === 'edit') {
      const page = selectedEditorialPage(contracts);
      const fields = editorialEditableFieldsForPage(page);

      if (fields.length > 0) {
        return fields;
      }
    }

    return editorialFieldsFor(editorialConfig(contracts), contentType);
  }

  function editorialFieldByKey(contracts, contentType, key) {
    return editorialActiveFields(contracts, contentType).find((field) => field && field.key === key) || null;
  }

  function readableFieldTarget(target) {
    const map = {
      page_title: 'главный заголовок страницы и название в админском списке страниц',
      page_header: 'первый экран страницы под шапкой сайта',
      breadcrumbs: 'хлебные крошки над контентом страницы',
      rich_text: 'основной текстовый блок страницы',
      product_profile: 'подробный блок товара на странице продукта',
      product_card: 'карточку товара в каталоге, карусели и связанных блоках',
      product_review_card: 'карточку обзора товара на странице обзоров',
      comparison_table: 'строку товара в таблицах сравнения',
      category_body: 'контент внутри страницы категории',
      category_guides: 'связанные гайды и подсказки внутри категории',
      home_featured_reviews: 'товарные карточки и обзоры на главной странице',
      home_category_cards: 'карточки категорий на главной странице',
      related_pages: 'блок связанных страниц и внутренних ссылок',
      author_profile: 'профиль эксперта или автора',
      author_cards: 'карточки экспертов в списках и виджетах',
      review_body: 'текст страницы обзора',
      footer_navigation: 'ссылки в подвале сайта',
      seo_meta: 'SEO title, description и данные для сниппета',
      structured_data: 'JSON-LD микроразметку страницы'
    };

    return map[target] || ('блок сайта "' + String(target || '').replace(/_/g, ' ') + '"');
  }

  function contentTypeName(contentType) {
    const map = {
      product: 'товара',
      article: 'статьи или гайда',
      review: 'обзора',
      author: 'автора или эксперта',
      category: 'категории',
      technical: 'технической страницы'
    };

    return map[contentType] || 'страницы';
  }

  function fieldHelpText(field, contentType, area) {
    const key = String(field && field.key ? field.key : '');
    const label = String(field && field.label ? field.label : key || 'поле');
    const publicTargets = field && Array.isArray(field.public_targets) ? field.public_targets : [];
    const targetText = publicTargets.map(readableFieldTarget).filter(Boolean).join('; ');
    const byKey = {
      title: 'При редактировании этой строки меняется основной заголовок и публичное название ' + contentTypeName(contentType) + '.',
      brand: 'При редактировании этой строки меняется бренд или производитель, который пользователь видит рядом с названием товара.',
      description: 'При редактировании этой строки меняется короткое описание, которое видно пользователю в карточке, первом экране или превью страницы.',
      rating: 'При редактировании этой строки меняется числовая оценка товара. Она влияет только на отображение рейтинга, а не на реальные голоса пользователей.',
      price_range: 'При редактировании этой строки меняется цена, которую пользователь видит рядом с кнопкой покупки.',
      buy_button: 'При редактировании этой строки меняется текст кнопки покупки.',
      buy_url: 'При редактировании этой строки меняется ссылка, куда попадет пользователь после клика по кнопке покупки.',
      review_cta_label: 'При редактировании этой строки меняется текст кнопки или ссылки, ведущей на обзор товара.',
      review_route: 'При редактировании этой строки меняется путь к странице обзора, на которую ведет карточка товара.',
      review_title: 'При редактировании этой строки меняется заголовок связанного обзора товара.',
      review_preview: 'При редактировании этой строки меняется короткое превью обзора, которое видно в карточке или блоке Medical Review.',
      review_link_label: 'При редактировании этой строки меняется подпись ссылки на обзор.',
      compare_label: 'При редактировании этой строки меняется текст ссылки или кнопки сравнения.',
      compare_route: 'При редактировании этой строки меняется URL страницы сравнения.',
      author_name: 'При редактировании этой строки меняется имя автора, которое выводится на странице, в карточке автора и в микроразметке.',
      author_route: 'При редактировании этой строки меняется ссылка на страницу автора.',
      reviewer: 'При редактировании этой строки меняется имя медицинского рецензента или эксперта в блоке проверки.',
      reviewer_role: 'При редактировании этой строки меняется должность или специализация рецензента.',
      reviewer_route: 'При редактировании этой строки меняется ссылка на страницу рецензента.',
      reviewer_image: 'При редактировании этой строки меняется фотография рецензента в блоке Medical Review.',
      reviewer_social_links: 'При редактировании этой строки меняются ссылки на профили рецензента, которые видны в его блоке.',
      updated: 'При редактировании этой строки меняется дата обновления, которую пользователь видит на странице.',
      primary_image: 'При редактировании этой строки меняется основная фотография страницы или товара.',
      verdict: 'При редактировании этой строки меняется короткий редакционный вывод о товаре.',
      availability: 'При редактировании этой строки меняется подпись доступности товара.',
      facts: 'При редактировании этой строки меняются короткие факты в карточке или профиле товара.',
      ingredients: 'При редактировании этой строки меняется список ингредиентов и дозировок.',
      safety_notes: 'При редактировании этой строки меняются предупреждения и заметки безопасности.',
      pros: 'При редактировании этой строки меняется список плюсов.',
      cons: 'При редактировании этой строки меняется список минусов.',
      sources: 'При редактировании этой строки меняются источники и внешние ссылки.',
      body_sections: 'При редактировании этой строки меняется основной текст статьи или обзора.',
      role: 'При редактировании этой строки меняется роль автора или эксперта.',
      credentials: 'При редактировании этой строки меняется список квалификаций автора.',
      bio: 'При редактировании этой строки меняется описание автора или эксперта.',
      reviews_route: 'При редактировании этой строки меняется ссылка на список обзоров автора.',
      social_links: 'При редактировании этой строки меняются социальные ссылки автора.',
      policy_sections: 'При редактировании этой строки меняется основной текст технической страницы.',
      faq: 'При редактировании этой строки меняются вопросы и ответы на странице.'
    };
    let text = byKey[key] || ('При редактировании этой строки меняется поле "' + label + '" на странице ' + contentTypeName(contentType) + '.');

    if (field && field.dynamic === true) {
      text = 'При редактировании этой строки меняется конкретный уже существующий текст или значение на выбранной странице. Система подставила это поле из текущей структуры страницы.';
    }

    if (area === 'product_card') {
      text += ' В редакторе карточек это поле также влияет на внешний вид товара в каталоге и на главной карусели.';
    }

    if (targetText) {
      text += ' На сайте это видно здесь: ' + targetText + '.';
    }

    if (field && field.input_type === 'url') {
      text += ' Вводите полный публичный URL, если ссылка ведет наружу.';
    }

    if (field && field.input_type === 'list') {
      text += ' Каждый пункт лучше писать с новой строки.';
    }

    return text;
  }

  function createHelpBubble(text) {
    const help = document.createElement('span');

    help.className = 'field-help';
    help.tabIndex = 0;
    help.setAttribute('role', 'button');
    help.setAttribute('aria-label', text);
    help.dataset.tooltip = text;
    help.textContent = '❔';

    return help;
  }

  function createFieldLabel(labelText, helpText) {
    const wrapper = document.createElement('span');
    const title = document.createElement('strong');

    wrapper.className = 'field-label-with-help';
    title.textContent = labelText;
    wrapper.appendChild(title);
    wrapper.appendChild(createHelpBubble(helpText));

    return wrapper;
  }

  function enhanceStaticLabelHelp(controlId, helpText) {
    const control = byId(controlId);
    const label = control ? document.querySelector('label[for="' + controlId + '"]') : null;

    if (!control || !label || label.querySelector('.field-help')) {
      return;
    }

    const textNodes = [];

    Array.from(label.childNodes).forEach((node) => {
      if (node === control) {
        return;
      }

      if (node.nodeType === Node.TEXT_NODE && String(node.textContent || '').trim() !== '') {
        textNodes.push(node);
      }
    });

    const title = textNodes.map((node) => String(node.textContent || '').trim()).join(' ').trim();

    textNodes.forEach((node) => node.remove());
    label.insertBefore(createFieldLabel(title || controlId, helpText), control);
  }

  function enhanceStaticAdminHelp() {
    const helps = {
      'admin-editorial-mode': 'Выбирает действие: создать новую страницу или отредактировать уже опубликованную.',
      'admin-editorial-existing-page': 'Выбирает готовую страницу сайта. После выбора матрица показывает поля именно этой страницы.',
      'admin-editorial-content-type': 'Выбирает тип шаблона: товар, статья, обзор, автор, категория или техническая страница.',
      'admin-editorial-title': 'Меняет главный заголовок страницы и название, которое будет видно в списках и ссылках.',
      'admin-editorial-slug': 'Меняет URL-часть страницы после домена. Например, значение omega даст путь вида /bady/omega/.',
      'admin-editorial-media-file': 'Загружает новую картинку для выбранной страницы или карточки.',
      'admin-editorial-media-path': 'Указывает путь к картинке, которая будет показана на сайте.',
      'admin-editorial-media-alt': 'Меняет alt-текст картинки для SEO и доступности.',
      'admin-product-card-mode': 'Выбирает действие для товара: создать новую карточку или отредактировать существующую.',
      'admin-product-card-existing-page': 'Выбирает готовый товар. После выбора поля карточки заполняются текущими данными.',
      'admin-product-card-title': 'Меняет название товара в карточке, каталоге, карусели и на странице товара.',
      'admin-product-card-slug': 'Меняет URL-часть товара внутри каталога.',
      'admin-product-card-media-file': 'Загружает фото товара для карточки и страницы продукта.',
      'admin-product-card-media-path': 'Указывает путь к изображению товара, если картинка уже лежит на сайте.',
      'admin-product-card-media-alt': 'Меняет alt-текст фотографии товара.',
      'admin-site-header-nav': 'Редактирует верхнее меню сайта: группы ссылок, подписи пунктов и пути, по которым кликает пользователь.',
      'admin-site-footer-nav': 'Редактирует подвал сайта: колонки, подписи ссылок и пути внизу каждой страницы.'
    };

    Object.keys(helps).forEach((id) => enhanceStaticLabelHelp(id, helps[id]));
  }

  function renderEditorialMatrix(contracts) {
    const config = editorialConfig(contracts);
    const matrix = document.querySelector('[data-editorial-field-matrix]');

    if (!matrix || !config) {
      return;
    }

    const contentType = selectedEditorialContentType(config);
    const preset = editorialPreset(config, contentType);
    const activeFields = editorialActiveFields(contracts, contentType);
    const dynamicEdit = currentEditorialMode() === 'edit' && activeFields.some((field) => field && field.dynamic === true);
    const defaults = dynamicEdit
      ? activeFields.map((field) => field.key || '').filter(Boolean)
      : Array.isArray(preset.default_visible_fields) ? preset.default_visible_fields : [];
    const current = editorialState.visibleFields.length > 0 ? editorialState.visibleFields : defaults;

    editorialState.visibleFields = [];
    matrix.textContent = '';

    activeFields.forEach((field) => {
      const key = field.key || '';

      if (!key) {
        return;
      }

      const row = document.createElement('label');
      const input = document.createElement('input');
      const body = document.createElement('span');
      const hint = document.createElement('small');
      const checked = current.includes(key);

      row.className = 'editorial-matrix__row';
      input.type = 'checkbox';
      input.value = key;
      input.checked = checked;
      input.dataset.editorialFieldToggle = key;
      hint.className = 'editorial-ai-hint';
      hint.textContent = field.ai_hint || '';
      body.appendChild(createFieldLabel(field.label || key, fieldHelpText(field, contentType, 'editorial_matrix')));
      body.appendChild(hint);
      row.appendChild(input);
      row.appendChild(body);
      matrix.appendChild(row);

      if (checked) {
        editorialState.visibleFields.push(key);
      }
    });

    renderEditorialFieldInputs(contracts);
    setEditorialStatus('Матрица обновлена для типа: ' + contentType);
  }

  function renderEditorialFieldInputs(contracts) {
    const config = editorialConfig(contracts);
    const container = document.querySelector('[data-editorial-field-inputs]');

    if (!container || !config) {
      return;
    }

    const contentType = selectedEditorialContentType(config);
    const fields = editorialActiveFields(contracts, contentType).filter((field) => editorialState.visibleFields.includes(field.key || '') && field.key !== 'title');

    container.textContent = '';

    if (fields.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Дополнительные поля не выбраны.';
      container.appendChild(empty);
      return;
    }

    fields.forEach((field) => {
      const key = field.key || '';
      const label = document.createElement('label');
      const control = field.input_type === 'textarea' || field.input_type === 'list'
        ? document.createElement('textarea')
        : document.createElement('input');

      label.setAttribute('for', 'admin-editorial-field-' + key);
      control.id = 'admin-editorial-field-' + key;
      control.dataset.editorialInput = key;

      if (control.tagName === 'TEXTAREA') {
        control.rows = field.input_type === 'list' ? 3 : 5;
      } else {
        control.type = field.input_type === 'number' ? 'number' : field.input_type === 'url' ? 'url' : 'text';
        control.autocomplete = 'off';
      }

      if (field.example) {
        control.placeholder = field.example;
      }

      if (Object.prototype.hasOwnProperty.call(editorialState.editFieldValues, key)) {
        control.value = editorialListText(editorialState.editFieldValues[key]);
      }

      label.appendChild(createFieldLabel(field.label || key, fieldHelpText(field, contentType, 'editorial_input')));
      label.appendChild(control);
      container.appendChild(label);
    });
  }

  function renderEditorialLinking(contracts) {
    const config = editorialConfig(contracts);
    const container = document.querySelector('[data-editorial-linking]');

    if (!container || !config) {
      return;
    }

    container.textContent = '';
    (Array.isArray(config.linking_targets) ? config.linking_targets : []).forEach((target) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      const text = document.createElement('span');

      input.type = 'checkbox';
      input.value = target;
      input.dataset.editorialLinkingTarget = target;
      text.textContent = target;
      label.appendChild(input);
      label.appendChild(text);
      container.appendChild(label);
    });
  }

  function navigationLines(groups) {
    return (Array.isArray(groups) ? groups : []).map((group) => {
      const groupId = group && group.id ? String(group.id) : 'group';
      const groupTitle = group && group.title ? String(group.title) : 'Navigation';
      const items = group && Array.isArray(group.items) ? group.items : [];
      const lines = ['# group: ' + groupId + ' | ' + groupTitle];

      items.forEach((item) => {
        if (!item || !item.title || !item.route) {
          return;
        }

        lines.push(String(item.title) + ' | ' + String(item.route));
      });

      return lines.join('\n');
    }).join('\n\n');
  }

  function safeNavigationGroupId(value, fallback) {
    const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');

    return normalized || fallback;
  }

  function parseNavigationLines(text, fallbackId) {
    const groups = [];
    let group = null;

    String(text || '').split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();

      if (!line) {
        return;
      }

      if (line.indexOf('#') === 0) {
        const match = line.match(/^#\s*group:\s*([^|]+)\|\s*(.+)$/i);

        if (!match) {
          return;
        }

        group = {
          id: safeNavigationGroupId(match[1], fallbackId + '-' + String(groups.length + 1)),
          title: match[2].trim(),
          items: []
        };
        groups.push(group);
        return;
      }

      if (!group) {
        group = {
          id: fallbackId + '-1',
          title: fallbackId === 'header' ? 'Header navigation' : 'Footer navigation',
          items: []
        };
        groups.push(group);
      }

      const separator = line.indexOf('|');
      const title = separator >= 0 ? line.slice(0, separator).trim() : line;
      const route = separator >= 0 ? line.slice(separator + 1).trim() : '';

      if (title && route) {
        group.items.push({ title, route });
      }
    });

    return groups;
  }

  function setSiteNavigationStatus(message) {
    const status = document.querySelector('[data-site-navigation-status]');

    if (status) {
      status.value = message;
    }
  }

  function setSiteNavigationOutput(payload) {
    const output = document.querySelector('[data-site-navigation-output]');

    if (output) {
      output.value = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    }
  }

  function siteNavigationPayload() {
    const header = document.querySelector('[data-site-navigation-section="header"]');
    const footer = document.querySelector('[data-site-navigation-section="footer"]');

    return {
      request_id: requestId('req-site-navigation'),
      navigation: {
        header: parseNavigationLines(header ? header.value : '', 'header'),
        footer: parseNavigationLines(footer ? footer.value : '', 'footer')
      }
    };
  }

  async function submitSiteNavigation(dryRun) {
    const payload = siteNavigationPayload();

    setSiteNavigationOutput(payload);
    setSiteNavigationStatus(dryRun ? 'Проверяю шапку и подвал...' : 'Сохраняю шапку и подвал через GitHub Actions...');

    if (!isGithubMode()) {
      const result = { ok: false, issues: ['Редактирование шапки и подвала доступно через CMS-admin_v2 на GitHub Pages.'] };

      setSiteNavigationOutput(result);
      setSiteNavigationStatus('GitHub-режим не активен.');
      return result;
    }

    const result = await githubDispatchCommand('site_navigation', payload, dryRun);

    setSiteNavigationOutput(result);
    setSiteNavigationStatus(result.ok ? (dryRun ? 'Проверка меню отправлена.' : 'Сохранение меню отправлено в Actions.') : 'Меню не отправлено.');

    return result;
  }

  function renderSiteChromeEditor(manifest) {
    const navigation = manifest && manifest.navigation ? manifest.navigation : {};
    const header = document.querySelector('[data-site-navigation-section="header"]');
    const footer = document.querySelector('[data-site-navigation-section="footer"]');

    if (header && header.value.trim() === '') {
      header.value = navigationLines(navigation.header || []);
    }

    if (footer && footer.value.trim() === '') {
      footer.value = navigationLines(navigation.footer || []);
    }
  }

  function wireSiteChromeEditor() {
    const validate = document.querySelector('[data-site-navigation-validate]');
    const apply = document.querySelector('[data-site-navigation-apply]');

    if (validate) {
      validate.addEventListener('click', () => {
        submitSiteNavigation(true);
      });
    }

    if (apply) {
      apply.addEventListener('click', () => {
        submitSiteNavigation(false);
      });
    }
  }

  function currentEditorialPayload(contracts) {
    const config = editorialConfig(contracts);
    const contentType = selectedEditorialContentType(config);
    const preset = editorialPreset(config, contentType);
    const mode = currentEditorialMode();
    const selectedPage = selectedEditorialPage(contracts);
    const slugInput = document.querySelector('[data-editorial-slug]');
    const titleInput = document.querySelector('[data-editorial-input="title"]');
    const languageInput = document.querySelector('[data-editorial-language-folder]');
    const title = titleInput ? titleInput.value.trim() : '';
    const slug = normalizeSlug(slugInput && slugInput.value ? slugInput.value : title);
    const route = mode === 'edit' && selectedPage && selectedPage.route
      ? selectedPage.route
      : replacePlaceholders(preset.route_template || '/{{slug}}/', { '{{slug}}': slug });
    const fields = {};
    const mediaPath = byId('admin-editorial-media-path') ? byId('admin-editorial-media-path').value.trim() : '';
    const mediaAlt = byId('admin-editorial-media-alt') ? byId('admin-editorial-media-alt').value.trim() : '';

    document.querySelectorAll('[data-editorial-input]').forEach((input) => {
      const key = input.getAttribute('data-editorial-input') || '';
      const field = editorialFieldByKey(contracts, contentType, key);

      if (key) {
        fields[key] = field && field.input_type === 'list'
          ? input.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
          : input.value;
      }
    });

    editorialState.media = mediaPath || mediaAlt ? { primary_image: { path: mediaPath, alt: mediaAlt } } : {};

    return {
      request_id: requestId('req-editorial-queue'),
      actor: editorialActorPayload(),
      content_type: contentType,
      mode,
      language_folder: '',
      slug,
      route,
      target_path: mode === 'edit' && selectedPage ? selectedPage.resource : '',
      visible_fields: editorialState.visibleFields.slice(),
      fields,
      media: editorialState.media,
      linking: {
        targets: Array.from(document.querySelectorAll('[data-editorial-linking-target]:checked')).map((input) => input.value)
      }
    };
  }

  function setEditorialOutput(payload) {
    const output = document.querySelector('[data-editorial-output]');

    if (output) {
      output.value = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    }
  }

  async function editorialFetch(authContract, endpointKey, payload) {
    const contract = activeAuthContract(authContract);
    const endpointPaths = {
      editorial_queue: authEndpoint(contract, 'editorial_queue'),
      editorial_validate: authEndpoint(contract, 'editorial_validate'),
      editorial_media: authEndpoint(contract, 'editorial_media'),
      editorial_deploy: authEndpoint(contract, 'editorial_deploy'),
      editorial_archive: authEndpoint(contract, 'editorial_archive')
    };
    const path = endpointPaths[endpointKey] || authEndpoint(contract, endpointKey) || protectedEndpointFallbacks[endpointKey] || '';

    if (!path) {
      return { ok: false, issues: [endpointKey + ' endpoint unavailable'] };
    }

    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        [contract.csrf_header || 'X-CSRF-Token']: authState.csrfToken || (byId('admin-payload-csrf') ? byId('admin-payload-csrf').value : '')
      },
      body: JSON.stringify(payload || {})
    });
    const result = await readResponseJson(response);

    return Object.assign({ ok: response.ok && result.ok !== false, http_status: response.status }, result);
  }

  async function submitEditorialQueue(contracts, authContract) {
    const payload = currentEditorialPayload(contracts);

    editorialState.lastQueuePayload = payload;
    setEditorialStatus('Отправка материала в очередь...');
    setEditorialOutput(payload);

    try {
      const result = await editorialFetch(authContract, 'editorial_queue', payload);

      setEditorialOutput(result);
      setEditorialStatus(result.ok ? 'Материал добавлен в очередь публикации.' : 'Очередь вернула ошибку проверки.');

      return result;
    } catch (error) {
      const result = { ok: false, issues: ['editorial queue request failed: ' + (error && error.message ? error.message : 'unknown error')] };

      setEditorialOutput(result);
      setEditorialStatus('Endpoint очереди недоступен.');

      return result;
    }
  }

  async function submitEditorialValidate(contracts, authContract) {
    const payload = currentEditorialPayload(contracts);

    setEditorialStatus('Проверка очереди публикации...');
    setEditorialOutput(payload);

    if (isGithubMode()) {
      const result = await githubDispatchCommand('publish', payload, true);

      setEditorialOutput(result);
      setEditorialStatus(result.ok ? 'GitHub dry-run отправлен в Actions.' : 'GitHub dry-run не запущен.');

      return result;
    }

    try {
      const result = await editorialFetch(authContract, 'editorial_validate', payload);

      setEditorialOutput(result);
      setEditorialStatus(result.ok ? 'Проверка прошла; ответ содержит текущие элементы очереди.' : 'Проверка вернула ошибки.');

      return result;
    } catch (error) {
      const result = { ok: false, issues: ['editorial validate endpoint unavailable'] };

      setEditorialOutput(result);
      setEditorialStatus('Endpoint проверки недоступен.');

      return result;
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.addEventListener('load', () => {
        const value = typeof reader.result === 'string' ? reader.result : '';
        const marker = 'base64,';
        const markerIndex = value.indexOf(marker);

        resolve(markerIndex >= 0 ? value.slice(markerIndex + marker.length) : value);
      });
      reader.addEventListener('error', () => reject(reader.error || new Error('file read failed')));
      reader.readAsDataURL(file);
    });
  }

  function githubContentsPath(path) {
    return String(path || '').split('/').map((part) => encodeURIComponent(part)).join('/');
  }

  function safeMediaFilename(file, prefix) {
    const rawName = String(file && file.name ? file.name : 'upload').trim();
    const dot = rawName.lastIndexOf('.');
    const rawBase = dot > 0 ? rawName.slice(0, dot) : rawName;
    const rawExt = dot > 0 ? rawName.slice(dot + 1) : '';
    const ext = String(rawExt || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
    const base = String(rawBase || 'media')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'media';

    return prefix + '-' + Date.now().toString(36) + '-' + base + '.' + ext;
  }

  function mediaUploadFolder(contentType, area) {
    if (area === 'product' || contentType === 'product') {
      return 'assets/media/uploads/products';
    }

    if (contentType === 'author') {
      return 'assets/media/uploads/people';
    }

    return 'assets/media/uploads/editorial';
  }

  async function githubUploadMediaFile(file, contentType, alt, area) {
    const config = readGithubConfig();
    const repository = config.repository || '';
    const branchInput = document.querySelector('[data-github-branch]');
    const deployInput = document.querySelector('[data-github-deploy-after]');
    const ref = branchInput && branchInput.value ? branchInput.value.trim() : (config.branch || 'main');
    const deployAfter = deployInput ? deployInput.checked : true;
    const allowed = ['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml'];

    if (!repository) {
      return { ok: false, issues: ['GitHub repository config is missing.'] };
    }

    if (!allowed.includes(file.type)) {
      return {
        ok: false,
        errors: [{
          field: 'primary_image',
          code: 'unsupported_media_type',
          human: 'Upload webp, jpg, png, or svg media only.'
        }]
      };
    }

    if (file.size > 3 * 1024 * 1024) {
      return {
        ok: false,
        errors: [{
          field: 'primary_image',
          code: 'media_too_large',
          human: 'Media file must be 3 MB or smaller.'
        }]
      };
    }

    if (!githubToken()) {
      return { ok: false, issues: ['GitHub token не подключен.'] };
    }

    const folder = mediaUploadFolder(contentType, area);
    const relativePath = folder + '/' + safeMediaFilename(file, area || contentType || 'media');
    const publicPath = '/' + relativePath;
    const base64 = await fileToBase64(file);

    try {
      const response = await fetch(githubApiUrl('/repos/' + repository + '/contents/' + githubContentsPath(relativePath)), {
        method: 'PUT',
        headers: Object.assign({}, githubHeaders(), {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          message: 'Upload CMS media: ' + relativePath,
          content: base64,
          branch: ref
        })
      });
      const payload = await readResponseJson(response);

      if (!response.ok) {
        return {
          ok: false,
          http_status: response.status,
          action: 'github_contents_media_upload',
          errors: [{
            field: 'github_contents',
            code: 'upload_failed',
            human: payload.message || 'GitHub Contents upload failed.',
            ai_hint: 'Check token Contents write permission and branch protection.'
          }],
          data: payload
        };
      }

      let deployResult = null;

      if (deployAfter) {
        deployResult = await githubDispatchWorkflow(config.deploy_workflow_id || 'deploy.yml', {
          target: 'production'
        }, config.deploy_actions_url || '');
      }

      return {
        ok: true,
        action: 'github_contents_media_upload',
        data: {
          media: {
            path: publicPath,
            alt,
            mime: file.type
          },
          commit: payload && payload.commit ? payload.commit.sha : '',
          deploy: deployResult
        },
        written_paths: [relativePath],
        warnings: deployAfter ? ['Media uploaded to GitHub; static deploy workflow was requested.'] : []
      };
    } catch (error) {
      return {
        ok: false,
        action: 'github_contents_media_upload',
        issues: ['GitHub media upload failed: ' + (error && error.message ? error.message : 'network error')]
      };
    }
  }

  async function submitEditorialMedia(contracts, authContract) {
    const fileInput = document.querySelector('[data-editorial-media-file]');
    const file = fileInput && fileInput.files && fileInput.files.length > 0 ? fileInput.files[0] : null;
    const config = editorialConfig(contracts);
    const alt = byId('admin-editorial-media-alt') ? byId('admin-editorial-media-alt').value.trim() : '';
    const contentType = selectedEditorialContentType(config);

    if (!file) {
      const result = {
        ok: false,
        errors: [{
          field: 'primary_image',
          code: 'missing_upload_file',
          message: 'Выберите локальный файл webp, jpg или png перед сохранением медиа.'
        }]
      };

      setEditorialOutput(result);
      setEditorialStatus('Файл не выбран; URL-поле пока не сохраняет медиа.');

      return result;
    }

    setEditorialStatus('Чтение файла медиа...');

    try {
      const payload = {
        request_id: requestId('req-editorial-media'),
        actor: editorialActorPayload(),
        content_type: contentType,
        filename: file.name,
        mime: file.type,
        base64: await fileToBase64(file),
        alt
      };

      if (isGithubMode()) {
        const result = await githubUploadMediaFile(file, contentType, alt, 'editorial');

        if (result && result.ok && result.data && result.data.media) {
          editorialState.media.primary_image = result.data.media;

          if (byId('admin-editorial-media-path') && result.data.media.path) {
            byId('admin-editorial-media-path').value = result.data.media.path;
          }
        }

        setEditorialOutput(result);
        setEditorialStatus(result.ok ? 'Медиа сохранено в GitHub, deploy запрошен.' : 'GitHub media upload вернул ошибку.');

        return result;
      }

      const result = await editorialFetch(authContract, 'editorial_media', payload);

      if (result && result.data && result.data.media) {
        editorialState.media.primary_image = result.data.media;

        if (byId('admin-editorial-media-path') && result.data.media.path) {
          byId('admin-editorial-media-path').value = result.data.media.path;
        }
      }

      setEditorialOutput(result);
      setEditorialStatus(result.ok ? 'Медиа сохранено через защищенный endpoint.' : 'Медиа endpoint вернул ошибки.');

      return result;
    } catch (error) {
      const message = error && error.message ? error.message : 'unknown error';
      const result = { ok: false, issues: ['editorial media request failed: ' + message] };

      setEditorialOutput(result);
      setEditorialStatus('Endpoint медиа недоступен или файл не прочитан.');

      return result;
    }
  }

  async function submitEditorialDeploy(contracts, authContract, payloadOverride) {
    const payload = payloadOverride || editorialState.lastQueuePayload || currentEditorialPayload(contracts);

    setEditorialStatus('Запрос deploy endpoint...');
    setEditorialOutput(payload);

    try {
      const result = await editorialFetch(authContract, 'editorial_deploy', payload);

      setEditorialOutput(result);
      setEditorialStatus(result.ok ? 'Deploy выполнен.' : 'Deploy endpoint вернул ответ сервера.');

      return result;
    } catch (error) {
      const result = { ok: false, issues: ['editorial deploy endpoint unavailable'] };

      setEditorialOutput(result);
      setEditorialStatus('Endpoint deploy недоступен.');

      return result;
    }
  }

  async function submitEditorialPublish(contracts, authContract) {
    if (isGithubMode()) {
      const payload = currentEditorialPayload(contracts);

      editorialState.lastQueuePayload = payload;
      setEditorialStatus('Публикация через GitHub Actions...');
      setEditorialOutput(payload);

      const result = await githubDispatchCommand('publish', payload, false);

      setEditorialOutput(result);
      setEditorialStatus(result.ok ? 'GitHub workflow публикации запущен.' : 'GitHub workflow публикации не запущен.');

      return result;
    }

    setEditorialStatus('Публикация: сохраняю материал в очередь...');

    const queued = await submitEditorialQueue(contracts, authContract);

    if (!queued || queued.ok !== true) {
      setEditorialStatus('Публикация остановлена: очередь вернула ошибки.');
      return queued;
    }

    setEditorialStatus('Публикация: обновляю сайт...');

    const queueId = queued && queued.data && queued.data.item && queued.data.item.id ? queued.data.item.id : '';
    const deployPayload = Object.assign({}, editorialState.lastQueuePayload || currentEditorialPayload(contracts), {
      request_id: requestId('req-editorial-deploy'),
      queue_ids: queueId ? [queueId] : []
    });
    const deployed = await submitEditorialDeploy(contracts, authContract, deployPayload);

    if (deployed && deployed.ok === true) {
      setEditorialStatus('Опубликовано. Страница доступна после обновления сайта.');
      loadAdminBootstrap(authContract);
    }

    return deployed;
  }

  async function submitEditorialArchive(authContract) {
    const deleteSelect = document.querySelector('[data-editorial-delete-page]');
    const selectedResource = deleteSelect ? deleteSelect.value : '';

    if (!selectedResource) {
      const result = { ok: false, issues: ['Выберите страницу или карточку для удаления.'] };

      setEditorialOutput(result);
      setEditorialStatus('Удаление остановлено: страница не выбрана.');

      return result;
    }

    const payload = {
      request_id: requestId('req-editorial-archive'),
      actor: editorialActorPayload(),
      items: selectedResource ? [{ resource: selectedResource, mode: '410' }] : []
    };

    setEditorialStatus('Запрос archive endpoint...');
    setEditorialOutput(payload);

    if (isGithubMode()) {
      const result = await githubDispatchCommand('archive', payload, false);

      setEditorialOutput(result);
      setEditorialStatus(result.ok ? 'GitHub workflow удаления запущен.' : 'GitHub workflow удаления не запущен.');

      return result;
    }

    try {
      const result = await editorialFetch(authContract, 'editorial_archive', payload);

      setEditorialOutput(result);
      setEditorialStatus(result.ok ? 'Удаление выполнено; страница исключена из публичной сборки.' : 'Delete endpoint вернул ответ сервера.');

      if (result.ok) {
        loadAdminBootstrap(readAuthContract() || authContract);
      }

      return result;
    } catch (error) {
      const result = { ok: false, issues: ['editorial archive endpoint unavailable'] };

      setEditorialOutput(result);
      setEditorialStatus('Endpoint архива недоступен.');

      return result;
    }
  }

  function wireEditorialWidget(contracts, authContract) {
    const widget = document.querySelector('[data-editorial-widget]');
    const config = editorialConfig(contracts);
    const typeSelect = document.querySelector('[data-editorial-content-type]');

    if (!widget || !config || !typeSelect) {
      return;
    }

    fillSelect(typeSelect, (Array.isArray(config.content_types) ? config.content_types : []).map((type) => ({
      value: type,
      label: type
    })));
    fillEditorialPageSelects(contracts);
    syncEditorialModeControls(contracts);

    if (widget.dataset.editorialBound !== 'true') {
      const modeSelect = document.querySelector('[data-editorial-mode]');
      const existingPageSelect = document.querySelector('[data-editorial-existing-page]');
      const titleInput = byId('admin-editorial-title');
      const slugInput = byId('admin-editorial-slug');
      const validateButton = widget.querySelector('[data-editorial-queue-validate]');
      const mediaButton = widget.querySelector('[data-editorial-media-save]');
      const publishButton = widget.querySelector('[data-editorial-publish]');
      const archiveButton = widget.querySelector('[data-editorial-archive-submit]');

      widget.dataset.editorialBound = 'true';
      if (modeSelect) {
        modeSelect.addEventListener('change', () => {
          editorialState.visibleFields = [];
          syncEditorialModeControls(contracts);
          renderEditorialMatrix(contracts);
          setEditorialOutput(currentEditorialPayload(contracts));
        });
      }
      if (existingPageSelect) {
        existingPageSelect.addEventListener('change', () => {
          const titleInput = byId('admin-editorial-title');
          const slugInput = byId('admin-editorial-slug');

          if (titleInput) {
            titleInput.value = '';
          }

          if (slugInput) {
            slugInput.value = '';
            slugInput.dataset.manualSlug = 'false';
          }

          editorialState.visibleFields = [];
          syncEditorialModeControls(contracts);
          renderEditorialMatrix(contracts);
          setEditorialOutput(currentEditorialPayload(contracts));
        });
      }
      typeSelect.addEventListener('change', () => {
        editorialState.visibleFields = [];
        renderEditorialMatrix(contracts);
      });
      widget.addEventListener('change', (event) => {
        const target = event.target;

        if (!(target instanceof HTMLInputElement) || !target.dataset.editorialFieldToggle) {
          return;
        }

        editorialState.visibleFields = Array.from(widget.querySelectorAll('[data-editorial-field-toggle]:checked')).map((input) => input.value);
        renderEditorialFieldInputs(contracts);
        setEditorialOutput(currentEditorialPayload(contracts));
      });

      if (titleInput && slugInput) {
        titleInput.addEventListener('input', () => {
          if (slugInput.dataset.manualSlug === 'true') {
            return;
          }

          slugInput.value = normalizeSlug(titleInput.value);
          setEditorialOutput(currentEditorialPayload(contracts));
        });
        slugInput.addEventListener('input', () => {
          slugInput.dataset.manualSlug = 'true';
          slugInput.value = normalizeSlug(slugInput.value);
          setEditorialOutput(currentEditorialPayload(contracts));
        });
      }

      widget.addEventListener('input', (event) => {
        if (event.target instanceof HTMLElement && event.target.hasAttribute('data-editorial-input')) {
          setEditorialOutput(currentEditorialPayload(contracts));
        }
      });

      if (validateButton) {
        validateButton.addEventListener('click', () => submitEditorialValidate(contracts, activeAuthContract(authContract)));
      }

      if (mediaButton) {
        mediaButton.addEventListener('click', () => submitEditorialMedia(contracts, activeAuthContract(authContract)));
      }

      if (publishButton) {
        publishButton.addEventListener('click', () => submitEditorialPublish(contracts, activeAuthContract(authContract)));
      }

      if (archiveButton) {
        archiveButton.addEventListener('click', () => submitEditorialArchive(activeAuthContract(authContract)));
      }
    }

    renderEditorialMatrix(contracts);
    renderEditorialLinking(contracts);
    setEditorialOutput(currentEditorialPayload(contracts));
  }

  function productCardMode() {
    const mode = document.querySelector('[data-product-card-mode]');

    return mode && mode.value === 'edit' ? 'edit' : 'create';
  }

  function productCardPages(contracts) {
    return editorialPageOptions(contracts).filter((page) => editorialContentTypeForPage(page) === 'product');
  }

  function selectedProductCardPage(contracts) {
    const select = document.querySelector('[data-product-card-existing-page]');
    const resource = select ? select.value : '';

    if (!resource) {
      return null;
    }

    return productCardPages(contracts).find((page) => page.resource === resource) || null;
  }

  function setProductCardStatus(message) {
    const status = document.querySelector('[data-product-card-status]');

    if (status) {
      status.value = message;
    }
  }

  function setProductCardOutput(payload) {
    const output = document.querySelector('[data-product-card-output]');

    if (output) {
      output.value = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    }
  }

  function productCardPlacementLabel(fieldKey) {
    return ['title', 'brand', 'description', 'rating', 'price_range', 'buy_button', 'buy_url', 'primary_image', 'verdict'].includes(fieldKey)
      ? 'Внутри карточки'
      : 'Снаружи карточки';
  }

  function fillProductCardPageSelect(contracts) {
    const pages = productCardPages(contracts);
    const options = [{ value: '', label: 'Выберите товар' }].concat(pages.map((page) => ({
      value: page.resource,
      label: (page.route || page.resource) + ' - ' + (page.title || page.id || 'Без названия')
    })));

    fillSelect(document.querySelector('[data-product-card-existing-page]'), options);
  }

  function setProductCardSelectionSummary(page, values) {
    const target = document.querySelector('[data-product-card-selection-summary]');

    if (!target) {
      return;
    }

    if (!page) {
      target.hidden = true;
      target.textContent = '';
      return;
    }

    const filled = Object.keys(values || {}).filter((key) => key !== 'title' && editorialString(values[key]) !== '');
    target.hidden = false;
    target.innerHTML = '<strong>Загружена карточка товара: ' + escapeHtml(page.title || page.id || page.route || '') + '</strong>'
      + '<p>Route: <code>' + escapeHtml(page.route || '') + '</code>. JSON: <code>' + escapeHtml(page.resource || '') + '</code>.</p>'
      + '<p>Матрица показывает поля внутри карточки и подробные строки снаружи. Заполнено полей: ' + escapeHtml(String(filled.length)) + '.</p>';
  }

  function syncProductCardModeControls(contracts) {
    const mode = productCardMode();
    const existingPage = document.querySelector('[data-product-card-existing-page]');
    const page = selectedProductCardPage(contracts);

    if (existingPage) {
      existingPage.disabled = mode !== 'edit';
    }

    if (mode === 'edit' && page) {
      const config = editorialConfig(contracts);
      const preset = editorialPreset(config, 'product');
      const defaults = Array.isArray(preset.default_visible_fields) ? preset.default_visible_fields : [];
      const existing = editorialExistingValues(page, 'product');
      const titleInput = byId('admin-product-card-title');
      const slugInput = byId('admin-product-card-slug');
      const languageInput = document.querySelector('[data-product-card-language-folder]');
      const mediaPath = byId('admin-product-card-media-path');
      const mediaAlt = byId('admin-product-card-media-alt');
      const valueFields = Object.keys(existing.values).filter((key) => key !== 'title' && editorialString(existing.values[key]) !== '');

      if (titleInput) {
        titleInput.value = existing.values.title || page.title || '';
      }

      if (slugInput) {
        slugInput.value = normalizeSlug((page.route || '').split('/').filter(Boolean).pop() || page.id || page.title || '');
        slugInput.dataset.manualSlug = 'false';
      }

      if (languageInput) {
        languageInput.value = '';
      }

      if (mediaPath) {
        mediaPath.value = existing.media.path || '';
      }

      if (mediaAlt) {
        mediaAlt.value = existing.media.alt || '';
      }

      productCardState.editFieldValues = existing.values;
      productCardState.editMedia = existing.media;
      productCardState.visibleFields = Array.from(new Set(defaults.concat(valueFields)));
      setProductCardSelectionSummary(page, existing.values);
      setProductCardStatus('Готовая карточка загружена: ' + (page.route || ''));
      return;
    }

    productCardState.editFieldValues = {};
    productCardState.editMedia = {};
    setProductCardSelectionSummary(null, {});
  }

  function renderProductCardMatrix(contracts) {
    const config = editorialConfig(contracts);
    const matrix = document.querySelector('[data-product-card-field-matrix]');

    if (!matrix || !config) {
      return;
    }

    const preset = editorialPreset(config, 'product');
    const defaults = Array.isArray(preset.default_visible_fields) ? preset.default_visible_fields : [];
    const current = productCardState.visibleFields.length > 0 ? productCardState.visibleFields : defaults;

    productCardState.visibleFields = [];
    matrix.textContent = '';

    editorialFieldsFor(config, 'product').forEach((field) => {
      const key = field.key || '';

      if (!key) {
        return;
      }

      const row = document.createElement('label');
      const input = document.createElement('input');
      const body = document.createElement('span');
      const placement = document.createElement('small');
      const hint = document.createElement('small');
      const checked = key === 'title' || current.includes(key);

      row.className = 'editorial-matrix__row';
      input.type = 'checkbox';
      input.value = key;
      input.checked = checked;
      input.dataset.productCardFieldToggle = key;
      if (key === 'title') {
        input.disabled = true;
      }
      placement.className = 'product-card-placement';
      placement.textContent = productCardPlacementLabel(key);
      hint.className = 'editorial-ai-hint';
      hint.textContent = field.ai_hint || '';
      body.appendChild(createFieldLabel(field.label || key, fieldHelpText(field, 'product', 'product_card')));
      body.appendChild(placement);
      body.appendChild(hint);
      row.appendChild(input);
      row.appendChild(body);
      matrix.appendChild(row);

      if (checked) {
        productCardState.visibleFields.push(key);
      }
    });

    renderProductCardFieldInputs(contracts);
    setProductCardStatus('Матрица карточки обновлена.');
  }

  function renderProductCardFieldInputs(contracts) {
    const config = editorialConfig(contracts);
    const container = document.querySelector('[data-product-card-field-inputs]');

    if (!container || !config) {
      return;
    }

    container.querySelectorAll('[data-product-card-input]').forEach((input) => {
      const key = input.getAttribute('data-product-card-input') || '';

      if (key) {
        productCardState.editFieldValues[key] = input.value;
      }
    });

    const fields = editorialFieldsFor(config, 'product').filter((field) => {
      const key = field.key || '';

      return productCardState.visibleFields.includes(key) && key !== 'title' && key !== 'primary_image';
    });

    container.textContent = '';

    if (fields.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Дополнительные строки карточки не выбраны.';
      container.appendChild(empty);
      return;
    }

    fields.forEach((field) => {
      const key = field.key || '';
      const label = document.createElement('label');
      const control = field.input_type === 'textarea' || field.input_type === 'list'
        ? document.createElement('textarea')
        : document.createElement('input');

      label.setAttribute('for', 'admin-product-card-field-' + key);
      control.id = 'admin-product-card-field-' + key;
      control.dataset.productCardInput = key;

      if (control.tagName === 'TEXTAREA') {
        control.rows = field.input_type === 'list' ? 3 : 5;
      } else {
        control.type = field.input_type === 'number' ? 'number' : field.input_type === 'url' ? 'url' : 'text';
        control.autocomplete = 'off';
      }

      if (field.example) {
        control.placeholder = field.example;
      }

      if (Object.prototype.hasOwnProperty.call(productCardState.editFieldValues, key)) {
        control.value = editorialListText(productCardState.editFieldValues[key]);
      }

      label.appendChild(createFieldLabel(field.label || key, fieldHelpText(field, 'product', 'product_card')));
      label.appendChild(control);
      container.appendChild(label);
    });
  }

  function currentProductCardPayload(contracts) {
    const config = editorialConfig(contracts);
    const preset = editorialPreset(config, 'product');
    const mode = productCardMode();
    const selectedPage = selectedProductCardPage(contracts);
    const titleInput = byId('admin-product-card-title');
    const slugInput = byId('admin-product-card-slug');
    const languageInput = document.querySelector('[data-product-card-language-folder]');
    const title = titleInput ? titleInput.value.trim() : '';
    const slug = normalizeSlug(slugInput && slugInput.value ? slugInput.value : title);
    const route = mode === 'edit' && selectedPage && selectedPage.route
      ? selectedPage.route
      : replacePlaceholders(preset.route_template || '/bady/{{slug}}/', { '{{slug}}': slug });
    const fields = { title };
    const mediaPath = byId('admin-product-card-media-path') ? byId('admin-product-card-media-path').value.trim() : '';
    const mediaAlt = byId('admin-product-card-media-alt') ? byId('admin-product-card-media-alt').value.trim() : '';

    document.querySelectorAll('[data-product-card-input]').forEach((input) => {
      const key = input.getAttribute('data-product-card-input') || '';
      const field = editorialFieldByKey(config, 'product', key);

      if (key) {
        fields[key] = field && field.input_type === 'list'
          ? input.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
          : input.value;
      }
    });

    productCardState.media = mediaPath || mediaAlt ? { primary_image: { path: mediaPath, alt: mediaAlt } } : {};

    return {
      request_id: requestId('req-product-card-queue'),
      actor: editorialActorPayload(),
      content_type: 'product',
      mode,
      language_folder: '',
      slug,
      route,
      target_path: mode === 'edit' && selectedPage ? selectedPage.resource : '',
      visible_fields: Array.from(new Set(['title'].concat(productCardState.visibleFields))),
      fields,
      media: productCardState.media,
      linking: {
        targets: ['category_bady', 'home_featured_reviews', 'related_pages']
      }
    };
  }

  async function submitProductCardQueue(contracts, authContract) {
    const payload = currentProductCardPayload(contracts);

    productCardState.lastQueuePayload = payload;
    setProductCardStatus('Отправка карточки товара в очередь...');
    setProductCardOutput(payload);

    try {
      const result = await editorialFetch(authContract, 'editorial_queue', payload);

      setProductCardOutput(result);
      setProductCardStatus(result.ok ? 'Карточка добавлена в очередь публикации.' : 'Очередь вернула ошибку проверки.');

      return result;
    } catch (error) {
      const result = { ok: false, issues: ['product card queue request failed: ' + (error && error.message ? error.message : 'unknown error')] };

      setProductCardOutput(result);
      setProductCardStatus('Endpoint очереди недоступен.');

      return result;
    }
  }

  async function submitProductCardValidate(contracts, authContract) {
    const payload = currentProductCardPayload(contracts);

    setProductCardStatus('Проверка карточки товара...');
    setProductCardOutput(payload);

    if (isGithubMode()) {
      const result = await githubDispatchCommand('publish', payload, true);

      setProductCardOutput(result);
      setProductCardStatus(result.ok ? 'GitHub dry-run карточки отправлен в Actions.' : 'GitHub dry-run карточки не запущен.');

      return result;
    }

    try {
      const result = await editorialFetch(authContract, 'editorial_validate', payload);

      setProductCardOutput(result);
      setProductCardStatus(result.ok ? 'Проверка прошла.' : 'Проверка вернула ошибки.');

      return result;
    } catch (error) {
      const result = { ok: false, issues: ['product card validate endpoint unavailable'] };

      setProductCardOutput(result);
      setProductCardStatus('Endpoint проверки недоступен.');

      return result;
    }
  }

  async function submitProductCardMedia(contracts, authContract) {
    const fileInput = document.querySelector('[data-product-card-media-file]');
    const file = fileInput && fileInput.files && fileInput.files.length > 0 ? fileInput.files[0] : null;
    const alt = byId('admin-product-card-media-alt') ? byId('admin-product-card-media-alt').value.trim() : '';

    if (!file) {
      const result = {
        ok: false,
        errors: [{
          field: 'primary_image',
          code: 'missing_upload_file',
          message: 'Выберите локальный файл webp, jpg или png перед сохранением медиа товара.'
        }]
      };

      setProductCardOutput(result);
      setProductCardStatus('Файл товара не выбран.');

      return result;
    }

    setProductCardStatus('Чтение файла товара...');

    try {
      const payload = {
        request_id: requestId('req-product-card-media'),
        actor: editorialActorPayload(),
        content_type: 'product',
        filename: file.name,
        mime: file.type,
        base64: await fileToBase64(file),
        alt
      };

      if (isGithubMode()) {
        const result = await githubUploadMediaFile(file, 'product', alt, 'product');

        if (result && result.ok && result.data && result.data.media) {
          productCardState.media.primary_image = result.data.media;

          if (byId('admin-product-card-media-path') && result.data.media.path) {
            byId('admin-product-card-media-path').value = result.data.media.path;
          }
        }

        setProductCardOutput(result);
        setProductCardStatus(result.ok ? 'Медиа карточки сохранено в GitHub, deploy запрошен.' : 'GitHub media upload карточки вернул ошибку.');

        return result;
      }

      const result = await editorialFetch(authContract, 'editorial_media', payload);

      if (result && result.data && result.data.media) {
        productCardState.media.primary_image = result.data.media;

        if (byId('admin-product-card-media-path') && result.data.media.path) {
          byId('admin-product-card-media-path').value = result.data.media.path;
        }
      }

      setProductCardOutput(result);
      setProductCardStatus(result.ok ? 'Медиа товара сохранено.' : 'Медиа endpoint вернул ошибки.');

      return result;
    } catch (error) {
      const message = error && error.message ? error.message : 'unknown error';
      const result = { ok: false, issues: ['product card media request failed: ' + message] };

      setProductCardOutput(result);
      setProductCardStatus('Endpoint медиа недоступен или файл не прочитан.');

      return result;
    }
  }

  async function submitProductCardPublish(contracts, authContract) {
    if (isGithubMode()) {
      const payload = currentProductCardPayload(contracts);

      productCardState.lastQueuePayload = payload;
      setProductCardStatus('Публикация карточки через GitHub Actions...');
      setProductCardOutput(payload);

      const result = await githubDispatchCommand('publish', payload, false);

      setProductCardOutput(result);
      setProductCardStatus(result.ok ? 'GitHub workflow публикации карточки запущен.' : 'GitHub workflow публикации карточки не запущен.');

      return result;
    }

    setProductCardStatus('Публикация карточки: сохраняю очередь...');

    const queued = await submitProductCardQueue(contracts, authContract);

    if (!queued || queued.ok !== true) {
      setProductCardStatus('Публикация карточки остановлена: очередь вернула ошибки.');
      return queued;
    }

    const queueId = queued && queued.data && queued.data.item && queued.data.item.id ? queued.data.item.id : '';
    const deployPayload = Object.assign({}, productCardState.lastQueuePayload || currentProductCardPayload(contracts), {
      request_id: requestId('req-product-card-deploy'),
      queue_ids: queueId ? [queueId] : []
    });

    setProductCardStatus('Публикация карточки: обновляю сайт...');

    try {
      const deployed = await editorialFetch(authContract, 'editorial_deploy', deployPayload);

      setProductCardOutput(deployed);
      setProductCardStatus(deployed.ok ? 'Карточка опубликована на сайте.' : 'Deploy endpoint вернул ошибки.');

      if (deployed && deployed.ok === true) {
        loadAdminBootstrap(authContract);
      }

      return deployed;
    } catch (error) {
      const result = { ok: false, issues: ['product card deploy endpoint unavailable'] };

      setProductCardOutput(result);
      setProductCardStatus('Endpoint deploy недоступен.');

      return result;
    }
  }

  function wireProductCardEditor(contracts, authContract) {
    const widget = document.querySelector('[data-product-card-editor]');
    const config = editorialConfig(contracts);

    if (!widget || !config) {
      return;
    }

    fillProductCardPageSelect(contracts);
    syncProductCardModeControls(contracts);

    if (widget.dataset.productCardBound !== 'true') {
      const modeSelect = document.querySelector('[data-product-card-mode]');
      const existingPageSelect = document.querySelector('[data-product-card-existing-page]');
      const titleInput = byId('admin-product-card-title');
      const slugInput = byId('admin-product-card-slug');
      const validateButton = widget.querySelector('[data-product-card-validate]');
      const mediaButton = widget.querySelector('[data-product-card-media-save]');
      const publishButton = widget.querySelector('[data-product-card-publish]');

      widget.dataset.productCardBound = 'true';

      if (modeSelect) {
        modeSelect.addEventListener('change', () => {
          productCardState.visibleFields = [];
          syncProductCardModeControls(contracts);
          renderProductCardMatrix(contracts);
          setProductCardOutput(currentProductCardPayload(contracts));
        });
      }

      if (existingPageSelect) {
        existingPageSelect.addEventListener('change', () => {
          if (titleInput) {
            titleInput.value = '';
          }

          if (slugInput) {
            slugInput.value = '';
            slugInput.dataset.manualSlug = 'false';
          }

          productCardState.visibleFields = [];
          syncProductCardModeControls(contracts);
          renderProductCardMatrix(contracts);
          setProductCardOutput(currentProductCardPayload(contracts));
        });
      }

      widget.addEventListener('change', (event) => {
        const target = event.target;

        if (!(target instanceof HTMLInputElement) || !target.dataset.productCardFieldToggle) {
          return;
        }

        productCardState.visibleFields = Array.from(widget.querySelectorAll('[data-product-card-field-toggle]:checked')).map((input) => input.value);
        renderProductCardFieldInputs(contracts);
        setProductCardOutput(currentProductCardPayload(contracts));
      });

      if (titleInput && slugInput) {
        titleInput.addEventListener('input', () => {
          if (slugInput.dataset.manualSlug === 'true') {
            return;
          }

          slugInput.value = normalizeSlug(titleInput.value);
          setProductCardOutput(currentProductCardPayload(contracts));
        });
        slugInput.addEventListener('input', () => {
          slugInput.dataset.manualSlug = 'true';
          slugInput.value = normalizeSlug(slugInput.value);
          setProductCardOutput(currentProductCardPayload(contracts));
        });
      }

      widget.addEventListener('input', (event) => {
        if (
          event.target instanceof HTMLElement
          && (
            event.target.hasAttribute('data-product-card-input')
            || event.target.hasAttribute('data-product-card-media-field')
            || event.target.hasAttribute('data-product-card-language-folder')
          )
        ) {
          setProductCardOutput(currentProductCardPayload(contracts));
        }
      });

      if (validateButton) {
        validateButton.addEventListener('click', () => submitProductCardValidate(contracts, activeAuthContract(authContract)));
      }

      if (mediaButton) {
        mediaButton.addEventListener('click', () => submitProductCardMedia(contracts, activeAuthContract(authContract)));
      }

      if (publishButton) {
        publishButton.addEventListener('click', () => submitProductCardPublish(contracts, activeAuthContract(authContract)));
      }
    }

    renderProductCardMatrix(contracts);
    setProductCardOutput(currentProductCardPayload(contracts));
  }

  function setNestedValue(target, path, value) {
    const parts = path.split('.');
    let cursor = target;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        cursor[part] = value;
        return;
      }

      if (!cursor[part] || typeof cursor[part] !== 'object') {
        cursor[part] = {};
      }

      cursor = cursor[part];
    });
  }

  function collectDesignPatch() {
    const patch = {};

    document.querySelectorAll('[data-design-field]').forEach((field) => {
      const path = field.getAttribute('data-design-field') || '';

      if (!path) {
        return;
      }

      const value = field instanceof HTMLInputElement && field.type === 'checkbox'
        ? field.checked
        : field.value;

      setNestedValue(patch, path, value);
    });

    return patch;
  }

  function nestedValue(source, path) {
    if (!source || typeof source !== 'object') {
      return undefined;
    }

    return path.split('.').reduce((cursor, part) => {
      if (!cursor || typeof cursor !== 'object' || !(part in cursor)) {
        return undefined;
      }

      return cursor[part];
    }, source);
  }

  function safeDesignAssetPath(value) {
    return typeof value === 'string' && /^\/assets\/media\/design\/[a-z0-9_-]+\.(svg|png|webp)$/.test(value)
      ? value
      : '';
  }

  function syncDesignFieldsFromTheme(theme) {
    if (!theme || typeof theme !== 'object') {
      return;
    }

    document.querySelectorAll('[data-design-field]').forEach((field) => {
      const path = field.getAttribute('data-design-field') || '';
      const value = nestedValue(theme, path);

      if (value !== undefined && value !== null) {
        if (field instanceof HTMLInputElement && field.type === 'checkbox') {
          field.checked = value === true;
          return;
        }

        field.value = String(value);
      }
    });

    const brand = theme.brand && typeof theme.brand === 'object' ? theme.brand : {};

    ['logo', 'favicon'].forEach((kind) => {
      const asset = brand[kind] && typeof brand[kind] === 'object' ? brand[kind] : {};
      const path = safeDesignAssetPath(asset.path);

      if (path) {
        designState.assetPaths[kind] = path;
        designState.assetModes[kind] = asset.mode === 'uploaded' ? 'uploaded' : 'generated';
      }
    });
  }

  function buildDesignThemeFromFields() {
    const patch = collectDesignPatch();
    const brand = patch.brand || {};
    const tokens = patch.tokens || {};
    const colors = tokens.colors || {};
    const typography = tokens.typography || {};
    const layout = tokens.layout || {};
    const features = patch.features || {};
    const brandName = brand.name || 'NutriScope';
    const logoPath = designState.assetPaths.logo || designState.uploads.logo || '/assets/media/design/logo.svg';
    const faviconPath = designState.assetPaths.favicon || designState.uploads.favicon || '/assets/media/design/favicon.svg';
    const logoMode = designState.assetModes.logo || (designState.uploads.logo ? 'uploaded' : 'generated');
    const faviconMode = designState.assetModes.favicon || (designState.uploads.favicon ? 'uploaded' : 'generated');

    return {
      version: 'design-theme-v1',
      id: 'theme_admin_manual',
      name: brandName + ' Admin Draft',
      generated_at: new Date().toISOString(),
      source: 'admin',
      seed: byId('admin-design-seed') ? byId('admin-design-seed').value.trim() : 'admin-manual',
      brand: {
        name: brandName,
        mark_text: brandName.slice(0, 2).toUpperCase() || 'NS',
        logo: {
          mode: logoMode,
          path: logoPath,
          alt: brandName
        },
        favicon: {
          mode: faviconMode,
          path: faviconPath
        }
      },
      tokens: {
        colors: {
          page_bg: colors.page_bg || '#f6f9fb',
          surface: colors.surface || '#ffffff',
          surface_muted: colors.surface_muted || '#f1f6f8',
          surface_info: colors.surface_info || '#eef7fb',
          text: colors.text || '#10233f',
          muted: colors.muted || '#607086',
          border: colors.border || '#d9e4e8',
          accent: colors.accent || '#008b95',
          accent_strong: colors.accent_strong || '#006b74',
          success: colors.success || '#2f9d63',
          warning: colors.warning || '#b57918',
          focus: colors.focus || '#1d75d8'
        },
        typography: {
          body: typography.body || 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          display: typography.display || 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          base_size: '16px'
        },
        layout: {
          density: layout.density || 'balanced',
          container: layout.container || '86rem',
          radius_card: layout.radius_card || '8px',
          radius_control: layout.radius_control || '6px',
          shadow_panel: layout.shadow_panel || '0 14px 32px rgba(16, 35, 63, 0.08)'
        },
        components: {
          button_style: 'filled',
          card_style: 'bordered',
          trust_style: 'evidence'
        }
      },
      features: {
        theme_toggle: false,
        locale_switcher: false,
        footer_share_robots: ['follow', 'nofollow', 'noindex,nofollow'].includes(features.footer_share_robots)
          ? features.footer_share_robots
          : 'nofollow'
      },
      validation: {
        contrast: 'pass',
        issues: []
      }
    };
  }

  function designPreviewHref(payload) {
    const previewPrefix = 'build/admin/design-preview/';
    const paths = payload && Array.isArray(payload.written_paths) ? payload.written_paths : [];
    const previewPath = paths.find((path) => {
      if (typeof path !== 'string' || !path.startsWith(previewPrefix)) {
        return false;
      }

      const relative = path.slice('build/admin/'.length);

      return relative.startsWith('design-preview/')
        && !relative.includes('..')
        && !relative.startsWith('/')
        && !relative.includes(':')
        && !relative.includes('\\');
    }) || '';

    return previewPath ? previewPath.slice('build/admin/'.length) : '';
  }

  function updateDesignPreviewLink(payload) {
    const link = document.querySelector('[data-design-preview-link]');

    if (!link) {
      return;
    }

    const href = designPreviewHref(payload);

    if (!href) {
      link.hidden = true;
      link.removeAttribute('href');
      link.textContent = 'Открыть предпросмотр';
      return;
    }

    link.href = href;
    link.hidden = false;
    link.textContent = 'Открыть предпросмотр';
  }

  function designActionTimeoutMs(name) {
    return ['design_apply', 'design_preview', 'design_deploy_package'].includes(name) ? 120000 : 30000;
  }

  function setDesignControlsDisabled(disabled) {
    const generator = document.querySelector('[data-design-generator]');

    if (!generator) {
      return;
    }

    generator.querySelectorAll('button').forEach((button) => {
      button.disabled = disabled;
    });
  }

  async function runDesignAction(name, payload) {
    const path = designEndpoint(name);
    const authContract = readAuthContract() || {};

    if (!path) {
      setDesignStatus('Endpoint дизайна недоступен');
      return { ok: false, issues: ['design endpoint unavailable'] };
    }

    if (designState.inFlight) {
      const result = { ok: false, issues: ['design action already running'] };

      setDesignStatus('Дождитесь завершения текущего действия');
      setDesignOutput(result);

      return result;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), designActionTimeoutMs(name));

    designState.inFlight = true;
    setDesignControlsDisabled(true);
    setStatusBusy('admin-design-status', true);

    try {
      const response = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          [authContract.csrf_header || 'X-CSRF-Token']: authState.csrfToken || (byId('admin-payload-csrf') ? byId('admin-payload-csrf').value : '')
        },
        body: JSON.stringify(payload || {}),
        signal: controller.signal
      });
      const result = await readResponseJson(response);
      const wrapped = Object.assign({ http_status: response.status }, result);

      setDesignOutput(wrapped);
      designState.lastPayload = wrapped;
      updateDesignPreviewLink(wrapped);

      return Object.assign({ ok: response.ok && result.ok !== false }, wrapped);
    } catch (error) {
      const timedOut = error && error.name === 'AbortError';
      const result = {
        ok: false,
        issues: [timedOut ? 'design endpoint timeout' : 'design endpoint unavailable']
      };

      setDesignOutput(result);
      updateDesignPreviewLink(null);

      return result;
    } finally {
      window.clearTimeout(timeoutId);
      designState.inFlight = false;
      setDesignControlsDisabled(false);
      setStatusBusy('admin-design-status', false);
    }
  }

  function designActionPayload(prefix, extra) {
    return Object.assign({
      request_id: requestId(prefix)
    }, extra || {});
  }

  async function persistDesignDraft(prefix) {
    const result = await runDesignAction('design_save_draft', designActionPayload(prefix || 'req-design-save-draft', {
      theme: buildDesignThemeFromFields()
    }));

    if (result.ok) {
      syncDesignFieldsFromTheme(result.theme);
      designState.dirty = false;
    }

    return result;
  }

  async function ensureDesignDraftSaved() {
    if (!designState.dirty) {
      return true;
    }

    setDesignStatus('Сохраняем изменения дизайна...');
    const result = await persistDesignDraft('req-design-autosave');

    if (!result.ok) {
      setDesignStatus('Черновик дизайна не сохранен, действие остановлено');
      return false;
    }

    setDesignStatus('Черновик дизайна сохранен');
    return true;
  }

  async function saveDesignDraft() {
    const result = await persistDesignDraft('req-design-save-draft');

    setDesignStatus(result.ok ? 'Черновик дизайна сохранен' : 'Черновик дизайна не сохранен');
  }

  async function uploadDesignAssets() {
    const fields = Array.from(document.querySelectorAll('[data-design-upload]'));
    const selected = fields.find((field) => field.files && field.files.length > 0);

    if (!selected) {
      setDesignStatus('Выберите logo или favicon');
      return;
    }

    const file = selected.files[0];
    const kind = selected.getAttribute('data-design-upload') || '';
    const reader = new FileReader();

    reader.addEventListener('load', async () => {
      if (!await ensureDesignDraftSaved()) {
        return;
      }

      const encoded = String(reader.result || '').split(',')[1] || '';
      const result = await runDesignAction('design_upload', designActionPayload('req-design-upload', {
        kind,
        filename: file.name,
        contents_base64: encoded
      }));

      rememberUploadedDesignAsset(result, kind);

      setDesignStatus(result.ok ? 'Design asset загружен' : 'Design asset не загружен');
    });
    reader.addEventListener('error', () => setDesignStatus('Design asset не прочитан'));
    reader.readAsDataURL(file);
  }

  function rememberUploadedDesignAsset(result, kind) {
    if (!result || !result.ok) {
      return;
    }

    const paths = Array.isArray(result.written_paths) ? result.written_paths : [];
    const uploaded = paths.find((path) => typeof path === 'string' && path.indexOf('assets/media/design/') === 0);

    if (uploaded) {
      designState.uploads[kind] = '/' + uploaded;
      designState.assetPaths[kind] = '/' + uploaded;
      designState.assetModes[kind] = 'uploaded';
      designState.dirty = false;
    }

    syncDesignFieldsFromTheme(result.theme);
  }

  async function uploadAndApplyFavicon(filename, contentsBase64, statusLabel) {
    if (!await ensureDesignDraftSaved()) {
      return;
    }

    const uploadResult = await runDesignAction('design_upload', designActionPayload('req-design-favicon-upload', {
      kind: 'favicon',
      filename,
      contents_base64: contentsBase64
    }));

    rememberUploadedDesignAsset(uploadResult, 'favicon');

    if (!uploadResult.ok) {
      setDesignStatus((statusLabel || 'Favicon') + ' не загружен');
      return;
    }

    const applyResult = await runDesignAction('design_apply', designActionPayload('req-design-favicon-apply'));

    if (applyResult.ok) {
      syncDesignFieldsFromTheme(applyResult.theme);
      designState.dirty = false;
    }

    setDesignStatus(applyResult.ok ? (statusLabel || 'Favicon') + ' применен к статическому сайту' : (statusLabel || 'Favicon') + ' загружен, но не применен');
  }

  function safeFaviconColor(value, fallback) {
    const normalized = String(value || '').trim();

    return /^#[0-9a-fA-F]{3,8}$/.test(normalized) ? normalized : fallback;
  }

  function faviconToolRoot(target) {
    return target && typeof target.closest === 'function' ? target.closest('[data-design-favicon-tool]') || document : document;
  }

  function generatedFaviconSvg(root) {
    const scope = root || document;
    const seedField = scope.querySelector('[data-design-favicon-seed]') || byId('admin-design-favicon-seed');
    const brandField = byId('admin-design-brand');
    const accentField = byId('admin-design-accent');
    const surfaceField = byId('admin-design-surface');
    const source = String((seedField && seedField.value) || (brandField && brandField.value) || 'CMS').replace(/[^a-z0-9]/gi, '').toUpperCase();
    const initials = (source || 'CMS').slice(0, 2);
    const accent = safeFaviconColor(accentField && accentField.value, '#007a7f');
    const surface = safeFaviconColor(surfaceField && surfaceField.value, '#ffffff');

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
      + '<rect width="64" height="64" rx="14" fill="' + accent + '"/>'
      + '<path d="M44 13a15 15 0 0 0-18 18L13 44a6 6 0 0 0 7 7l13-13a15 15 0 0 0 18-18l-10 10-7-7z" fill="' + surface + '"/>'
      + '<text x="32" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="800" fill="' + surface + '">' + initials + '</text>'
      + '</svg>';
  }

  function applyFaviconOnlyUpload(event) {
    const root = faviconToolRoot(event && event.currentTarget ? event.currentTarget : null);
    const selected = root.querySelector('[data-design-favicon-only]');

    if (!selected || !selected.files || selected.files.length === 0) {
      setDesignStatus('Выберите файл favicon для локальной смены');
      return;
    }

    const file = selected.files[0];
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      const encoded = String(reader.result || '').split(',')[1] || '';
      uploadAndApplyFavicon(file.name, encoded, 'Favicon');
    });
    reader.addEventListener('error', () => setDesignStatus('Favicon не прочитан'));
    reader.readAsDataURL(file);
  }

  function generateAndApplyFavicon(event) {
    const root = faviconToolRoot(event && event.currentTarget ? event.currentTarget : null);
    const svg = generatedFaviconSvg(root);

    uploadAndApplyFavicon('favicon-local-' + Date.now() + '.svg', window.btoa(svg), 'Сгенерированный favicon');
  }

  function renderDesignPanel(bootstrap) {
    const panel = document.querySelector('[data-section-panel="design"]');
    const siteLaunchPanel = document.querySelector('[data-section-panel="site-launch"]');
    const generator = document.querySelector('[data-design-generator]');
    const siteLaunch = document.querySelector('[data-domain-design-generator]');
    const actor = authState.actor || (bootstrap && bootstrap.actor) || {};
    const runtime = bootstrap && bootstrap.manifest ? bootstrap.manifest.runtime : adminState.manifest && adminState.manifest.runtime;
    const roleCapabilities = runtime && runtime.capabilities && actor && actor.role
      ? runtime.capabilities[actor.role] || {}
      : {};
    const canDesign = Boolean(roleCapabilities.config || (actor && actor.role === 'admin'));

    if (!panel || !generator) {
      return;
    }

    panel.hidden = !canDesign;
    if (siteLaunchPanel) {
      siteLaunchPanel.hidden = !canDesign;
    }

    if (!canDesign) {
      setDesignStatus('Нет права design/config');
      setDomainStatus('Нет права admin/config');
      return;
    }

    setDesignStatus('Готово к генерации');
    setDomainStatus('Готово к проверке доменного профиля');

    if (designState.booted) {
      return;
    }

    designState.booted = true;

    const generate = generator.querySelector('[data-design-generate]');
    const saveDraft = generator.querySelector('[data-design-save-draft]');
    const preview = generator.querySelector('[data-design-preview]');
    const apply = generator.querySelector('[data-design-apply]');
    const rollback = generator.querySelector('[data-design-rollback]');
    const deploy = generator.querySelector('[data-design-deploy]');
    const upload = generator.querySelector('[data-design-upload-run]');
    const faviconApplyButtons = document.querySelectorAll('[data-design-favicon-apply]');
    const faviconGenerateButtons = document.querySelectorAll('[data-design-favicon-generate]');
    const domainDryRun = siteLaunch ? siteLaunch.querySelector('[data-domain-rebrand-dry-run]') : null;
    const domainApply = siteLaunch ? siteLaunch.querySelector('[data-domain-rebrand-apply]') : null;
    const maintenanceBackup = siteLaunch ? siteLaunch.querySelector('[data-server-maintenance-backup]') : null;
    const maintenanceReset = siteLaunch ? siteLaunch.querySelector('[data-server-maintenance-reset]') : null;
    const maintenanceBackupReset = siteLaunch ? siteLaunch.querySelector('[data-server-maintenance-backup-reset]') : null;
    const domainField = byId('admin-domain-name');
    const routeSeedField = byId('admin-domain-route-seed');

    generator.querySelectorAll('[data-design-field]').forEach((field) => {
      field.addEventListener('input', () => {
        designState.dirty = true;
        setDesignStatus('Поля дизайна изменены');
      });
    });

    if (generate) {
      generate.addEventListener('click', async () => {
        const seed = byId('admin-design-seed') && byId('admin-design-seed').value.trim()
          ? byId('admin-design-seed').value.trim()
          : String(Date.now());
        const result = await runDesignAction('design_generate', designActionPayload('req-design-generate', { seed }));

        if (result.ok) {
          syncDesignFieldsFromTheme(result.theme);
          designState.dirty = false;
          designState.uploads = {};
        }

        setDesignStatus(result.ok ? 'Черновик дизайна создан' : 'Черновик дизайна не создан');
      });
    }

    if (saveDraft) {
      saveDraft.addEventListener('click', saveDesignDraft);
    }

    if (preview) {
      preview.addEventListener('click', async () => {
        if (!await ensureDesignDraftSaved()) {
          return;
        }

        const result = await runDesignAction('design_preview', designActionPayload('req-design-preview'));

        setDesignStatus(result.ok ? 'Предпросмотр дизайна собран' : 'Предпросмотр дизайна не собран');
      });
    }

    if (apply) {
      apply.addEventListener('click', async () => {
        if (!window.confirm('Применить дизайн к публичной сборке?')) {
          setDesignStatus('Применение отменено');
          return;
        }

        if (!await ensureDesignDraftSaved()) {
          return;
        }

        const result = await runDesignAction('design_apply', designActionPayload('req-design-apply'));

        if (result.ok) {
          syncDesignFieldsFromTheme(result.theme);
          designState.dirty = false;
        }

        setDesignStatus(result.ok ? 'Дизайн применен, локальная сборка обновлена' : 'Дизайн не применен');
      });
    }

    if (rollback) {
      rollback.addEventListener('click', async () => {
        const historyField = byId('admin-design-history-id');
        const historyId = historyField ? historyField.value.trim() : '';

        if (!historyId) {
          setDesignStatus('Укажите history id для rollback');
          return;
        }

        if (!window.confirm('Откатить активный дизайн и пересобрать публичную сборку?')) {
          setDesignStatus('Rollback отменен');
          return;
        }

        const result = await runDesignAction('design_rollback', designActionPayload('req-design-rollback', {
          history_id: historyId
        }));

        if (result.ok) {
          syncDesignFieldsFromTheme(result.theme);
          designState.dirty = false;
          designState.uploads = {};
        }

        setDesignStatus(result.ok ? 'Дизайн откатан, локальная сборка обновлена' : 'Дизайн не откатан');
      });
    }

    if (deploy) {
      deploy.addEventListener('click', async () => {
        const result = await runDesignAction('design_deploy_package', designActionPayload('req-design-deploy-package', {
          deploy_target: collectDomainDeployTargetPayload()
        }));

        setDesignStatus(result.ok ? 'Deploy package собран' : 'Deploy package не собран');
      });
    }

    if (upload) {
      upload.addEventListener('click', uploadDesignAssets);
    }

    faviconApplyButtons.forEach((button) => button.addEventListener('click', applyFaviconOnlyUpload));
    faviconGenerateButtons.forEach((button) => button.addEventListener('click', generateAndApplyFavicon));

    if (domainDryRun) {
      domainDryRun.addEventListener('click', () => runSiteRebrandAction(readAuthContract() || {}, true));
    }

    if (domainApply) {
      domainApply.addEventListener('click', () => runSiteRebrandAction(readAuthContract() || {}, false));
    }

    if (maintenanceBackup) {
      maintenanceBackup.addEventListener('click', () => runServerMaintenanceAction('backup'));
    }

    if (maintenanceReset) {
      maintenanceReset.addEventListener('click', () => runServerMaintenanceAction('reset_static_host'));
    }

    if (maintenanceBackupReset) {
      maintenanceBackupReset.addEventListener('click', () => runServerMaintenanceAction('backup_and_reset_static_host'));
    }

    if (domainField) {
      domainField.addEventListener('blur', fillDomainDefaults);
    }

    if (routeSeedField) {
      routeSeedField.addEventListener('blur', fillDomainDefaults);
    }
  }

  function wireMedGenPanel() {
    const panel = document.querySelector('[data-medgen-panel]');

    if (!panel || panel.dataset.medgenBooted === 'true') {
      return;
    }

    panel.dataset.medgenBooted = 'true';

    const dryRun = panel.querySelector('[data-medgen-dry-run]');
    const run = panel.querySelector('[data-medgen-run]');

    if (dryRun) {
      dryRun.addEventListener('click', () => runMedGenWorkflow(true));
    }

    if (run) {
      run.addEventListener('click', () => runMedGenWorkflow(false));
    }
  }

  function resetDraftActionState() {
    draftActionState.dryRun = null;
    setDraftActionStatus('Dry-run required before execute');
    setDraftExecuteEnabled(false);
    setDraftActionSummary(null);
    updateDraftPreviewLink(null);
  }

  function dryRunSignature(selection) {
    return {
      actionKey: selection.actionKey,
      resource: selection.page.resource,
      payload: JSON.stringify(selection.payload)
    };
  }

  function dryRunMatches(selection) {
    const latest = draftActionState.dryRun;
    const current = dryRunSignature(selection);

    return latest
      && latest.actionKey === current.actionKey
      && latest.resource === current.resource
      && latest.payload === current.payload;
  }

  async function runDraftAction(contracts, mode) {
    const selection = currentDraftSelection(contracts);

    if (!selection) {
      setDraftExecuteEnabled(false);
      setDraftActionStatus('No draft action selected');
      return;
    }

    const action = selection.action;
    const http = action.http || {};
    const isDryRun = mode === 'dry-run';
    const path = isDryRun ? http.dry_run_path : http.path;

    if (!path) {
      setDraftExecuteEnabled(false);
      setDraftActionStatus('Selected action has no HTTP endpoint');
      return;
    }

    if (!isDryRun) {
      if (!dryRunMatches(selection)) {
        setDraftExecuteEnabled(false);
        setDraftActionStatus('Run dry-run for this exact payload before execute');
        return;
      }

      if (!window.confirm('Execute ' + action.label + ' for ' + selection.page.resource + '?')) {
        setDraftActionStatus('Execute cancelled');
        return;
      }
    }

    setDraftActionStatus(isDryRun ? 'Running dry-run...' : 'Executing action...');
    setStatusBusy('admin-draft-action-status', true);

    try {
      const response = await fetch(path, {
        method: http.method || 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          [http.csrf_header || 'X-CSRF-Token']: authState.csrfToken || (byId('admin-payload-csrf') ? byId('admin-payload-csrf').value : '')
        },
        body: JSON.stringify(selection.payload)
      });
      const payload = await readResponseJson(response);
      const ok = response.ok && payload.ok !== false;
      const result = {
        ok,
        status: response.status,
        action: selection.actionKey,
        resource: selection.page.resource,
        response: payload
      };

      setDraftActionOutput(result);
      setDraftActionSummary(result);
      updateDraftPreviewLink(result);

      if (ok) {
        const authContract = readAuthContract();

        if (authContract) {
          loadAuditHistory(authContract);
          loadDraftStatuses(authContract);
        }
      }

      if (isDryRun && ok) {
        setStatusBusy('admin-draft-action-status', false);
        draftActionState.dryRun = dryRunSignature(selection);
        setDraftExecuteEnabled(true);
        setDraftActionStatus('Dry-run passed; execute is enabled for this payload');
        return;
      }

      if (isDryRun) {
        setStatusBusy('admin-draft-action-status', false);
        draftActionState.dryRun = null;
        setDraftExecuteEnabled(false);
        setDraftActionStatus('Dry-run failed with HTTP ' + response.status);
        return;
      }

      setStatusBusy('admin-draft-action-status', false);
      draftActionState.dryRun = null;
      setDraftExecuteEnabled(false);
      setDraftActionStatus(ok ? 'Execute finished; run dry-run again before another write' : 'Execute failed with HTTP ' + response.status);
    } catch (error) {
      setStatusBusy('admin-draft-action-status', false);
      if (!isDryRun) {
        draftActionState.dryRun = null;
      }

      setDraftActionOutput({ ok: false, issue: 'draft endpoint unavailable' });
      setDraftActionSummary({
        ok: false,
        status: 0,
        action: selection ? selection.actionKey : 'draft_action',
        resource: selection ? selection.page.resource : '',
        response: { issues: ['draft endpoint unavailable'], written_paths: [] }
      });
      updateDraftPreviewLink(null);
      setDraftExecuteEnabled(false);
      setDraftActionStatus('Draft endpoint unavailable');
    }
  }

  function copyTarget(id) {
    const target = byId(id);

    if (!target) {
      return;
    }

    target.select();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(target.value).catch(() => document.execCommand('copy'));
      return;
    }

    document.execCommand('copy');
  }

  function metricHtml(label, value, detail, modifier) {
    return '<article class="metric' + (modifier ? ' ' + escapeHtml(modifier) : '') + '"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong>'
      + (detail ? '<small>' + escapeHtml(detail) + '</small>' : '') + '</article>';
  }

  function githubMetricHtml(value) {
    return '<article class="metric metric--github-rate" data-github-rate-limit data-rate-state="' + (githubState.rateLimitVisible ? 'ready' : 'pending') + '">'
      + '<h1>GitHub лимиты</h1><h3 data-github-rate-limit-value>' + escapeHtml(value) + '</h3></article>';
  }

  function renderAdminMetrics(manifest) {
    const target = document.querySelector('[data-admin-metrics]');
    const summary = manifest && manifest.summary ? manifest.summary : {};

    if (!target) {
      return;
    }

    const githubRateMessage = githubState.rateLimitVisible
      ? githubState.rateLimitMessage
      : (isGithubMode() ? 'Загрузка лимитов...' : 'GitHub не подключен');
    const totalPages = Number(summary.total_pages || 0);
    const publishedPages = Number(summary.published_pages || 0);
    const modules = Number(summary.modules || 0);
    const statusMessage = totalPages || modules
      ? 'Готово'
      : 'Ожидание';
    const statusDetail = totalPages || modules
      ? 'стр ' + totalPages + ' · опубл ' + publishedPages + ' · сохр ' + totalPages + ' · мод ' + modules
      : 'Данные еще загружаются';

    target.innerHTML = [
      metricHtml('Статус', statusMessage, statusDetail, 'metric--status'),
      metricHtml('Страниц', totalPages),
      metricHtml('Опубл.', publishedPages),
      metricHtml('Модулей', modules),
      metricHtml('Версия', manifest && manifest.version ? manifest.version : 'n/a'),
      githubMetricHtml(githubRateMessage)
    ].join('');
  }

  function renderTypeOptions(pageTypes) {
    const select = document.querySelector('[data-page-type-filter]');
    const types = Array.isArray(pageTypes) ? pageTypes : [];

    if (!select) {
      return;
    }

    fillSelect(select, [
      { value: '', label: 'All page types' },
      ...types.map((type) => ({ value: type, label: type }))
    ]);
  }

  function renderModuleFlow(modules) {
    if (!Array.isArray(modules) || modules.length === 0) {
      return '<li><span>modules</span><strong>none</strong><em>empty</em></li>';
    }

    return modules.map((module) => '<li><span>' + escapeHtml(module.slot || '') + '</span><strong>'
      + escapeHtml(module.type || '') + '</strong><em>' + escapeHtml(module.id || '') + '</em></li>').join('');
  }

  function renderPages(pages) {
    const target = document.querySelector('[data-page-list]');

    if (!target) {
      return;
    }

    target.innerHTML = Array.isArray(pages) && pages.length > 0
      ? pages.map((page) => '<article class="page-row" data-page-row data-page-title="' + escapeHtml(page.title || '')
        + '" data-page-route="' + escapeHtml(page.route || '')
        + '" data-page-type="' + escapeHtml(page.page_type || '') + '">'
        + '<div><span class="pill">' + escapeHtml(page.page_type || '') + '</span>'
        + '<h3>' + escapeHtml(page.title || '') + '</h3>'
        + '<p><code>' + escapeHtml(page.route || '') + '</code> · ' + escapeHtml(page.status || '') + '</p>'
        + '<span class="page-row__draft" data-page-draft-status="' + escapeHtml(page.path || page.resource || '') + '">Draft status unknown</span>'
        + '<div class="page-row__actions"><a class="page-row__edit" href="#admin-editorial" data-edit-page="' + escapeHtml(page.path || page.resource || '') + '">Редактировать</a></div></div>'
        + '<ol class="module-flow">' + renderModuleFlow(page.modules || []) + '</ol>'
        + '</article>').join('')
      : '<p class="empty-state">Pages are unavailable for this session.</p>';
  }

  function renderWorkflowActions(contracts) {
    const target = document.querySelector('[data-workflow-actions]');
    const actions = contracts && contracts.actions ? contracts.actions : {};

    if (!target) {
      return;
    }

    target.innerHTML = Object.entries(actions).map(([actionKey, action]) => {
      const roles = Array.isArray(action.allowed_roles) ? action.allowed_roles.join(', ') : '';

      return '<article class="workflow-card"><h3>' + escapeHtml(action.label || actionKey) + '</h3>'
        + '<p><code>' + escapeHtml(action.command || '') + '</code></p>'
        + '<dl><dt>Dry run</dt><dd><code>' + escapeHtml(action.dry_run_command || '') + '</code></dd>'
        + '<dt>Roles</dt><dd>' + escapeHtml(roles) + '</dd></dl></article>';
    }).join('');
  }

  function renderWorkflowPages(contracts) {
    const target = document.querySelector('[data-workflow-pages]');
    const pages = contracts && Array.isArray(contracts.pages) ? contracts.pages : [];

    if (!target) {
      return;
    }

    target.innerHTML = pages.map((page) => '<details class="workflow-page">'
      + '<summary>' + escapeHtml(page.route || page.resource || '') + '</summary>'
      + '<div><span class="pill">' + escapeHtml(page.page_type || '') + '</span>'
      + '<h3>' + escapeHtml(page.title || '') + '</h3>'
      + '<p><code>' + escapeHtml(page.resource || '') + '</code></p></div>'
      + '<dl><dt>Draft</dt><dd><code>' + escapeHtml(page.draft_path || '') + '</code></dd>'
      + '<dt>Preview</dt><dd><code>' + escapeHtml(page.preview_path || '') + '</code></dd></dl>'
      + '</details>').join('');
  }

  function renderModules(modules) {
    const target = document.querySelector('[data-module-grid]');

    if (!target) {
      return;
    }

    target.innerHTML = Array.isArray(modules) && modules.length > 0
      ? modules.map((module) => '<article class="module-card">'
        + '<div class="module-card__title"><span>' + escapeHtml(module.type || '') + '</span><h3>'
        + escapeHtml(module.name || '') + '</h3></div>'
        + '<p>' + escapeHtml(module.description || '') + '</p>'
        + '<dl><dt>Page types</dt><dd>' + escapeHtml((module.allowed_page_types || []).join(', ')) + '</dd>'
        + '<dt>Slots</dt><dd>' + escapeHtml((module.allowed_slots || []).join(', ')) + '</dd>'
        + '<dt>SEO hooks</dt><dd>' + escapeHtml((module.seo_hooks || []).join(', ') || 'none') + '</dd></dl>'
        + '</article>').join('')
      : '<p class="empty-state">Modules are unavailable for this session.</p>';
  }

  function renderRuntime(runtime) {
    const target = document.querySelector('[data-runtime-grid]');
    const capabilities = runtime && runtime.capabilities ? runtime.capabilities : {};

    if (!target) {
      return;
    }

    const panels = [
      '<article class="runtime-panel"><h3>Runtime contract</h3><dl>'
      + '<dt>CSRF ttl</dt><dd>' + escapeHtml(runtime && runtime.csrf_ttl_seconds ? runtime.csrf_ttl_seconds : '') + ' seconds</dd>'
      + '<dt>CSRF secret env</dt><dd><code>' + escapeHtml(runtime && runtime.csrf_secret_env ? runtime.csrf_secret_env : '') + '</code></dd>'
      + '<dt>Lock store</dt><dd><code>' + escapeHtml(runtime && runtime.lock_store_path ? runtime.lock_store_path : '') + '</code></dd>'
      + '<dt>Audit log</dt><dd><code>' + escapeHtml(runtime && runtime.audit_log_path ? runtime.audit_log_path : '') + '</code></dd>'
      + '</dl></article>'
    ];

    Object.entries(capabilities).forEach(([role, roleCapabilities]) => {
      const enabled = ['read', 'write', 'publish', 'config'].filter((capability) => roleCapabilities && roleCapabilities[capability] === true);
      panels.push('<article class="runtime-panel"><h3>' + escapeHtml(role) + '</h3><p>' + escapeHtml(enabled.join(', ')) + '</p></article>');
    });

    target.innerHTML = panels.join('');
  }

  function setRolePermissionsStatus(message) {
    const status = document.querySelector('[data-role-permissions-status]');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function setRolePermissionsShortcutVisible(visible) {
    const shortcut = document.querySelector('[data-role-permissions-shortcut]');

    if (shortcut) {
      shortcut.hidden = !visible;
    }
  }

  function canManageRolePermissions(actor) {
    const current = actor || authState.actor || {};
    const capabilities = current.capabilities || {};

    return current.role === 'admin' && capabilities.roles === true;
  }

  function applyRolePermissionsVisibility(actor) {
    const visible = canManageRolePermissions(actor);
    const panel = document.querySelector('[data-role-permissions]');
    const shell = byId('admin-role-permissions') || (panel ? panel.closest('[data-section-panel="role-permissions"]') : null);

    if (panel) {
      panel.hidden = !visible;
    }

    if (shell) {
      shell.hidden = !visible;
      if (!visible && shell.tagName.toLowerCase() === 'details') {
        shell.open = false;
      }
    }

    setRolePermissionsShortcutVisible(visible);
  }

  function wireRolePermissionsShortcut() {
    const shortcut = document.querySelector('[data-role-permissions-shortcut]');

    if (!shortcut || shortcut.dataset.rolePermissionsShortcutBound === 'true') {
      return;
    }

    shortcut.dataset.rolePermissionsShortcutBound = 'true';
    shortcut.addEventListener('click', () => {
      scrollToAdminSection('role-permissions', 'admin-role-permissions');
    });
  }

  function editorCapabilities(runtime) {
    if (isGithubMode()) {
      const users = githubRoleUsers();
      const editor = users.find((user) => user && user.role === 'editor');

      return editor && editor.capabilities ? Object.assign({}, roleDefaultCapabilities('editor'), editor.capabilities, { read: true, roles: false }) : roleDefaultCapabilities('editor');
    }

    return runtime && runtime.capabilities && runtime.capabilities.editor
      ? runtime.capabilities.editor
      : { read: true, write: false, publish: false, config: false };
  }

  function syncEditorPermissionFields(runtime) {
    const capabilities = editorCapabilities(runtime);

    document.querySelectorAll('[data-editor-permission]').forEach((field) => {
      const name = field.getAttribute('data-editor-permission') || '';

      if (field instanceof HTMLInputElement) {
        field.checked = capabilities[name] === true;
      }
    });
  }

  function collectEditorPermissionFields() {
    const capabilities = { read: true };

    document.querySelectorAll('[data-editor-permission]').forEach((field) => {
      const name = field.getAttribute('data-editor-permission') || '';

      if (field instanceof HTMLInputElement && name) {
        capabilities[name] = field.checked;
      }
    });

    return capabilities;
  }

  function adminUserField(name) {
    return document.querySelector('[data-admin-user-field="' + name + '"]');
  }

  function collectAdminUserPermissionFields() {
    const capabilities = { read: true };

    document.querySelectorAll('[data-admin-user-permission]').forEach((field) => {
      const name = field.getAttribute('data-admin-user-permission') || '';

      if (field instanceof HTMLInputElement && name) {
        capabilities[name] = field.checked;
      }
    });

    return capabilities;
  }

  function syncAdminUserPermissionFields(capabilities) {
    document.querySelectorAll('[data-admin-user-permission]').forEach((field) => {
      const name = field.getAttribute('data-admin-user-permission') || '';

      if (field instanceof HTMLInputElement && name) {
        field.checked = capabilities && capabilities[name] === true;
      }
    });
  }

  function resetAdminUserForm(runtime) {
    const id = adminUserField('id');
    const username = adminUserField('username');
    const role = adminUserField('role');
    const status = adminUserField('status');
    const password = adminUserField('password');

    if (id instanceof HTMLInputElement) {
      id.value = '';
    }
    if (username instanceof HTMLInputElement) {
      username.value = '';
    }
    if (role instanceof HTMLSelectElement) {
      role.value = 'admin';
    }
    if (status instanceof HTMLSelectElement) {
      status.value = 'active';
    }
    if (password instanceof HTMLInputElement) {
      password.value = '';
    }

    syncAdminUserPermissionFields(editorCapabilities(runtime));
  }

  function populateAdminUserForm(user, runtime) {
    const id = adminUserField('id');
    const username = adminUserField('username');
    const role = adminUserField('role');
    const status = adminUserField('status');
    const password = adminUserField('password');

    if (id instanceof HTMLInputElement) {
      id.value = user && user.id ? user.id : '';
    }
    if (username instanceof HTMLInputElement) {
      username.value = user && user.username ? user.username : '';
    }
    if (role instanceof HTMLSelectElement) {
      role.value = user && user.role === 'editor' ? 'editor' : 'admin';
    }
    if (status instanceof HTMLSelectElement) {
      status.value = user && user.status === 'disabled' ? 'disabled' : 'active';
    }
    if (password instanceof HTMLInputElement) {
      password.value = '';
    }

    syncAdminUserPermissionFields(user && user.role === 'editor' ? user.capabilities : editorCapabilities(runtime));
  }

  function renderAdminUsersList(payload, runtime) {
    const target = document.querySelector('[data-admin-users-list]');
    const users = payload && Array.isArray(payload.users) ? payload.users : [];

    adminState.adminUsers = users;

    if (!target) {
      return;
    }

    if (users.length === 0) {
      target.innerHTML = '<p>Учетные записи не найдены.</p>';
      return;
    }

    target.innerHTML = users.map((user) => {
      const passwordLabel = user.password_hint
        ? user.password_hint
        : (user.password_mode === 'env' ? 'env hash; можно сбросить' : 'пароль скрыт; можно задать новый');
      const caps = user.capabilities || {};
      const enabled = editableRoleCapabilities.filter((capability) => caps[capability] === true).join(', ') || 'read only';

      return '<article class="admin-user-card" data-admin-user-card="' + escapeHtml(user.id || '') + '">'
        + '<div class="admin-user-card__head"><div><h3>' + escapeHtml(user.username || '') + '</h3>'
        + '<p>' + escapeHtml(user.role || '') + ' · ' + escapeHtml(user.status || '') + '</p></div>'
        + '<button type="button" data-admin-user-edit="' + escapeHtml(user.id || '') + '">Редактировать</button></div>'
        + '<p>Пароль: <code>' + escapeHtml(passwordLabel) + '</code></p>'
        + '<p>Права: ' + escapeHtml(enabled) + '</p>'
        + '</article>';
    }).join('');

    target.querySelectorAll('[data-admin-user-edit]').forEach((button) => {
      if (button.dataset.adminUserEditBound === 'true') {
        return;
      }

      button.dataset.adminUserEditBound = 'true';
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-admin-user-edit') || '';
        const user = adminState.adminUsers.find((item) => item && item.id === id);
        populateAdminUserForm(user || null, runtime);
        setRolePermissionsStatus('Загружена учетка: ' + (user && user.username ? user.username : id));
      });
    });
  }

  async function loadAdminUsers(authContract, runtime) {
    if (isGithubMode()) {
      renderAdminUsersList({ users: githubRoleUsers() }, runtime);
      setRolePermissionsStatus('GitHub-профили загружены из config/admin-github-users.json.');
      return;
    }

    const path = authEndpoint(authContract, 'admin_users') || protectedEndpointFallbacks.admin_users;

    if (!path) {
      setRolePermissionsStatus('Endpoint учетных записей недоступен');
      return;
    }

    try {
      const response = await fetch(path, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const payload = await readResponseJson(response);

      if (response.ok && payload.ok !== false) {
        renderAdminUsersList(payload, runtime);
        return;
      }

      setRolePermissionsStatus((payload.issues || [payload.issue || 'Список учеток не загружен']).join('; '));
    } catch (error) {
      setRolePermissionsStatus('Endpoint учетных записей недоступен');
    }
  }

  async function saveAdminUser(authContract, runtime) {
    const path = authEndpoint(authContract, 'admin_users') || protectedEndpointFallbacks.admin_users;
    const id = adminUserField('id');
    const username = adminUserField('username');
    const role = adminUserField('role');
    const status = adminUserField('status');
    const password = adminUserField('password');

    const selectedRole = role instanceof HTMLSelectElement ? role.value : 'admin';
    const user = {
      id: id instanceof HTMLInputElement ? id.value.trim() : '',
      username: username instanceof HTMLInputElement ? username.value.trim() : '',
      role: selectedRole === 'editor' ? 'editor' : 'admin',
      status: status instanceof HTMLSelectElement && status.value === 'disabled' ? 'disabled' : 'active'
    };

    if (user.username === '' && user.id !== '') {
      user.username = user.id;
    }

    if (user.username === '') {
      setRolePermissionsStatus(isGithubMode() ? 'Укажи GitHub login профиля.' : 'Укажи логин учетной записи.');
      return;
    }

    if (password instanceof HTMLInputElement && password.value.trim() !== '') {
      user.password = password.value.trim();
    }

    if (user.role === 'editor') {
      user.capabilities = collectAdminUserPermissionFields();
    } else if (isGithubMode()) {
      user.capabilities = roleDefaultCapabilities('admin');
    }

    if (isGithubMode()) {
      setRolePermissionsStatus('Отправляю изменение GitHub-профиля в Actions...');
      setStatusBusy('admin-role-permissions-status', true);

      try {
        const result = await githubDispatchCommand('github_roles', {
          operation: 'upsert_user',
          user
        }, false);

        if (result.ok === false) {
          const issues = result.issues || (result.errors || []).map((error) => error.human || error.code || 'GitHub-профиль не сохранен');
          setRolePermissionsStatus((issues.length > 0 ? issues : ['GitHub-профиль не сохранен']).join('; '));
          setStatusBusy('admin-role-permissions-status', false);
          return;
        }

        const roles = githubRolesConfig();
        roles.users = roles.users || {};
        roles.users[user.username || user.id] = {
          role: user.role,
          status: user.status,
          capabilities: user.capabilities || roleDefaultCapabilities(user.role)
        };
        renderAdminUsersList({ users: githubRoleUsers() }, runtime);
        populateAdminUserForm(user, runtime);
        setRolePermissionsStatus('GitHub-профиль отправлен в Actions. После workflow обновится Pages-админка.');
        setStatusBusy('admin-role-permissions-status', false);
        return;
      } catch (error) {
        setRolePermissionsStatus('GitHub Actions недоступен: ' + (error && error.message ? error.message : 'network error'));
        setStatusBusy('admin-role-permissions-status', false);
        return;
      }
    }

    if (!path) {
      setRolePermissionsStatus('Endpoint учетных записей недоступен');
      return;
    }

    setRolePermissionsStatus('Сохраняю учетную запись...');
    setStatusBusy('admin-role-permissions-status', true);

    try {
      const response = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          [authContract.csrf_header || 'X-CSRF-Token']: authState.csrfToken || ''
        },
        body: JSON.stringify({
          request_id: 'req-admin-user-' + Date.now(),
          user
        })
      });
      const payload = await readResponseJson(response);

      if (response.ok && payload.ok !== false) {
        renderAdminUsersList(payload, runtime);
        populateAdminUserForm(payload.user || user, runtime);
        setRolePermissionsStatus(payload.temporary_password
          ? 'Учетка сохранена. Временный пароль: ' + payload.temporary_password
          : 'Учетка сохранена.');
        setStatusBusy('admin-role-permissions-status', false);
        loadAdminBootstrap(authContract);
        return;
      }

      setRolePermissionsStatus((payload.issues || [payload.issue || 'Учетка не сохранена']).join('; '));
      setStatusBusy('admin-role-permissions-status', false);
    } catch (error) {
      setRolePermissionsStatus('Endpoint учетных записей недоступен');
      setStatusBusy('admin-role-permissions-status', false);
    }
  }

  function wireAdminUserManager(authContract, runtime) {
    const form = document.querySelector('[data-admin-user-form]');
    const newButton = document.querySelector('[data-admin-user-new]');

    if (form && form.dataset.adminUserFormBound !== 'true') {
      form.dataset.adminUserFormBound = 'true';
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        saveAdminUser(readAuthContract() || authContract, runtime);
      });
    }

    if (newButton && newButton.dataset.adminUserNewBound !== 'true') {
      newButton.dataset.adminUserNewBound = 'true';
      newButton.addEventListener('click', () => {
        resetAdminUserForm(runtime);
        setRolePermissionsStatus('Форма готова для новой учетной записи.');
      });
    }
  }

  function agentKeyField(name) {
    return document.querySelector('[data-agent-key-field="' + name + '"]');
  }

  function agentKeysFromManifest(manifest) {
    const source = manifest || adminState.manifest || {};

    return Array.isArray(source.agent_keys) ? source.agent_keys : adminState.agentKeys;
  }

  function setAgentKeyStatus(message) {
    const status = document.querySelector('[data-agent-key-status]');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function setGeneratedAgentKeyPreview(value) {
    const field = document.querySelector('[data-agent-key-generated]');
    const wrap = document.querySelector('[data-agent-key-generated-wrap]');
    const copyButton = document.querySelector('[data-agent-key-copy]');
    const hideButton = document.querySelector('[data-agent-key-hide]');
    const hasValue = typeof value === 'string' && value !== '';

    if (field instanceof HTMLInputElement) {
      field.value = hasValue ? value : '';
    }

    [wrap, copyButton, hideButton].forEach((element) => {
      if (element instanceof HTMLElement) {
        element.hidden = !hasValue;
      }
    });
  }

  async function copyGeneratedAgentKey() {
    const field = document.querySelector('[data-agent-key-generated]');
    const apiKey = agentKeyField('api_key');
    const value = field instanceof HTMLInputElement && field.value
      ? field.value
      : (apiKey instanceof HTMLInputElement ? apiKey.value : '');

    if (!value) {
      setAgentKeyStatus('Сначала сгенерируйте raw key.');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      setAgentKeyStatus('Raw key скопирован. Сохраните его в secret storage агента как CMX_AGENT_API_KEY.');
      return;
    }

    if (field instanceof HTMLInputElement) {
      field.focus();
      field.select();
      document.execCommand('copy');
      setAgentKeyStatus('Raw key скопирован. Сохраните его в secret storage агента как CMX_AGENT_API_KEY.');
    }
  }

  function collectAgentKeyPermissionFields() {
    const capabilities = { read: true };

    document.querySelectorAll('[data-agent-key-permission]').forEach((field) => {
      const name = field.getAttribute('data-agent-key-permission') || '';

      if (field instanceof HTMLInputElement && name) {
        capabilities[name] = field.checked;
      }
    });

    capabilities.roles = false;

    return capabilities;
  }

  function syncAgentKeyPermissionFields(capabilities) {
    const values = capabilities || roleDefaultCapabilities('editor');

    document.querySelectorAll('[data-agent-key-permission]').forEach((field) => {
      const name = field.getAttribute('data-agent-key-permission') || '';

      if (field instanceof HTMLInputElement && name) {
        field.checked = values[name] === true;
      }
    });
  }

  function resetAgentKeyForm() {
    const name = agentKeyField('name');
    const role = agentKeyField('role');
    const status = agentKeyField('status');
    const secretRef = agentKeyField('secret_ref');
    const apiKey = agentKeyField('api_key');

    if (name instanceof HTMLInputElement) {
      name.value = '';
    }
    if (role instanceof HTMLSelectElement) {
      role.value = 'editor';
    }
    if (status instanceof HTMLSelectElement) {
      status.value = 'active';
    }
    if (secretRef instanceof HTMLInputElement) {
      secretRef.value = 'CMX_AGENT_API_KEY';
    }
    if (apiKey instanceof HTMLInputElement) {
      apiKey.value = '';
    }

    setGeneratedAgentKeyPreview('');
    syncAgentKeyPermissionFields(roleDefaultCapabilities('editor'));
  }

  function populateAgentKeyForm(key) {
    const name = agentKeyField('name');
    const role = agentKeyField('role');
    const status = agentKeyField('status');
    const secretRef = agentKeyField('secret_ref');
    const apiKey = agentKeyField('api_key');

    if (name instanceof HTMLInputElement) {
      name.value = key && key.name ? key.name : '';
    }
    if (role instanceof HTMLSelectElement) {
      role.value = key && ['admin', 'editor', 'viewer'].includes(key.role) ? key.role : 'editor';
    }
    if (status instanceof HTMLSelectElement) {
      status.value = key && key.status === 'disabled' ? 'disabled' : 'active';
    }
    if (secretRef instanceof HTMLInputElement) {
      secretRef.value = key && key.secret_ref ? key.secret_ref : 'CMX_AGENT_API_KEY';
    }
    if (apiKey instanceof HTMLInputElement) {
      apiKey.value = '';
    }

    setGeneratedAgentKeyPreview('');
    syncAgentKeyPermissionFields(key && key.capabilities ? key.capabilities : roleDefaultCapabilities('editor'));
  }

  function renderAgentKeysList(payload) {
    const target = document.querySelector('[data-agent-keys-list]');
    const keys = payload && Array.isArray(payload.keys) ? payload.keys : agentKeysFromManifest();

    adminState.agentKeys = keys;
    if (adminState.manifest) {
      adminState.manifest.agent_keys = keys;
    }

    if (!target) {
      return;
    }

    if (!keys.length) {
      target.innerHTML = '<p>Agent API ключи еще не заведены.</p>';
      return;
    }

    target.innerHTML = keys.map((key) => {
      const caps = key.capabilities || {};
      const enabled = editableRoleCapabilities.filter((capability) => caps[capability] === true).join(', ') || 'read only';

      return '<article class="admin-user-card agent-key-card" data-agent-key-card="' + escapeHtml(key.name || '') + '">'
        + '<div class="admin-user-card__head"><div><h3>' + escapeHtml(key.name || '') + '</h3>'
        + '<p>' + escapeHtml(key.role || '') + ' · ' + escapeHtml(key.status || '') + '</p></div>'
        + '<button type="button" data-agent-key-edit="' + escapeHtml(key.name || '') + '">Редактировать</button></div>'
        + '<p>Fingerprint: <code>' + escapeHtml(key.fingerprint || '') + '</code></p>'
        + '<p>Secret ref: <code>' + escapeHtml(key.secret_ref || 'CMX_AGENT_API_KEY') + '</code></p>'
        + '<p>Header: <code>Authorization: Bearer ${' + escapeHtml(key.secret_ref || 'CMX_AGENT_API_KEY') + '}</code></p>'
        + '<p>Права: ' + escapeHtml(enabled) + '</p>'
        + '<button type="button" class="button-link button-link--danger" data-agent-key-revoke="' + escapeHtml(key.name || '') + '">Отключить</button>'
        + '</article>';
    }).join('');

    target.querySelectorAll('[data-agent-key-edit]').forEach((button) => {
      if (button.dataset.agentKeyEditBound === 'true') {
        return;
      }

      button.dataset.agentKeyEditBound = 'true';
      button.addEventListener('click', () => {
        const name = button.getAttribute('data-agent-key-edit') || '';
        const key = adminState.agentKeys.find((item) => item && item.name === name);
        populateAgentKeyForm(key || null);
        setAgentKeyStatus('Загружен ключ: ' + (key && key.name ? key.name : name) + '. Для смены секрета введите новый API key.');
      });
    });

    target.querySelectorAll('[data-agent-key-revoke]').forEach((button) => {
      if (button.dataset.agentKeyRevokeBound === 'true') {
        return;
      }

      button.dataset.agentKeyRevokeBound = 'true';
      button.addEventListener('click', () => revokeAgentKey(button.getAttribute('data-agent-key-revoke') || ''));
    });
  }

  function generateAgentApiKey() {
    const bytes = new Uint8Array(32);

    window.crypto.getRandomValues(bytes);

    return 'cmx_agent_' + Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  async function sha256Hex(value) {
    if (!window.crypto || !window.crypto.subtle || typeof TextEncoder === 'undefined') {
      throw new Error('Браузер не поддерживает Web Crypto SHA-256.');
    }

    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  async function saveAgentKey() {
    if (!isGithubMode()) {
      setAgentKeyStatus('Сохранение agent API ключей сейчас выполняется через GitHub Pages админку и Actions.');
      return;
    }

    const name = agentKeyField('name');
    const role = agentKeyField('role');
    const status = agentKeyField('status');
    const secretRef = agentKeyField('secret_ref');
    const apiKey = agentKeyField('api_key');
    const key = {
      name: name instanceof HTMLInputElement ? name.value.trim() : '',
      role: role instanceof HTMLSelectElement ? role.value : 'editor',
      status: status instanceof HTMLSelectElement && status.value === 'disabled' ? 'disabled' : 'active',
      secret_ref: secretRef instanceof HTMLInputElement && secretRef.value.trim() ? secretRef.value.trim().toUpperCase() : 'CMX_AGENT_API_KEY',
      capabilities: collectAgentKeyPermissionFields()
    };
    const rawKey = apiKey instanceof HTMLInputElement ? apiKey.value.trim() : '';

    if (!key.name) {
      setAgentKeyStatus('Укажи имя агента.');
      return;
    }

    if (!/^[A-Z][A-Z0-9_]{2,80}$/.test(key.secret_ref)) {
      setAgentKeyStatus('Secret ref должен быть именем переменной, например CMX_AGENT_API_KEY.');
      return;
    }

    if (rawKey !== '') {
      if (rawKey.length < 24) {
        setAgentKeyStatus('API key должен быть не короче 24 символов.');
        return;
      }

      try {
        key.key_hash = 'sha256:' + await sha256Hex(rawKey);
      } catch (error) {
        setAgentKeyStatus(error && error.message ? error.message : 'Не удалось посчитать hash ключа.');
        return;
      }
    }

    setAgentKeyStatus('Отправляю agent API key в GitHub Actions...');
    setStatusBusy('admin-agent-key-status', true);

    try {
      const result = await githubDispatchCommand('agent_keys', {
        operation: 'upsert_key',
        key
      }, false);

      if (result.ok === false) {
        const issues = result.issues || (result.errors || []).map((error) => error.human || error.code || 'Agent API key не сохранен');
        setAgentKeyStatus((issues.length > 0 ? issues : ['Agent API key не сохранен']).join('; '));
        setStatusBusy('admin-agent-key-status', false);
        return;
      }

      const next = (result.data && Array.isArray(result.data.keys)) ? result.data.keys : adminState.agentKeys;
      renderAgentKeysList({ keys: next });
      if (apiKey instanceof HTMLInputElement) {
        apiKey.value = '';
      }
      setGeneratedAgentKeyPreview('');
      setAgentKeyStatus('Agent API key отправлен в Actions. Сырой ключ не сохранен в bootstrap; используйте его только в хранилище агента.');
      setStatusBusy('admin-agent-key-status', false);
    } catch (error) {
      setAgentKeyStatus('GitHub Actions недоступен: ' + (error && error.message ? error.message : 'network error'));
      setStatusBusy('admin-agent-key-status', false);
    }
  }

  async function revokeAgentKey(name) {
    if (!isGithubMode()) {
      setAgentKeyStatus('Отключение agent API ключей сейчас выполняется через GitHub Pages админку и Actions.');
      return;
    }

    if (!name) {
      setAgentKeyStatus('Не выбран agent API key.');
      return;
    }

    setAgentKeyStatus('Отключаю agent API key...');
    setStatusBusy('admin-agent-key-status', true);

    try {
      const result = await githubDispatchCommand('agent_keys', {
        operation: 'revoke_key',
        name
      }, false);

      if (result.ok === false) {
        const issues = result.issues || (result.errors || []).map((error) => error.human || error.code || 'Agent API key не отключен');
        setAgentKeyStatus((issues.length > 0 ? issues : ['Agent API key не отключен']).join('; '));
        setStatusBusy('admin-agent-key-status', false);
        return;
      }

      const next = (result.data && Array.isArray(result.data.keys)) ? result.data.keys : adminState.agentKeys.map((key) => key.name === name ? Object.assign({}, key, { status: 'disabled' }) : key);
      renderAgentKeysList({ keys: next });
      setAgentKeyStatus('Agent API key отправлен на отключение.');
      setStatusBusy('admin-agent-key-status', false);
    } catch (error) {
      setAgentKeyStatus('GitHub Actions недоступен: ' + (error && error.message ? error.message : 'network error'));
      setStatusBusy('admin-agent-key-status', false);
    }
  }

  function wireAgentKeyManager() {
    const form = document.querySelector('[data-agent-key-form]');
    const generateButton = document.querySelector('[data-agent-key-generate]');
    const copyButton = document.querySelector('[data-agent-key-copy]');
    const hideButton = document.querySelector('[data-agent-key-hide]');
    const newButton = document.querySelector('[data-agent-key-new]');
    const roleField = agentKeyField('role');

    if (form && form.dataset.agentKeyFormBound !== 'true') {
      form.dataset.agentKeyFormBound = 'true';
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        saveAgentKey();
      });
    }

    if (generateButton && generateButton.dataset.agentKeyGenerateBound !== 'true') {
      generateButton.dataset.agentKeyGenerateBound = 'true';
      generateButton.addEventListener('click', () => {
        const field = agentKeyField('api_key');
        const rawKey = generateAgentApiKey();

        if (field instanceof HTMLInputElement) {
          field.value = rawKey;
        }

        setGeneratedAgentKeyPreview(rawKey);
        const generated = document.querySelector('[data-agent-key-generated]');

        if (generated instanceof HTMLInputElement) {
          generated.focus();
          generated.select();
        }

        setAgentKeyStatus('Ключ сгенерирован локально в браузере. Нажмите "Скопировать raw key" и сохраните его в secret storage агента.');
      });
    }

    if (copyButton && copyButton.dataset.agentKeyCopyBound !== 'true') {
      copyButton.dataset.agentKeyCopyBound = 'true';
      copyButton.addEventListener('click', () => {
        copyGeneratedAgentKey().catch(() => setAgentKeyStatus('Не удалось скопировать автоматически. Выделите raw key вручную.'));
      });
    }

    if (hideButton && hideButton.dataset.agentKeyHideBound !== 'true') {
      hideButton.dataset.agentKeyHideBound = 'true';
      hideButton.addEventListener('click', () => {
        setGeneratedAgentKeyPreview('');
        setAgentKeyStatus('Raw key скрыт на экране. Он останется в форме до сохранения или сброса.');
      });
    }

    if (newButton && newButton.dataset.agentKeyNewBound !== 'true') {
      newButton.dataset.agentKeyNewBound = 'true';
      newButton.addEventListener('click', () => {
        resetAgentKeyForm();
        setAgentKeyStatus('Форма готова для нового агентского ключа.');
      });
    }

    if (roleField && roleField.dataset.agentKeyRoleBound !== 'true') {
      roleField.dataset.agentKeyRoleBound = 'true';
      roleField.addEventListener('change', () => {
        syncAgentKeyPermissionFields(roleDefaultCapabilities(roleField.value || 'editor'));
      });
    }
  }

  async function saveEditorPermissions(authContract) {
    const path = authEndpoint(authContract, 'role_permissions') || protectedEndpointFallbacks.role_permissions;
    const capabilities = collectEditorPermissionFields();

    if (isGithubMode()) {
      setRolePermissionsStatus('Отправляю права editor в Actions...');
      setStatusBusy('admin-role-permissions-status', true);

      try {
        const result = await githubDispatchCommand('github_roles', {
          operation: 'update_editor_capabilities',
          capabilities
        }, false);

        if (result.ok === false) {
          const issues = result.issues || (result.errors || []).map((error) => error.human || error.code || 'Права editor не сохранены');
          setRolePermissionsStatus((issues.length > 0 ? issues : ['Права editor не сохранены']).join('; '));
          setStatusBusy('admin-role-permissions-status', false);
          return;
        }

        const roles = githubRolesConfig();
        const users = roles && roles.users ? roles.users : {};
        Object.keys(users).forEach((login) => {
          if (users[login] && users[login].role === 'editor') {
            users[login].capabilities = Object.assign({}, capabilities, { read: true, roles: false });
          }
        });
        renderAdminUsersList({ users: githubRoleUsers() }, {});
        setRolePermissionsStatus('Права editor отправлены в Actions. Editor по-прежнему не получает доступ к блоку ролей.');
        setStatusBusy('admin-role-permissions-status', false);
        return;
      } catch (error) {
        setRolePermissionsStatus('GitHub Actions недоступен: ' + (error && error.message ? error.message : 'network error'));
        setStatusBusy('admin-role-permissions-status', false);
        return;
      }
    }

    if (!path) {
      setRolePermissionsStatus('Endpoint прав editor недоступен');
      return;
    }

    setRolePermissionsStatus('Сохраняю права editor...');
    setStatusBusy('admin-role-permissions-status', true);

    try {
      const response = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          [authContract.csrf_header || 'X-CSRF-Token']: authState.csrfToken || ''
        },
        body: JSON.stringify({
          request_id: 'req-editor-permissions-' + Date.now(),
          target_role: 'editor',
          capabilities
        })
      });
      const payload = await readResponseJson(response);

      if (response.ok && payload.ok !== false) {
        setRolePermissionsStatus('Права editor сохранены');
        setStatusBusy('admin-role-permissions-status', false);
        loadAdminBootstrap(authContract);
        return;
      }

      setRolePermissionsStatus((payload.issues || [payload.issue || 'Права editor не сохранены']).join('; '));
      setStatusBusy('admin-role-permissions-status', false);
    } catch (error) {
      setRolePermissionsStatus('Endpoint прав editor недоступен');
      setStatusBusy('admin-role-permissions-status', false);
    }
  }

  function renderRolePermissions(manifest, authContract) {
    const panel = document.querySelector('[data-role-permissions]');
    const shell = byId('admin-role-permissions') || (panel ? panel.closest('[data-section-panel="role-permissions"]') : null);
    const actor = authState.actor || {};
    const isAdmin = canManageRolePermissions(actor);
    const runtime = manifest && manifest.runtime ? manifest.runtime : {};

    if (!panel) {
      return;
    }

    panel.hidden = !isAdmin;
    if (shell) {
      shell.hidden = !isAdmin;
      if (!isAdmin && shell.tagName.toLowerCase() === 'details') {
        shell.open = false;
      }
    }
    setRolePermissionsShortcutVisible(isAdmin);
    syncEditorPermissionFields(runtime);

    if (!isAdmin) {
      setRolePermissionsStatus('Доступно только admin.');
      return;
    }

    setRolePermissionsStatus(isGithubMode()
      ? 'Можно изменить GitHub-профили admin/editor.'
      : 'Можно изменить права editor.');
    renderAdminUsersList({ users: adminState.adminUsers }, runtime);
    loadAdminUsers(readAuthContract() || authContract, runtime);
    wireAdminUserManager(readAuthContract() || authContract, runtime);
    renderAgentKeysList({ keys: agentKeysFromManifest(manifest) });
    wireAgentKeyManager();

    const saveButton = panel.querySelector('[data-role-permissions-save]');

    if (saveButton && saveButton.dataset.rolePermissionsBound !== 'true') {
      saveButton.dataset.rolePermissionsBound = 'true';
      saveButton.addEventListener('click', () => saveEditorPermissions(readAuthContract() || authContract));
    }
  }

  function renderContractList(authContract) {
    const list = document.querySelector('[data-contract-list]');
    const auditEndpoint = document.querySelector('.audit-endpoint code');

    if (!list) {
      return;
    }

    if (auditEndpoint) {
      auditEndpoint.textContent = authEndpoint(authContract, 'audit_recent');
    }

    list.innerHTML = [
      ['Bootstrap', authEndpoint(authContract, 'bootstrap')],
      ['Auth login', authEndpoint(authContract, 'login')],
      ['Session', authEndpoint(authContract, 'session')],
      ['Draft status', authEndpoint(authContract, 'draft_status')],
      ['Audit recent', authEndpoint(authContract, 'audit_recent')],
      ['Site rebrand', authEndpoint(authContract, 'site_rebrand')],
      ['Content source', 'content/pages/**/*.json'],
      ['Module source', 'modules/*/module.json']
    ].filter(([, value]) => Boolean(value)).map(([label, value]) => '<li>' + escapeHtml(label) + ': <code>' + escapeHtml(value) + '</code></li>').join('');
  }

  function setSectionCounts(manifest, contracts) {
    const pages = manifest && Array.isArray(manifest.pages) ? manifest.pages.length : 0;
    const modules = manifest && Array.isArray(manifest.modules) ? manifest.modules.length : 0;
    const actions = contracts && contracts.actions ? Object.keys(contracts.actions).length : 0;
    const createTemplates = contracts && Array.isArray(contracts.create_templates) ? contracts.create_templates.length : 0;
    const editorialTypes = contracts && contracts.editorial_widget && Array.isArray(contracts.editorial_widget.content_types)
      ? contracts.editorial_widget.content_types.length
      : 0;
    const system = manifest && manifest.runtime ? Object.keys(manifest.runtime).length : 0;
    const productCards = contracts && Array.isArray(contracts.pages)
      ? contracts.pages.filter((page) => editorialContentTypeForPage(page) === 'product').length
      : 0;
    const sites = manifest && Array.isArray(manifest.sites) ? manifest.sites.length : 0;
    const values = { 'site-workflow': 5, 'main-workspace': editorialTypes + productCards, editorial: editorialTypes, 'product-cards': productCards, 'role-permissions': 6, 'site-launch': 6, medgen: 4, sites, content: pages, workflow: actions + createTemplates, modules, design: 2, system, technical: pages + modules + actions };

    Object.entries(values).forEach(([section, count]) => {
      const node = document.querySelector('[data-section-count="' + section + '"]');

      if (node) {
        node.textContent = String(count);
      }
    });
  }

  function resetComposerOutputs() {
    ['admin-payload-page', 'admin-payload-action', 'admin-module-editor-module'].forEach((id) => {
      const select = byId(id);

      if (select) {
        select.innerHTML = '';
      }
    });

    ['admin-command-output', 'admin-payload-output', 'admin-module-editor-props', 'admin-draft-action-output'].forEach((id) => {
      const field = byId(id);

      if (field) {
        field.value = '';
      }
    });
  }

  function clearAdminBootstrap(message) {
    adminState.actionContracts = null;
    adminState.authContract = null;
    adminState.manifest = null;
    adminState.agentKeys = [];
    adminState.activeSiteId = '';
    designState.booted = false;
    resetEditorialWidgetState();
    setGatedVisible(false);
    setRolePermissionsShortcutVisible(false);
    setAdminBootStatus(message || 'Данные админки не загружены');
    renderDesignPanel(null);
    renderSiteWorkflow({});
    renderSiteFleet({});
    setDomainOutput('');
    renderRolePermissions({}, readAuthContract());
    renderAgentKeysList({ keys: [] });
    renderAdminMetrics({ summary: {} });
    ['[data-page-list]', '[data-workflow-actions]', '[data-workflow-pages]', '[data-module-grid]', '[data-runtime-grid]'].forEach((selector) => {
      const node = document.querySelector(selector);

      if (node) {
        node.textContent = '';
      }
    });
    resetComposerOutputs();

    const root = document.querySelector('[data-admin-gated-root]');

    if (root) {
      root.textContent = '';
    }
  }

  function mountAdminShell(payload) {
    const root = document.querySelector('[data-admin-gated-root]');

    if (!root || !payload || typeof payload.shell_html !== 'string' || payload.shell_html === '') {
      return;
    }

    root.innerHTML = payload.shell_html;
  }

  function renderAdminBootstrap(payload) {
    mountAdminShell(payload);

    const manifest = payload && payload.manifest ? payload.manifest : {};
    const contracts = payload && payload.action_contracts ? payload.action_contracts : {};
    const authContract = payload && payload.auth_contract ? payload.auth_contract : readAuthContract();

    adminState.manifest = manifest;
    adminState.actionContracts = contracts;
    adminState.authContract = authContract;
    adminState.agentKeys = Array.isArray(manifest.agent_keys) ? manifest.agent_keys : [];
    if (!adminState.activeSiteId && Array.isArray(manifest.sites) && manifest.sites[0]) {
      adminState.activeSiteId = String(manifest.sites[0].site_id || '');
    }
    setGatedVisible(true);
    renderAdminMetrics(manifest);
    if (isGithubMode() && githubToken()) {
      loadGithubRateLimit();
    }
    renderTypeOptions(manifest.page_types || []);
    renderPages(manifest.pages || []);
    renderWorkflowActions(contracts);
    renderWorkflowPages(contracts);
    renderModules(manifest.modules || []);
    renderDesignPanel(payload);
    renderSiteWorkflow(manifest);
    renderSiteFleet(manifest);
    renderSiteChromeEditor(manifest);
    renderRuntime(manifest.runtime || {});
    renderRolePermissions(manifest, authContract);
    applyRolePermissionsVisibility(authState.actor);
    renderContractList(authContract);
    setSectionCounts(manifest, contracts);
    setAdminBootStatus('Готово');
    enhanceStaticAdminHelp();
    wirePageFilters();
    wireMedGenPanel();
    bootComposer();
    wireEditorialWidget(adminState.actionContracts, adminState.authContract);
    wireProductCardEditor(adminState.actionContracts, adminState.authContract);
    wireSiteChromeEditor();
    if (!isGithubMode()) {
      loadAuditHistory(authContract);
      loadDraftStatuses(authContract);
    }
  }

  async function loadAdminBootstrap(authContract) {
    const path = authEndpoint(authContract, 'bootstrap');

    if (!path) {
      clearAdminBootstrap('Bootstrap endpoint unavailable');
      return;
    }

    setAdminBootStatus('Загрузка данных админки...');
    setStatusBusy('admin-auth-status', true);

    try {
      const response = await fetch(path, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const payload = await readResponseJson(response);

      if (response.ok && payload.ok !== false) {
        renderAdminBootstrap(payload);
        setStatusBusy('admin-auth-status', false);
        return;
      }

      clearAdminBootstrap(payload.issue || 'Bootstrap unavailable');
      setStatusBusy('admin-auth-status', false);
    } catch (error) {
      clearAdminBootstrap('Bootstrap endpoint unavailable');
      setStatusBusy('admin-auth-status', false);
    }
  }

  function authEndpoint(authContract, key) {
    return authContract
      && authContract.endpoints
      && authContract.endpoints[key]
      && authContract.endpoints[key].path
      ? authContract.endpoints[key].path
      : '';
  }

  async function readResponseJson(response) {
    try {
      return await response.json();
    } catch (error) {
      return {};
    }
  }

  async function loadGithubBootstrap() {
    const config = readGithubConfig();
    const bootstrapUrl = config.bootstrap_url || 'github-bootstrap.json';

    setAdminBootStatus('Загрузка GitHub bootstrap...');
    setGithubStatus('Загрузка структуры сайта из GitHub Pages...');

    try {
      const response = await fetch(bootstrapUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      const payload = await readResponseJson(response);

      if (!response.ok || payload.ok === false) {
        clearAdminBootstrap('GitHub bootstrap unavailable');
        setGithubStatus('Bootstrap недоступен.');
        return;
      }

      applyGithubActor(githubState.actorLogin || 'unknown-github-user');
      renderAdminBootstrap(payload);
      setGithubStatus('GitHub подключен: ' + (authState.actor ? authState.actor.username + ' / ' + authState.actor.role : 'unknown') + '. Команды публикации будут запускать workflow_dispatch.');
    } catch (error) {
      clearAdminBootstrap('GitHub bootstrap unavailable');
      setGithubStatus('Bootstrap недоступен: ' + (error && error.message ? error.message : 'network error'));
    }
  }

  async function verifyGithubToken() {
    const config = readGithubConfig();
    const repository = config.repository || '';

    if (!githubToken()) {
      return { ok: false, message: 'Введите GitHub token.' };
    }

    try {
      const userResponse = await fetch(githubApiUrl('/user'), {
        method: 'GET',
        headers: githubHeaders()
      });
      const userPayload = await readResponseJson(userResponse);

      if (!userResponse.ok) {
        return { ok: false, message: 'GitHub token отклонен: ' + (userPayload.message || 'проверьте, что token полный, активный и не отозван.') };
      }

      const login = userPayload.login || '';
      const response = await fetch(githubApiUrl('/repos/' + repository), {
        method: 'GET',
        headers: githubHeaders()
      });
      const payload = await readResponseJson(response);

      if (!response.ok) {
        return { ok: false, message: 'GitHub token распознан как ' + (login || 'unknown') + ', но не имеет доступа к ' + repository + ': ' + (payload.message || 'проверьте Contents/Actions permissions и доступ к репозиторию.') };
      }

      const actor = applyGithubActor(login);

      if (!['admin', 'editor'].includes(actor.role) || !(actor.capabilities && actor.capabilities.read === true)) {
        return { ok: false, message: 'GitHub login ' + actor.username + ' не добавлен в разрешенные профили CMS. Admin должен добавить этот login в блоке "Права и редактор".' };
      }

      loadGithubRateLimit();

      return { ok: true, message: 'GitHub token проверен: ' + authState.actor.username + ' / ' + authState.actor.role + '.' };
    } catch (error) {
      return { ok: false, message: error && error.message ? error.message : 'GitHub API недоступен.' };
    }
  }

  async function githubDispatchCommand(command, payload, dryRun) {
    const config = readGithubConfig();
    const repository = config.repository || '';
    const workflow = config.workflow_id || config.workflow || 'admin-command.yml';
    const branchInput = document.querySelector('[data-github-branch]');
    const deployInput = document.querySelector('[data-github-deploy-after]');
    const ref = branchInput && branchInput.value ? branchInput.value.trim() : (config.branch || 'main');
    const deployAfter = deployInput ? deployInput.checked : true;
    const body = {
      ref,
      inputs: {
        command,
        payload_json: JSON.stringify(payload || {}),
        dry_run: dryRun ? 'true' : 'false',
        deploy_static_vps: deployAfter && !dryRun ? 'true' : 'false',
        target: 'production'
      }
    };

    if (!githubToken()) {
      return {
        ok: false,
        issues: ['GitHub token не подключен. Подключите token в верхнем блоке GitHub доступа.']
      };
    }

    try {
      const response = await fetch(githubApiUrl('/repos/' + repository + '/actions/workflows/' + workflow + '/dispatches'), {
        method: 'POST',
        headers: Object.assign({}, githubHeaders(), {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(body)
      });
      const responsePayload = response.status === 204 ? {} : await readResponseJson(response);
      const actionsUrl = config.actions_url || ('https://github.com/' + repository + '/actions');

      if (response.ok) {
        return {
          ok: true,
          action: 'github_workflow_dispatch',
          command,
          dry_run: dryRun,
          data: {
            workflow,
            ref,
            deploy_static_vps: deployAfter && !dryRun,
            actions_url: actionsUrl
          },
          warnings: ['GitHub принял команду асинхронно. Откройте Actions и дождитесь завершения workflow.']
        };
      }

      return {
        ok: false,
        http_status: response.status,
        action: 'github_workflow_dispatch',
        command,
        errors: [{
          field: 'github_actions',
          code: 'dispatch_failed',
          human: responsePayload.message || 'GitHub workflow_dispatch failed.',
          ai_hint: 'Check token permissions: Actions write, Contents write, workflow file name, and branch.'
        }],
        data: responsePayload
      };
    } catch (error) {
      return {
        ok: false,
        action: 'github_workflow_dispatch',
        command,
        issues: ['GitHub API request failed: ' + (error && error.message ? error.message : 'network error')]
      };
    }
  }

  async function githubDispatchWorkflow(workflow, inputs, actionsUrl) {
    const config = readGithubConfig();
    const repository = config.repository || '';
    const branchInput = document.querySelector('[data-github-branch]');
    const ref = branchInput && branchInput.value ? branchInput.value.trim() : (config.branch || 'main');
    const normalizedInputs = {};

    Object.entries(inputs || {}).forEach(([key, value]) => {
      normalizedInputs[key] = String(value);
    });

    if (!githubToken()) {
      return {
        ok: false,
        issues: ['GitHub token не подключен. Подключите token на экране входа.']
      };
    }

    try {
      const response = await fetch(githubApiUrl('/repos/' + repository + '/actions/workflows/' + workflow + '/dispatches'), {
        method: 'POST',
        headers: Object.assign({}, githubHeaders(), {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ ref, inputs: normalizedInputs })
      });
      const responsePayload = response.status === 204 ? {} : await readResponseJson(response);

      if (response.ok) {
        return {
          ok: true,
          action: 'github_workflow_dispatch',
          workflow,
          data: {
            ref,
            inputs: normalizedInputs,
            actions_url: actionsUrl || ('https://github.com/' + repository + '/actions/workflows/' + workflow)
          },
          warnings: ['GitHub принял workflow асинхронно. Дождитесь завершения Actions перед следующим шагом.']
        };
      }

      return {
        ok: false,
        http_status: response.status,
        action: 'github_workflow_dispatch',
        workflow,
        errors: [{
          field: 'github_actions',
          code: 'dispatch_failed',
          human: responsePayload.message || 'GitHub workflow_dispatch failed.',
          ai_hint: 'Check token permissions: Actions write, workflow file name, branch, and environment secrets.'
        }],
        data: responsePayload
      };
    } catch (error) {
      return {
        ok: false,
        action: 'github_workflow_dispatch',
        workflow,
        issues: ['GitHub API request failed: ' + (error && error.message ? error.message : 'network error')]
      };
    }
  }

  function setAuthStatus(message) {
    const status = byId('admin-auth-status');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function activeAccountPanel() {
    return byId('admin-account-panel') || byId('admin-github-account-panel');
  }

  function setAccountPanelOpen(open) {
    const panel = activeAccountPanel();
    const toggle = document.querySelector('[data-account-toggle]');

    if (panel) {
      panel.hidden = !open;
    }

    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  function setAccountLabel(message) {
    const label = document.querySelector('[data-account-label]');

    if (label) {
      label.textContent = message;
    }
  }

  function clearAuthInputs() {
    const username = byId('admin-auth-login');
    const password = byId('admin-auth-password');

    if (username) {
      username.value = '';
      username.defaultValue = '';
      username.setAttribute('value', '');
    }

    if (password) {
      password.value = '';
      password.defaultValue = '';
      password.setAttribute('value', '');
    }
  }

  function wireAccountMenu() {
    const menu = document.querySelector('[data-account-menu], [data-account-menu-github]');
    const toggle = document.querySelector('[data-account-toggle]');
    const panel = activeAccountPanel();

    if (!menu || !toggle || !panel) {
      return;
    }

    clearAuthInputs();
    window.setTimeout(() => {
      if (!authState.actor) {
        clearAuthInputs();
      }
    }, 250);

    toggle.addEventListener('click', () => {
      if (!authState.actor) {
        clearAuthInputs();
      }

      setAccountPanelOpen(panel.hidden);
    });

    document.addEventListener('click', (event) => {
      if (!panel.hidden && event.target instanceof Node && !menu.contains(event.target)) {
        setAccountPanelOpen(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setAccountPanelOpen(false);
      }
    });
  }

  function setSessionOutput(payload) {
    const output = byId('admin-auth-session-output');

    if (output) {
      output.value = JSON.stringify(payload, null, 2);
    }
  }

  function setAuditStatus(message) {
    const status = byId('admin-audit-status');

    if (status) {
      status.value = message;
      status.textContent = message;
    }
  }

  function renderAuditEvents(events) {
    const list = byId('admin-audit-events');

    if (!list) {
      return;
    }

    list.textContent = '';

    if (!Array.isArray(events) || events.length === 0) {
      const item = document.createElement('li');
      item.textContent = 'No audit events found.';
      list.appendChild(item);
      return;
    }

    events.forEach((event) => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      const details = document.createElement('span');
      const meta = [
        event && event.outcome ? event.outcome : '',
        event && event.resource ? event.resource : '',
        event && event.actor_id ? 'actor: ' + event.actor_id : '',
        event && event.role ? 'role: ' + event.role : '',
        event && event.at ? event.at : ''
      ].filter(Boolean);

      title.textContent = event && event.action ? event.action : 'audit.event';
      details.textContent = meta.join(' · ');
      item.appendChild(title);
      item.appendChild(details);
      list.appendChild(item);
    });
  }

  async function loadAuditHistory(authContract) {
    const path = authEndpoint(authContract, 'audit_recent');

    if (!path) {
      setAuditStatus('Audit endpoint unavailable');
      setStatusBusy('admin-audit-status', false);
      return;
    }

    setAuditStatus('Loading audit history...');
    setStatusBusy('admin-audit-status', true);

    try {
      const response = await fetch(path, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const payload = await readResponseJson(response);

      if (response.ok && payload.ok !== false) {
        renderAuditEvents(payload.events || []);
        setAuditStatus('Loaded ' + (payload.count || 0) + ' audit event(s)');
        setStatusBusy('admin-audit-status', false);
        return;
      }

      renderAuditEvents([]);
      setAuditStatus(payload.issue || 'Audit history unavailable');
      setStatusBusy('admin-audit-status', false);
    } catch (error) {
      renderAuditEvents([]);
      setAuditStatus('Audit endpoint unavailable');
      setStatusBusy('admin-audit-status', false);
    }
  }

  function setDraftStatusOutput(message) {
    const output = byId('admin-draft-status-output');

    if (output) {
      output.value = message;
      output.textContent = message;
    }
  }

  function draftStatusLabel(page) {
    if (!page || typeof page !== 'object') {
      return 'Draft status unknown';
    }

    if (page.draft_exists && page.preview_exists) {
      return 'Draft + preview';
    }

    if (page.draft_exists) {
      return 'Draft exists';
    }

    return 'No draft';
  }

  function renderDraftStatuses(pages) {
    const statusByResource = new Map();

    if (Array.isArray(pages)) {
      pages.forEach((page) => {
        if (page && page.resource) {
          statusByResource.set(page.resource, page);
        }
      });
    }

    document.querySelectorAll('[data-page-draft-status]').forEach((badge) => {
      const resource = badge.getAttribute('data-page-draft-status') || '';
      const page = statusByResource.get(resource) || null;
      const hasDraft = Boolean(page && page.draft_exists);
      const hasPreview = Boolean(page && page.preview_exists);

      badge.textContent = draftStatusLabel(page);
      badge.classList.toggle('page-row__draft--exists', hasDraft);
      badge.setAttribute('title', page ? [
        page.draft_path || '',
        hasPreview ? page.preview_path || '' : ''
      ].filter(Boolean).join(' · ') : 'Draft status unknown');
    });
  }

  async function loadDraftStatuses(authContract) {
    const path = authEndpoint(authContract, 'draft_status');

    if (!path) {
      setDraftStatusOutput('Draft status endpoint unavailable');
      setStatusBusy('admin-draft-status-output', false);
      return;
    }

    setDraftStatusOutput('Loading draft status...');
    setStatusBusy('admin-draft-status-output', true);

    try {
      const response = await fetch(path, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const payload = await readResponseJson(response);

      if (response.ok && payload.ok !== false) {
        renderDraftStatuses(payload.pages || []);
        setDraftStatusOutput('Loaded draft status for ' + (payload.count || 0) + ' page(s)');
        setStatusBusy('admin-draft-status-output', false);
        return;
      }

      renderDraftStatuses([]);
      setDraftStatusOutput(payload.issue || 'Draft status unavailable');
      setStatusBusy('admin-draft-status-output', false);
    } catch (error) {
      renderDraftStatuses([]);
      setDraftStatusOutput('Draft status endpoint unavailable');
      setStatusBusy('admin-draft-status-output', false);
    }
  }

  function syncPayloadComposerAuth(payload) {
    const actor = payload.actor || authState.actor || {};

    if (byId('admin-payload-actor-id') && actor.id) {
      byId('admin-payload-actor-id').value = actor.id;
    }

    if (byId('admin-payload-role') && actor.role) {
      byId('admin-payload-role').value = actor.role;
    }

    if (byId('admin-payload-session') && (payload.session_id || authState.sessionId)) {
      byId('admin-payload-session').value = payload.session_id || authState.sessionId;
    }

    if (byId('admin-payload-csrf') && authState.csrfToken) {
      byId('admin-payload-csrf').value = authState.csrfToken;
    }

    const composer = document.querySelector('[data-payload-composer]');

    if (composer) {
      composer.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function applySessionPayload(payload) {
    if (payload && (payload.ok || payload.authenticated)) {
      authState.sessionId = payload.session_id || authState.sessionId;
      authState.actor = payload.actor || authState.actor;
      authState.csrfToken = payload.csrf_token || authState.csrfToken;
      setAuthStatus('Authenticated: ' + (authState.actor ? authState.actor.username : authState.sessionId));
      setAccountLabel(authState.actor ? authState.actor.username : 'В системе');
      syncPayloadComposerAuth(payload);
    } else {
      authState.sessionId = '';
      authState.actor = null;
      authState.csrfToken = '';
      setAuthStatus('Not authenticated');
      setAccountLabel('Войти');
      setAuditStatus('Login to load audit history');
      renderAuditEvents([]);
      setDraftStatusOutput('Login to load draft status');
      renderDraftStatuses([]);
      clearAdminBootstrap('Войдите, чтобы загрузить данные админки');
    }

    setStatusBusy('admin-auth-status', false);
    setSessionOutput(payload || {});
  }

  async function checkSession(authContract) {
    const path = authEndpoint(authContract, 'session');

    if (!path) {
      return;
    }

    setAuthStatus('Checking session...');
    setStatusBusy('admin-auth-status', true);

    try {
      const response = await fetch(path, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const payload = await readResponseJson(response);
      applySessionPayload(response.ok ? payload : { authenticated: false, issue: payload.issue || 'missing or expired session' });

      if (response.ok) {
        loadAdminBootstrap(authContract);
      }
    } catch (error) {
      applySessionPayload({ authenticated: false, issue: 'session endpoint unavailable' });
    }
  }

  async function login(authContract) {
    const path = authEndpoint(authContract, 'login');

    if (!path) {
      return;
    }

    setAuthStatus('Authenticating...');
    setStatusBusy('admin-auth-status', true);

    try {
      const response = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_id: byId('admin-auth-request') ? byId('admin-auth-request').value : 'req-admin-login',
          username: byId('admin-auth-login') ? byId('admin-auth-login').value : '',
          password: byId('admin-auth-password') ? byId('admin-auth-password').value : ''
        })
      });
      const payload = await readResponseJson(response);

      if (byId('admin-auth-password')) {
        byId('admin-auth-password').value = '';
      }

      if (response.ok && byId('admin-auth-login')) {
        byId('admin-auth-login').value = '';
      }

      applySessionPayload(response.ok ? payload : { ok: false, issues: payload.issues || ['login failed'] });

      if (response.ok) {
        loadAdminBootstrap(authContract);
      }
    } catch (error) {
      applySessionPayload({ ok: false, issues: ['login endpoint unavailable'] });
    }
  }

  async function logout(authContract) {
    const path = authEndpoint(authContract, 'logout');

    if (!path) {
      return;
    }

    setAuthStatus('Logging out...');
    setStatusBusy('admin-auth-status', true);

    try {
      const response = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          [authContract.csrf_header || 'X-CSRF-Token']: authState.csrfToken || (byId('admin-payload-csrf') ? byId('admin-payload-csrf').value : '')
        }
      });
      const payload = await readResponseJson(response);

      if (response.ok) {
        authState.csrfToken = '';
        authState.sessionId = '';
        authState.actor = null;
      }

      applySessionPayload(response.ok ? { ok: true, authenticated: false } : payload);

      if (response.ok) {
        renderAuditEvents([]);
        setAuditStatus('Login to load audit history');
        renderDraftStatuses([]);
        setDraftStatusOutput('Login to load draft status');
        clearAdminBootstrap('Вы вышли из админки');
      }
    } catch (error) {
      applySessionPayload({ ok: false, issues: ['logout endpoint unavailable'] });
    }
  }

  function wireCreatePageComposer(contracts) {
    const createPanel = document.querySelector('[data-page-create]');

    if (!createPanel) {
      return;
    }

    const titleInput = byId('admin-create-title');
    const slugInput = byId('admin-create-slug');
    const createButton = createPanel.querySelector('[data-create-page-template]');

    if (titleInput && slugInput && titleInput.dataset.createTitleBound !== 'true') {
      titleInput.dataset.createTitleBound = 'true';
      titleInput.addEventListener('input', () => {
        if (slugInput.dataset.manualSlug === 'true') {
          return;
        }

        slugInput.value = normalizeSlug(titleInput.value);
      });
    }

    if (slugInput && slugInput.dataset.createSlugBound !== 'true') {
      slugInput.dataset.createSlugBound = 'true';
      slugInput.addEventListener('input', () => {
        slugInput.dataset.manualSlug = 'true';
        slugInput.value = normalizeSlug(slugInput.value);
      });
    }

    if (createButton && createButton.dataset.createBound !== 'true') {
      createButton.dataset.createBound = 'true';
      createButton.addEventListener('click', () => createPageFromTemplate(readContracts() || contracts));
    }
  }

  function bootComposer() {
    const composer = document.querySelector('[data-payload-composer]');
    const contracts = readContracts();

    if (!composer || !contracts || !Array.isArray(contracts.pages) || !contracts.actions) {
      return;
    }

    const alreadyBooted = composer.dataset.composerBooted === 'true';
    const pageSelect = byId('admin-payload-page');
    const actionSelect = byId('admin-payload-action');
    const actions = Object.entries(contracts.actions).map(([key, action]) => ({
      value: key,
      label: action.label + ' (' + action.capability + ')'
    }));

    renderCreateTemplates(contracts);
    wireCreatePageComposer(contracts);
    refreshPageSelect(contracts);
    fillSelect(actionSelect, actions);
    syncPageSeoEditor(contracts);
    syncModuleEditor(contracts);
    const loadedFromUrl = loadPageFromUrl(contracts);

    if (!loadedFromUrl) {
      setPayloadShortcutStatus('Choose a page or use Edit from page list');
    }

    wirePageEditShortcuts(contracts);

    if (alreadyBooted) {
      updateComposer(contracts);
      resetDraftActionState();
      return;
    }

    composer.dataset.composerBooted = 'true';

    composer.addEventListener('input', () => {
      resetDraftActionState();
      updateComposer(contracts);
    });
    composer.addEventListener('change', (event) => {
      if (event.target === pageSelect) {
        syncPageSeoEditor(contracts);
        syncModuleEditor(contracts);
      }

      resetDraftActionState();
      updateComposer(contracts);
    });
    composer.querySelectorAll('[data-copy-target]').forEach((button) => {
      button.addEventListener('click', () => copyTarget(button.getAttribute('data-copy-target')));
    });

    const dryRunButton = composer.querySelector('[data-draft-run-dry-run]');
    const executeButton = composer.querySelector('[data-draft-run-execute]');

    if (dryRunButton) {
      dryRunButton.addEventListener('click', () => runDraftAction(contracts, 'dry-run'));
    }

    if (executeButton) {
      executeButton.addEventListener('click', () => runDraftAction(contracts, 'execute'));
    }

    const moduleSelect = byId('admin-module-editor-module');
    const moduleProps = byId('admin-module-editor-props');

    composer.querySelectorAll('[data-page-seo-field]').forEach((field) => {
      field.addEventListener('input', () => refreshPageSeoEditor(contracts));
      field.addEventListener('change', () => refreshPageSeoEditor(contracts));
    });

    if (moduleSelect) {
      moduleSelect.addEventListener('change', () => {
        loadSelectedModuleProps(contracts);
        resetDraftActionState();
        updateComposer(contracts);
      });
    }

    if (moduleProps) {
      moduleProps.addEventListener('input', () => {
        const parsed = readModuleEditorProps();
        moduleEditorState.props = parsed.props;
        moduleEditorState.valid = parsed.valid;

        if (parsed.valid) {
          renderModuleFields(parsed.props, contracts);
          setModuleEditorStatus('Module props ready for draft save payload');
        } else {
          setModuleEditorStatus('Props JSON must be a valid object');
        }

        resetDraftActionState();
        updateComposer(contracts);
      });
    }

    updateComposer(contracts);

    if (!loadedFromUrl) {
      resetDraftActionState();
    }
  }

  function bootAuth() {
    const panel = document.querySelector('[data-auth-session]');
    const authContract = readAuthContract();

    if (!panel || !authContract) {
      return;
    }

    const form = document.querySelector('[data-auth-login]');

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        login(authContract);
      });
    }

    const sessionButton = document.querySelector('[data-auth-session-check]');

    if (sessionButton) {
      sessionButton.addEventListener('click', () => checkSession(authContract));
    }

    const logoutButton = document.querySelector('[data-auth-logout]');

    if (logoutButton) {
      logoutButton.addEventListener('click', () => logout(authContract));
    }

    const auditButton = document.querySelector('[data-audit-refresh]');

    if (auditButton) {
      auditButton.addEventListener('click', () => loadAuditHistory(readAuthContract() || authContract));
    }

    const draftStatusButton = document.querySelector('[data-draft-status-refresh]');

    if (draftStatusButton) {
      draftStatusButton.addEventListener('click', () => loadDraftStatuses(readAuthContract() || authContract));
    }

    checkSession(authContract);
  }

  function bootGithubAuth() {
    const form = document.querySelector('[data-github-auth]');
    const tokenInput = document.querySelector('[data-github-token]');
    const disconnectButtons = Array.from(document.querySelectorAll('[data-github-disconnect], [data-github-logout]'));
    const storedToken = sessionStorage.getItem(githubSessionKey()) || '';
    const disconnectGithubSession = () => {
      githubState.token = '';
      githubState.connected = false;
      githubState.actorLogin = '';
      githubState.actorProfile = null;
      authState.actor = null;
      sessionStorage.removeItem(githubSessionKey());

      if (tokenInput) {
        tokenInput.value = '';
        tokenInput.setCustomValidity('');
      }

      setAccountLabel('token');
      setAccountPanelOpen(false);
      clearAdminBootstrap('GitHub token удален из sessionStorage');
      setGithubStatus('GitHub token удален из текущего браузера.');
      setGithubRateLimit('Лимиты не загружены', false);
    };

    if (tokenInput && storedToken) {
      tokenInput.value = storedToken;
      githubState.token = storedToken;
    }

    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();

        githubState.token = tokenInput && tokenInput.value ? tokenInput.value.trim() : '';
        if (tokenInput) {
          tokenInput.setCustomValidity('');
        }

        if (githubState.token) {
          sessionStorage.setItem(githubSessionKey(), githubState.token);
        }

        setGithubStatus('Проверяю GitHub token...');

        const verification = await verifyGithubToken();

        if (!verification.ok) {
          githubState.token = '';
          githubState.connected = false;
          githubState.actorLogin = '';
          githubState.actorProfile = null;
          authState.actor = null;
          sessionStorage.removeItem(githubSessionKey());
          if (tokenInput) {
            tokenInput.value = '';
            tokenInput.setCustomValidity(verification.message);
            tokenInput.reportValidity();
          }
          setAccountLabel('token');
          applyRolePermissionsVisibility(null);
          setGithubStatus(verification.message);
          clearAdminBootstrap('GitHub token не подключен');
          return;
        }

        githubState.connected = true;
        setGithubStatus(verification.message);
        loadGithubBootstrap();
      });
    }

    disconnectButtons.forEach((button) => button.addEventListener('click', disconnectGithubSession));

    if (storedToken) {
      verifyGithubToken().then((verification) => {
        if (verification.ok) {
          githubState.connected = true;
          loadGithubBootstrap();
          return;
        }

        githubState.token = '';
        githubState.connected = false;
        githubState.actorLogin = '';
        githubState.actorProfile = null;
        authState.actor = null;
        sessionStorage.removeItem(githubSessionKey());
        if (tokenInput) {
          tokenInput.value = '';
          tokenInput.setCustomValidity(verification.message);
          tokenInput.reportValidity();
        }
        setAccountLabel('token');
        applyRolePermissionsVisibility(null);
        setGithubStatus(verification.message);
      });
    } else {
      clearAdminBootstrap('Подключите GitHub token, чтобы открыть CMS.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    bootAdminTheme();
    wireAdminBrandCollapse();
    wireAdminNavAnchors();
    wireAccountMenu();
    wireRolePermissionsShortcut();
    wirePageFilters();
    bootComposer();
    if (isGithubMode()) {
      bootGithubAuth();
    } else {
      bootAuth();
    }
  });
})();
