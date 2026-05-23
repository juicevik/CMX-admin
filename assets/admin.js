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
    activeSiteId: '',
    releaseStatusRequestSeq: 0,
    releaseStatusBySite: {},
    runtimeContentIndexRequestSeq: 0,
    runtimeContentIndexesBySite: {},
    runtimeContentIndexLoadingBySite: {},
    contentBaselinePayloadsBySite: {},
    contentBaselineApprovalsBySite: {},
    directUploadBundlesBySite: {},
    directUploadApprovalsBySite: {},
    medgenStatusBySite: {},
    medgenTaskIndexBySite: {},
    medgenTaskRefreshAtBySite: {},
    medgenTaskRefreshTimer: null,
    medgenTaskRefreshInFlight: false
  };
  const siteContextRequiredPanels = ['main-workspace', 'editorial', 'product-cards', 'medgen', 'design', 'technical', 'content', 'workflow', 'modules', 'system'];
  const siteContextControlSelector = 'button, input, select, textarea';
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
    rateLimitMessage: 'Act n/a · CF Workers 100k/day',
    rateLimitVisible: false
  };
  const adminThemeStorageKey = 'cms.admin.theme';
  const activeSiteStoragePrefix = 'cms.active.site.';
  const admin2TargetState = {
    intent: 'create_site',
    target: 'site',
    intentTouched: false
  };
  let admin2ManualStepKey = '';
  let admin2ReturnRaf = 0;
  const admin2IntentDefinitions = {
    select_site: {
      label: 'Выбрать домен',
      target: 'site_existing',
      section: 'site-workflow',
      anchor: '#admin-active-site',
      focus: 'admin-active-site',
      requiresSite: false,
      detail: 'active site / домен'
    },
    create_site: {
      label: 'Создать сайт',
      target: 'site',
      section: 'site-launch',
      anchor: '#admin-site-launch',
      requiresSite: false,
      detail: 'домен, GEO, дизайн, skeleton'
    },
    edit_page: {
      label: 'Редактировать существующий',
      target: 'page',
      section: 'editorial',
      anchor: '#admin-editorial',
      requiresSite: true,
      detail: 'страницы, SEO, media'
    },
    medgen: {
      label: 'Запустить MedGen',
      target: 'medgen_task',
      section: 'medgen',
      anchor: '#admin-medgen',
      focus: 'admin-medgen-task-id',
      requiresSite: true,
      detail: 'task, status, preview'
    },
    product_card: {
      label: 'Работать с карточкой',
      target: 'product_card_target',
      section: 'product-cards',
      anchor: '#admin-product-cards',
      requiresSite: true,
      detail: 'product matrix и media'
    },
    design: {
      label: 'Править дизайн',
      target: 'design_target',
      section: 'design',
      anchor: '#admin-design',
      requiresSite: true,
      detail: 'theme, logo, favicon'
    },
    deploy: {
      label: 'Проверить deploy',
      target: 'package',
      section: 'site-workflow',
      anchor: '#admin-site-workflow',
      requiresSite: true,
      detail: 'preview, approval, release'
    },
    delete_site: {
      label: 'Удалить сайт и домен',
      target: 'site_delete',
      section: 'site-workflow',
      anchor: '#admin-site-domain-delete',
      focus: 'admin-site-domain-delete',
      requiresSite: true,
      detail: 'выбор домена, confirm, archive profile'
    }
  };
  const admin2TargetDefinitions = {
    site: {
      label: 'Новый сайт',
      intent: 'create_site',
      section: 'site-launch',
      anchor: '#admin-site-launch',
      requiresSite: false
    },
    site_existing: {
      label: 'Домен',
      intent: 'select_site',
      section: 'site-workflow',
      anchor: '#admin-active-site',
      focus: 'admin-active-site',
      requiresSite: false
    },
    site_delete: {
      label: 'Сайт и домен',
      intent: 'delete_site',
      section: 'site-workflow',
      anchor: '#admin-site-domain-delete',
      focus: 'admin-site-domain-delete',
      requiresSite: true
    },
    page: {
      label: 'Страница',
      intent: 'edit_page',
      section: 'editorial',
      anchor: '#admin-editorial',
      requiresSite: true
    },
    package: {
      label: 'Пакет',
      intent: 'deploy',
      section: 'site-workflow',
      anchor: '#admin-site-workflow',
      requiresSite: true
    },
    product_card_target: {
      label: 'Product card',
      intent: 'product_card',
      section: 'product-cards',
      anchor: '#admin-product-cards',
      requiresSite: true
    },
    design_target: {
      label: 'Design',
      intent: 'design',
      section: 'design',
      anchor: '#admin-design',
      requiresSite: true
    },
    medgen_task: {
      label: 'MedGen task',
      intent: 'medgen',
      section: 'medgen',
      anchor: '#admin-medgen',
      focus: 'admin-medgen-task-id',
      requiresSite: true
    }
  };

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

  function activeSiteStorageKey() {
    const config = readGithubConfig();
    const repository = config && config.repository ? String(config.repository) : 'cms';

    return activeSiteStoragePrefix + repository;
  }

  function readStoredActiveSite() {
    try {
      return String(sessionStorage.getItem(activeSiteStorageKey()) || '').trim();
    } catch (error) {
      return '';
    }
  }

  function writeStoredActiveSite(siteId) {
    try {
      const key = activeSiteStorageKey();
      const value = String(siteId || '').trim();

      if (value) {
        sessionStorage.setItem(key, value);
      } else {
        sessionStorage.removeItem(key);
      }
    } catch (error) {
      // Session storage is optional; the visible selector remains the source of truth.
    }
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

  function actionsBillingLabel(payload) {
    const used = Number(payload && payload.total_minutes_used ? payload.total_minutes_used : 0);
    const included = Number(payload && payload.included_minutes ? payload.included_minutes : 0);

    if (included > 0) {
      return 'Act ' + formatMinutes(used) + '/' + formatMinutes(included);
    }

    return 'Act ' + formatMinutes(used);
  }

  function actionsBillingIssue(response, payload) {
    const message = String(payload && payload.message ? payload.message : '').toLowerCase();

    if (response && (response.status === 401 || response.status === 403 || response.status === 404) && message.includes('user') && message.includes('scope')) {
      return 'Act нужен user';
    }

    if (response && response.status === 404) {
      return 'Act n/a';
    }

    return '';
  }

  function monthStartDate() {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  function monthStartIsoDate() {
    return monthStartDate().toISOString().slice(0, 10);
  }

  function parseGithubRepository(repository) {
    const parts = String(repository || '').split('/');

    return {
      owner: parts[0] || '',
      repo: parts[1] || ''
    };
  }

  function githubActionUsageRepositories() {
    const config = readGithubConfig();
    const configured = Array.isArray(config.actions_usage_repositories)
      ? config.actions_usage_repositories
      : [];
    const fallbackRepository = config && config.repository ? String(config.repository) : '';
    const repositories = configured.length
      ? configured
      : [{ repository: fallbackRepository, label: fallbackRepository, billable: true, quota_minutes: 2000 }];
    const seen = new Set();

    return repositories
      .map((item) => {
        const repository = String(item && item.repository ? item.repository : '').trim();
        const parsed = parseGithubRepository(repository);

        return {
          repository,
          owner: parsed.owner,
          repo: parsed.repo,
          label: String(item && item.label ? item.label : (parsed.repo || repository)),
          billable: !(item && item.billable === false),
          quotaMinutes: Number(item && item.quota_minutes ? item.quota_minutes : 0)
        };
      })
      .filter((item) => {
        const key = item.repository.toLowerCase();

        if (!item.owner || !item.repo || seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
  }

  function minutesBetween(startedAt, completedAt, rounded) {
    const started = startedAt ? new Date(startedAt).getTime() : 0;
    const completed = completedAt ? new Date(completedAt).getTime() : 0;

    if (!started || !completed || completed <= started) {
      return 0;
    }

    const minutes = (completed - started) / 60000;

    return rounded ? Math.max(1, Math.ceil(minutes)) : minutes;
  }

  function runStartedAt(run) {
    return run && (run.run_started_at || run.created_at) ? (run.run_started_at || run.created_at) : '';
  }

  function runCompletedAt(run) {
    return run && (run.updated_at || run.completed_at) ? (run.updated_at || run.completed_at) : '';
  }

  function actionRunsPath(repository, page) {
    const owner = repository && repository.owner ? String(repository.owner) : '';
    const repo = repository && repository.repo ? String(repository.repo) : '';
    const query = [
      'per_page=100',
      'page=' + encodeURIComponent(String(page || 1)),
      'created=%3E%3D' + encodeURIComponent(monthStartIsoDate())
    ].join('&');

    return '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/actions/runs?' + query;
  }

  function actionRunJobsPath(repository, runId, page) {
    const owner = repository && repository.owner ? String(repository.owner) : '';
    const repo = repository && repository.repo ? String(repository.repo) : '';

    return '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/actions/runs/' + encodeURIComponent(String(runId)) + '/jobs?per_page=100&page=' + encodeURIComponent(String(page || 1));
  }

  async function fetchCurrentMonthActionRuns(repository) {
    const runs = [];
    let page = 1;

    while (page <= 5) {
      const result = await fetchGithubJson(actionRunsPath(repository, page));

      if (!result.response.ok || !result.payload || !Array.isArray(result.payload.workflow_runs)) {
        return { ok: false, issue: 'runs_unavailable', runs };
      }

      runs.push(...result.payload.workflow_runs);

      if (result.payload.workflow_runs.length < 100) {
        break;
      }

      page += 1;
    }

    return { ok: true, runs };
  }

  async function fetchRunRoundedJobMinutes(repository, run) {
    if (!run || !run.id) {
      return { ok: false, minutes: 0 };
    }

    let minutes = 0;
    let page = 1;

    while (page <= 3) {
      const result = await fetchGithubJson(actionRunJobsPath(repository, run.id, page));

      if (!result.response.ok || !result.payload || !Array.isArray(result.payload.jobs)) {
        return { ok: false, minutes: 0 };
      }

      result.payload.jobs.forEach((job) => {
        minutes += minutesBetween(job.started_at, job.completed_at, true);
      });

      if (result.payload.jobs.length < 100) {
        break;
      }

      page += 1;
    }

    return { ok: true, minutes };
  }

  async function mapWithConcurrency(items, limit, mapper) {
    const results = new Array(items.length);
    let cursor = 0;

    async function worker() {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await mapper(items[index], index);
      }
    }

    const workers = [];
    const count = Math.min(Math.max(1, limit), items.length);

    for (let index = 0; index < count; index += 1) {
      workers.push(worker());
    }

    await Promise.all(workers);

    return results;
  }

  async function loadGithubActionsRepoUsage(repository) {
    const runsResult = await fetchCurrentMonthActionRuns(repository);

    if (!runsResult.ok) {
      return { ok: false, minutes: 0, runs: 0, billable: repository.billable, quotaMinutes: repository.quotaMinutes };
    }

    const runs = runsResult.runs.filter((run) => {
      const started = runStartedAt(run);

      return started && new Date(started) >= monthStartDate();
    });

    if (!runs.length) {
      return { ok: true, minutes: 0, runs: 0, billable: repository.billable, quotaMinutes: repository.quotaMinutes };
    }

    const jobResults = await mapWithConcurrency(runs, 4, (run) => fetchRunRoundedJobMinutes(repository, run));
    const jobMinutes = jobResults.reduce((sum, result) => sum + (result && result.ok ? result.minutes : 0), 0);

    if (jobMinutes > 0) {
      return { ok: true, minutes: jobMinutes, runs: runs.length, billable: repository.billable, quotaMinutes: repository.quotaMinutes };
    }

    const runMinutes = runs.reduce((sum, run) => sum + minutesBetween(runStartedAt(run), runCompletedAt(run), true), 0);

    return { ok: true, minutes: runMinutes, runs: runs.length, billable: repository.billable, quotaMinutes: repository.quotaMinutes, approximate: true };
  }

  function actionsUsageLabel(metrics) {
    const billableMinutes = metrics.reduce((sum, item) => sum + (item.billable ? item.minutes : 0), 0);
    const publicMinutes = metrics.reduce((sum, item) => sum + (!item.billable ? item.minutes : 0), 0);
    const totalRuns = metrics.reduce((sum, item) => sum + item.runs, 0);
    const quota = metrics.reduce((sum, item) => sum + (item.billable ? item.quotaMinutes : 0), 0) || 2000;
    const prefix = metrics.some((item) => item.approximate) ? '~' : '';
    const parts = ['Act ' + prefix + Math.round(billableMinutes) + '/' + quota];

    if (publicMinutes > 0) {
      parts.push('pub ' + Math.round(publicMinutes));
    }

    if (totalRuns > 0) {
      parts.push(totalRuns + 'r');
    }

    return parts.join(' · ');
  }

  async function loadGithubActionsConfiguredUsage() {
    const repositories = githubActionUsageRepositories();

    if (!repositories.length) {
      return 'Act repo n/a';
    }

    const metrics = await mapWithConcurrency(repositories, 2, loadGithubActionsRepoUsage);
    const available = metrics.filter((item) => item && item.ok);

    if (!available.length) {
      return 'Act repo n/a';
    }

    return actionsUsageLabel(available);
  }

  async function fetchActionsBillingForUser(login) {
    if (!login) {
      return { ok: false, label: 'Act n/a' };
    }

    try {
      const billing = await fetchGithubJson('/users/' + encodeURIComponent(login) + '/settings/billing/actions');

      if (billing.response.ok && billing.payload) {
        return { ok: true, label: actionsBillingLabel(billing.payload) };
      }

      return { ok: false, label: actionsBillingIssue(billing.response, billing.payload) || 'Act n/a' };
    } catch (error) {
      return { ok: false, label: 'Act n/a' };
    }
  }

  async function fetchActionsBillingForOrg(owner) {
    if (!owner) {
      return { ok: false, label: 'Act n/a' };
    }

    try {
      const billing = await fetchGithubJson('/orgs/' + encodeURIComponent(owner) + '/settings/billing/actions');

      if (billing.response.ok && billing.payload) {
        return { ok: true, label: actionsBillingLabel(billing.payload) };
      }

      return { ok: false, label: actionsBillingIssue(billing.response, billing.payload) || 'Act n/a' };
    } catch (error) {
      return { ok: false, label: 'Act n/a' };
    }
  }

  async function loadGithubActionsUsage() {
    const config = readGithubConfig();
    const owner = config && config.owner ? String(config.owner) : '';
    const actor = githubState.actorLogin ? String(githubState.actorLogin) : '';
    const ownerBilling = await fetchActionsBillingForUser(owner);

    if (ownerBilling.ok || ownerBilling.label === 'Act нужен user') {
      return ownerBilling.label;
    }

    if (actor && actor.toLowerCase() !== owner.toLowerCase()) {
      const actorBilling = await fetchActionsBillingForUser(actor);

      if (actorBilling.ok || actorBilling.label === 'Act нужен user') {
        return actorBilling.label;
      }
    }

    const orgBilling = await fetchActionsBillingForOrg(owner);

    if (orgBilling.ok || orgBilling.label === 'Act нужен user') {
      return orgBilling.label;
    }

    return loadGithubActionsConfiguredUsage();
  }

  function githubToken() {
    return githubState.token || sessionStorage.getItem(githubSessionKey()) || '';
  }

  function githubApiUrl(path) {
    const config = readGithubConfig();
    const base = config.api_base || 'https://api.github.com';

    return String(base).replace(/\/+$/, '') + path;
  }

  function cloudflareRuntimeEnabled() {
    const config = readGithubConfig();

    return config.cloudflare_runtime_enabled !== false;
  }

  function cloudflareApiBase() {
    const config = readGithubConfig();
    const base = config.cloudflare_api_base || 'https://api.workerwp.store';

    return String(base).replace(/\/+$/, '');
  }

  function cloudflareApiUrl(path) {
    return cloudflareApiBase() + path;
  }

  function cloudflareHeaders() {
    return {
      Accept: 'application/json',
      Authorization: 'Bearer ' + githubToken(),
      'Content-Type': 'application/json'
    };
  }

  function cloudflareSiteIdFromProfile(profile) {
    const source = profile && profile.site_id
      ? profile.site_id
      : profile && profile.domain
        ? profile.domain
        : profile && profile.base_url
          ? profile.base_url
          : adminState.activeSiteId;

    return String(source || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  async function cloudflareApiRequest(path, options) {
    if (!cloudflareRuntimeEnabled()) {
      return { ok: false, issues: ['cloudflare_runtime_disabled'] };
    }

    if (!githubToken()) {
      return { ok: false, issues: ['Token не подключен. Cloudflare Worker принимает тот же Bearer token, hash которого сохранен в Worker secret.'] };
    }

    try {
      const response = await fetch(cloudflareApiUrl(path), Object.assign({
        method: 'GET',
        headers: cloudflareHeaders()
      }, options || {}));
      const payload = await readResponseJson(response);

      return Object.assign({ ok: response.ok && payload.ok !== false, http_status: response.status }, payload);
    } catch (error) {
      return {
        ok: false,
        action: 'cloudflare_runtime_request',
        issues: ['Cloudflare Worker API недоступен: ' + (error && error.message ? error.message : 'network error')]
      };
    }
  }

  async function cloudflareUpsertSiteProfile(profile) {
    const siteId = cloudflareSiteIdFromProfile(profile);

    if (!siteId) {
      return { ok: false, issues: ['site_id_required'] };
    }

    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId), {
      method: 'PUT',
      body: JSON.stringify({ profile: Object.assign({ site_id: siteId }, profile || {}) })
    });
  }

  async function cloudflareListSiteProfiles() {
    return cloudflareApiRequest('/api/sites');
  }

  async function cloudflareStoreContentPackage(siteId, payload, packageType) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/content-packages', {
      method: 'POST',
      body: JSON.stringify(Object.assign({}, payload || {}, {
        site_id: siteId,
        package_type: packageType || 'editorial',
        request_id: payload && payload.request_id ? payload.request_id : 'req-' + Date.now()
      }))
    });
  }

  async function cloudflareCreatePreview(siteId, payload) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/preview', {
      method: 'POST',
      body: JSON.stringify(Object.assign({}, payload || {}, {
        site_id: siteId,
        request_id: payload && payload.request_id ? payload.request_id : 'req-' + Date.now()
      }))
    });
  }

  async function cloudflarePublish(siteId, payload) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/publish', {
      method: 'POST',
      body: JSON.stringify(Object.assign({}, payload || {}, { site_id: siteId }))
    });
  }

  async function cloudflareReleaseStatus(siteId) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/release-status');
  }

  async function cloudflareMedGenTaskSummary(siteId) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/medgen/tasks/summary?refresh=1');
  }

  async function cloudflareCreateMedGenTask(siteId, payload) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/medgen/tasks/create', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    });
  }

  async function cloudflarePollMedGenTask(siteId, taskId) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/medgen/tasks/' + encodeURIComponent(taskId) + '/poll', {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  async function cloudflareCreateMedGenPreview(siteId, taskId) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/medgen/tasks/' + encodeURIComponent(taskId) + '/preview', {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  async function cloudflareUpsertMedGenTask(siteId, payload) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/medgen/tasks', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    });
  }

  async function cloudflareCreateReleaseBatch(siteId, payload) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/release-batches', {
      method: 'POST',
      body: JSON.stringify(Object.assign({}, payload || {}, { site_id: siteId }))
    });
  }

  async function cloudflarePrepareRuntimeRelease(siteId, payload) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/runtime-releases', {
      method: 'POST',
      body: JSON.stringify(Object.assign({}, payload || {}, { site_id: siteId }))
    });
  }

  async function cloudflareRequestPagesDeployment(siteId, payload) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/pages-deployments', {
      method: 'POST',
      body: JSON.stringify(Object.assign({}, payload || {}, { site_id: siteId }))
    });
  }

  async function cloudflarePagesDeployments(siteId) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/pages-deployments');
  }

  async function cloudflareRuntimeContentIndex(siteId) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/content-index');
  }

  async function cloudflareExportSiteSnapshot(siteId) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/export');
  }

  async function cloudflareDeletePagesProject(siteId) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/cloudflare-pages/project', {
      method: 'DELETE'
    });
  }

  async function cloudflareDeleteSiteRuntime(siteId, domain) {
    const query = domain ? '?domain=' + encodeURIComponent(domain) : '';

    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + query, {
      method: 'DELETE'
    });
  }

  async function cloudflareSeedContentBaseline(siteId, payload) {
    return cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/content-baseline', {
      method: 'POST',
      body: JSON.stringify(Object.assign({}, payload || {}, { site_id: siteId }))
    });
  }

  function cloudflareRuntimeForActiveSite() {
    return isGithubMode()
      && cloudflareRuntimeEnabled()
      && hostingProvider(activeSiteProfile()) === 'cloudflare_pages';
  }

  function runtimeContentIndexRequired(profile) {
    const currentProfile = profile || activeSiteProfile();
    const index = currentProfile && currentProfile.content_index && typeof currentProfile.content_index === 'object'
      ? currentProfile.content_index
      : {};

    return isGithubMode()
      && cloudflareRuntimeEnabled()
      && hostingProvider(currentProfile) === 'cloudflare_pages'
      && String(index.mode || 'cloudflare_runtime_content') === 'cloudflare_runtime_content';
  }

  function runtimeContentIndexLoading(siteId) {
    const key = String(siteId || adminState.activeSiteId || '').trim();

    return key ? Boolean(adminState.runtimeContentIndexLoadingBySite[key]) : false;
  }

  function runtimeContentIndexCounts(payload) {
    const contentIndex = payload && payload.content_index && typeof payload.content_index === 'object'
      ? payload.content_index
      : {};
    const sourceCounts = contentIndex.source_counts && typeof contentIndex.source_counts === 'object'
      ? contentIndex.source_counts
      : payload && payload.source_counts && typeof payload.source_counts === 'object'
        ? payload.source_counts
        : {};

    return {
      configured: Number(contentIndex.configured_pages || payload && payload.configured_pages || 0),
      matched: Number(contentIndex.matched_pages || payload && payload.matched_pages || 0),
      published: Number(sourceCounts.published_objects || 0),
      packages: Number(sourceCounts.content_packages || 0),
      pages: Array.isArray(payload && payload.pages) ? payload.pages.length : 0,
      contracts: Array.isArray(payload && payload.action_contract_pages) ? payload.action_contract_pages.length : 0
    };
  }

  function runtimeContentIndexHasBaseline(payload) {
    const counts = runtimeContentIndexCounts(payload || {});

    return counts.published > 0;
  }

  function runtimeContentIndexSummary(payload) {
    if (!payload || payload.ok === false) {
      return 'Runtime content-index не загружен.';
    }

    const counts = runtimeContentIndexCounts(payload);
    return 'Runtime index: ' + counts.matched + '/' + counts.configured
      + ' страниц, baseline ' + counts.published
      + ', packages ' + counts.packages + '.';
  }

  function setRuntimeIndexStatus(message, state) {
    const elements = releaseStatusElements();

    if (!elements.runtimeIndexStatus) {
      return;
    }

    elements.runtimeIndexStatus.value = message;
    elements.runtimeIndexStatus.textContent = message;
    elements.runtimeIndexStatus.dataset.runtimeIndexState = state || 'idle';
  }

  function mergeRuntimeContentIndex(siteId, payload) {
    const siteKey = String(siteId || '').trim();

    if (!siteKey || !payload || payload.ok === false) {
      return false;
    }

    const pages = Array.isArray(payload.pages) ? payload.pages : [];
    const contractPages = Array.isArray(payload.action_contract_pages) ? payload.action_contract_pages : [];
    const contentIndex = payload.content_index && typeof payload.content_index === 'object'
      ? payload.content_index
      : null;
    const manifest = adminState.manifest || {};
    const contracts = adminState.actionContracts || {};

    adminState.runtimeContentIndexesBySite[siteKey] = payload;

    manifest.pages = [
      ...(Array.isArray(manifest.pages) ? manifest.pages : []).filter((page) => itemSiteId(page) !== siteKey),
      ...pages.map((page) => Object.assign({ site_id: siteKey, runtime_source: 'cloudflare_runtime' }, page || {}))
    ];

    if (contentIndex) {
      const indexes = Array.isArray(manifest.content_indexes) ? manifest.content_indexes : [];
      manifest.content_indexes = [
        ...indexes.filter((index) => String(index && index.site_id ? index.site_id : '') !== siteKey),
        contentIndex
      ];

      if (Array.isArray(manifest.sites)) {
        manifest.sites = manifest.sites.map((site) => {
          if (String(site && site.site_id ? site.site_id : '') !== siteKey) {
            return site;
          }

          return Object.assign({}, site, { content_index: contentIndex });
        });
      }
    }

    if (Array.isArray(contracts.pages)) {
      contracts.pages = [
        ...contracts.pages.filter((page) => itemSiteId(page) !== siteKey),
        ...contractPages.map((page) => Object.assign({ site_id: siteKey, runtime_source: 'cloudflare_runtime' }, page || {}))
      ];
    }

    return true;
  }

  function rerenderSiteScopedContent() {
    renderAdminMetrics(adminState.manifest || {});
    setSectionCounts(adminState.manifest || {}, adminState.actionContracts || {});
    renderPages(scopedPagesList((adminState.manifest || {}).pages || []));

    if (!adminState.actionContracts) {
      return;
    }

    fillEditorialPageSelects(adminState.actionContracts);
    fillProductCardPageSelect(adminState.actionContracts);
    refreshPageSelect(adminState.actionContracts);
    renderWorkflowPages(adminState.actionContracts);
    renderEditorialMatrix(adminState.actionContracts);
    renderEditorialLinking(adminState.actionContracts);
    setEditorialOutput(currentEditorialPayload(adminState.actionContracts));
    renderProductCardMatrix(adminState.actionContracts);
    renderProductCardFieldInputs(adminState.actionContracts);
    setProductCardOutput(currentProductCardPayload(adminState.actionContracts));
  }

  async function refreshRuntimeContentIndexForActiveSite(options) {
    const opts = options || {};
    const profile = activeSiteProfile();
    const siteId = profile && profile.site_id ? String(profile.site_id) : '';

    if (!siteId || !runtimeContentIndexRequired(profile)) {
      return null;
    }

    const requestSeq = adminState.runtimeContentIndexRequestSeq + 1;
    adminState.runtimeContentIndexRequestSeq = requestSeq;
    adminState.runtimeContentIndexLoadingBySite[siteId] = true;
    renderPages(scopedPagesList((adminState.manifest || {}).pages || []));

    const payload = await cloudflareRuntimeContentIndex(siteId);

    if (requestSeq !== adminState.runtimeContentIndexRequestSeq || siteId !== adminState.activeSiteId) {
      adminState.runtimeContentIndexLoadingBySite[siteId] = false;
      return payload;
    }

    adminState.runtimeContentIndexLoadingBySite[siteId] = false;

    if (payload && payload.ok) {
      mergeRuntimeContentIndex(siteId, payload);
      rerenderSiteScopedContent();
      setRuntimeIndexStatus(runtimeContentIndexSummary(payload), runtimeContentIndexHasBaseline(payload) ? 'ready' : 'blocked');
    } else if (!opts.silent) {
      setRuntimeIndexStatus('Runtime content-index не загружен. Проверьте Worker/API для выбранного сайта.', 'error');
      renderPages(scopedPagesList((adminState.manifest || {}).pages || []));
    } else if (payload && payload.ok === false) {
      setRuntimeIndexStatus('Runtime content-index не загружен для выбранного сайта.', 'error');
    }

    return payload;
  }

  function cloudflareContentPackageSummary(payload, targetPath, packageType) {
    const fields = payload && payload.fields ? payload.fields : {};

    return {
      package_type: packageType || 'editorial',
      mode: payload && payload.mode ? payload.mode : '',
      content_type: payload && payload.content_type ? payload.content_type : '',
      slug: payload && payload.slug ? payload.slug : '',
      route: payload && payload.route ? payload.route : '',
      target_path: targetPath || '',
      title: fields.title || fields.author_name || '',
      active_site_id: adminState.activeSiteId
    };
  }

  function pageContractByResource(contracts, resource) {
    return contracts && Array.isArray(contracts.pages)
      ? contracts.pages.find((page) => page && page.resource === resource) || null
      : null;
  }

  async function cloudflareSaveEditorialPackage(payload, contracts, packageType) {
    const profile = activeSiteProfile();
    const siteId = cloudflareSiteIdFromProfile(profile || {});
    const targetPath = pageTargetPathForPayload(payload, contracts);
    const validation = clientValidateEditorialPayload(payload, contracts);

    if (!siteId) {
      return { ok: false, issues: ['site_context_required'] };
    }

    if (!validation.ok) {
      return validation;
    }

    let page = null;

    if (payload.mode === 'edit') {
      const existing = pageContractByResource(contracts, targetPath);
      const existingPayload = editorialPageData(existing);
      page = existingPayload && typeof existingPayload === 'object'
        ? JSON.parse(JSON.stringify(existingPayload))
        : null;

      if (!page) {
        return {
          ok: false,
          action: 'cloudflare_editorial_package',
          issues: ['Existing page payload is not available in admin manifest. Rebuild admin bootstrap before editing this page.']
        };
      }

      applyFieldsToPage(page, payload);
    } else {
      page = generatedPageFromPayload(payload, contracts);
    }

    const requestIdValue = requestId('req-cf-editorial');
    const packagePayload = {
      request_id: requestIdValue,
      site_id: siteId,
      package_type: packageType || 'editorial',
      summary: cloudflareContentPackageSummary(payload, targetPath, packageType),
      target_path: targetPath,
      payload,
      page
    };
    const stored = await cloudflareStoreContentPackage(siteId, packagePayload, packageType || 'editorial');

    if (!stored.ok) {
      return stored;
    }

    const preview = await cloudflareCreatePreview(siteId, {
      request_id: requestIdValue,
      package_r2_key: stored.r2_key || stored.storage_key || '',
      summary: packagePayload.summary
    });

    if (!preview.ok) {
      return preview;
    }

    const approved = window.prompt(
      'Cloudflare preview создан. Для публикации вставьте approval token из ответа. Отмена сохранит пакет как preview без публикации.',
      preview.preview_token || ''
    );

    if (!approved) {
      const result = Object.assign({}, preview, {
        ok: true,
        status: 'preview_ready',
        package: stored,
        target_path: targetPath,
        warnings: ['Пакет сохранен в Cloudflare runtime; публикация ждет approval token. GitHub Actions не запускались.']
      });

      refreshReleaseStatusForActiveSite({ silent: true });
      return result;
    }

    const published = await cloudflarePublish(siteId, {
      request_id: requestIdValue,
      approval_token: approved,
      target_path: targetPath,
      package_storage_key: stored.storage_key || stored.r2_key || ''
    });

    let sourceSave = null;

    if (published.ok) {
      const current = await githubReadTextFile(targetPath);
      sourceSave = await githubSaveJsonFile(
        targetPath,
        page,
        'Persist Cloudflare runtime source: ' + targetPath,
        current.ok ? current.sha : ''
      );
    }

    const result = Object.assign({}, published, {
      ok: published.ok && (!sourceSave || sourceSave.ok),
      package: stored,
      preview,
      source_save: sourceSave,
      target_path: targetPath
    });

    if (result.ok) {
      refreshReleaseStatusForActiveSite({ silent: true });
      refreshRuntimeContentIndexForActiveSite({ silent: true });
    }

    return result;
  }

  async function cloudflareArchivePagePackage(relativePath) {
    const profile = activeSiteProfile();
    const siteId = cloudflareSiteIdFromProfile(profile || {});

    if (!siteId) {
      return { ok: false, issues: ['site_context_required'] };
    }

    if (!isSafeContentPagePath(relativePath)) {
      return { ok: false, issues: ['Archive target must be a safe content/pages/*.json path.'] };
    }

    const requestIdValue = requestId('req-cf-archive');
    const packagePayload = {
      request_id: requestIdValue,
      site_id: siteId,
      package_type: 'archive',
      summary: {
        target_path: relativePath,
        mode: 'archive',
        active_site_id: adminState.activeSiteId
      },
      target_path: relativePath,
      archive: {
        status: 'archived',
        robots: 'noindex,nofollow'
      }
    };
    const stored = await cloudflareStoreContentPackage(siteId, packagePayload, 'archive');

    if (!stored.ok) {
      return stored;
    }

    const preview = await cloudflareCreatePreview(siteId, {
      request_id: requestIdValue,
      package_r2_key: stored.r2_key || stored.storage_key || '',
      summary: packagePayload.summary
    });

    if (!preview.ok) {
      return preview;
    }

    const approved = window.prompt(
      'Cloudflare preview удаления создан. Для архивации вставьте approval token из ответа.',
      preview.preview_token || ''
    );

    if (!approved) {
      const result = Object.assign({}, preview, {
        ok: true,
        status: 'preview_ready',
        package: stored,
        warnings: ['Архивация остановлена до approval token. GitHub Actions не запускались.']
      });

      refreshReleaseStatusForActiveSite({ silent: true });
      return result;
    }

    const published = await cloudflarePublish(siteId, {
      request_id: requestIdValue,
      approval_token: approved,
      target_path: relativePath,
      package_storage_key: stored.storage_key || stored.r2_key || ''
    });

    let sourceSave = null;

    if (published.ok) {
      const current = await githubReadTextFile(relativePath);
      if (current.ok && current.content) {
        try {
          const page = JSON.parse(current.content);
          page.status = 'archived';
          page.seo = page.seo && typeof page.seo === 'object' ? page.seo : {};
          page.seo.robots = 'noindex,nofollow';
          sourceSave = await githubSaveJsonFile(
            relativePath,
            page,
            'Persist Cloudflare archive source: ' + relativePath,
            current.sha || ''
          );
        } catch (error) {
          sourceSave = {
            ok: false,
            issues: ['Existing page JSON could not be parsed for archive source save.']
          };
        }
      } else {
        sourceSave = {
          ok: false,
          issues: ['Existing page JSON could not be read for archive source save.']
        };
      }
    }

    const result = Object.assign({}, published, {
      ok: published.ok && (!sourceSave || sourceSave.ok),
      package: stored,
      preview,
      source_save: sourceSave
    });

    if (result.ok) {
      refreshReleaseStatusForActiveSite({ silent: true });
      refreshRuntimeContentIndexForActiveSite({ silent: true });
    }

    return result;
  }

  async function cloudflareUploadMediaFile(file, contentType, alt, area) {
    const profile = activeSiteProfile();
    const siteId = cloudflareSiteIdFromProfile(profile || {});
    const allowed = ['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml'];

    if (!siteId) {
      return { ok: false, issues: ['site_context_required'] };
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

    const filename = safeMediaFilename(file, area || contentType || 'media');
    const result = await cloudflareApiRequest('/api/sites/' + encodeURIComponent(siteId) + '/media', {
      method: 'POST',
      body: JSON.stringify({
        site_id: siteId,
        filename,
        content_type: file.type,
        contents_base64: await fileToBase64(file),
        alt: alt || ''
      })
    });

    if (result.ok) {
      const path = result.public_path || (result.r2_key ? '/assets/media/cloudflare/' + filename : '');
      result.data = {
        media: {
          path,
          alt: alt || '',
          storage: result.storage || '',
          storage_key: result.storage_key || result.r2_key || '',
          digest: result.digest || ''
        }
      };
    }

    return result;
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
      setGithubRateLimit('Act n/a · CF Workers 100k/day', false);
      return;
    }

    try {
      const { response, payload } = await fetchGithubJson('/rate_limit');

      if (!response.ok || !payload || !payload.resources) {
        setGithubRateLimit('Act n/a · CF Workers 100k/day', true);
        return;
      }

      const actionsLabel = await loadGithubActionsUsage();
      const parts = [
        actionsLabel,
        'CF Workers 100k/day'
      ];

      setGithubRateLimit(parts.join(' · '), true);
    } catch (error) {
      setGithubRateLimit('Act n/a · CF Workers 100k/day', true);
    }
  }

  const editableRoleCapabilities = ['write', 'publish', 'config', 'media', 'archive', 'site_rebrand', 'deploy'];

  function roleDefaultCapabilities(role) {
    if (role === 'admin') {
      return { read: true, write: true, publish: true, config: true, media: true, archive: true, site_rebrand: true, deploy: true, roles: true };
    }

    if (role === 'editor') {
      return { read: true, write: true, publish: true, config: true, media: true, archive: true, site_rebrand: true, deploy: true, roles: true };
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
      capabilities.roles = true;
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

    if (!normalized) {
      return null;
    }

    return profiles.find((profile) => String(profile.site_id || '') === normalized) || null;
  }

  function activeSiteProfile() {
    return siteProfileById(adminState.activeSiteId);
  }

  function activeSiteKey() {
    const profile = activeSiteProfile();

    return profile ? String(profile.site_id || '') : '';
  }

  function manifestContentSiteId() {
    const manifest = adminState.manifest || {};
    const contentSite = manifest.content_site && typeof manifest.content_site === 'object'
      ? manifest.content_site
      : {};

    return String(contentSite.site_id || manifest.current_site_id || '').trim();
  }

  function itemSiteId(item) {
    if (!item || typeof item !== 'object') {
      return '';
    }

    return String(item.site_id || item.active_site_id || item.profile_id || '').trim();
  }

  function belongsToActiveSite(item) {
    const selected = activeSiteKey();

    if (!selected) {
      return false;
    }

    const explicit = itemSiteId(item);

    if (explicit) {
      return explicit === selected;
    }

    const contentSiteId = manifestContentSiteId();

    return contentSiteId ? contentSiteId === selected : true;
  }

  function scopedPagesList(pages) {
    return Array.isArray(pages) ? pages.filter((page) => belongsToActiveSite(page)) : [];
  }

  function scopedContracts(contracts) {
    if (!contracts || typeof contracts !== 'object') {
      return contracts;
    }

    return Object.assign({}, contracts, {
      pages: scopedPagesList(contracts.pages)
    });
  }

  function activeSiteLabel() {
    const profile = activeSiteProfile();

    return profile ? siteProfileOptionLabel(profile) : 'сайт не выбран';
  }

  function siteContextError() {
    return {
      ok: false,
      action: 'site_context_required',
      issues: ['Сначала выберите домен в блоке "Рабочий сценарий CMS". После этого редактура, публикация, MedGen, дизайн и deploy будут работать относительно выбранного сайта.']
    };
  }

  function focusActiveSiteSelector() {
    const select = document.querySelector('[data-active-site-select]');
    const panel = byId('admin-site-workflow');

    if (panel && panel.tagName.toLowerCase() === 'details') {
      panel.open = true;
    }

    if (select) {
      select.focus();
      select.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function requireActiveSiteContext(statusSetter, outputSetter) {
    const profile = activeSiteProfile();

    if (profile) {
      return profile;
    }

    const result = siteContextError();

    if (typeof outputSetter === 'function') {
      outputSetter(result);
    }

    if (typeof statusSetter === 'function') {
      statusSetter('Сначала выберите домен для работы.');
    }

    focusActiveSiteSelector();

    return null;
  }

  function siteRouteNamespace(profile, type) {
    const routes = profile && profile.route_namespaces && typeof profile.route_namespaces === 'object'
      ? profile.route_namespaces
      : {};

    return String(routes[type] || '');
  }

  function profileDeployLabel(profile) {
    const deploy = deployProfile(profile);
    const provider = hostingProvider(profile);
    const environment = String(deploy.environment || cloudflareSiteIdFromProfile(profile) || 'production');
    const cloudflare = deploy && deploy.cloudflare && typeof deploy.cloudflare === 'object'
      ? deploy.cloudflare
      : {};

    if (provider === 'cloudflare_pages') {
      return provider + ' / ' + (cloudflare.pages_project || environment);
    }

    return provider + ' / ' + environment;
  }

  function releaseProfile(profile) {
    return profile && profile.release && typeof profile.release === 'object'
      ? profile.release
      : {};
  }

  function releaseStatusLabel(profile) {
    const release = releaseProfile(profile);

    return String(release.last_deploy_status || profile.status || 'draft');
  }

  function releaseHistoryLabel(profile) {
    const history = Array.isArray(releaseProfile(profile).status_history)
      ? releaseProfile(profile).status_history
      : [];
    const entry = history[0] && typeof history[0] === 'object' ? history[0] : null;

    if (!entry) {
      return 'history pending';
    }

    return String(entry.operation || 'site_update') + ' · ' + String(entry.at || '');
  }

  function firstWorkflowLink(profile) {
    const release = releaseProfile(profile);
    const links = Array.isArray(release.workflow_links) ? release.workflow_links : [];
    const first = links.find((link) => link && typeof link === 'object' && link.url);
    const fallback = release.last_workflow_run_url
      ? { label: 'Workflow', url: release.last_workflow_run_url }
      : null;

    const link = first || fallback;
    const url = link ? safeHttpHref(link.url) : '';

    return url ? { label: link.label || 'Workflow', url } : null;
  }

  function safeHttpHref(value) {
    try {
      const url = new URL(String(value || ''), window.location.href);

      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  function deployProfile(profile) {
    return profile && profile.deploy_profile && typeof profile.deploy_profile === 'object'
      ? profile.deploy_profile
      : {};
  }

  function hostingProvider(profile) {
    const provider = String(deployProfile(profile).provider || 'cloudflare_pages');

    return provider === 'cloudflare_pages' ? 'cloudflare_pages' : 'static_vps';
  }

  function hostingModeLabel(profile) {
    return hostingProvider(profile) === 'cloudflare_pages'
      ? 'Cloudflare Pages / Worker'
      : 'VPS / SSH static';
  }

  function sshMirrorConfig(profile) {
    const deploy = deployProfile(profile);
    const mirror = deploy.vps_mirror && typeof deploy.vps_mirror === 'object' ? deploy.vps_mirror : {};
    const secretRefs = deploy.secret_refs && typeof deploy.secret_refs === 'object' ? deploy.secret_refs : {};
    const deployTarget = profile && profile.deploy_target && typeof profile.deploy_target === 'object' ? profile.deploy_target : {};
    const publicRoot = String(mirror.public_root || deploy.public_root || deployTarget.root_path || '').trim();
    const hasSecretRefs = Boolean(secretRefs.ssh_host && secretRefs.ssh_user && secretRefs.ssh_private_key && secretRefs.deploy_root);
    const enabled = mirror.enabled === true && hasSecretRefs;

    return {
      enabled,
      mode: String(mirror.mode || 'static_copy_only'),
      public_root: publicRoot,
      environment: String(deploy.environment || cloudflareSiteIdFromProfile(profile) || 'production').trim() || 'production',
      secret_refs: secretRefs,
      note: String(mirror.note || 'Cloudflare Pages остается основным хостингом; VPS получает только статический дубликат.')
    };
  }

  function sshMirrorAvailable(profile) {
    return Boolean(profile && hostingProvider(profile) === 'cloudflare_pages' && sshMirrorConfig(profile).enabled);
  }

  function defaultDeploySecretRefs() {
    return {
      ssh_host: 'DEPLOY_HOST',
      ssh_port: 'DEPLOY_PORT',
      ssh_user: 'DEPLOY_USER',
      ssh_private_key: 'DEPLOY_SSH_KEY',
      deploy_root: 'DEPLOY_PATH',
      tls_email: 'DEPLOY_TLS_EMAIL',
      cloudflare_account_id: 'CLOUDFLARE_ACCOUNT_ID',
      cloudflare_api_token: 'CLOUDFLARE_API_TOKEN'
    };
  }

  function sshMirrorToggleHtml(attributeName) {
    const available = sshMirrorAvailable(activeSiteProfile());
    const title = available
      ? 'Если отмечено, после Cloudflare Pages deploy будет запущен отдельный SSH mirror workflow. Домен все равно остается на Cloudflare.'
      : 'SSH mirror недоступен: в выбранном site profile нет сохраненного SSH target/secret_refs.';
    const attr = attributeName || 'data-ssh-mirror-deploy';

    return '<label class="ssh-mirror-toggle" aria-disabled="' + (available ? 'false' : 'true') + '" title="' + escapeHtml(title) + '">'
      + '<input type="checkbox" ' + attr + ' ' + (available ? '' : 'disabled') + '> Deploy SSH'
      + '</label>';
  }

  function syncSshMirrorToggles() {
    const available = sshMirrorAvailable(activeSiteProfile());
    const title = available
      ? 'Если отмечено, после Cloudflare Pages deploy будет запущен отдельный SSH mirror workflow. Домен все равно остается на Cloudflare.'
      : 'SSH mirror недоступен: в выбранном site profile нет сохраненного SSH target/secret_refs.';

    document.querySelectorAll('[data-ssh-mirror-deploy], [data-medgen-ssh-mirror-deploy]').forEach((control) => {
      if (!(control instanceof HTMLInputElement)) {
        return;
      }

      control.disabled = !available;
      if (!available) {
        control.checked = false;
      }

      const label = control.closest('.ssh-mirror-toggle');
      if (label) {
        label.setAttribute('aria-disabled', available ? 'false' : 'true');
        label.setAttribute('title', title);
      }
    });
  }

  function sshMirrorRequested(selector) {
    const control = document.querySelector(selector);

    return control instanceof HTMLInputElement && !control.disabled && control.checked;
  }

  function sshMirrorPayload(requested, source) {
    const mirror = sshMirrorConfig(activeSiteProfile());

    return {
      requested: requested === true,
      mode: mirror.mode,
      public_root: mirror.public_root,
      environment: mirror.environment,
      source: String(source || 'admin_cloudflare_pages_deploy'),
      secret_refs: mirror.secret_refs,
      note: mirror.note
    };
  }

  async function requestSshMirrorDeployForActiveSite(source) {
    const profile = activeSiteProfile();
    const config = readGithubConfig();
    const mirror = sshMirrorConfig(profile);

    if (!sshMirrorAvailable(profile)) {
      return { ok: false, issues: ['ssh_mirror_not_configured'] };
    }

    if (!githubToken()) {
      return { ok: false, issues: ['github_token_required_for_ssh_mirror'] };
    }

    return githubDispatchWorkflow(config.deploy_workflow_id || 'deploy.yml', {
      target: mirror.environment || 'production',
      verification_mode: 'content_fast'
    }, config.deploy_actions_url || '');
  }

  function syncActiveHostingActions(profile) {
    const provider = profile ? hostingProvider(profile) : '';

    document.body.dataset.hostingProvider = provider || 'none';
    document.querySelectorAll('[data-hosting-provider-action]').forEach((control) => {
      if (!(control instanceof HTMLButtonElement || control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) {
        return;
      }

      const expected = control.getAttribute('data-hosting-provider-action') || '';
      const allowed = expected.split(/\s+/).filter(Boolean);
      const disabled = Boolean(profile) && allowed.length > 0 && !allowed.includes(provider);
      control.disabled = disabled;
      control.title = disabled
        ? 'Недоступно для выбранной среды: активный сайт работает в ' + hostingModeLabel(profile) + '.'
        : '';

      if (disabled && control instanceof HTMLInputElement && control.type === 'checkbox') {
        control.checked = false;
      }
    });
  }

  function syncProviderPanels(selector, provider) {
    document.querySelectorAll(selector).forEach((panel) => {
      const expected = panel.getAttribute(selector.slice(1, -1)) || '';
      const active = expected.split(/\s+/).filter(Boolean).includes(provider);

      panel.hidden = !active;
      panel.querySelectorAll('input, select, textarea, button').forEach((control) => {
        if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement || control instanceof HTMLButtonElement) {
          control.disabled = !active;
        }
      });
    });
  }

  function syncSiteFleetHostingFields() {
    const field = document.querySelector('[data-site-fleet-deploy-field="provider"]');
    const provider = field && field.value === 'static_vps' ? 'static_vps' : 'cloudflare_pages';

    syncProviderPanels('[data-site-fleet-hosting-panel]', provider);
  }

  function syncDomainHostingFields() {
    const field = document.querySelector('[data-domain-hosting-provider-select]');
    const provider = field && field.value === 'static_vps' ? 'static_vps' : 'cloudflare_pages';

    syncProviderPanels('[data-domain-hosting-panel]', provider);
  }

  function syncSiteScopedDefaults(profile) {
    if (!profile) {
      return;
    }

    const domain = String(profile.domain || '').trim();
    const baseUrl = String(profile.base_url || (domain ? 'https://' + domain : '')).trim();
    const contactEmail = String(profile.contact_email || contactEmailFromDomain(domain)).trim();
    const locale = String(profile.root_locale || '').trim();
    const title = String(profile.display_name || domain || '').trim();

    [
      ['admin-medgen-site-domain', domain],
      ['admin-medgen-site-name', title],
      ['admin-medgen-contact-email', contactEmail],
      ['admin-medgen-locale', locale],
      ['admin-domain-name', domain],
      ['admin-domain-base-url', baseUrl],
      ['admin-domain-email', contactEmail],
      ['admin-deploy-tls-email', contactEmail],
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

  function githubEnvironmentForProfile(profile) {
    const deploy = deployProfile(profile);

    return String(deploy.environment || cloudflareSiteIdFromProfile(profile) || '').trim();
  }

  async function githubJsonRequest(path, method, body) {
    const options = {
      method: method || 'GET',
      headers: githubHeaders()
    };

    if (body !== undefined) {
      options.headers = Object.assign({}, options.headers, {
        'Content-Type': 'application/json'
      });
      options.body = JSON.stringify(body);
    }

    const response = await fetch(githubApiUrl(path), options);
    const payload = await readResponseJson(response);

    return { response, payload };
  }

  async function githubEnsureEnvironment(environmentName) {
    const repository = githubRepository();
    const environment = String(environmentName || '').trim();

    if (!repository) {
      return { ok: false, issues: ['github_repository_missing'] };
    }

    if (!githubToken()) {
      return { ok: false, issues: ['github_token_required'] };
    }

    if (!environment) {
      return { ok: false, issues: ['github_environment_required'] };
    }

    const { response, payload } = await githubJsonRequest(
      '/repos/' + repository + '/environments/' + encodeURIComponent(environment),
      'PUT',
      {}
    );

    if (!response.ok) {
      return {
        ok: false,
        http_status: response.status,
        issues: [payload && payload.message ? payload.message : 'GitHub Environment не создан.'],
        data: payload
      };
    }

    return { ok: true, environment, data: payload };
  }

  async function githubEnvironmentPublicKey(environmentName) {
    const repository = githubRepository();
    const environment = String(environmentName || '').trim();

    if (!repository || !environment) {
      return { ok: false, issues: ['github_environment_public_key_context_missing'] };
    }

    const { response, payload } = await githubJsonRequest(
      '/repos/' + repository + '/environments/' + encodeURIComponent(environment) + '/secrets/public-key',
      'GET'
    );

    if (!response.ok || !payload || !payload.key || !payload.key_id) {
      return {
        ok: false,
        http_status: response.status,
        issues: [payload && payload.message ? payload.message : 'GitHub Environment public key недоступен.'],
        data: payload
      };
    }

    return {
      ok: true,
      key: String(payload.key),
      key_id: String(payload.key_id)
    };
  }

  async function loadSodium() {
    const sodium = window.sodium;

    if (!sodium || !sodium.ready) {
      throw new Error('libsodium_not_loaded');
    }

    await sodium.ready;

    if (typeof sodium.crypto_box_seal !== 'function') {
      throw new Error('libsodium_crypto_box_seal_unavailable');
    }

    return sodium;
  }

  async function encryptGithubEnvironmentSecret(rawValue, publicKeyBase64) {
    const sodium = await loadSodium();
    const variant = sodium.base64_variants.ORIGINAL;
    const publicKey = sodium.from_base64(String(publicKeyBase64 || ''), variant);
    const message = sodium.from_string(String(rawValue || ''));
    const sealed = sodium.crypto_box_seal(message, publicKey);

    return sodium.to_base64(sealed, variant);
  }

  async function githubPutEnvironmentSecret(environmentName, secretName, encryptedValue, keyId) {
    const repository = githubRepository();
    const environment = String(environmentName || '').trim();
    const name = String(secretName || '').trim();

    if (!repository || !environment || !name) {
      return { ok: false, issues: ['github_environment_secret_context_missing'] };
    }

    if (!/^[A-Z0-9_]+$/.test(name)) {
      return { ok: false, issues: ['unsafe_secret_name: ' + name] };
    }

    const { response, payload } = await githubJsonRequest(
      '/repos/' + repository + '/environments/' + encodeURIComponent(environment) + '/secrets/' + encodeURIComponent(name),
      'PUT',
      {
        encrypted_value: encryptedValue,
        key_id: keyId
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        http_status: response.status,
        issues: [payload && payload.message ? payload.message : 'GitHub Environment secret не сохранен: ' + name],
        data: payload
      };
    }

    return { ok: true, name };
  }

  async function githubListEnvironmentSecretNames(environmentName) {
    const repository = githubRepository();
    const environment = String(environmentName || '').trim();

    if (!repository) {
      return { ok: false, issues: ['github_repository_missing'] };
    }

    if (!githubToken()) {
      return { ok: false, issues: ['github_token_required'] };
    }

    if (!environment) {
      return { ok: false, issues: ['github_environment_required'] };
    }

    try {
      const { response, payload } = await fetchGithubJson('/repos/' + repository + '/environments/' + encodeURIComponent(environment) + '/secrets?per_page=100');

      if (!response.ok) {
        return {
          ok: false,
          http_status: response.status,
          issues: [payload && payload.message ? payload.message : 'GitHub Environment secrets недоступны.'],
          data: payload
        };
      }

      return {
        ok: true,
        environment,
        names: Array.isArray(payload && payload.secrets)
          ? payload.secrets.map((item) => String(item && item.name ? item.name : '').trim()).filter(Boolean)
          : [],
        data: payload
      };
    } catch (error) {
      return {
        ok: false,
        issues: ['github_environment_secret_check_failed: ' + (error && error.message ? error.message : 'network error')]
      };
    }
  }

  function uniqueNonEmpty(values) {
    return Array.from(new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)));
  }

  function expectedEnvironmentSecretRefs(profile) {
    const deploy = deployProfile(profile);
    const refs = Object.assign(defaultDeploySecretRefs(), deploy.secret_refs && typeof deploy.secret_refs === 'object' ? deploy.secret_refs : {});
    const provider = hostingProvider(profile);
    const mirror = deploy.vps_mirror && typeof deploy.vps_mirror === 'object' ? deploy.vps_mirror : {};
    const mirrorRoot = String(mirror.public_root || deploy.public_root || '').trim();
    const wantsSsh = provider === 'static_vps' || (mirror.enabled === true && mirrorRoot !== '');
    const cfRefs = provider === 'cloudflare_pages'
      ? uniqueNonEmpty([refs.cloudflare_account_id, refs.cloudflare_api_token])
      : [];
    const sshRefs = wantsSsh
      ? uniqueNonEmpty([refs.ssh_host, refs.ssh_port, refs.ssh_user, refs.ssh_private_key, refs.deploy_root])
      : [];

    return {
      cloudflare: cfRefs,
      ssh: sshRefs,
      wants_ssh: wantsSsh
    };
  }

  function environmentReadinessSummary(profile, availableNames) {
    const expected = expectedEnvironmentSecretRefs(profile);
    const available = new Set((availableNames || []).map((name) => String(name || '').trim()).filter(Boolean));
    const missingCf = expected.cloudflare.filter((name) => !available.has(name));
    const missingSsh = expected.ssh.filter((name) => !available.has(name));
    const parts = [];

    if (expected.cloudflare.length) {
      parts.push(missingCf.length ? 'CF не хватает: ' + missingCf.join(', ') : 'CF готов');
    }

    if (expected.wants_ssh) {
      parts.push(missingSsh.length ? 'SSH mirror не хватает: ' + missingSsh.join(', ') : 'SSH mirror готов');
    } else {
      parts.push('SSH mirror выключен');
    }

    return {
      ok: missingCf.length === 0 && missingSsh.length === 0,
      missing_cloudflare: missingCf,
      missing_ssh: missingSsh,
      message: parts.join(' · ')
    };
  }

  function setSiteFleetSecretStatus(message) {
    const status = document.querySelector('[data-site-fleet-secret-status]');

    if (status) {
      status.value = String(message || '');
      status.textContent = String(message || '');
    }
  }

  function setSiteFleetSecretSaveStatus(message) {
    const status = document.querySelector('[data-site-fleet-secret-save-status]');

    if (status) {
      status.value = String(message || '');
      status.textContent = String(message || '');
    }
  }

  function secretRefsForProfile(profile) {
    const deploy = deployProfile(profile);

    return Object.assign(
      defaultDeploySecretRefs(),
      deploy.secret_refs && typeof deploy.secret_refs === 'object' ? deploy.secret_refs : {}
    );
  }

  function collectSiteFleetEnvironmentSecretValues(profile) {
    const refs = secretRefsForProfile(profile);
    const collected = {};

    document.querySelectorAll('[data-site-fleet-secret-value], [data-site-fleet-secret-name]').forEach((field) => {
      if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLTextAreaElement)) {
        return;
      }

      const raw = field.value;
      const trimmed = String(raw || '').trim();

      if (!trimmed) {
        return;
      }

      const refKey = field.getAttribute('data-site-fleet-secret-value') || '';
      const explicitName = field.getAttribute('data-site-fleet-secret-name') || '';
      const secretName = explicitName || refs[refKey] || '';

      if (secretName) {
        collected[String(secretName).trim()] = refKey === 'ssh_private_key' ? raw : trimmed;
      }
    });

    const hasSshValue = ['DEPLOY_HOST', 'DEPLOY_USER', 'DEPLOY_PATH', 'DEPLOY_SSH_KEY'].some((name) => {
      return Object.prototype.hasOwnProperty.call(collected, name);
    });

    if (hasSshValue && !Object.prototype.hasOwnProperty.call(collected, refs.ssh_port || 'DEPLOY_PORT')) {
      collected[refs.ssh_port || 'DEPLOY_PORT'] = '22';
    }

    return collected;
  }

  function clearSiteFleetEnvironmentSecretValues(secretNames, secretRefs) {
    const names = new Set((secretNames || []).map((name) => String(name || '').trim()).filter(Boolean));
    const refs = secretRefs && typeof secretRefs === 'object'
      ? secretRefs
      : secretRefsForProfile(collectSiteFleetPayload('upsert_site').profile);

    document.querySelectorAll('[data-site-fleet-secret-value], [data-site-fleet-secret-name]').forEach((field) => {
      if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLTextAreaElement)) {
        return;
      }

      const explicitName = field.getAttribute('data-site-fleet-secret-name') || '';
      const refKey = field.getAttribute('data-site-fleet-secret-value') || '';
      const secretName = explicitName || refs[refKey] || '';

      if (!names.size || names.has(secretName)) {
        field.value = '';
      }
    });
  }

  async function saveEnvironmentSecretsForProfile(profile, options) {
    const currentOptions = options && typeof options === 'object' ? options : {};
    const environment = githubEnvironmentForProfile(profile);
    const refs = secretRefsForProfile(profile);
    const values = collectSiteFleetEnvironmentSecretValues(profile);
    const names = Object.keys(values).filter(Boolean);

    if (!names.length) {
      return { ok: true, skipped: true, written_names: [] };
    }

    if (!githubToken()) {
      return { ok: false, issues: ['github_token_required'] };
    }

    if (!environment) {
      return { ok: false, issues: ['github_environment_required'] };
    }

    if (!currentOptions.skipConfirm && !window.confirm('Создать GitHub Environment "' + environment + '" и записать ' + names.length + ' encrypted secrets? Значения будут очищены из формы после записи.')) {
      return { ok: false, cancelled: true, issues: ['operation_cancelled'] };
    }

    setSiteFleetSecretSaveStatus('Создаю GitHub Environment ' + environment + '...');

    const ensureResult = await githubEnsureEnvironment(environment);

    if (!ensureResult.ok) {
      return ensureResult;
    }

    setSiteFleetSecretSaveStatus('Получаю public key GitHub Environment...');

    const publicKey = await githubEnvironmentPublicKey(environment);

    if (!publicKey.ok) {
      return publicKey;
    }

    const written = [];
    const issues = [];

    for (const name of names) {
      setSiteFleetSecretSaveStatus('Шифрую и сохраняю secret ' + name + '...');

      try {
        const encrypted = await encryptGithubEnvironmentSecret(values[name], publicKey.key);
        const result = await githubPutEnvironmentSecret(environment, name, encrypted, publicKey.key_id);

        if (result.ok) {
          written.push(name);
        } else {
          issues.push(...(result.issues || ['secret_save_failed: ' + name]));
        }
      } catch (error) {
        issues.push('secret_save_failed: ' + name + ': ' + (error && error.message ? error.message : 'encryption error'));
      }
    }

    if (written.length) {
      clearSiteFleetEnvironmentSecretValues(written, refs);
    }

    return {
      ok: issues.length === 0,
      action: 'github_environment_secrets_save',
      environment,
      written_names: written,
      issues
    };
  }

  async function saveActiveSiteEnvironmentSecrets() {
    const collected = collectSiteFleetPayload('upsert_site');
    const profile = collected.profile && typeof collected.profile === 'object'
      ? Object.assign({}, collected.profile, { site_id: cloudflareSiteIdFromProfile(collected.profile) || collected.site_id || activeSiteKey() })
      : activeSiteProfile();

    if (!profile) {
      setSiteFleetSecretSaveStatus('Сначала выберите или заполните профиль сайта.');
      return;
    }

    setStatusBusy('admin-site-fleet-secret-save-status', true);

    try {
      const result = await saveEnvironmentSecretsForProfile(profile, { skipConfirm: false });

      if (result.cancelled) {
        setSiteFleetSecretSaveStatus('Операция отменена.');
        return;
      }

      if (!result.ok) {
        setSiteFleetSecretSaveStatus('Environment secrets не сохранены: ' + (result.issues || ['unknown error']).join('; '));
        return;
      }

      setSiteFleetSecretSaveStatus(result.skipped
        ? 'Нет заполненных значений для записи.'
        : 'Environment ' + result.environment + ': сохранено refs ' + result.written_names.join(', ') + '. Значения очищены из формы.');
      await checkActiveSiteEnvironmentSecrets();
    } finally {
      setStatusBusy('admin-site-fleet-secret-save-status', false);
    }
  }

  function clearActiveSiteEnvironmentSecretValues() {
    clearSiteFleetEnvironmentSecretValues([]);
    setSiteFleetSecretSaveStatus('Введенные значения очищены из формы. GitHub Environment secrets не изменялись.');
  }

  async function checkActiveSiteEnvironmentSecrets() {
    const profile = activeSiteProfile();

    if (!profile) {
      setSiteFleetSecretStatus('Сначала выберите профиль сайта.');
      return;
    }

    const environment = githubEnvironmentForProfile(profile);

    setSiteFleetSecretStatus('Проверяю GitHub Environment ' + (environment || '-') + '...');

    const result = await githubListEnvironmentSecretNames(environment);

    if (!result.ok) {
      setSiteFleetSecretStatus('Environment ' + (environment || '-') + ': ' + (result.issues || ['проверка не удалась']).join('; '));
      return;
    }

    const readiness = environmentReadinessSummary(profile, result.names || []);

    setSiteFleetSecretStatus('Environment ' + environment + ': ' + readiness.message + '. Найдено refs: ' + (result.names || []).length + '.');
  }

  function setActiveSite(siteId) {
    const profile = siteProfileById(siteId);
    const previous = adminState.activeSiteId;

    adminState.activeSiteId = profile ? String(profile.site_id || '') : '';
    writeStoredActiveSite(adminState.activeSiteId);
    syncSiteScopedDefaults(profile);
    renderSiteWorkflow(adminState.manifest || {});
    renderSiteFleet(adminState.manifest || {});
    renderAdminMetrics(adminState.manifest || {});
    setSectionCounts(adminState.manifest || {}, adminState.actionContracts || {});

    if (previous !== adminState.activeSiteId) {
      resetEditorialWidgetState();
      productCardState.visibleFields = [];
      productCardState.editFieldValues = {};
      productCardState.editMedia = {};
      productCardState.media = {};
      productCardState.lastQueuePayload = null;
    }

    renderPages(scopedPagesList((adminState.manifest || {}).pages || []));

    if (adminState.actionContracts) {
      fillEditorialPageSelects(adminState.actionContracts);
      fillProductCardPageSelect(adminState.actionContracts);
      refreshPageSelect(adminState.actionContracts);
      renderWorkflowPages(adminState.actionContracts);
      renderEditorialMatrix(adminState.actionContracts);
      renderEditorialLinking(adminState.actionContracts);
      setEditorialOutput(currentEditorialPayload(adminState.actionContracts));
      renderProductCardMatrix(adminState.actionContracts);
      renderProductCardFieldInputs(adminState.actionContracts);
      setProductCardOutput(currentProductCardPayload(adminState.actionContracts));
    }

    refreshRuntimeContentIndexForActiveSite({ silent: true });
    refreshMedGenTaskIndexForActiveSite({ force: true });
  }

  function isSiteContextControlExempt(control) {
    return Boolean(
      control.closest('[data-site-context-exempt]')
      || control.closest('[data-site-workflow-panel]')
      || control.matches('[data-active-site-select]')
    );
  }

  function setSiteContextActionState(panel, locked) {
    panel.querySelectorAll(siteContextControlSelector).forEach((control) => {
      if (isSiteContextControlExempt(control)) {
        return;
      }

      if (locked) {
        if (!control.disabled) {
          control.dataset.siteContextDisabled = 'true';
        }
        control.disabled = true;
        return;
      }

      if (control.dataset.siteContextDisabled === 'true') {
        control.disabled = false;
        delete control.dataset.siteContextDisabled;
      }
    });
  }

  function ensureSiteContextNotice(panel, message) {
    let notice = panel.querySelector('[data-site-context-lock]');

    if (!notice) {
      notice = document.createElement('p');
      notice.className = 'site-context-lock';
      notice.setAttribute('data-site-context-lock', '');
      notice.setAttribute('role', 'note');

      const summary = panel.querySelector('summary');
      panel.insertBefore(notice, summary && summary.nextSibling ? summary.nextSibling : panel.firstChild);
    }

    notice.textContent = message;
    notice.hidden = false;
  }

  function syncSiteContextGate(profile, profiles) {
    const locked = !profile;
    const message = profiles && profiles.length > 0
      ? 'Сначала выберите домен в первом блоке. Этот раздел начнет работать только после выбора активного сайта.'
      : 'Сначала создайте профиль сайта. Без домена этот раздел не может менять контент, дизайн или deploy.';

    document.body.dataset.activeSiteId = profile ? String(profile.site_id || '') : '';
    document.body.dataset.siteContext = locked ? 'missing' : 'ready';

    siteContextRequiredPanels.forEach((name) => {
      const panel = document.querySelector('[data-section-panel="' + name + '"]');

      if (!panel) {
        return;
      }

      panel.dataset.siteContext = locked ? 'missing' : 'ready';
      panel.setAttribute('aria-disabled', locked ? 'true' : 'false');
      setSiteContextActionState(panel, locked);

      const notice = panel.querySelector('[data-site-context-lock]');
      if (locked) {
        ensureSiteContextNotice(panel, message);
      } else if (notice) {
        notice.hidden = true;
      }
    });
  }

  function siteProfileOptions(manifest) {
    const profiles = siteProfiles(manifest);

    return profiles.map((profile) => ({
      value: String(profile.site_id || ''),
      label: siteProfileOptionLabel(profile)
    }));
  }

  function siteProfileOptionLabel(profile) {
    const domain = String(profile && profile.domain ? profile.domain : '').trim();
    const brand = String(profile && profile.display_name ? profile.display_name : '').trim();
    const fallback = String(profile && profile.site_id ? profile.site_id : 'Site').trim();

    if (domain && brand && brand.toLowerCase() !== domain.toLowerCase()) {
      return domain + ' / ' + brand;
    }

    if (domain) {
      return domain + ' / ' + fallback;
    }

    return fallback;
  }

  function runtimeSiteProfile(site) {
    const profile = site && site.profile && typeof site.profile === 'object' ? site.profile : {};
    const siteId = String(site && site.site_id ? site.site_id : profile.site_id || '').trim();
    const domain = String(site && site.domain ? site.domain : profile.domain || '').trim();
    const baseUrl = String(site && site.base_url ? site.base_url : profile.base_url || (domain ? 'https://' + domain : '')).trim();

    return Object.assign({}, profile, {
      site_id: siteId,
      display_name: String(profile.display_name || domain || siteId || 'Site'),
      domain,
      base_url: baseUrl,
      root_locale: String(site && site.root_locale ? site.root_locale : profile.root_locale || ''),
      geo_country: String(site && site.geo_country ? site.geo_country : profile.geo_country || ''),
      status: String(site && site.status ? site.status : profile.status || 'configured'),
      deploy_profile: profile.deploy_profile && typeof profile.deploy_profile === 'object' ? profile.deploy_profile : {},
      medgen_profile: profile.medgen_profile && typeof profile.medgen_profile === 'object' ? profile.medgen_profile : {},
      seo: profile.seo && typeof profile.seo === 'object' ? profile.seo : {},
      release: profile.release && typeof profile.release === 'object' ? profile.release : {},
      runtime_source: 'cloudflare_runtime'
    });
  }

  function mergeRuntimeSiteProfiles(sites) {
    if (!adminState.manifest || !Array.isArray(sites) || sites.length === 0) {
      return false;
    }

    const previous = Array.isArray(adminState.manifest.sites) ? adminState.manifest.sites : [];
    const byId = {};

    previous.forEach((profile) => {
      const siteId = String(profile && profile.site_id ? profile.site_id : '').trim();

      if (siteId) {
        byId[siteId] = profile;
      }
    });

    sites.map(runtimeSiteProfile).forEach((profile) => {
      const siteId = String(profile.site_id || '').trim();

      if (!siteId) {
        return;
      }

      byId[siteId] = Object.assign({}, byId[siteId] || {}, profile);
    });

    adminState.manifest.sites = Object.values(byId).sort((a, b) => String(a.site_id || '').localeCompare(String(b.site_id || '')));

    const storedSiteId = readStoredActiveSite();
    if (!adminState.activeSiteId && storedSiteId && siteProfileById(storedSiteId)) {
      adminState.activeSiteId = storedSiteId;
    }

    renderAdminMetrics(adminState.manifest);
    renderSiteWorkflow(adminState.manifest);
    renderSiteFleet(adminState.manifest);
    setSectionCounts(adminState.manifest, adminState.actionContracts || {});

    return true;
  }

  async function refreshRuntimeSiteProfiles(options) {
    const opts = options || {};

    if (!isGithubMode() || !githubToken() || !cloudflareRuntimeEnabled()) {
      return { ok: false, issues: ['cloudflare_runtime_disabled'] };
    }

    const payload = await cloudflareListSiteProfiles();

    if (payload && payload.ok && Array.isArray(payload.sites)) {
      mergeRuntimeSiteProfiles(payload.sites);
      return payload;
    }

    if (!opts.silent) {
      const issues = payload && Array.isArray(payload.issues)
        ? payload.issues
        : payload && Array.isArray(payload.errors)
          ? payload.errors
          : [];
      setGithubStatus('Cloudflare runtime site list не загружен: ' + (issues.length ? issues.join('; ') : 'API недоступен'));
    }

    return payload;
  }

  function releaseStatusElements() {
    return {
      panel: document.querySelector('[data-release-status-panel]'),
      summary: document.querySelector('[data-release-status-summary]'),
      counts: document.querySelectorAll('[data-release-status-count]'),
      packages: document.querySelector('[data-release-status-packages]'),
      batches: document.querySelector('[data-release-status-batches]'),
      deployments: document.querySelector('[data-release-status-deployments]'),
      refresh: document.querySelector('[data-release-status-refresh]'),
      prepare: document.querySelector('[data-runtime-release-prepare]'),
      deploy: document.querySelector('[data-cloudflare-pages-deploy]'),
      sshMirrorDeploy: document.querySelector('[data-ssh-mirror-deploy]'),
      runtimeIndexRefresh: document.querySelector('[data-runtime-index-refresh]'),
      runtimeIndexStatus: document.querySelector('[data-runtime-index-status]'),
      directUploadFile: document.querySelector('[data-direct-upload-file]'),
      directUploadJson: document.querySelector('[data-direct-upload-json]'),
      directUploadPreview: document.querySelector('[data-direct-upload-preview]'),
      directUploadDeploy: document.querySelector('[data-direct-upload-deploy]'),
      directUploadStatus: document.querySelector('[data-direct-upload-status]'),
      baselineGenerate: document.querySelector('[data-content-baseline-generate]'),
      baselineFile: document.querySelector('[data-content-baseline-file]'),
      baselineJson: document.querySelector('[data-content-baseline-json]'),
      baselinePreview: document.querySelector('[data-content-baseline-preview]'),
      baselineSeed: document.querySelector('[data-content-baseline-seed]'),
      baselineStatus: document.querySelector('[data-content-baseline-status]')
    };
  }

  function stageWidgetElement(kind) {
    return document.querySelector('[data-stage-widget="' + kind + '"]');
  }

  function setStageWidget(kind, state, summary, detail, actionLabel) {
    const widget = stageWidgetElement(kind);

    if (!widget) {
      return;
    }

    const normalizedState = state || 'idle';
    const summaryNode = widget.querySelector('[data-stage-widget-summary]');
    const detailNode = widget.querySelector('[data-stage-widget-detail]');
    const popoverNode = widget.querySelector('[data-stage-widget-popover]');
    const action = widget.querySelector('[data-stage-widget-action]');

    widget.dataset.stageState = normalizedState;
    widget.title = detail || summary || '';

    if (summaryNode) {
      summaryNode.value = summary || '';
      summaryNode.textContent = summary || '';
    }

    if (detailNode) {
      detailNode.textContent = detail || '';
    }

    if (popoverNode) {
      popoverNode.textContent = detail || summary || '';
    }

    if (action instanceof HTMLButtonElement) {
      const widgetKind = widget.getAttribute('data-stage-widget') || kind;
      action.hidden = !actionLabel;
      action.textContent = actionLabel || '';
      action.dataset.stageAction = actionLabel
        ? (widgetKind === 'medgen'
            ? (/deploy/i.test(String(actionLabel)) ? 'deploy' : 'medgen')
            : (/deploy/i.test(String(actionLabel)) ? 'deploy' : 'refresh'))
        : '';
    }

    updateAdmin2PipelineState();
  }

  function admin2PipelineStateLabel(state) {
    const labels = {
      blocked: 'ждет',
      idle: 'idle',
      pending: 'next',
      running: 'идет',
      ready: 'готов',
      deployed: 'done',
      error: 'ошибка'
    };

    return labels[state] || labels.idle;
  }

  function normalizeAdmin2PipelineState(state) {
    return ['blocked', 'idle', 'pending', 'running', 'ready', 'deployed', 'error'].includes(state)
      ? state
      : 'idle';
  }

  function admin2PipelineStepElement(key) {
    return document.querySelector('.admin2-pipeline__step--' + key);
  }

  function setAdmin2PipelineStep(key, state, detail, current) {
    const step = admin2PipelineStepElement(key);

    if (!step) {
      return;
    }

    const normalized = normalizeAdmin2PipelineState(state);
    const status = step.querySelector('em');
    const statusText = status ? status.querySelector('span') : null;
    const detailNode = step.querySelector('strong + span');
    const titleNode = step.querySelector('strong');

    ['is-blocked', 'is-idle', 'is-pending', 'is-running', 'is-ready', 'is-deployed', 'is-error', 'is-current'].forEach((className) => {
      step.classList.remove(className);
    });
    step.classList.add('is-' + normalized);
    step.classList.toggle('is-current', current === true);

    if (statusText) {
      statusText.textContent = admin2PipelineStateLabel(normalized);
    } else if (status) {
      status.textContent = admin2PipelineStateLabel(normalized);
    }

    if (detailNode) {
      detailNode.textContent = detail || '';
    }

    if (current) {
      step.setAttribute('aria-current', 'step');
    } else {
      step.removeAttribute('aria-current');
    }

    step.setAttribute('aria-label', (titleNode ? titleNode.textContent : key) + ': ' + (detail || admin2PipelineStateLabel(normalized)));
  }

  function admin2ContentActionForIntent(intent) {
    if (intent === 'delete_site') {
      return { label: 'Удалить сайт и домен', href: '#admin-site-domain-delete' };
    }

    if (intent === 'edit_page') {
      return { label: 'Открыть редактуру', href: '#admin-editorial' };
    }

    if (intent === 'product_card') {
      return { label: 'Открыть карточки', href: '#admin-product-cards' };
    }

    if (intent === 'design') {
      return { label: 'Открыть дизайн', href: '#admin-design' };
    }

    return { label: 'Открыть MedGen', href: '#admin-medgen' };
  }

  function admin2PipelineAction(current, context) {
    const step = current || {};
    const intent = selectedAdmin2IntentDefinition();
    const profile = context.profile;

    if (step.key === 'intent') {
      return { label: 'Выбрать сценарий', href: '#admin2-target-heading' };
    }

    if (step.key === 'site') {
      if (!profile && admin2TargetState.intent === 'create_site') {
        return { label: 'Создать новый сайт', href: '#admin-site-launch' };
      }

      return { label: 'Выбрать домен', href: '#admin-active-site' };
    }

    if (step.key === 'skeleton') {
      return { label: 'Открыть блок skeleton', href: '#admin-site-launch' };
    }

    if (step.key === 'content') {
      return admin2ContentActionForIntent(admin2TargetState.intent);
    }

    if (step.key === 'preview') {
      return { label: 'Собрать preview', href: '#admin-medgen' };
    }

    if (step.key === 'approval') {
      return { label: 'Открыть approval', href: '#admin-site-workflow' };
    }

    if (step.key === 'deploy') {
      return { label: 'Открыть deploy', href: '#admin-site-workflow' };
    }

    return { label: 'Выбрать сценарий', href: '#admin2-target-heading' };
  }

  function admin2PipelineBackAction(current, context) {
    const step = current || {};
    const profile = context.profile;
    const label = 'Назад к предыдущему сценарию';

    if (!step.key || step.key === 'intent') {
      return null;
    }

    if (step.key === 'site') {
      return { label, href: '#admin2-target-heading', resetIntent: true, targetStepKey: 'intent' };
    }

    if (step.key === 'skeleton') {
      return { label, href: profile ? '#admin-active-site' : '#admin-site-launch', targetStepKey: 'site' };
    }

    if (step.key === 'content') {
      return { label, href: '#admin-site-launch', targetStepKey: 'skeleton' };
    }

    if (step.key === 'preview') {
      const action = admin2ContentActionForIntent(admin2TargetState.intent);

      return { label, href: action.href, targetStepKey: 'content' };
    }

    if (step.key === 'approval') {
      return { label, href: '#admin-medgen', targetStepKey: 'preview' };
    }

    if (step.key === 'deploy') {
      return { label, href: '#admin-site-workflow', targetStepKey: 'approval' };
    }

    return null;
  }

  function setAdmin2PrimaryAction(action) {
    const link = document.querySelector('.admin2-command__next');

    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const nextAction = action || { label: 'Выбрать сценарий', href: '#admin2-target-heading' };
    link.textContent = nextAction.label || 'Открыть шаг';
    link.href = nextAction.href || '#admin2-target-heading';
  }

  function setAdmin2BackAction(action) {
    const link = document.querySelector('.admin2-command__back');

    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    if (!action) {
      link.hidden = true;
      link.classList.remove('is-reset-intent');
      link.admin2TargetStepKey = '';
      return;
    }

    link.hidden = false;
    link.textContent = action.label || 'Назад к предыдущему сценарию';
    link.href = action.href || '#admin2-target-heading';
    link.classList.toggle('is-reset-intent', action.resetIntent === true);
    link.admin2TargetStepKey = action.targetStepKey || '';
  }

  function setAdmin2RestartAction(visible) {
    const link = document.querySelector('.admin2-command__restart');

    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    link.hidden = visible !== true;
  }

  function medgenTaskExplicitPreviewUrl(taskRecord) {
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};
    const preview = taskRecord && taskRecord.preview && typeof taskRecord.preview === 'object' ? taskRecord.preview : {};

    return String(taskRecord && taskRecord.preview_url || task.preview_url || preview.preview_url || '').trim();
  }

  function medgenPreviewCounts(tasks) {
    const list = Array.isArray(tasks) ? tasks : [];
    const counts = {
      ready: 0,
      accepted: 0,
      deploying: 0,
      deployed: 0,
      failed: 0,
      explicit_url: 0
    };

    list.forEach((taskRecord) => {
      const status = medgenTaskPreviewStatus(taskRecord);

      if (medgenTaskExplicitPreviewUrl(taskRecord)) {
        counts.explicit_url += 1;
      }

      if (status === 'preview_ready') {
        counts.ready += 1;
      } else if (['accepted', 'release_queued', 'release_prepared'].includes(status)) {
        counts.accepted += 1;
      } else if (['pages_deploy_requested', 'cloudflare_pages_deploy_requested', 'cloudflare_pages_deploy_building'].includes(status)) {
        counts.deploying += 1;
      } else if (['deployed', 'cloudflare_pages_deployed'].includes(status)) {
        counts.deployed += 1;
      } else if (['preview_failed', 'pages_deploy_failed', 'cloudflare_pages_deploy_failed'].includes(status)) {
        counts.failed += 1;
      }
    });

    return counts;
  }

  function activeReleaseStatus() {
    const siteId = activeSiteKey();

    return siteId ? adminState.releaseStatusBySite[siteId] || null : null;
  }

  function admin2PipelineReleaseCounts(status) {
    if (!status || status.ok === false) {
      return {
        preview_ready: 0,
        accepted: 0,
        release_queued: 0,
        release_prepared: 0,
        pages_deploy_requested: 0,
        deployed: 0,
        pages_deploy_failed: 0,
        pending: 0
      };
    }

    return {
      preview_ready: releaseCount(status, 'preview_ready'),
      accepted: releaseCount(status, 'accepted'),
      release_queued: releaseCount(status, 'release_queued'),
      release_prepared: releaseCount(status, 'release_prepared') || Number(status.prepared_package_count || 0),
      pages_deploy_requested: releaseCount(status, 'pages_deploy_requested'),
      deployed: releaseCount(status, 'deployed'),
      pages_deploy_failed: releaseCount(status, 'pages_deploy_failed'),
      pending: Number(status.pending_package_count || 0)
    };
  }

  function setAdmin2ContextItem(key, state, primary, secondary) {
    const item = document.querySelector('.admin2-context__item--' + key);

    if (!item) {
      return;
    }

    const normalized = normalizeAdmin2PipelineState(state);
    const primaryNode = item.querySelector('strong');
    const secondaryNode = item.querySelector('span');

    ['is-blocked', 'is-idle', 'is-pending', 'is-running', 'is-ready', 'is-deployed', 'is-error'].forEach((className) => {
      item.classList.remove(className);
    });
    item.classList.add('is-' + normalized);

    if (primaryNode) {
      primaryNode.textContent = primary || '-';
    }

    if (secondaryNode) {
      secondaryNode.textContent = secondary || '';
    }
  }

  function updateAdmin2ActiveSiteContext(context) {
    const profile = context.profile;
    const pages = context.pages;
    const medgenIndex = context.medgenIndex;
    const medgenCounts = context.medgenCounts;
    const previewCounts = context.previewCounts;
    const releaseStatus = context.releaseStatus;
    const releaseCounts = context.releaseCounts;
    const releaseHasStatus = context.releaseHasStatus;

    if (!document.querySelector('.admin2-context')) {
      return;
    }

    if (!profile) {
      setAdmin2ContextItem('site', 'blocked', 'Сайт не выбран', 'выберите домен');
      setAdmin2ContextItem('geo', 'blocked', '-', 'single_root');
      setAdmin2ContextItem('hosting', 'blocked', '-', 'deploy target');
      setAdmin2ContextItem('skeleton', 'blocked', '-', 'страницы');
      setAdmin2ContextItem('medgen', 'blocked', '-', 'status');
      setAdmin2ContextItem('release', 'blocked', '-', 'readiness');
      return;
    }

    const domain = String(profile.domain || profile.site_id || 'site');
    const locale = String(profile.root_locale || '-');
    const geo = String(profile.geo_country || profile.market || '').trim();

    setAdmin2ContextItem('site', 'ready', domain, String(profile.display_name || profile.site_id || 'active'));
    setAdmin2ContextItem('geo', 'ready', locale, geo ? geo + ' · single_root' : 'single_root');
    setAdmin2ContextItem('hosting', hostingProvider(profile) === 'cloudflare_pages' ? 'ready' : 'pending', hostingModeLabel(profile), profileDeployLabel(profile));
    setAdmin2ContextItem('skeleton', pages.length > 0 ? 'ready' : 'pending', pages.length > 0 ? pages.length + ' страниц' : 'нет страниц', pages.length > 0 ? 'content scope loaded' : 'нужен skeleton');

    if (medgenIndex && medgenIndex.loading) {
      setAdmin2ContextItem('medgen', 'running', 'проверяю', 'runtime task summary');
    } else if (medgenIndex && medgenIndex.error) {
      setAdmin2ContextItem('medgen', 'error', 'status error', medgenIndex.error);
    } else if (medgenCounts.failed > 0) {
      setAdmin2ContextItem('medgen', 'error', medgenCounts.failed + ' ошибок', medgenCounts.total + ' всего');
    } else if (medgenCounts.active > 0) {
      setAdmin2ContextItem('medgen', 'running', medgenCounts.active + ' в работе', medgenCounts.ready + ' ready');
    } else if (medgenCounts.ready > 0) {
      setAdmin2ContextItem('medgen', 'ready', medgenCounts.ready + ' ready', previewCounts.ready + ' preview');
    } else {
      setAdmin2ContextItem('medgen', 'idle', medgenCounts.total > 0 ? medgenCounts.total + ' задач' : 'нет задач', 'можно создать');
    }

    if (hostingProvider(profile) !== 'cloudflare_pages') {
      setAdmin2ContextItem('release', 'ready', 'VPS mirror', 'Cloudflare Pages вторичный');
    } else if (releaseStatus && releaseStatus.ok === false) {
      setAdmin2ContextItem('release', 'error', 'status error', 'откройте Release');
    } else if (releaseCounts.pages_deploy_failed > 0) {
      setAdmin2ContextItem('release', 'error', releaseCounts.pages_deploy_failed + ' failed', 'Cloudflare Pages');
    } else if (releaseCounts.pages_deploy_requested > 0) {
      setAdmin2ContextItem('release', 'running', 'deploy идет', 'Cloudflare Pages');
    } else if (releaseCounts.release_prepared > 0) {
      setAdmin2ContextItem('release', 'ready', 'готов к deploy', releaseCounts.release_prepared + ' prepared');
    } else if (releaseCounts.pending > 0 || releaseCounts.accepted > 0 || releaseCounts.release_queued > 0) {
      setAdmin2ContextItem('release', 'pending', 'нужен release', (releaseCounts.pending || releaseCounts.accepted || releaseCounts.release_queued) + ' пакетов');
    } else if (releaseCounts.deployed > 0) {
      setAdmin2ContextItem('release', 'deployed', 'deployed', releaseCounts.deployed + ' пакетов');
    } else {
      setAdmin2ContextItem('release', releaseHasStatus ? 'ready' : 'idle', releaseHasStatus ? 'чисто' : 'не проверен', releaseHasStatus ? 'новых правок нет' : 'refresh status');
    }
  }

  function admin2IntentDefinition(intent) {
    return admin2IntentDefinitions[intent] || admin2IntentDefinitions.create_site;
  }

  function admin2TargetDefinition(target) {
    return admin2TargetDefinitions[target] || admin2TargetDefinitions.site;
  }

  function selectedAdmin2IntentDefinition() {
    return admin2IntentDefinition(admin2TargetState.intent);
  }

  function selectedAdmin2TargetDefinition() {
    return admin2TargetDefinition(admin2TargetState.target || selectedAdmin2IntentDefinition().target);
  }

  function setAdmin2OptionState(selector, selectedValue, profile) {
    document.querySelectorAll(selector).forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const value = String(button.value || '').trim();
      const selected = value === selectedValue;

      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.disabled = false;
    });
  }

  function setAdmin2CommandFocus(mode) {
    const root = document.querySelector('.admin2-command');

    if (!root) {
      return;
    }

    ['target', 'pipeline', 'review'].forEach((name) => {
      root.classList.toggle('is-focusing-' + name, mode === name);
    });
  }

  function scheduleAdmin2ReturnVisibility() {
    if (admin2ReturnRaf) {
      return;
    }

    admin2ReturnRaf = window.requestAnimationFrame(() => {
      admin2ReturnRaf = 0;
      updateAdmin2ReturnVisibility();
    });
  }

  function updateAdmin2ReturnVisibility() {
    const link = document.querySelector('.admin2-return');
    const command = document.querySelector('.admin2-command');
    const gated = document.querySelector('[data-admin-gated]');

    if (!(link instanceof HTMLAnchorElement) || !command || (gated instanceof HTMLElement && gated.hidden)) {
      if (link instanceof HTMLAnchorElement) {
        link.hidden = true;
        link.classList.remove('is-visible');
      }
      return;
    }

    const rect = command.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const awayFromPipeline = rect.bottom < 96 || rect.top > viewportHeight - 96;

    link.hidden = !awayFromPipeline;
    link.classList.toggle('is-visible', awayFromPipeline);
  }

  function scrollToAdmin2Pipeline() {
    const command = document.querySelector('.admin2-command');

    setAdmin2CommandFocus('pipeline');

    if (command && typeof command.scrollIntoView === 'function') {
      command.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      openAdmin2PipelineHref('#admin2-target-heading');
    }

    scheduleAdmin2ReturnVisibility();
  }

  function siteDomainDeleteLabel(profile) {
    if (!profile) {
      return '';
    }

    return String(profile.domain || profile.site_id || 'active site').trim();
  }

  function openSiteDomainDeleteWidget() {
    const widget = document.querySelector('[data-site-domain-delete-widget]');

    if (widget && 'open' in widget) {
      widget.open = true;
    }
  }

  function updateSiteDomainDeleteWidget(profile) {
    const widget = document.querySelector('[data-site-domain-delete-widget]');
    const domainNode = document.querySelector('[data-site-domain-delete-domain]');
    const detailNode = document.querySelector('[data-site-domain-delete-detail]');
    const checkbox = document.querySelector('[data-site-domain-delete-confirm]');
    const button = document.querySelector('[data-site-domain-delete-submit]');
    const status = document.querySelector('[data-site-domain-delete-status]');
    const domain = siteDomainDeleteLabel(profile);
    const siteKey = profile ? String(profile.site_id || profile.domain || '') : '';

    if (!widget && !domainNode && !checkbox && !button && !status) {
      return;
    }

    if (admin2TargetState.intent === 'delete_site') {
      openSiteDomainDeleteWidget();
    }

    if (domainNode) {
      domainNode.textContent = domain || 'Домен не выбран';
    }

    if (detailNode) {
      detailNode.textContent = profile
        ? 'Проверьте домен, включите confirm и только затем запускайте полное удаление сайта.'
        : 'Сначала выберите активный домен выше.';
    }

    if (checkbox instanceof HTMLInputElement) {
      if (checkbox.dataset.siteId !== siteKey) {
        checkbox.checked = false;
        checkbox.dataset.siteId = siteKey;
      }

      checkbox.disabled = !profile;
    }

    const confirmed = Boolean(profile && checkbox instanceof HTMLInputElement && checkbox.checked);

    if (button instanceof HTMLButtonElement) {
      button.disabled = !confirmed;
      button.setAttribute('aria-disabled', confirmed ? 'false' : 'true');
    }

    if (status) {
      const message = !profile
        ? 'Выберите домен, чтобы включить удаление.'
        : (confirmed
          ? 'Готово к запуску: нажмите кнопку удаления, чтобы создать GitHub archive snapshot и очистить Cloudflare runtime/Pages + GitHub config для ' + domain + '.'
          : 'Подтвердите checkbox для домена ' + domain + ', чтобы включить кнопку.');

      status.value = message;
      status.textContent = message;
    }
  }

  function wireSiteDomainDeleteWidget() {
    const checkbox = document.querySelector('[data-site-domain-delete-confirm]');

    if (!(checkbox instanceof HTMLInputElement) || checkbox.dataset.siteDomainDeleteBound === 'true') {
      return;
    }

    checkbox.dataset.siteDomainDeleteBound = 'true';
    checkbox.addEventListener('change', () => {
      updateSiteDomainDeleteWidget(activeSiteProfile());
    });
  }

  function updateAdmin2TargetSelector(profile) {
    const root = document.querySelector('.admin2-target');

    if (!root) {
      return;
    }

    const intent = selectedAdmin2IntentDefinition();
    const target = selectedAdmin2TargetDefinition();
    const status = root.querySelector('.admin2-target__status');
    const action = root.querySelector('.admin2-target__action');
    const blocked = !profile && intent.requiresSite === true;
    const domain = profile ? String(profile.domain || profile.site_id || 'active site') : '';
    const intentSelected = admin2TargetState.intentTouched === true;

    setAdmin2OptionState('.admin2-target__group--intent .admin2-target-option', intentSelected ? admin2TargetState.intent : '', profile);
    setAdmin2OptionState('.admin2-target__group--target .admin2-target-option', intentSelected ? admin2TargetState.target : '', profile);

    if (status) {
      let targetStatus = 'Выбрано: ' + intent.label + ' -> ' + target.label + (domain ? ' для ' + domain + '.' : '.');

      if (!intentSelected) {
        targetStatus = 'Выберите сценарий: создать сайт, выбрать домен или редактировать существующий.';
      } else if (admin2TargetState.intent === 'select_site' && !profile) {
        targetStatus = 'Выбрано: Выбрать домен. Следующий шаг - откройте список сайтов и задайте active site.';
      } else if (admin2TargetState.intent === 'delete_site' && !profile) {
        targetStatus = 'Выбрано: Удалить сайт и домен. Сначала выберите домен, который нужно удалить.';
      } else if (admin2TargetState.intent === 'delete_site') {
        targetStatus = 'Выбрано: Удалить сайт и домен для ' + domain + '. Действие откроет блок удаления под выбором домена.';
      } else if (blocked) {
        targetStatus = intent.label + ': сначала выберите активный сайт.';
      }

      status.value = targetStatus;
      status.textContent = targetStatus;
    }

    if (action instanceof HTMLAnchorElement) {
      action.href = !intentSelected
        ? '#admin2-target-heading'
        : blocked
          ? '#admin-active-site'
          : (intent.anchor || target.anchor || '#admin-site-workflow');
      action.textContent = !intentSelected
        ? 'Сначала выберите сценарий'
        : blocked
          ? 'Выбрать домен'
          : (admin2TargetState.intent === 'delete_site' ? 'Удалить сайт и домен' : 'Открыть: ' + intent.label);
      action.classList.toggle('is-disabled', !intentSelected);
      action.setAttribute('aria-disabled', !intentSelected ? 'true' : 'false');
    }
  }

  function setAdmin2ReviewCard(kind, state, primary, secondary, actionLabel, href) {
    const card = document.querySelector('.admin2-review-card--' + kind);

    if (!card) {
      return;
    }

    const normalized = normalizeAdmin2PipelineState(state);
    const primaryNode = card.querySelector('strong');
    const secondaryNode = card.querySelector('small');
    const action = card.querySelector('.admin2-review__action');

    ['is-blocked', 'is-idle', 'is-pending', 'is-running', 'is-ready', 'is-deployed', 'is-error'].forEach((className) => {
      card.classList.remove(className);
    });
    card.classList.add('is-' + normalized);

    if (primaryNode) {
      primaryNode.textContent = primary || '-';
    }

    if (secondaryNode) {
      secondaryNode.textContent = secondary || '';
    }

    if (action instanceof HTMLAnchorElement) {
      const rawHref = String(href || '').trim();
      const safeHref = rawHref.charAt(0) === '#' ? rawHref : safeHttpHref(rawHref);

      action.hidden = !actionLabel;
      action.textContent = actionLabel || '';

      if (safeHref) {
        action.setAttribute('href', safeHref);
      }

      if (safeHref && safeHref.charAt(0) !== '#') {
        action.target = '_blank';
        action.rel = 'noopener';
      } else {
        action.removeAttribute('target');
        action.removeAttribute('rel');
      }
    }

    card.setAttribute('aria-label', kind + ': ' + (primary || admin2PipelineStateLabel(normalized)) + (secondary ? '. ' + secondary : ''));
  }

  function latestMedGenPreviewCandidate(tasks) {
    const previewLikeStatuses = [
      'preview_ready',
      'accepted',
      'release_queued',
      'release_prepared',
      'pages_deploy_requested',
      'cloudflare_pages_deploy_requested',
      'cloudflare_pages_deploy_building',
      'deployed',
      'cloudflare_pages_deployed'
    ];
    const list = Array.isArray(tasks) ? tasks.slice() : [];

    list.sort((a, b) => medgenTaskUpdatedAt(b) - medgenTaskUpdatedAt(a));

    for (const taskRecord of list) {
      const status = medgenTaskPreviewStatus(taskRecord);
      const previewUrl = safeHttpHref(medgenTaskExplicitPreviewUrl(taskRecord));

      if (previewUrl || previewLikeStatuses.includes(status)) {
        return {
          task: taskRecord,
          title: medgenTaskTitle(taskRecord),
          status,
          url: previewUrl
        };
      }
    }

    return null;
  }

  function latestAdmin2DeploymentUrl(status) {
    const deployments = status && Array.isArray(status.pages_deployments) ? status.pages_deployments.slice() : [];

    deployments.sort((a, b) => {
      const left = Date.parse(String(a && (a.created_on || a.created_at || a.modified_on || a.modified_at) || '')) || 0;
      const right = Date.parse(String(b && (b.created_on || b.created_at || b.modified_on || b.modified_at) || '')) || 0;

      return right - left;
    });

    for (const deployment of deployments) {
      const url = safeHttpHref(deployment && (deployment.deployment_url || deployment.url || deployment.alias_url));

      if (url) {
        return url;
      }
    }

    return '';
  }

  function updateAdmin2ReviewSummary(context) {
    const root = document.querySelector('.admin2-review');

    if (!root) {
      return;
    }

    const statusNode = root.querySelector('.admin2-review__status');
    const profile = context.profile;
    const medgenIndex = context.medgenIndex;
    const medgenCounts = context.medgenCounts;
    const previewCounts = context.previewCounts;
    const releaseStatus = context.releaseStatus;
    const releaseCounts = context.releaseCounts;
    const releaseHasStatus = context.releaseHasStatus;
    const medgenTasks = context.medgenTasks;
    const review = {
      preview: { state: 'blocked', primary: 'Нет сайта', secondary: 'ожидает active site', action: 'Выбрать сайт', href: '#admin-active-site' },
      approval: { state: 'blocked', primary: 'Нет preview', secondary: 'approval появится после preview', action: 'Открыть release', href: '#admin-site-workflow' },
      deploy: { state: 'blocked', primary: 'Нет release', secondary: 'Cloudflare Pages readiness', action: 'Открыть deploy', href: '#admin-site-workflow' },
      status: 'Выберите сайт, чтобы увидеть preview и deploy readiness.'
    };

    if (!profile) {
      setAdmin2ReviewCard('preview', review.preview.state, review.preview.primary, review.preview.secondary, review.preview.action, review.preview.href);
      setAdmin2ReviewCard('approval', review.approval.state, review.approval.primary, review.approval.secondary, review.approval.action, review.approval.href);
      setAdmin2ReviewCard('deploy', review.deploy.state, review.deploy.primary, review.deploy.secondary, review.deploy.action, review.deploy.href);

      if (statusNode) {
        statusNode.value = review.status;
        statusNode.textContent = review.status;
      }
      return;
    }

    const domain = String(profile.domain || profile.site_id || 'site');
    const previewCandidate = latestMedGenPreviewCandidate(medgenTasks);
    const previewUrl = previewCandidate ? previewCandidate.url : '';
    const deploymentUrl = latestAdmin2DeploymentUrl(releaseStatus);
    const previewReadyCount = previewCounts.ready || previewCounts.explicit_url || releaseCounts.preview_ready;

    if (medgenIndex && medgenIndex.loading) {
      review.preview = { state: 'running', primary: 'Проверяю MedGen', secondary: domain + ' · runtime summary', action: 'Открыть MedGen', href: '#admin-medgen' };
      review.status = 'Идет проверка MedGen status для выбранного сайта.';
    } else if (medgenIndex && medgenIndex.error) {
      review.preview = { state: 'error', primary: 'MedGen status error', secondary: medgenIndex.error, action: 'Открыть MedGen', href: '#admin-medgen' };
      review.status = 'Требует внимания: MedGen status не прочитан.';
    } else if (previewCounts.failed > 0 || releaseCounts.pages_deploy_failed > 0) {
      review.preview = { state: 'error', primary: 'Preview/deploy error', secondary: (previewCounts.failed || releaseCounts.pages_deploy_failed) + ' failed', action: 'Открыть release', href: '#admin-site-workflow' };
      review.status = 'Требует внимания: есть failed preview/deploy status.';
    } else if (previewCounts.deployed > 0 || releaseCounts.deployed > 0) {
      review.preview = { state: 'deployed', primary: 'Preview закрыт', secondary: (previewCounts.deployed || releaseCounts.deployed) + ' deployed', action: deploymentUrl ? 'Открыть deploy URL' : 'Открыть release', href: deploymentUrl || '#admin-site-workflow' };
      review.status = 'Последний preview прошел approval/deploy gate.';
    } else if (previewCounts.deploying > 0 || releaseCounts.pages_deploy_requested > 0) {
      review.preview = { state: 'running', primary: 'Deploy идет', secondary: 'Cloudflare Pages requested', action: 'Открыть release', href: '#admin-site-workflow' };
      review.status = 'Deploy уже запрошен, проверьте статус Cloudflare Pages.';
    } else if (previewCounts.accepted > 0 || releaseCounts.accepted > 0 || releaseCounts.release_queued > 0 || releaseCounts.release_prepared > 0) {
      review.preview = { state: 'ready', primary: 'Preview принят', secondary: 'approval уже пройден', action: 'Открыть release', href: '#admin-site-workflow' };
      review.status = releaseCounts.release_prepared > 0 ? 'Preview принят, пакет готов к deploy.' : 'Preview принят, следующий шаг в release center.';
    } else if (previewReadyCount > 0 || previewUrl) {
      review.preview = { state: 'ready', primary: 'Preview готов', secondary: previewCandidate ? previewCandidate.title : previewReadyCount + ' preview ready', action: previewUrl ? 'Открыть preview' : 'Открыть MedGen', href: previewUrl || '#admin-medgen' };
      review.status = 'Preview готов: проверьте результат и подтвердите approval gate.';
    } else if (medgenCounts.ready > 0) {
      review.preview = { state: 'pending', primary: 'Нужен Worker preview', secondary: medgenCounts.ready + ' MedGen ready', action: 'Открыть MedGen', href: '#admin-medgen' };
      review.status = 'Контент готов, следующий шаг: собрать preview через Worker.';
    } else {
      review.preview = { state: 'idle', primary: 'Нет preview', secondary: medgenCounts.total > 0 ? medgenCounts.total + ' MedGen задач без preview' : 'создайте контент или draft', action: 'Открыть MedGen', href: '#admin-medgen' };
      review.status = 'Preview появится после MedGen или редакторского draft.';
    }

    if (releaseStatus && releaseStatus.ok === false) {
      review.approval = { state: 'error', primary: 'Release status error', secondary: 'approval center недоступен', action: 'Открыть release', href: '#admin-site-workflow' };
    } else if (releaseCounts.pages_deploy_requested > 0) {
      review.approval = { state: 'ready', primary: 'Approval принят', secondary: 'deploy уже идет', action: 'Открыть release', href: '#admin-site-workflow' };
    } else if (releaseCounts.release_prepared > 0 || releaseCounts.accepted > 0 || releaseCounts.release_queued > 0) {
      review.approval = { state: 'ready', primary: 'Approval принят', secondary: (releaseCounts.release_prepared || releaseCounts.accepted || releaseCounts.release_queued) + ' пакетов', action: 'Открыть release', href: '#admin-site-workflow' };
    } else if (releaseCounts.preview_ready > 0 || previewCounts.ready > 0 || previewCounts.explicit_url > 0) {
      review.approval = { state: 'pending', primary: 'Нужно подтвердить', secondary: (releaseCounts.preview_ready || previewCounts.ready || previewCounts.explicit_url) + ' preview ready', action: 'Открыть approval', href: '#admin-site-workflow' };
    } else if (releaseCounts.deployed > 0 || previewCounts.deployed > 0) {
      review.approval = { state: 'deployed', primary: 'Approval закрыт', secondary: 'последний пакет опубликован', action: 'Открыть release', href: '#admin-site-workflow' };
    } else {
      review.approval = { state: 'idle', primary: 'Ждет preview', secondary: releaseHasStatus ? 'новых preview нет' : 'status не проверен', action: 'Открыть release', href: '#admin-site-workflow' };
    }

    if (hostingProvider(profile) !== 'cloudflare_pages') {
      review.deploy = { state: 'ready', primary: 'VPS mirror', secondary: 'Cloudflare Pages вторичный', action: 'Открыть deploy', href: '#admin-site-workflow' };
    } else if (releaseStatus && releaseStatus.ok === false) {
      review.deploy = { state: 'error', primary: 'Release недоступен', secondary: 'проверьте Worker status', action: 'Открыть deploy', href: '#admin-site-workflow' };
    } else if (releaseCounts.pages_deploy_failed > 0) {
      review.deploy = { state: 'error', primary: 'Deploy failed', secondary: releaseCounts.pages_deploy_failed + ' Pages failed', action: 'Открыть deploy', href: '#admin-site-workflow' };
    } else if (releaseCounts.pages_deploy_requested > 0) {
      review.deploy = { state: 'running', primary: 'Deploy идет', secondary: 'Cloudflare Pages', action: 'Открыть deploy', href: '#admin-site-workflow' };
    } else if (releaseCounts.deployed > 0) {
      review.deploy = { state: 'deployed', primary: 'Deployed', secondary: releaseCounts.deployed + ' пакетов', action: deploymentUrl ? 'Открыть deploy URL' : 'Открыть deploy', href: deploymentUrl || '#admin-site-workflow' };
    } else if (releaseCounts.release_prepared > 0) {
      review.deploy = { state: 'ready', primary: 'Готов к deploy', secondary: releaseCounts.release_prepared + ' prepared', action: 'Открыть deploy', href: '#admin-site-workflow' };
    } else if (releaseCounts.pending > 0 || releaseCounts.accepted > 0 || releaseCounts.release_queued > 0) {
      review.deploy = { state: 'pending', primary: 'Нужен release', secondary: (releaseCounts.pending || releaseCounts.accepted || releaseCounts.release_queued) + ' пакетов', action: 'Открыть deploy', href: '#admin-site-workflow' };
    } else {
      review.deploy = { state: releaseHasStatus ? 'ready' : 'idle', primary: releaseHasStatus ? 'Новых правок нет' : 'Не проверен', secondary: releaseHasStatus ? 'release queue clean' : 'refresh release status', action: 'Открыть deploy', href: '#admin-site-workflow' };
    }

    if (review.preview.state === 'error' || review.approval.state === 'error' || review.deploy.state === 'error') {
      review.status = 'Требует внимания: откройте нижний gated слой для диагностики.';
    } else if (review.deploy.state === 'running') {
      review.status = 'Deploy запущен, отслеживайте Cloudflare Pages status.';
    } else if (review.deploy.state === 'ready' && releaseCounts.release_prepared > 0) {
      review.status = 'Release prepared: deploy доступен только через gated controls ниже.';
    } else if (review.approval.state === 'pending') {
      review.status = 'Preview готов: нужен визуальный approve перед публикацией.';
    } else if (review.preview.state === 'pending') {
      review.status = 'Следующий шаг: собрать Worker preview для готового MedGen результата.';
    } else if (review.preview.state === 'idle') {
      review.status = 'Выберите цель и создайте content/draft, чтобы pipeline дошел до preview.';
    }

    setAdmin2ReviewCard('preview', review.preview.state, review.preview.primary, review.preview.secondary, review.preview.action, review.preview.href);
    setAdmin2ReviewCard('approval', review.approval.state, review.approval.primary, review.approval.secondary, review.approval.action, review.approval.href);
    setAdmin2ReviewCard('deploy', review.deploy.state, review.deploy.primary, review.deploy.secondary, review.deploy.action, review.deploy.href);

    if (statusNode) {
      statusNode.value = review.status;
      statusNode.textContent = review.status;
    }
  }

  function openAdmin2TargetSelection() {
    const profile = activeSiteProfile();
    const intent = selectedAdmin2IntentDefinition();

    if (!profile && intent.requiresSite === true) {
      setAdmin2CommandFocus('pipeline');
      scrollToAdminSection('site-workflow', 'admin-active-site');
      return;
    }

    setAdmin2CommandFocus('pipeline');
    if (admin2TargetState.intent === 'delete_site') {
      openSiteDomainDeleteWidget();
    }
    scrollToAdminSection(intent.section || 'site-workflow', intent.focus || '');
  }

  function wireAdmin2TargetSelector() {
    document.querySelectorAll('.admin2-target__group--intent .admin2-target-option').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.classList.contains('is-admin2-target-bound')) {
        return;
      }

      button.classList.add('is-admin2-target-bound');
      button.addEventListener('click', () => {
        if (button.disabled) {
          return;
        }

        const value = String(button.value || '').trim();
        const definition = admin2IntentDefinition(value);

        admin2TargetState.intent = value;
        admin2TargetState.target = definition.target || admin2TargetState.target;
        admin2TargetState.intentTouched = true;
        admin2ManualStepKey = '';
        setAdmin2CommandFocus('pipeline');
        updateAdmin2PipelineState();
      });
    });

    document.querySelectorAll('.admin2-target__group--target .admin2-target-option').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.classList.contains('is-admin2-target-bound')) {
        return;
      }

      button.classList.add('is-admin2-target-bound');
      button.addEventListener('click', () => {
        if (button.disabled) {
          return;
        }

        const value = String(button.value || '').trim();
        const definition = admin2TargetDefinition(value);

        admin2TargetState.target = value;
        admin2TargetState.intent = definition.intent || admin2TargetState.intent;
        admin2TargetState.intentTouched = true;
        admin2ManualStepKey = '';
        setAdmin2CommandFocus('pipeline');
        updateAdmin2PipelineState();
      });
    });

    document.querySelectorAll('.admin2-target__action').forEach((link) => {
      if (!(link instanceof HTMLAnchorElement) || link.classList.contains('is-admin2-target-bound')) {
        return;
      }

      link.classList.add('is-admin2-target-bound');
      link.addEventListener('click', (event) => {
        event.preventDefault();

        if (link.getAttribute('aria-disabled') === 'true') {
          openAdmin2PipelineHref('#admin2-target-heading');
          return;
        }

        setAdmin2CommandFocus('pipeline');
        openAdmin2TargetSelection();
      });
    });
  }

  function wireAdmin2ReviewSummary() {
    document.querySelectorAll('.admin2-review__action').forEach((link) => {
      if (!(link instanceof HTMLAnchorElement) || link.classList.contains('is-admin2-review-bound')) {
        return;
      }

      link.classList.add('is-admin2-review-bound');
      link.addEventListener('click', (event) => {
        const href = String(link.getAttribute('href') || '').trim();

        if (href.charAt(0) !== '#') {
          return;
        }

        event.preventDefault();

        if (href === '#admin-medgen') {
          scrollToAdminSection('medgen', 'admin-medgen-task-id');
          return;
        }

        if (href === '#admin-site-launch') {
          scrollToAdminSection('site-launch', '');
          return;
        }

        if (href === '#admin-active-site') {
          scrollToAdminSection('site-workflow', 'admin-active-site');
          return;
        }

        scrollToAdminSection('site-workflow', href === '#admin-site-workflow' ? 'admin-release-status-summary' : '');
      });
    });
  }

  function openAdmin2PipelineHref(href) {
    if (href === '#admin2-target-heading') {
      setAdmin2CommandFocus('target');
      const target = byId('admin2-target-heading');

      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (href === '#admin-active-site') {
      setAdmin2CommandFocus('pipeline');
      scrollToAdminSection('site-workflow', 'admin-active-site');
      return;
    }

    if (href === '#admin-site-domain-delete') {
      setAdmin2CommandFocus('pipeline');
      openSiteDomainDeleteWidget();
      scrollToAdminSection('site-workflow', 'admin-site-domain-delete');
      return;
    }

    if (href === '#admin-site-launch') {
      setAdmin2CommandFocus('pipeline');
      scrollToAdminSection('site-launch', '');
      return;
    }

    if (href === '#admin-medgen') {
      setAdmin2CommandFocus('pipeline');
      scrollToAdminSection('medgen', 'admin-medgen-task-id');
      return;
    }

    if (href === '#admin-editorial') {
      setAdmin2CommandFocus('pipeline');
      scrollToAdminSection('editorial', '');
      return;
    }

    if (href === '#admin-product-cards') {
      setAdmin2CommandFocus('pipeline');
      scrollToAdminSection('product-cards', '');
      return;
    }

    if (href === '#admin-design') {
      setAdmin2CommandFocus('pipeline');
      scrollToAdminSection('design', '');
      return;
    }

    if (href === '#admin-site-fleet-delete') {
      setAdmin2CommandFocus('pipeline');
      scrollToAdminSection('sites', 'admin-site-fleet-delete');
      return;
    }

    setAdmin2CommandFocus('pipeline');
    scrollToAdminSection('site-workflow', 'admin-release-status-summary');
  }

  function wireAdmin2PrimaryAction() {
    document.querySelectorAll('.admin2-command__next').forEach((link) => {
      if (!(link instanceof HTMLAnchorElement) || link.classList.contains('is-admin2-next-bound')) {
        return;
      }

      link.classList.add('is-admin2-next-bound');
      link.addEventListener('click', (event) => {
        const href = String(link.getAttribute('href') || '').trim();

        if (href.charAt(0) !== '#') {
          return;
        }

        event.preventDefault();
        openAdmin2PipelineHref(href);
      });
    });
  }

  function wireAdmin2BackAction() {
    document.querySelectorAll('.admin2-command__back').forEach((link) => {
      if (!(link instanceof HTMLAnchorElement) || link.classList.contains('is-admin2-back-bound')) {
        return;
      }

      link.classList.add('is-admin2-back-bound');
      link.addEventListener('click', (event) => {
        const href = String(link.getAttribute('href') || '').trim();

        if (href.charAt(0) !== '#') {
          return;
        }

        event.preventDefault();

        if (link.classList.contains('is-reset-intent')) {
          admin2TargetState.intentTouched = false;
          admin2ManualStepKey = '';
          updateAdmin2PipelineState();
        }

        if (!link.classList.contains('is-reset-intent') && link.admin2TargetStepKey) {
          admin2ManualStepKey = String(link.admin2TargetStepKey || '');
          updateAdmin2PipelineState();
        }

        openAdmin2PipelineHref(href);
      });
    });
  }

  function wireAdmin2RestartAction() {
    document.querySelectorAll('.admin2-command__restart').forEach((link) => {
      if (!(link instanceof HTMLAnchorElement) || link.classList.contains('is-admin2-restart-bound')) {
        return;
      }

      link.classList.add('is-admin2-restart-bound');
      link.addEventListener('click', (event) => {
        event.preventDefault();

        admin2TargetState.intent = 'create_site';
        admin2TargetState.target = 'site';
        admin2TargetState.intentTouched = false;
        admin2ManualStepKey = '';
        setAdmin2CommandFocus('target');
        updateAdmin2PipelineState();
        openAdmin2PipelineHref('#admin2-target-heading');
      });
    });
  }

  function wireAdmin2ReturnAction() {
    document.querySelectorAll('.admin2-return').forEach((link) => {
      if (!(link instanceof HTMLAnchorElement) || link.classList.contains('is-admin2-return-bound')) {
        return;
      }

      link.classList.add('is-admin2-return-bound');
      link.addEventListener('click', (event) => {
        event.preventDefault();
        scrollToAdmin2Pipeline();
      });
    });

    if (!document.documentElement.classList.contains('is-admin2-return-watch-bound')) {
      document.documentElement.classList.add('is-admin2-return-watch-bound');
      window.addEventListener('scroll', scheduleAdmin2ReturnVisibility, { passive: true });
      window.addEventListener('resize', scheduleAdmin2ReturnVisibility);
    }

    scheduleAdmin2ReturnVisibility();
  }

  function updateAdmin2PipelineState() {
    const root = document.querySelector('.admin2-pipeline');
    const statusNode = document.querySelector('.admin2-command__status');

    if (!root) {
      return;
    }

    const profile = activeSiteProfile();
    const siteId = activeSiteKey();
    const manifest = adminState.manifest || {};
    const pages = profile ? scopedPagesList(manifest.pages || []) : [];
    const medgenIndex = siteId ? adminState.medgenTaskIndexBySite[siteId] : null;
    const medgenTasks = medgenIndex && Array.isArray(medgenIndex.tasks) ? medgenIndex.tasks : [];
    const medgenCounts = medgenTaskCounts(medgenTasks);
    const previewCounts = medgenPreviewCounts(medgenTasks);
    const releaseStatus = activeReleaseStatus();
    const releaseCounts = admin2PipelineReleaseCounts(releaseStatus);
    const releaseHasStatus = Boolean(releaseStatus);
    const steps = [];
    const intent = selectedAdmin2IntentDefinition();
    const intentReady = admin2TargetState.intentTouched === true;

    updateAdmin2TargetSelector(profile);
    updateSiteDomainDeleteWidget(profile);
    updateAdmin2ActiveSiteContext({
      profile,
      pages,
      medgenIndex,
      medgenCounts,
      previewCounts,
      releaseStatus,
      releaseCounts,
      releaseHasStatus
    });
    updateAdmin2ReviewSummary({
      profile,
      medgenIndex,
      medgenCounts,
      previewCounts,
      releaseStatus,
      releaseCounts,
      releaseHasStatus,
      medgenTasks
    });

    steps.push({
      key: 'intent',
      state: intentReady ? 'ready' : 'pending',
      detail: intentReady ? intent.label : 'выберите: новый сайт или редактура'
    });

    if (!profile) {
      steps.push(
        {
          key: 'site',
          state: intentReady ? 'pending' : 'blocked',
          detail: admin2TargetState.intent === 'create_site' ? 'создайте новый домен' : 'выберите существующий домен'
        },
        { key: 'skeleton', state: 'blocked', detail: 'ожидает сайт' },
        { key: 'content', state: 'blocked', detail: 'ожидает сайт' },
        { key: 'preview', state: 'blocked', detail: 'ожидает контент' },
        { key: 'approval', state: 'blocked', detail: 'ожидает preview' },
        { key: 'deploy', state: 'blocked', detail: 'ожидает approval' }
      );
    } else {
      steps.push({
        key: 'site',
        state: 'ready',
        detail: String(profile.domain || profile.site_id || 'site') + (profile.root_locale ? ' · ' + String(profile.root_locale) : '')
      });

      if (admin2TargetState.intent === 'delete_site') {
        steps.push(
          { key: 'skeleton', state: 'ready', detail: 'не требуется для удаления' },
          { key: 'content', state: 'pending', detail: 'откройте блок удаления и подтвердите домен' },
          { key: 'preview', state: 'blocked', detail: 'не требуется для удаления' },
          { key: 'approval', state: 'blocked', detail: 'archive snapshot обязателен' },
          { key: 'deploy', state: 'blocked', detail: 'Cloudflare/GitHub cleanup без Actions' }
        );
      } else {
      steps.push({
        key: 'skeleton',
        state: pages.length > 0 ? 'ready' : 'pending',
        detail: pages.length > 0 ? pages.length + ' страниц в scope' : 'создайте skeleton'
      });

      if (medgenIndex && medgenIndex.loading) {
        steps.push({ key: 'content', state: 'running', detail: 'читаю MedGen status' });
      } else if (medgenIndex && medgenIndex.error) {
        steps.push({ key: 'content', state: 'error', detail: 'MedGen status не прочитан' });
      } else if (medgenCounts.failed > 0) {
        steps.push({ key: 'content', state: 'error', detail: medgenCounts.failed + ' ошибок MedGen' });
      } else if (medgenCounts.active > 0) {
        steps.push({ key: 'content', state: 'running', detail: medgenCounts.active + ' задач в работе' });
      } else if (medgenCounts.ready > 0) {
        steps.push({ key: 'content', state: 'ready', detail: medgenCounts.ready + ' результатов готово' });
      } else {
        steps.push({ key: 'content', state: 'idle', detail: medgenCounts.total > 0 ? medgenCounts.total + ' задач без ready' : 'создайте MedGen или редактируйте' });
      }

      if (medgenIndex && medgenIndex.loading) {
        steps.push({ key: 'preview', state: 'running', detail: 'жду MedGen status' });
      } else if (previewCounts.failed > 0 || releaseCounts.pages_deploy_failed > 0) {
        steps.push({ key: 'preview', state: 'error', detail: 'preview/deploy требует проверки' });
      } else if (previewCounts.deployed > 0) {
        steps.push({ key: 'preview', state: 'deployed', detail: previewCounts.deployed + ' preview deployed' });
      } else if (previewCounts.deploying > 0) {
        steps.push({ key: 'preview', state: 'running', detail: previewCounts.deploying + ' preview в deploy' });
      } else if (previewCounts.accepted > 0 || releaseCounts.accepted > 0 || releaseCounts.release_queued > 0 || releaseCounts.release_prepared > 0) {
        steps.push({ key: 'preview', state: 'ready', detail: 'preview принято' });
      } else if (previewCounts.ready > 0 || releaseCounts.preview_ready > 0 || previewCounts.explicit_url > 0) {
        steps.push({ key: 'preview', state: 'ready', detail: (previewCounts.ready || releaseCounts.preview_ready || previewCounts.explicit_url) + ' preview готово' });
      } else if (medgenCounts.ready > 0) {
        steps.push({ key: 'preview', state: 'pending', detail: 'соберите Worker preview' });
      } else {
        steps.push({ key: 'preview', state: 'idle', detail: 'ожидает готовый контент' });
      }

      if (releaseStatus && releaseStatus.ok === false) {
        steps.push({ key: 'approval', state: 'error', detail: 'release status не прочитан' });
      } else if (releaseCounts.pages_deploy_requested > 0) {
        steps.push({ key: 'approval', state: 'ready', detail: 'approval принят, deploy идет' });
      } else if (releaseCounts.release_prepared > 0 || releaseCounts.accepted > 0 || releaseCounts.release_queued > 0) {
        steps.push({ key: 'approval', state: 'ready', detail: 'результат принят' });
      } else if (releaseCounts.preview_ready > 0 || previewCounts.ready > 0) {
        steps.push({ key: 'approval', state: 'pending', detail: 'нужно подтвердить preview' });
      } else if (releaseCounts.deployed > 0 || previewCounts.deployed > 0) {
        steps.push({ key: 'approval', state: 'deployed', detail: 'последний approval закрыт' });
      } else {
        steps.push({ key: 'approval', state: 'idle', detail: 'ожидает preview' });
      }

      if (hostingProvider(profile) !== 'cloudflare_pages') {
        steps.push({ key: 'deploy', state: 'ready', detail: 'VPS mirror вторичный' });
      } else if (releaseStatus && releaseStatus.ok === false) {
        steps.push({ key: 'deploy', state: 'error', detail: 'release status недоступен' });
      } else if (releaseCounts.pages_deploy_failed > 0) {
        steps.push({ key: 'deploy', state: 'error', detail: releaseCounts.pages_deploy_failed + ' failed deploy' });
      } else if (releaseCounts.pages_deploy_requested > 0) {
        steps.push({ key: 'deploy', state: 'running', detail: 'Cloudflare Pages deploy идет' });
      } else if (releaseCounts.release_prepared > 0) {
        steps.push({ key: 'deploy', state: 'ready', detail: 'готов к Pages deploy' });
      } else if (releaseCounts.pending > 0 || releaseCounts.accepted > 0 || releaseCounts.release_queued > 0) {
        steps.push({ key: 'deploy', state: 'pending', detail: 'подготовьте runtime release' });
      } else if (releaseCounts.deployed > 0) {
        steps.push({ key: 'deploy', state: 'deployed', detail: 'последний deploy отмечен' });
      } else {
        steps.push({ key: 'deploy', state: releaseHasStatus ? 'ready' : 'idle', detail: releaseHasStatus ? 'новых правок нет' : 'проверьте release status' });
      }
      }
    }

    const computedCurrent = steps.find((step) => ['error', 'running', 'pending', 'idle', 'blocked'].includes(step.state)) || steps[steps.length - 1] || null;
    const manualCurrent = admin2ManualStepKey
      ? steps.find((step) => step.key === admin2ManualStepKey) || null
      : null;
    const current = manualCurrent || computedCurrent;

    if (admin2ManualStepKey && !manualCurrent) {
      admin2ManualStepKey = '';
    }

    root.classList.toggle('has-current', Boolean(current));
    steps.forEach((step) => {
      setAdmin2PipelineStep(step.key, step.state, step.detail, current && current.key === step.key);
    });

    setAdmin2PrimaryAction(admin2PipelineAction(current, { profile, pages, medgenCounts, previewCounts, releaseCounts, releaseStatus }));
    setAdmin2BackAction(admin2PipelineBackAction(current, { profile, pages, medgenCounts, previewCounts, releaseCounts, releaseStatus }));
    setAdmin2RestartAction(Boolean(admin2TargetState.intentTouched || admin2ManualStepKey));
    scheduleAdmin2ReturnVisibility();

    if (statusNode) {
      const currentIndex = current ? steps.findIndex((step) => step.key === current.key) + 1 : 0;
      statusNode.value = current
        ? (current.state === 'error'
          ? 'Шаг ' + currentIndex + ': требует внимания: ' + current.detail + '.'
          : 'Шаг ' + currentIndex + ': ' + current.detail + '.')
        : 'Pipeline готов: выберите следующий рабочий сценарий.';
      statusNode.textContent = statusNode.value;
    }
  }

  function wireAdmin2CommandCenter() {
    document.querySelectorAll('.admin2-command-card[href^="#"]').forEach((link) => {
      if (!(link instanceof HTMLAnchorElement) || link.classList.contains('is-admin2-command-bound')) {
        return;
      }

      link.classList.add('is-admin2-command-bound');
      link.addEventListener('click', () => {
        const target = byId(String(link.getAttribute('href') || '').replace(/^#/, ''));

        if (target && target.tagName.toLowerCase() === 'details') {
          target.open = true;
        }
      });
    });

    wireAdmin2PrimaryAction();
    wireAdmin2BackAction();
    wireAdmin2RestartAction();
    wireAdmin2ReturnAction();
  }

  function siteStageFromReleaseStatus(profile, status) {
    if (!profile) {
      return {
        state: 'blocked',
        summary: 'Сайт не выбран',
        detail: 'Сначала выберите домен в первом блоке. Остальные разделы будут заблокированы.'
      };
    }

    if (hostingProvider(profile) !== 'cloudflare_pages') {
      return {
        state: 'ready',
        summary: 'VPS mirror',
        detail: 'Активный сайт использует SSH mirror. Cloudflare release status для него не нужен.'
      };
    }

    if (!status) {
      return {
        state: 'idle',
        summary: 'Ожидает проверки',
        detail: 'Нажмите обновить, чтобы увидеть очередь публикации выбранного сайта.'
      };
    }

    if (status.ok === false) {
      return {
        state: 'error',
        summary: 'Нужна проверка',
        detail: Array.isArray(status.issues) ? status.issues.join('; ') : 'Release status не загружен.'
      };
    }

    const pending = Number(status.pending_package_count || 0);
    const prepared = Number(status.prepared_package_count || releaseCount(status, 'release_prepared') || 0);
    const deploying = releaseCount(status, 'pages_deploy_requested');
    const failed = releaseCount(status, 'pages_deploy_failed');
    const deployed = releaseCount(status, 'deployed');

    if (failed > 0) {
      return {
        state: 'error',
        summary: 'Есть ошибки deploy',
        detail: 'Для выбранного сайта есть failed deploy пакеты: ' + failed + '. Откройте Release status ниже.',
        action: 'Обновить'
      };
    }

    if (deploying > 0) {
      return {
        state: 'running',
        summary: 'Deploy идет',
        detail: 'Cloudflare Pages deployment запрошен. Дождитесь завершения и обновите статус.'
      };
    }

    if (prepared > 0) {
      return {
        state: 'ready',
        summary: 'Готов к deploy',
        detail: 'Runtime release подготовлен: ' + prepared + ' пакетов. Можно запросить Cloudflare Pages deploy.',
        action: 'Deploy'
      };
    }

    if (pending > 0) {
      return {
        state: 'pending',
        summary: 'Есть правки',
        detail: 'Нужно подготовить runtime release для ' + pending + ' опубликованных пакетов.',
        action: 'Обновить'
      };
    }

    return {
      state: 'ready',
      summary: deployed > 0 ? 'Опубликовано' : 'Чисто',
      detail: deployed > 0
        ? 'Последние пакеты выбранного сайта уже отмечены как deployed.'
        : 'Новых правок для deploy по выбранному сайту нет.'
    };
  }

  function updateSiteStageWidget(status) {
    const state = siteStageFromReleaseStatus(activeSiteProfile(), status);

    setStageWidget('site', state.state, state.summary, state.detail, state.action);
  }

  function normalizedDomainKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
  }

  function medgenTaskPayload(taskRecord) {
    if (!taskRecord || typeof taskRecord !== 'object') {
      return {};
    }

    if (taskRecord.medgen_payload && typeof taskRecord.medgen_payload === 'object') {
      return taskRecord.medgen_payload;
    }

    if (taskRecord.payload && typeof taskRecord.payload === 'object') {
      return taskRecord.payload;
    }

    return {};
  }

  function medgenTaskSiteDomain(taskRecord) {
    const payload = medgenTaskPayload(taskRecord);
    const site = payload.site && typeof payload.site === 'object' ? payload.site : {};

    return normalizedDomainKey(site.domain || site.base_url || taskRecord.site_domain || '');
  }

  function medgenTaskMatchesProfile(taskRecord, profile) {
    if (!profile) {
      return false;
    }

    const profileSiteId = String(profile.site_id || '').trim();
    const taskSiteId = String(taskRecord.site_id || taskRecord.active_site_id || taskRecord.profile_id || '').trim();

    if (profileSiteId && taskSiteId && profileSiteId === taskSiteId) {
      return true;
    }

    const profileDomain = normalizedDomainKey(profile.domain || profile.base_url || '');
    const taskDomain = medgenTaskSiteDomain(taskRecord);

    return Boolean(profileDomain && taskDomain && profileDomain === taskDomain);
  }

  function medgenTaskStatus(taskRecord) {
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};

    return String(task.status || taskRecord.status || taskRecord.medgen_status || '').trim().toLowerCase();
  }

  function medgenTaskProgress(taskRecord) {
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};
    const progress = Number(task.progress || taskRecord.progress || 0);

    return Number.isFinite(progress) && progress > 0 ? Math.min(100, Math.round(progress)) : 0;
  }

  function medgenTaskIsReady(taskRecord) {
    const status = medgenTaskStatus(taskRecord);
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};
    const payload = medgenTaskPayload(taskRecord);
    const article = payload.article && typeof payload.article === 'object' ? payload.article : null;

    return status === 'succeeded' && (
      task.result_ready === true
      || task.has_result === true
      || task.has_article === true
      || article !== null
    );
  }

  function medgenTaskIsFailed(taskRecord) {
    const status = medgenTaskStatus(taskRecord);

    return ['failed', 'error', 'timeout'].includes(status);
  }

  function medgenTaskIsActive(taskRecord) {
    const status = medgenTaskStatus(taskRecord);

    return ['queued', 'running'].includes(status)
      || (!medgenTaskIsReady(taskRecord) && !medgenTaskIsFailed(taskRecord));
  }

  function medgenTaskStage(taskRecord) {
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};

    return String(task.stage || taskRecord.stage || '').trim().toLowerCase();
  }

  function medgenTaskFailedStage(taskRecord) {
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};

    return String(task.failed_stage || taskRecord.failed_stage || '').trim();
  }

  function medgenTaskPreviewStatus(taskRecord) {
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};
    const preview = taskRecord && taskRecord.preview && typeof taskRecord.preview === 'object' ? taskRecord.preview : {};

    return String(taskRecord.preview_status || task.preview_status || preview.status || '').trim().toLowerCase();
  }

  function medgenTaskDisplayState(taskRecord) {
    const status = medgenTaskStatus(taskRecord);
    const previewStatus = medgenTaskPreviewStatus(taskRecord);

    if (['failed', 'error', 'timeout'].includes(status)) {
      return 'critical';
    }

    if (previewStatus === 'deployed' || previewStatus === 'cloudflare_pages_deployed') {
      return 'deployed';
    }

    if (previewStatus === 'pages_deploy_failed' || previewStatus === 'cloudflare_pages_deploy_failed') {
      return 'critical';
    }

    if (previewStatus === 'preview_ready' || medgenTaskPreviewUrl(taskRecord) || status === 'succeeded') {
      return 'preview';
    }

    if (['accepted', 'release_queued', 'release_prepared', 'pages_deploy_requested', 'cloudflare_pages_deploy_requested', 'cloudflare_pages_deploy_building'].includes(previewStatus)) {
      return 'generating';
    }

    if (status === 'queued' || status === 'running') {
      return 'generating';
    }

    if (!status || ['planned', 'skeleton', 'not_requested', 'pending_request', 'draft'].includes(status)) {
      return 'skeleton';
    }

    return 'critical';
  }

  function medgenTaskOfficialStatusHtml(taskRecord) {
    const status = medgenTaskStatus(taskRecord) || 'unknown';
    const stage = medgenTaskStage(taskRecord) || 'unknown';
    const progress = medgenTaskProgress(taskRecord);
    const failedStage = medgenTaskFailedStage(taskRecord);
    const previewStatus = medgenTaskPreviewStatus(taskRecord);
    const lines = [
      '<span>Status: <b>' + escapeHtml(status) + '</b></span>',
      '<span>Stage: <b>' + escapeHtml(stage) + '</b></span>',
      '<span>Progress: <b>' + escapeHtml(String(progress)) + '%</b></span>'
    ];

    if (previewStatus) {
      lines.push('<span>Preview: <b>' + escapeHtml(previewStatus) + '</b></span>');
    }

    if (failedStage) {
      lines.push('<span>Failed: <b>' + escapeHtml(failedStage) + '</b></span>');
    }

    return lines.join('');
  }

  function medgenTaskLabel(taskRecord) {
    const payload = medgenTaskPayload(taskRecord);
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};
    const id = String(task.task_id || taskRecord.task_id || '').slice(0, 12);
    const title = String(payload.page_title || payload.page_key || payload.type || 'MedGen task');
    const status = medgenTaskStatus(taskRecord) || 'unknown';
    const stage = task.stage ? ' / ' + String(task.stage) : '';
    const progress = medgenTaskProgress(taskRecord);

    return title + (id ? ' #' + id : '') + ': ' + status + stage + (progress ? ' · ' + progress + '%' : '');
  }

  function medgenTaskUpdatedAt(taskRecord) {
    const raw = String(taskRecord && taskRecord.updated_at ? taskRecord.updated_at : '');
    const time = raw ? Date.parse(raw) : 0;

    return Number.isFinite(time) ? time : 0;
  }

  function medgenTaskId(taskRecord) {
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};

    return String(task.task_id || taskRecord && taskRecord.task_id || '').trim();
  }

  function medgenTaskRecordById(siteId, taskId) {
    const index = siteId ? adminState.medgenTaskIndexBySite[siteId] : null;
    const tasks = index && Array.isArray(index.tasks) ? index.tasks : [];

    return tasks.find((task) => medgenTaskId(task) === taskId) || null;
  }

  function medgenTaskPreviewUrl(taskRecord) {
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};
    const preview = taskRecord && taskRecord.preview && typeof taskRecord.preview === 'object' ? taskRecord.preview : {};
    const explicit = String(taskRecord && taskRecord.preview_url || task.preview_url || preview.preview_url || '').trim();

    if (explicit) {
      return explicit;
    }

    if (!medgenTaskIsReady(taskRecord)) {
      return '';
    }

    const profile = activeSiteProfile();
    const deploy = profile && profile.deploy_profile && typeof profile.deploy_profile === 'object' ? profile.deploy_profile : {};
    const cloudflare = deploy.cloudflare && typeof deploy.cloudflare === 'object' ? deploy.cloudflare : {};
    const project = String(cloudflare.pages_project || activeSiteKey() || '').trim();
    const pageKey = medgenTaskPageKey(taskRecord);
    const route = medgenTaskRouteFromPageKey(pageKey, medgenTaskTitle(taskRecord));

    return project && route ? 'https://' + project + '.pages.dev' + route : '';
  }

  function medgenTaskTitle(taskRecord) {
    const payload = medgenTaskPayload(taskRecord);
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};

    return String(task.page_title || payload.page_title || payload.page_key || task.type || payload.type || 'MedGen page').trim();
  }

  function medgenTaskPageKey(taskRecord) {
    const payload = medgenTaskPayload(taskRecord);
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};

    return String(task.page_key || payload.page_key || '').trim();
  }

  function medgenTaskRouteFromPageKey(pageKey, title) {
    const key = String(pageKey || '').trim().toLowerCase();
    const mapped = {
      about: 'about',
      editorial_policy: 'editorial-policy',
      experts: 'experts',
      contact: 'contact',
      methodology: 'methodology',
      information_sources: 'information-sources',
      affiliate_disclosure: 'affiliate-disclosure',
      support: 'support',
      faq: 'faq',
      how_to_use: 'how-to-use',
      suggest_supplement: 'suggest-supplement',
      legal_information: 'legal-information',
      disclaimer: 'disclaimer',
      privacy_policy: 'privacy-policy',
      terms_of_use: 'terms-of-use',
      cookie_policy: 'cookie-policy'
    };
    const slug = mapped[key] || String(title || key || '')
      .trim()
      .toLowerCase()
      .replace(/['"`]+/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug ? '/' + slug + '/' : '';
  }

  function medgenTaskType(taskRecord) {
    const payload = medgenTaskPayload(taskRecord);
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};

    return String(task.type || task.task_type || payload.type || '').trim();
  }

  function medgenTaskCounts(tasks) {
    const list = Array.isArray(tasks) ? tasks : [];
    const counts = {
      total: list.length,
      active: list.filter(medgenTaskIsActive).length,
      ready: list.filter(medgenTaskIsReady).length,
      failed: list.filter(medgenTaskIsFailed).length
    };

    counts.pending = Math.max(0, counts.total - counts.ready - counts.failed);

    return counts;
  }

  function medgenTaskRuntimeUpsertPayload(taskRecord, profile) {
    const payload = medgenTaskPayload(taskRecord);
    const task = taskRecord && taskRecord.task && typeof taskRecord.task === 'object' ? taskRecord.task : {};
    const taskId = medgenTaskId(taskRecord);
    const domain = medgenTaskSiteDomain(taskRecord) || normalizedDomainKey(profile && (profile.domain || profile.base_url));

    return {
      task_id: taskId,
      site_id: activeSiteKey(),
      domain,
      type: medgenTaskType(taskRecord),
      page_key: medgenTaskPageKey(taskRecord),
      page_title: medgenTaskTitle(taskRecord),
      status: medgenTaskStatus(taskRecord) || 'queued',
      stage: String(task.stage || '').trim(),
      progress: medgenTaskProgress(taskRecord),
      result_ready: medgenTaskIsReady(taskRecord),
      error: task.error || taskRecord.error || null,
      payload,
      updated_at: String(taskRecord && taskRecord.updated_at ? taskRecord.updated_at : new Date().toISOString())
    };
  }

  function medgenTaskMonitorHtml(tasks) {
    const list = Array.isArray(tasks) ? tasks.slice().sort((a, b) => medgenTaskUpdatedAt(b) - medgenTaskUpdatedAt(a)) : [];

    if (!list.length) {
      return '<p class="empty-state">Для выбранного сайта пока нет MedGen-страниц для preview.</p>';
    }

    const counts = medgenTaskCounts(list);
    const summary = '<div class="medgen-task-monitor__summary">'
      + '<strong>' + escapeHtml(String(counts.total)) + ' страниц</strong>'
      + '<span>готово к preview: ' + escapeHtml(String(counts.ready)) + '</span>'
      + '<span>в работе: ' + escapeHtml(String(counts.active)) + '</span>'
      + '<span>ошибки: ' + escapeHtml(String(counts.failed)) + '</span>'
      + '<button type="button" data-medgen-refresh-statuses>Проверить ответ MedGen</button>'
      + (counts.ready > 0 ? '<span class="medgen-task-monitor__bulk"><b>Отметить все</b><button type="button" data-medgen-select-all-preview>CF</button><button type="button" data-medgen-select-all-ssh>SSH</button></span>' : '')
      + (counts.ready > 0 ? '<button type="button" data-medgen-preview-ready-all>Деплой всех PREVIEW</button>' : '')
      + '</div>';
    const sshAvailable = sshMirrorAvailable(activeSiteProfile());

    const rows = list.slice(0, 24).map((taskRecord) => {
      const id = medgenTaskId(taskRecord);
      const progress = medgenTaskProgress(taskRecord);
      const state = medgenTaskDisplayState(taskRecord);
      const isReady = medgenTaskIsReady(taskRecord);
      const title = medgenTaskTitle(taskRecord);
      const pageKey = medgenTaskPageKey(taskRecord);
      const meta = [medgenTaskType(taskRecord), pageKey, id ? '#' + id.slice(0, 10) : ''].filter(Boolean).join(' · ');
      const previewUrl = medgenTaskPreviewUrl(taskRecord);

      const requestButton = id
        ? '<button type="button" data-medgen-task-request="' + escapeHtml(id) + '">Запросить</button>'
        : '';
      const pollButton = id
        ? '<button type="button" data-medgen-task-poll-row="' + escapeHtml(id) + '">Проверить</button>'
        : '';
      const rowDeployButtons = id && isReady
        ? '<button type="button" data-medgen-task-deploy="' + escapeHtml(id) + '">DeployCF</button>'
          + '<button type="button" data-medgen-task-deploy-ssh="' + escapeHtml(id) + '" ' + (sshAvailable ? '' : 'disabled title="SSH mirror недоступен: нет сохраненного SSH target/secret_refs."') + '>Deploy SSH</button>'
        : '';
      const action = id && isReady
        ? '<span class="medgen-task-row__actions"><button type="button" data-medgen-task-preview="' + escapeHtml(id) + '" data-medgen-existing-preview-url="' + escapeHtml(previewUrl) + '">Посмотреть preview</button>' + rowDeployButtons + '</span>'
        : (id ? '<span class="medgen-task-row__actions">' + requestButton + pollButton + '</span>' : '');
      const selector = '<div class="medgen-task-row__select" title="Отметьте CF для деплоя на Cloudflare Pages, SSH для дополнительного статического дубликата на VPS.">'
        + '<span class="medgen-task-row__select-head">CF</span>'
        + '<span class="medgen-task-row__select-head">SSH</span>'
        + '<label><input type="checkbox" data-medgen-preview-select="' + escapeHtml(id) + '" ' + (isReady ? 'checked' : 'disabled') + '><span class="sr-only">Cloudflare deploy</span></label>'
        + '<label><input type="checkbox" data-medgen-ssh-select="' + escapeHtml(id) + '" ' + (isReady && sshAvailable ? '' : 'disabled') + '><span class="sr-only">SSH mirror deploy</span></label>'
        + '</div>';

      return '<article class="medgen-task-row" data-medgen-task-state="' + escapeHtml(state) + '">'
        + '<span class="medgen-task-row__lamp" aria-hidden="true"></span>'
        + '<div><h4>' + escapeHtml(title) + '</h4><p>' + escapeHtml(meta) + '</p></div>'
        + '<strong class="medgen-task-row__status">' + medgenTaskOfficialStatusHtml(taskRecord) + '</strong>'
        + '<small>' + escapeHtml(String(progress)) + '%</small>'
        + action
        + selector
        + '</article>';
    }).join('');

    return summary + '<div class="medgen-task-monitor__list">' + rows + '</div>';
  }

  function renderMedGenTaskMonitor() {
    const target = document.querySelector('[data-medgen-task-monitor]');

    if (!target) {
      return;
    }

    const siteId = activeSiteKey();
    const index = siteId ? adminState.medgenTaskIndexBySite[siteId] : null;

    if (!siteId) {
      target.innerHTML = '<p class="empty-state">Сначала выберите домен в рабочем сценарии CMS.</p>';
      return;
    }

    if (index && index.loading) {
      target.innerHTML = '<p class="empty-state">Загружаю MedGen-статусы выбранного сайта...</p>';
      return;
    }

    if (index && index.error) {
      target.innerHTML = '<p class="empty-state">MedGen-статусы не прочитаны: ' + escapeHtml(index.error) + '</p>';
      return;
    }

    target.innerHTML = medgenTaskMonitorHtml(index && Array.isArray(index.tasks) ? index.tasks : []);
    wireMedGenTaskMonitor();
    syncSshMirrorToggles();
  }

  function selectedMedGenPreviewTaskIds() {
    return Array.from(document.querySelectorAll('[data-medgen-preview-select]'))
      .filter((input) => input instanceof HTMLInputElement && input.checked && !input.disabled)
      .map((input) => String(input.getAttribute('data-medgen-preview-select') || '').trim())
      .filter(Boolean);
  }

  function selectedMedGenSshTaskIds() {
    return Array.from(document.querySelectorAll('[data-medgen-ssh-select]'))
      .filter((input) => input instanceof HTMLInputElement && input.checked && !input.disabled)
      .map((input) => String(input.getAttribute('data-medgen-ssh-select') || '').trim())
      .filter(Boolean);
  }

  function medgenPreviewResultUrl(result) {
    return String(
      result && result.preview && result.preview.preview_url
        ? result.preview.preview_url
        : result && result.content_package && result.content_package.preview_url
          ? result.content_package.preview_url
          : result && result.preview_url
            ? result.preview_url
            : ''
    ).trim();
  }

  function medgenPreviewResultRequestId(result) {
    return String(
      result && result.request_id
        ? result.request_id
        : result && result.preview && result.preview.request_id
          ? result.preview.request_id
          : result && result.content_package && result.content_package.request_id
            ? result.content_package.request_id
            : ''
    ).trim();
  }

  function medgenPreviewAlreadyAccepted(result) {
    const status = String(
      result && result.content_package && result.content_package.status
        ? result.content_package.status
        : result && result.preview && result.preview.status
          ? result.preview.status
          : ''
    ).trim();

    return ['accepted', 'release_queued', 'release_prepared', 'pages_deploy_requested'].includes(status);
  }

  function openPreviewUrl(url, existingWindow) {
    const href = String(url || '').trim();

    if (!href) {
      return;
    }

    if (existingWindow && !existingWindow.closed) {
      existingWindow.location.href = href;
      return;
    }

    const opened = window.open(href, '_blank', 'noopener');
    if (!opened) {
      window.location.assign(href);
    }
  }

  async function deployMedGenPreviewTasks(siteId, taskIds, source, options) {
    const opts = options || {};
    const ids = Array.from(new Set((Array.isArray(taskIds) ? taskIds : []).map((id) => String(id || '').trim()).filter(Boolean)));
    const previewResults = [];
    const publishResults = [];

    if (!siteId || ids.length === 0) {
      return { ok: false, issues: ['site_id_or_task_ids_missing'], task_ids: ids };
    }

    for (const taskId of ids) {
      const preview = await cloudflareCreateMedGenPreview(siteId, taskId);
      previewResults.push(Object.assign({ task_id: taskId }, preview || {}));

      if (!preview || !preview.ok) {
        publishResults.push({ ok: false, task_id: taskId, issues: ['preview_failed'] });
        continue;
      }

      if (medgenPreviewAlreadyAccepted(preview)) {
        publishResults.push({ ok: true, task_id: taskId, skipped: true, status: 'already_accepted' });
        continue;
      }

      const requestId = medgenPreviewResultRequestId(preview);
      const token = String(preview.preview_token || '').trim();

      if (!requestId || !token) {
        publishResults.push({ ok: false, task_id: taskId, request_id: requestId, issues: ['preview_approval_token_missing'] });
        continue;
      }

      publishResults.push(await cloudflarePublish(siteId, {
        request_id: requestId,
        approval_token: token,
        source: source || 'medgen_preview_deploy'
      }));
    }

    const publishedOk = publishResults.length > 0 && publishResults.every((result) => result && result.ok);
    const runtimeRelease = publishedOk ? await prepareRuntimeReleaseForActiveSite() : null;
    const pagesDeploy = runtimeRelease && runtimeRelease.ok
      ? await requestCloudflarePagesDeployForActiveSite({
          source: source || 'medgen_preview_deploy',
          request_id: 'pages-deploy-medgen-' + Date.now(),
          ssh_mirror_requested: opts.ssh_mirror_requested === true
        })
      : null;

    return {
      ok: Boolean(publishedOk && runtimeRelease && runtimeRelease.ok && pagesDeploy && pagesDeploy.ok),
      action: source || 'medgen_preview_deploy',
      site_id: siteId,
      task_ids: ids,
      preview_results: previewResults,
      publish_results: publishResults,
      runtime_release: runtimeRelease,
      pages_deploy: pagesDeploy
    };
  }

  function wireMedGenTaskMonitor() {
    document.querySelectorAll('[data-medgen-refresh-statuses]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.medgenRefreshStatusesBound === 'true') {
        return;
      }

      button.dataset.medgenRefreshStatusesBound = 'true';
      button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Проверяю...';
        setMedGenStatus('Вручную проверяю MedGen-статусы выбранного сайта.');

        try {
          await refreshMedGenTaskIndexForActiveSite({ force: true, manual: true });
          setMedGenStatus('MedGen-статусы обновлены для выбранного сайта.');
        } finally {
          button.disabled = false;
          button.textContent = 'Проверить ответ MedGen';
        }
      });
    });

    document.querySelectorAll('[data-medgen-select-all-preview]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.medgenSelectAllPreviewBound === 'true') {
        return;
      }

      button.dataset.medgenSelectAllPreviewBound = 'true';
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-medgen-preview-select]').forEach((input) => {
          if (input instanceof HTMLInputElement && !input.disabled) {
            input.checked = true;
          }
        });
      });
    });

    document.querySelectorAll('[data-medgen-select-all-ssh]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.medgenSelectAllSshBound === 'true') {
        return;
      }

      button.dataset.medgenSelectAllSshBound = 'true';
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-medgen-ssh-select]').forEach((input) => {
          if (input instanceof HTMLInputElement && !input.disabled) {
            input.checked = true;
          }
        });
      });
    });

    document.querySelectorAll('[data-medgen-preview-ready-all]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.medgenPreviewReadyAllBound === 'true') {
        return;
      }

      button.dataset.medgenPreviewReadyAllBound = 'true';
      button.addEventListener('click', async () => {
        const siteId = activeSiteKey();
        const index = siteId ? adminState.medgenTaskIndexBySite[siteId] : null;
        const tasks = index && Array.isArray(index.tasks) ? index.tasks : [];
        const selected = selectedMedGenPreviewTaskIds();
        const selectedSsh = selectedMedGenSshTaskIds();
        const selectedUnion = Array.from(new Set(selected.concat(selectedSsh)));
        const ready = (selectedUnion.length > 0 ? selectedUnion : tasks.filter(medgenTaskIsReady).map(medgenTaskId)).filter(Boolean).slice(0, 25);

        if (!siteId || ready.length === 0) {
          setMedGenOutput({ ok: false, issues: ['selected_ready_medgen_tasks_not_found'] });
          return;
        }

        button.disabled = true;
        button.textContent = 'Деплою PREVIEW...';
        const sshRequested = selectedSsh.length > 0;
        setMedGenStatus(sshRequested
          ? 'Деплою выбранные MedGen PREVIEW на Cloudflare Pages и затем запрошу SSH mirror.'
          : 'Деплою выбранные MedGen PREVIEW на домен выбранного сайта.');

        try {
          const result = await deployMedGenPreviewTasks(siteId, ready, 'medgen_preview_batch_deploy', {
            ssh_mirror_requested: sshRequested
          });
          setMedGenOutput(result);
          setMedGenStatus(result && result.ok
            ? 'Выбранные MedGen PREVIEW приняты и отправлены в Cloudflare Pages deploy.'
              + (sshRequested ? ' SSH mirror workflow запрошен отдельно.' : ' GitHub Actions не запускались.')
            : 'Деплой выбранных MedGen PREVIEW не завершен. Проверьте JSON ответа.');
          await refreshRuntimeContentIndexForActiveSite({ silent: true, force: true });
          await refreshReleaseStatusForActiveSite({ silent: true });
          await refreshMedGenTaskIndexForActiveSite({ force: true });
        } finally {
          button.disabled = false;
          button.textContent = 'Деплой всех PREVIEW';
        }
      });
    });

    document.querySelectorAll('[data-medgen-task-preview]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.medgenTaskPreviewBound === 'true') {
        return;
      }

      button.dataset.medgenTaskPreviewBound = 'true';
      button.addEventListener('click', async () => {
        const siteId = activeSiteKey();
        const taskId = String(button.getAttribute('data-medgen-task-preview') || '').trim();
        let previewWindow = null;

        if (!siteId || !taskId) {
          setMedGenOutput({ ok: false, issues: ['site_id_or_task_id_missing'] });
          return;
        }

        button.disabled = true;
        button.textContent = 'Открываю...';

        try {
          previewWindow = window.open('', '_blank', 'noopener');
        } catch (error) {
          previewWindow = null;
        }

        try {
          const result = await cloudflareCreateMedGenPreview(siteId, taskId);

          setMedGenOutput(result);
          setMedGenStatus(result && result.ok
            ? 'MedGen result собран в preview-пакет выбранного сайта.'
            : 'MedGen preview не создан. Проверьте JSON ответа.');

          if (result && result.ok) {
            const previewUrl = medgenPreviewResultUrl(result);

            await refreshRuntimeContentIndexForActiveSite({ silent: true, force: true });
            await refreshReleaseStatusForActiveSite({ silent: true });
            await refreshMedGenTaskIndexForActiveSite({ force: true });

            if (previewUrl) {
              openPreviewUrl(previewUrl, previewWindow);
            } else if (previewWindow && !previewWindow.closed) {
              previewWindow.close();
            }
          } else if (previewWindow && !previewWindow.closed) {
            previewWindow.close();
          }
        } finally {
          button.disabled = false;
          button.textContent = 'Посмотреть preview';
        }
      });
    });

    document.querySelectorAll('[data-medgen-task-deploy]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.medgenTaskDeployBound === 'true') {
        return;
      }

      button.dataset.medgenTaskDeployBound = 'true';
      button.addEventListener('click', async () => {
        const siteId = activeSiteKey();
        const taskId = String(button.getAttribute('data-medgen-task-deploy') || '').trim();

        if (!siteId || !taskId) {
          setMedGenOutput({ ok: false, issues: ['site_id_or_task_id_missing'] });
          return;
        }

        button.disabled = true;
        button.textContent = 'DeployCF...';
        setMedGenStatus('Деплою выбранный MedGen PREVIEW на Cloudflare Pages без SSH mirror.');

        try {
          const result = await deployMedGenPreviewTasks(siteId, [taskId], 'medgen_task_monitor_deploy', {
            ssh_mirror_requested: false
          });

          setMedGenOutput(result);
          setMedGenStatus(result && result.ok
            ? 'MedGen PREVIEW принят и отправлен в Cloudflare Pages deploy. GitHub Actions не запускались.'
            : 'Deploy не завершен. Проверьте release status и JSON ответа.');
          await refreshReleaseStatusForActiveSite({ silent: true });
          await refreshMedGenTaskIndexForActiveSite({ force: true });
        } finally {
          button.disabled = false;
          button.textContent = 'DeployCF';
        }
      });
    });

    document.querySelectorAll('[data-medgen-task-deploy-ssh]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.medgenTaskDeploySshBound === 'true') {
        return;
      }

      button.dataset.medgenTaskDeploySshBound = 'true';
      button.addEventListener('click', async () => {
        const siteId = activeSiteKey();
        const taskId = String(button.getAttribute('data-medgen-task-deploy-ssh') || '').trim();

        if (!siteId || !taskId) {
          setMedGenOutput({ ok: false, issues: ['site_id_or_task_id_missing'] });
          return;
        }

        button.disabled = true;
        button.textContent = 'SSH...';
        setMedGenStatus('Деплою выбранный MedGen PREVIEW на Cloudflare Pages и затем запрошу SSH mirror.');

        try {
          const result = await deployMedGenPreviewTasks(siteId, [taskId], 'medgen_task_monitor_deploy_ssh', {
            ssh_mirror_requested: true
          });

          setMedGenOutput(result);
          setMedGenStatus(result && result.ok
            ? 'MedGen PREVIEW принят, Cloudflare Pages deploy запрошен, SSH mirror workflow запрошен отдельно.'
            : 'Deploy SSH не завершен. Проверьте release status и JSON ответа.');
          await refreshReleaseStatusForActiveSite({ silent: true });
          await refreshMedGenTaskIndexForActiveSite({ force: true });
        } finally {
          button.disabled = false;
          button.textContent = 'Deploy SSH';
        }
      });
    });

    document.querySelectorAll('[data-medgen-task-request]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.medgenTaskRequestBound === 'true') {
        return;
      }

      button.dataset.medgenTaskRequestBound = 'true';
      button.addEventListener('click', async () => {
        const siteId = activeSiteKey();
        const taskId = String(button.getAttribute('data-medgen-task-request') || '').trim();
        const taskRecord = medgenTaskRecordById(siteId, taskId);
        const payload = taskRecord ? medgenTaskPayload(taskRecord) : {};
        const taskIdField = byId('admin-medgen-task-id');

        if (!siteId || !taskId || !payload || Object.keys(payload).length === 0) {
          setMedGenOutput({ ok: false, issues: ['site_id_task_id_or_medgen_payload_missing'] });
          return;
        }

        button.disabled = true;
        button.textContent = 'Запрашиваю...';
        setMedGenStatus('Отправляю выбранную строку в MedGen для генерации контента.');

        try {
          const result = await cloudflareCreateMedGenTask(siteId, { payload });
          let githubResult = null;

          if (result && result.ok && result.task) {
            githubResult = await githubBackupMedGenTask(siteId, result.task, { payload });

            if (taskIdField instanceof HTMLInputElement && result.task.task_id) {
              taskIdField.value = result.task.task_id;
            }
          }

          setMedGenOutput(Object.assign({}, result || {}, {
            action: 'medgen_row_request',
            source_task_id: taskId,
            github: githubResult,
            warnings: ['Запрос отправлен через Cloudflare Worker; GitHub Actions не запускались.']
          }));
          setMedGenStatus(result && result.ok
            ? 'Запрос к MedGen создан. Строка перейдет в статус queued/running после обновления.'
            : 'Запрос к MedGen не создан. Проверьте JSON ответа.');
          await refreshMedGenTaskIndexForActiveSite({ force: true, manual: true });
        } finally {
          button.disabled = false;
          button.textContent = 'Запросить';
        }
      });
    });

    document.querySelectorAll('[data-medgen-task-poll-row]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.medgenTaskPollRowBound === 'true') {
        return;
      }

      button.dataset.medgenTaskPollRowBound = 'true';
      button.addEventListener('click', async () => {
        const siteId = activeSiteKey();
        const taskId = String(button.getAttribute('data-medgen-task-poll-row') || '').trim();
        const field = byId('admin-medgen-task-id');

        if (field instanceof HTMLInputElement) {
          field.value = taskId;
        }

        if (!siteId || !taskId) {
          setMedGenOutput({ ok: false, issues: ['site_id_or_task_id_missing'] });
          return;
        }

        button.disabled = true;
        button.textContent = 'Проверяю...';

        try {
          const result = await cloudflarePollMedGenTask(siteId, taskId);
          let previewResult = null;

          if (result && result.ok && medgenTaskIsReady(medgenTaskRecordFromRuntime(result.task))) {
            previewResult = await cloudflareCreateMedGenPreview(siteId, taskId);
          }

          setMedGenOutput(previewResult ? {
            ok: Boolean(result && result.ok && previewResult.ok),
            action: 'medgen_poll_and_preview',
            poll: result,
            preview: previewResult,
            warnings: ['Проверка и сбор preview прошли через Cloudflare Worker; GitHub Actions не запускались.']
          } : result);
          setMedGenStatus(result && result.ok
            ? (previewResult && previewResult.ok
              ? 'Task_id готов: preview собран на Cloudflare Pages. Нажмите «Посмотреть preview», чтобы открыть ссылку.'
              : 'Task_id проверен через Worker. Статус строки обновлен.')
            : 'Task_id не проверен. Смотрите JSON ответа.');
          await refreshMedGenTaskIndexForActiveSite({ force: true, manual: true });
        } finally {
          button.disabled = false;
          button.textContent = 'Проверить';
        }
      });
    });
  }

  function medgenTaskRecordFromRuntime(task) {
    if (!task || typeof task !== 'object') {
      return null;
    }

    return {
      source: 'cloudflare_runtime',
      site_id: String(task.site_id || ''),
      site_domain: String(task.domain || ''),
      updated_at: String(task.updated_at || ''),
      medgen_payload: task.payload && typeof task.payload === 'object'
        ? task.payload
        : {
            type: task.type || '',
            page_key: task.page_key || '',
            page_title: task.page_title || '',
            site: {
              domain: task.domain || ''
            }
          },
      task: {
        task_id: task.task_id || '',
        status: task.status || '',
        stage: task.stage || '',
        progress: task.progress || 0,
        result_ready: task.result_ready === true,
        has_result: task.has_result === true || task.result_ready === true,
        failed_stage: task.failed_stage || null,
        error: task.error || null,
        preview_url: task.preview_url || '',
        preview_request_id: task.preview_request_id || '',
        preview_status: task.preview_status || ''
      },
      preview: task.preview && typeof task.preview === 'object' ? task.preview : {},
      preview_url: task.preview_url || '',
      preview_request_id: task.preview_request_id || '',
      preview_status: task.preview_status || ''
    };
  }

  function medgenTaskIndexFromRuntimeSummary(summaryPayload) {
    const tasks = [];
    const seen = {};
    const addTask = (task) => {
      const record = medgenTaskRecordFromRuntime(task);
      const id = record && record.task ? String(record.task.task_id || '') : '';

      if (!record || !id || seen[id]) {
        return;
      }

      seen[id] = true;
      tasks.push(record);
    };

    addTask(summaryPayload && summaryPayload.latest_task);
    (Array.isArray(summaryPayload && summaryPayload.tasks) ? summaryPayload.tasks : []).forEach(addTask);
    (Array.isArray(summaryPayload && summaryPayload.active_tasks) ? summaryPayload.active_tasks : []).forEach(addTask);

    return {
      source: 'cloudflare_runtime',
      loaded_at: new Date().toISOString(),
      summary: summaryPayload && summaryPayload.summary && typeof summaryPayload.summary === 'object' ? summaryPayload.summary : {},
      tasks
    };
  }

  function medgenTaskGithubState(runtimeTask, medgenWrapper) {
    const task = runtimeTask && runtimeTask.task && typeof runtimeTask.task === 'object'
      ? runtimeTask.task
      : runtimeTask && typeof runtimeTask === 'object'
        ? runtimeTask
        : {};
    const payload = medgenWrapper && medgenWrapper.payload && typeof medgenWrapper.payload === 'object'
      ? medgenWrapper.payload
      : task.payload && typeof task.payload === 'object'
        ? task.payload
        : {};
    const medgenPayload = payload.payload && typeof payload.payload === 'object' ? payload.payload : payload;

    return {
      task_id: String(task.task_id || ''),
      payload: medgenPayload,
      medgen_payload: medgenPayload,
      task: {
        task_id: task.task_id || '',
        status: task.status || '',
        stage: task.stage || '',
        progress: task.progress || 0,
        failed_stage: task.failed_stage || null,
        error: task.error || null,
        has_article: task.has_article === true || task.has_result === true || task.result_ready === true,
        has_result: task.has_result === true || task.result_ready === true
      },
      updated_at: new Date().toISOString()
    };
  }

  async function githubBackupMedGenTask(siteId, runtimeTask, medgenWrapper) {
    const taskId = String(runtimeTask && runtimeTask.task_id ? runtimeTask.task_id : runtimeTask && runtimeTask.task ? runtimeTask.task.task_id : '').trim();

    if (!taskId || !githubToken()) {
      return { ok: false, issues: ['medgen_task_id_or_github_token_missing'] };
    }

    const path = 'content/medgen/tasks/' + taskId.replace(/[^a-zA-Z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) + '.json';
    const current = await githubReadTextFile(path);
    const state = medgenTaskGithubState(runtimeTask, medgenWrapper);
    const result = await githubSaveJsonFile(path, state, 'Sync MedGen task state: ' + siteId, current.ok ? current.sha : '');

    return Object.assign({}, result, { state_path: path });
  }

  async function syncGithubMedGenTasksToRuntime(siteId, profile, githubTasks, runtimeIndex) {
    const runtimeTasks = runtimeIndex && Array.isArray(runtimeIndex.tasks) ? runtimeIndex.tasks : [];
    const runtimeIds = {};

    runtimeTasks.forEach((task) => {
      const id = medgenTaskId(task);
      if (id) {
        runtimeIds[id] = true;
      }
    });

    const missing = (Array.isArray(githubTasks) ? githubTasks : [])
      .filter((task) => {
        const id = medgenTaskId(task);
        return id && !runtimeIds[id];
      })
      .slice(0, 25);

    if (!siteId || !missing.length || !cloudflareRuntimeForActiveSite()) {
      return { ok: true, synced: 0 };
    }

    const results = await mapWithConcurrency(missing, 3, async (task) => {
      const payload = medgenTaskRuntimeUpsertPayload(task, profile);

      if (!payload.task_id) {
        return { ok: false };
      }

      return cloudflareUpsertMedGenTask(siteId, payload).catch((error) => ({
        ok: false,
        error: error && error.message ? error.message : 'runtime upsert failed'
      }));
    });

    return {
      ok: results.every((result) => result && result.ok),
      synced: results.filter((result) => result && result.ok).length
    };
  }

  function medgenStageFromTaskIndex(profile) {
    if (!profile) {
      return null;
    }

    const siteId = activeSiteKey();
    const index = siteId ? adminState.medgenTaskIndexBySite[siteId] : null;

    if (!index) {
      return null;
    }

    if (index.loading) {
      return {
        state: 'running',
        summary: 'Проверяю задачи',
        detail: 'Админка читает runtime-статус MedGen без запуска долгих GitHub Actions.',
        action: ''
      };
    }

    if (index.error) {
      return {
        state: 'error',
        summary: 'Статус не прочитан',
        detail: index.error,
        action: 'Открыть MedGen'
      };
    }

    const tasks = Array.isArray(index.tasks) ? index.tasks : [];

    if (!tasks.length) {
      return {
        state: 'ready',
        summary: 'Нет активных задач',
        detail: 'Для выбранного сайта нет сохраненных MedGen task_id. Создайте задачу во втором этапе.',
        action: 'Открыть MedGen'
      };
    }

    const sorted = tasks.slice().sort((a, b) => medgenTaskUpdatedAt(b) - medgenTaskUpdatedAt(a));
    const active = sorted.filter(medgenTaskIsActive);
    const ready = sorted.filter(medgenTaskIsReady);
    const failed = sorted.filter(medgenTaskIsFailed);
    const counts = medgenTaskCounts(sorted);
    const latest = sorted[0];
    const latestLabel = latest ? medgenTaskLabel(latest) : '';

    if (failed.length > 0) {
      return {
        state: 'error',
        summary: 'Есть ошибки: ' + failed.length,
        detail: 'MedGen pages: ' + counts.ready + ' ready, ' + counts.active + ' active, ' + counts.failed + ' failed. ' + medgenTaskLabel(failed[0]),
        action: 'Открыть MedGen'
      };
    }

    if (active.length > 0) {
      return {
        state: 'running',
        summary: 'В работе: ' + active.length,
        detail: 'MedGen pages: ' + counts.total + ', preview ready: ' + counts.ready + ', active: ' + counts.active + '. ' + medgenTaskLabel(active[0]) + '. Автообновление не тратит Actions минуты.',
        action: 'Открыть MedGen'
      };
    }

    if (ready.length > 0) {
      return {
        state: 'ready',
        summary: 'Готово: ' + ready.length,
        detail: 'MedGen pages: ' + counts.total + ', preview ready: ' + counts.ready + '. ' + latestLabel + '. Проверьте preview результата и запустите publish/deploy для выбранного сайта.',
        action: 'Открыть MedGen'
      };
    }

    return {
      state: 'idle',
      summary: 'Задачи найдены',
      detail: latestLabel || 'MedGen task JSON найден, но статус не распознан.',
      action: 'Открыть MedGen'
    };
  }

  function updateMedGenStageWidget(state) {
    const profile = activeSiteProfile();
    const siteId = activeSiteKey();
    const saved = siteId ? adminState.medgenStatusBySite[siteId] : null;

    if (state && siteId) {
      adminState.medgenStatusBySite[siteId] = state;
    }

    if (!profile) {
      setStageWidget('medgen', 'blocked', 'Ожидает сайт', 'MedGen работает только после выбора активного сайта.', '');
      renderMedGenTaskMonitor();
      return;
    }

    if (profile.medgen_profile && profile.medgen_profile.enabled === false) {
      setStageWidget('medgen', 'idle', 'Выключен', 'В профиле выбранного сайта MedGen отключен.', '');
      renderMedGenTaskMonitor();
      return;
    }

    const indexed = medgenStageFromTaskIndex(profile);

    if (state) {
      setStageWidget(
        'medgen',
        state.state || 'idle',
        state.summary || 'MedGen',
        state.detail || '',
        state.action || ''
      );
      renderMedGenTaskMonitor();
      return;
    }

    if (indexed) {
      setStageWidget('medgen', indexed.state, indexed.summary, indexed.detail, indexed.action || '');
      renderMedGenTaskMonitor();
      scheduleMedGenTaskRefresh();
      return;
    }

    if (saved) {
      setStageWidget(
        'medgen',
        saved.state || 'idle',
        saved.summary || 'MedGen',
        saved.detail || '',
        saved.action || ''
      );
      renderMedGenTaskMonitor();
      return;
    }

    setStageWidget(
      'medgen',
      'ready',
      'Готов',
      'Второй этап: создайте задачу MedGen для уже выбранного сайта, затем проверьте task_id и опубликуйте результат.',
      ''
    );
    renderMedGenTaskMonitor();
  }

  async function refreshMedGenTaskIndexForActiveSite(options) {
    const opts = options || {};
    const profile = activeSiteProfile();
    const siteId = activeSiteKey();

    if (!profile || !siteId || !isGithubMode() || !githubToken()) {
      updateMedGenStageWidget();
      return;
    }

    const now = Date.now();
    const lastRefresh = Number(adminState.medgenTaskRefreshAtBySite[siteId] || 0);

    if (!opts.force && lastRefresh && now - lastRefresh < 45000) {
      updateMedGenStageWidget();
      return;
    }

    if (adminState.medgenTaskRefreshInFlight) {
      return;
    }

    adminState.medgenTaskRefreshInFlight = true;
    adminState.medgenTaskRefreshAtBySite[siteId] = now;
    adminState.medgenTaskIndexBySite[siteId] = {
      loading: true,
      tasks: Array.isArray(adminState.medgenTaskIndexBySite[siteId] && adminState.medgenTaskIndexBySite[siteId].tasks)
        ? adminState.medgenTaskIndexBySite[siteId].tasks
        : []
    };
    updateMedGenStageWidget();

    try {
      let runtimeIndex = null;
      if (cloudflareRuntimeForActiveSite()) {
        const runtimeSummary = await cloudflareMedGenTaskSummary(siteId);

        if (runtimeSummary && runtimeSummary.ok) {
          runtimeIndex = medgenTaskIndexFromRuntimeSummary(runtimeSummary);
          adminState.medgenTaskIndexBySite[siteId] = runtimeIndex;
          renderAdminMetrics(adminState.manifest || {});
          renderPages(scopedPagesList((adminState.manifest || {}).pages || []));
          updateMedGenStageWidget();
        }
      }

      const directory = await githubListDirectory('content/medgen/tasks');

      if (!directory.ok) {
        if (runtimeIndex) {
          adminState.medgenTaskIndexBySite[siteId] = runtimeIndex;
          renderAdminMetrics(adminState.manifest || {});
          renderPages(scopedPagesList((adminState.manifest || {}).pages || []));
          updateMedGenStageWidget();
          return;
        }

        if (directory.http_status === 404) {
          adminState.medgenTaskIndexBySite[siteId] = {
            loaded_at: new Date().toISOString(),
            tasks: []
          };
          renderAdminMetrics(adminState.manifest || {});
          renderPages(scopedPagesList((adminState.manifest || {}).pages || []));
          updateMedGenStageWidget();
          return;
        }

        adminState.medgenTaskIndexBySite[siteId] = {
          error: Array.isArray(directory.issues) ? directory.issues.join('; ') : 'Не удалось прочитать content/medgen/tasks.',
          tasks: []
        };
        renderAdminMetrics(adminState.manifest || {});
        renderPages(scopedPagesList((adminState.manifest || {}).pages || []));
        updateMedGenStageWidget();
        return;
      }

      const files = directory.entries
        .filter((entry) => entry && entry.type === 'file' && /\.json$/i.test(String(entry.name || entry.path || '')))
        .slice(0, 80);
      const reads = await mapWithConcurrency(files, 4, async (entry) => {
        const path = String(entry.path || '');

        if (!isSafeRepositoryPath(path, 'content/medgen/tasks/')) {
          return null;
        }

        const file = await githubReadTextFile(path);

        if (!file.ok) {
          return null;
        }

        try {
          return JSON.parse(file.content);
        } catch (error) {
          return null;
        }
      });
      const tasks = reads.filter((task) => task && medgenTaskMatchesProfile(task, profile));
      const syncResult = await syncGithubMedGenTasksToRuntime(siteId, profile, tasks, runtimeIndex).catch(() => ({ ok: false, synced: 0 }));

      if (syncResult && syncResult.synced > 0 && cloudflareRuntimeForActiveSite()) {
        const refreshedRuntimeSummary = await cloudflareMedGenTaskSummary(siteId).catch(() => null);

        if (refreshedRuntimeSummary && refreshedRuntimeSummary.ok) {
          runtimeIndex = medgenTaskIndexFromRuntimeSummary(refreshedRuntimeSummary);
        }
      }

      const mergedTasks = [];
      const seen = {};
      const addTask = (task) => {
        const id = String(task && task.task && task.task.task_id ? task.task.task_id : task && task.task_id ? task.task_id : '').trim();

        if (!id || seen[id]) {
          return;
        }

        seen[id] = true;
        mergedTasks.push(task);
      };

      (runtimeIndex && Array.isArray(runtimeIndex.tasks) ? runtimeIndex.tasks : []).forEach(addTask);
      tasks.forEach(addTask);

      adminState.medgenTaskIndexBySite[siteId] = {
        source: runtimeIndex ? 'cloudflare_runtime+github_contents' : 'github_contents',
        loaded_at: new Date().toISOString(),
        summary: runtimeIndex && runtimeIndex.summary ? runtimeIndex.summary : {},
        tasks: mergedTasks
      };
      renderAdminMetrics(adminState.manifest || {});
      renderPages(scopedPagesList((adminState.manifest || {}).pages || []));
      updateMedGenStageWidget();
    } catch (error) {
      adminState.medgenTaskIndexBySite[siteId] = {
        error: 'MedGen task index не загружен: ' + (error && error.message ? error.message : 'network error'),
        tasks: []
      };
      renderAdminMetrics(adminState.manifest || {});
      renderPages(scopedPagesList((adminState.manifest || {}).pages || []));
      updateMedGenStageWidget();
    } finally {
      adminState.medgenTaskRefreshInFlight = false;
    }
  }

  function scheduleMedGenTaskRefresh() {
    if (adminState.medgenTaskRefreshTimer) {
      clearTimeout(adminState.medgenTaskRefreshTimer);
      adminState.medgenTaskRefreshTimer = null;
    }

    const profile = activeSiteProfile();
    const siteId = activeSiteKey();
    const index = siteId ? adminState.medgenTaskIndexBySite[siteId] : null;
    const tasks = index && Array.isArray(index.tasks) ? index.tasks : [];
    const shouldContinue = Boolean(profile && siteId && isGithubMode() && githubToken() && tasks.some(medgenTaskIsActive));

    if (!shouldContinue) {
      return;
    }

    adminState.medgenTaskRefreshTimer = window.setTimeout(() => {
      refreshMedGenTaskIndexForActiveSite({ force: true });
    }, 60000);
  }

  function wireStageWidgetActions() {
    document.querySelectorAll('[data-stage-widget-action]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.stageWidgetBound === 'true') {
        return;
      }

      button.dataset.stageWidgetBound = 'true';
      button.addEventListener('click', () => {
        const widget = button.closest('[data-stage-widget]');
        const widgetKind = widget ? widget.getAttribute('data-stage-widget') : '';

        if (widgetKind === 'medgen' && button.dataset.stageAction !== 'deploy') {
          scrollToAdminSection('medgen', 'admin-medgen-task-id');
          refreshMedGenTaskIndexForActiveSite({ force: true });
          return;
        }

        if (button.dataset.stageAction === 'deploy') {
          requestCloudflarePagesDeployForActiveSite();
          return;
        }

        refreshReleaseStatusForActiveSite({ silent: false });
      });
    });
  }

  function resetReleaseStatusView(message, state) {
    const elements = releaseStatusElements();

    if (!elements.panel) {
      return;
    }

    elements.panel.dataset.releaseStatusState = state || 'idle';

    if (elements.summary) {
      elements.summary.value = message;
      elements.summary.textContent = message;
    }

    elements.counts.forEach((node) => {
      node.textContent = '-';
    });

    if (elements.packages) {
      elements.packages.innerHTML = '<li>Пакетов пока нет.</li>';
    }

    if (elements.batches) {
      elements.batches.innerHTML = '<li>Batch-релизов пока нет.</li>';
    }

    if (elements.deployments) {
      elements.deployments.innerHTML = '<li>Cloudflare Pages deploy пока не запускался.</li>';
    }

    if (state === 'loading') {
      setStageWidget('site', 'running', 'В работе', message, '');
    } else if (state === 'error') {
      updateSiteStageWidget({ ok: false, issues: [message] });
    } else {
      updateSiteStageWidget(null);
    }
  }

  function releaseCount(status, key) {
    const counts = status && status.content_packages && typeof status.content_packages === 'object'
      ? status.content_packages
      : {};

    return Number(counts[key] || 0);
  }

  function releaseSummaryTitle(item) {
    const summary = item && item.summary && typeof item.summary === 'object' ? item.summary : {};
    const title = summary.title || summary.route || summary.target_path || item.request_id || '';

    return String(title || item.package_type || 'package');
  }

  function renderReleaseItems(list, emptyText, formatter) {
    if (!list || !Array.isArray(list) || list.length === 0) {
      return '<li>' + escapeHtml(emptyText) + '</li>';
    }

    return list.slice(0, 5).map(formatter).join('');
  }

  function normalizeDeploymentStatus(status) {
    return String(status || '')
      .replace(/^cloudflare_pages_/, '')
      .replace(/^deploy_/, '')
      .replace(/_/g, ' ');
  }

  function renderReleaseStatus(status) {
    const elements = releaseStatusElements();

    if (!elements.panel) {
      return;
    }

    if (!status || status.ok === false) {
      const issues = status && Array.isArray(status.issues) ? status.issues.join('; ') : 'release-status endpoint недоступен';
      resetReleaseStatusView('Release status не загружен: ' + issues, 'error');
      return;
    }

    const pending = Number(status.pending_package_count || 0);
    const counts = {
      pending,
      accepted: releaseCount(status, 'accepted'),
      preview_ready: releaseCount(status, 'preview_ready'),
      release_prepared: releaseCount(status, 'release_prepared'),
      pages_deploy_requested: releaseCount(status, 'pages_deploy_requested'),
      deployed: releaseCount(status, 'deployed'),
      pages_deploy_failed: releaseCount(status, 'pages_deploy_failed'),
      release_queued: releaseCount(status, 'release_queued')
    };
    const prepared = Number(status.prepared_package_count || counts.release_prepared || 0);
    const latestDeployment = status.pages_deployments && status.pages_deployments.length > 0
      ? status.pages_deployments[0]
      : null;
    const deployText = pending > 0
      ? 'К runtime release готово правок: ' + pending + '.'
      : (prepared > 0
        ? 'Runtime release подготовлен: ' + prepared + ' пакетов ждут publish-адаптер.'
        : (latestDeployment
          ? 'Последний Cloudflare Pages deploy: ' + normalizeDeploymentStatus(latestDeployment.status) + '.'
          : 'Новых принятых правок для deploy нет.'));

    elements.panel.dataset.releaseStatusState = pending > 0 ? 'pending' : (prepared > 0 ? 'prepared' : 'clean');

    if (elements.summary) {
      elements.summary.value = deployText;
      elements.summary.textContent = deployText;
    }

    elements.counts.forEach((node) => {
      const key = node.getAttribute('data-release-status-count') || '';
      node.textContent = Object.prototype.hasOwnProperty.call(counts, key) ? String(counts[key]) : '-';
    });

    if (elements.packages) {
      elements.packages.innerHTML = renderReleaseItems(status.latest_packages, 'Пакетов пока нет.', (item) => {
        const statusText = item && item.status ? item.status : 'unknown';
        const type = item && item.package_type ? item.package_type : 'package';
        return '<li><strong>' + escapeHtml(statusText) + '</strong><span>' + escapeHtml(type + ' · ' + releaseSummaryTitle(item)) + '</span></li>';
      });
    }

    if (elements.batches) {
      elements.batches.innerHTML = renderReleaseItems(status.release_batches, 'Batch-релизов пока нет.', (item) => {
        const statusText = item && item.status ? item.status : 'queued';
        const count = Number(item && item.package_count ? item.package_count : 0);
        const project = item && item.pages_project ? item.pages_project : 'pages';
        const label = project + ' · ' + count + ' pkg';
        const url = item && item.workflow_run_url ? String(item.workflow_run_url) : '';
        const title = url
          ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(label) + '</a>'
          : escapeHtml(label);

        return '<li><strong>' + escapeHtml(statusText) + '</strong><span>' + title + '</span></li>';
      });
    }

    if (elements.deployments) {
      elements.deployments.innerHTML = renderReleaseItems(status.pages_deployments, 'Cloudflare Pages deploy пока не запускался.', (item) => {
        const statusText = normalizeDeploymentStatus(item && item.status ? item.status : 'unknown');
        const project = item && item.pages_project ? item.pages_project : 'pages';
        const count = Number(item && item.package_count ? item.package_count : 0);
        const deploymentUrl = item && item.deployment_url ? String(item.deployment_url) : '';
        const stage = item && item.cloudflare_stage ? ' · ' + String(item.cloudflare_stage) : '';
        const error = item && item.sync_error ? ' · ' + String(item.sync_error) : '';
        const label = project + ' · ' + count + ' pkg' + stage + error;
        const title = deploymentUrl
          ? '<a href="' + escapeHtml(deploymentUrl) + '" target="_blank" rel="noopener">' + escapeHtml(label) + '</a>'
          : escapeHtml(label);

        return '<li><strong>' + escapeHtml(statusText) + '</strong><span>' + title + '</span></li>';
      });
    }

    updateSiteStageWidget(status);
  }

  async function refreshReleaseStatusForActiveSite(options) {
    const profile = activeSiteProfile();
    const elements = releaseStatusElements();
    const opts = options || {};
    const requestSeq = ++adminState.releaseStatusRequestSeq;

    if (!elements.panel) {
      return null;
    }

    if (!profile) {
      resetReleaseStatusView('Выберите Cloudflare Pages сайт, чтобы увидеть очередь релиза.', 'idle');
      return null;
    }

    if (hostingProvider(profile) !== 'cloudflare_pages') {
      resetReleaseStatusView('Для VPS mirror release-status не нужен: deploy идет отдельным SSH-потоком.', 'static_vps');
      return null;
    }

    const siteId = cloudflareSiteIdFromProfile(profile);

    if (!opts.silent) {
      resetReleaseStatusView('Загружаю release status для ' + String(profile.domain || siteId) + '...', 'loading');
    }

    const status = await cloudflareReleaseStatus(siteId);
    const deployments = await cloudflarePagesDeployments(siteId).catch((error) => ({
      ok: false,
      issues: [error && error.message ? error.message : 'pages deployment status unavailable'],
      deployments: []
    }));

    if (requestSeq !== adminState.releaseStatusRequestSeq) {
      return status;
    }

    if (status && status.ok && deployments && deployments.ok) {
      status.pages_deployments = deployments.deployments || [];
      status.pages_deployments_sync_available = deployments.sync_available === true;
    }

    adminState.releaseStatusBySite[siteId] = status || {
      ok: false,
      issues: ['release_status_unavailable']
    };
    renderReleaseStatus(status);
    return status;
  }

  async function prepareRuntimeReleaseForActiveSite() {
    const profile = activeSiteProfile();
    const elements = releaseStatusElements();

    if (!elements.panel) {
      return { ok: false, issues: ['release_status_panel_missing'] };
    }

    if (!profile || hostingProvider(profile) !== 'cloudflare_pages') {
      resetReleaseStatusView('Runtime release доступен только для выбранного Cloudflare Pages сайта.', 'error');
      return { ok: false, issues: ['cloudflare_pages_site_required'] };
    }

    const siteId = cloudflareSiteIdFromProfile(profile);
    const deploy = profile && profile.deploy_profile ? profile.deploy_profile : {};
    const cloudflare = deploy && deploy.cloudflare ? deploy.cloudflare : {};

    if (!siteId) {
      resetReleaseStatusView('Сначала выберите активный домен сайта.', 'error');
      return { ok: false, issues: ['site_context_required'] };
    }

    resetReleaseStatusView('Готовлю runtime release в Cloudflare без GitHub Actions...', 'loading');

    const result = await cloudflarePrepareRuntimeRelease(siteId, {
      request_id: 'runtime-release-' + Date.now(),
      pages_project: cloudflare.pages_project || '',
      source: 'admin_release_status_panel'
    });

    if (result && result.ok) {
      const count = Number(result.package_count || 0);
      const message = count > 0
        ? 'Runtime release подготовлен в Cloudflare: ' + count + ' пакетов. Actions не запускались.'
        : 'Новых accepted правок нет. Actions не запускались.';
      resetReleaseStatusView(message, count > 0 ? 'prepared' : 'clean');
    } else {
      const issues = result && Array.isArray(result.issues) ? result.issues.join('; ') : 'runtime release endpoint недоступен';
      resetReleaseStatusView('Runtime release не подготовлен: ' + issues, 'error');
    }

    await refreshReleaseStatusForActiveSite({ silent: true });
    return result;
  }

  async function requestCloudflarePagesDeployForActiveSite(options) {
    const profile = activeSiteProfile();
    const elements = releaseStatusElements();
    const opts = options || {};

    if (!elements.panel) {
      return { ok: false, issues: ['release_status_panel_missing'] };
    }

    if (!profile || hostingProvider(profile) !== 'cloudflare_pages') {
      resetReleaseStatusView('Cloudflare Pages deploy доступен только для выбранного Cloudflare Pages сайта.', 'error');
      return { ok: false, issues: ['cloudflare_pages_site_required'] };
    }

    const siteId = cloudflareSiteIdFromProfile(profile);
    const deploy = profile && profile.deploy_profile ? profile.deploy_profile : {};
    const cloudflare = deploy && deploy.cloudflare ? deploy.cloudflare : {};

    if (!siteId || !cloudflare.pages_project) {
      resetReleaseStatusView('Для Cloudflare Pages deploy нужен активный домен и pages_project.', 'error');
      return { ok: false, issues: ['site_context_or_pages_project_required'] };
    }

    const sshRequested = opts.ssh_mirror_requested === true
      || (opts.ssh_mirror_requested !== false && sshMirrorRequested('[data-ssh-mirror-deploy]'));
    const sshPayload = sshMirrorPayload(sshRequested, opts.source || 'admin_release_status_panel');

    resetReleaseStatusView(sshRequested
      ? 'Запрашиваю Cloudflare Pages deploy через Worker; после него будет запрошен SSH mirror workflow...'
      : 'Запрашиваю Cloudflare Pages deploy через Worker. GitHub Actions не запускаются...', 'loading');

    const result = await cloudflareRequestPagesDeployment(siteId, {
      request_id: opts.request_id || 'pages-deploy-' + Date.now(),
      pages_project: cloudflare.pages_project || '',
      branch: cloudflare.branch || '',
      force: opts.force === true,
      source: opts.source || 'admin_release_status_panel',
      ssh_mirror_requested: sshRequested,
      ssh_mirror: sshPayload
    });
    let sshMirrorResult = null;

    if (sshRequested && result && result.ok && result.status !== 'no_prepared_release') {
      sshMirrorResult = await requestSshMirrorDeployForActiveSite(opts.source || 'admin_release_status_panel');
      result.ssh_mirror_workflow = sshMirrorResult;
    }

    if (result && result.ok) {
      const count = Number(result.package_count || 0);
      const message = result.status === 'no_prepared_release'
        ? 'Подготовленного runtime release нет. Cloudflare Pages deploy не запускался.'
        : 'Cloudflare Pages deploy запрошен через Worker: ' + count + ' пакетов.'
          + (sshRequested
            ? (sshMirrorResult && sshMirrorResult.ok
              ? ' SSH mirror workflow запрошен отдельно.'
              : ' SSH mirror не запущен: ' + ((sshMirrorResult && Array.isArray(sshMirrorResult.issues) && sshMirrorResult.issues.join('; ')) || 'проверьте deploy workflow/secrets.'))
            : ' GitHub Actions не запускались.');
      resetReleaseStatusView(message, result.status === 'no_prepared_release' ? 'clean' : 'prepared');
    } else {
      const issues = result && Array.isArray(result.issues) ? result.issues.join('; ') : 'pages deployment endpoint недоступен';
      resetReleaseStatusView('Cloudflare Pages deploy не запрошен: ' + issues, 'error');
    }

    await refreshReleaseStatusForActiveSite({ silent: true });
    return result;
  }

  function setBaselineStatus(message, state, seedEnabled) {
    const elements = releaseStatusElements();

    if (elements.baselineStatus) {
      elements.baselineStatus.value = message;
      elements.baselineStatus.textContent = message;
      elements.baselineStatus.dataset.contentBaselineState = state || 'idle';
    }

    if (elements.baselineSeed instanceof HTMLButtonElement) {
      elements.baselineSeed.disabled = seedEnabled !== true;
    }
  }

  function activeSiteBaselineKey() {
    return activeSiteKey() || cloudflareSiteIdFromProfile(activeSiteProfile()) || '';
  }

  function pageContractBaselineSource(page, siteId) {
    const source = clone(page || {});
    const payloadTemplates = source.payload_templates && typeof source.payload_templates === 'object'
      ? source.payload_templates
      : {};
    const draftSave = payloadTemplates.draft_save && typeof payloadTemplates.draft_save === 'object'
      ? payloadTemplates.draft_save
      : {};
    const resource = String(source.resource || source.path || source.target_path || draftSave.resource || draftSave.target_path || '').trim();
    const pageData = draftSave.page && typeof draftSave.page === 'object'
      ? draftSave.page
      : source.page && typeof source.page === 'object'
        ? source.page
        : null;

    if (!resource || !pageData) {
      return null;
    }

    const nextDraftSave = Object.assign({}, draftSave, {
      resource,
      target_path: resource,
      site_id: siteId,
      page: Object.assign({}, pageData, {
        site_id: siteId,
        status: pageData.status || 'published'
      })
    });

    return Object.assign({}, source, {
      resource,
      site_id: siteId,
      payload_templates: Object.assign({}, payloadTemplates, {
        draft_save: nextDraftSave
      })
    });
  }

  function baselineContractsForActiveSite() {
    const contracts = adminState.actionContracts || {};
    const siteId = activeSiteBaselineKey();
    const allPages = Array.isArray(contracts.pages) ? contracts.pages : [];
    const selectedPages = scopedPagesList(allPages);
    const fallbackPages = allPages.filter((page) => !itemSiteId(page));
    const sourcePages = selectedPages.length > 0 ? selectedPages : fallbackPages;
    const seen = new Set();

    return sourcePages
      .map((page) => pageContractBaselineSource(page, siteId))
      .filter((page) => {
        if (!page || seen.has(page.resource)) {
          return false;
        }

        seen.add(page.resource);
        return true;
      });
  }

  function buildRuntimeBaselinePayloadForActiveSite() {
    const profile = activeSiteProfile();
    const siteId = activeSiteBaselineKey();

    if (!profile || hostingProvider(profile) !== 'cloudflare_pages') {
      throw new Error('Baseline доступен только для выбранного Cloudflare Pages сайта.');
    }

    if (!siteId) {
      throw new Error('Сначала выберите активный сайт.');
    }

    const actionContractPages = baselineContractsForActiveSite();

    if (actionContractPages.length === 0) {
      throw new Error('В bootstrap нет страниц для baseline выбранного сайта. Вставьте готовый runtime-index JSON от агента.');
    }

    return {
      request_id: 'baseline-' + Date.now(),
      site_id: siteId,
      content_index: {
        version: 'cmx-site-content-index-v1',
        mode: 'cloudflare_runtime_content',
        site_id: siteId
      },
      action_contract_pages: actionContractPages
    };
  }

  function parseBaselinePayload(raw) {
    let payload;

    try {
      payload = JSON.parse(raw);
    } catch (error) {
      throw new Error('Baseline JSON не читается: ' + (error && error.message ? error.message : String(error)));
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Baseline должен быть JSON-объектом.');
    }

    const siteId = activeSiteBaselineKey();
    const payloadSiteId = String(payload.site_id || payload.content_index && payload.content_index.site_id || '').trim();

    if (payloadSiteId && siteId && payloadSiteId !== siteId) {
      throw new Error('Baseline относится к другому site_id: ' + payloadSiteId + '. Выбран сайт ' + siteId + '.');
    }

    const records = Array.isArray(payload.action_contract_pages)
      ? payload.action_contract_pages
      : Array.isArray(payload.pages)
        ? payload.pages
        : Array.isArray(payload.records)
          ? payload.records
          : [];

    if (records.length === 0) {
      throw new Error('В baseline нет action_contract_pages[], pages[] или records[].');
    }

    const valid = records.filter((record) => {
      const draftSave = record
        && record.payload_templates
        && record.payload_templates.draft_save
        && typeof record.payload_templates.draft_save === 'object'
          ? record.payload_templates.draft_save
          : {};
      const page = record && record.page && typeof record.page === 'object'
        ? record.page
        : draftSave.page && typeof draftSave.page === 'object'
          ? draftSave.page
          : null;
      const resource = String(record && (record.resource || record.path || record.target_path) || draftSave.resource || draftSave.target_path || '').trim();

      return Boolean(page && resource);
    });

    if (valid.length === 0) {
      throw new Error('Baseline не содержит страниц с page и resource/target_path.');
    }

    return Object.assign({}, payload, {
      site_id: siteId || payloadSiteId,
      request_id: payload.request_id || 'baseline-' + Date.now()
    });
  }

  function summarizeBaselinePayload(payload) {
    const records = Array.isArray(payload.action_contract_pages)
      ? payload.action_contract_pages
      : Array.isArray(payload.pages)
        ? payload.pages
        : Array.isArray(payload.records)
          ? payload.records
          : [];
    const routes = records
      .map((record) => {
        const draftSave = record
          && record.payload_templates
          && record.payload_templates.draft_save
          && typeof record.payload_templates.draft_save === 'object'
            ? record.payload_templates.draft_save
            : {};
        const page = record && record.page && typeof record.page === 'object'
          ? record.page
          : draftSave.page && typeof draftSave.page === 'object'
            ? draftSave.page
            : {};

        return String(page.route || record && (record.route || record.resource || record.path) || '').trim();
      })
      .filter(Boolean)
      .slice(0, 4);

    return {
      pages: records.length,
      sample: routes,
      text: 'Baseline готов: ' + records.length + ' страниц' + (routes.length ? ', примеры: ' + routes.join(', ') : '') + '.'
    };
  }

  async function previewBaselinePayload() {
    const elements = releaseStatusElements();
    const siteKey = activeSiteBaselineKey();

    if (!siteKey) {
      setBaselineStatus('Сначала выберите активный Cloudflare Pages сайт.', 'error', false);
      return null;
    }

    if (!elements.baselineJson || !String(elements.baselineJson.value || '').trim()) {
      setBaselineStatus('Соберите baseline из bootstrap или вставьте готовый runtime-index JSON.', 'error', false);
      return null;
    }

    try {
      const raw = String(elements.baselineJson.value || '');
      const payload = parseBaselinePayload(raw);
      const normalizedRaw = JSON.stringify(payload);
      const summary = summarizeBaselinePayload(payload);
      const payloadHash = await sha256Hex(normalizedRaw);

      adminState.contentBaselinePayloadsBySite[siteKey] = payload;
      adminState.contentBaselineApprovalsBySite[siteKey] = {
        payload_hash: payloadHash,
        previewed_at: new Date().toISOString(),
        summary
      };
      setBaselineStatus(summary.text + ' payload sha256 ' + payloadHash.slice(0, 16) + '.', 'ready', true);
      return payload;
    } catch (error) {
      setBaselineStatus(error && error.message ? error.message : String(error), 'error', false);
      return null;
    }
  }

  async function seedBaselineForActiveSite() {
    const profile = activeSiteProfile();
    const siteKey = activeSiteBaselineKey();
    const payload = adminState.contentBaselinePayloadsBySite[siteKey] || await previewBaselinePayload();

    if (!payload || !profile || hostingProvider(profile) !== 'cloudflare_pages') {
      setBaselineStatus('Baseline доступен только для выбранного Cloudflare Pages сайта.', 'error', false);
      return { ok: false, issues: ['cloudflare_pages_site_required'] };
    }

    const approval = adminState.contentBaselineApprovalsBySite[siteKey] || null;

    if (!approval || !approval.payload_hash) {
      setBaselineStatus('Сначала выполните preview baseline и согласуйте payload sha256.', 'error', false);
      return { ok: false, issues: ['content_baseline_preview_required'] };
    }

    setBaselineStatus('Загружаю baseline в Cloudflare runtime без GitHub Actions...', 'loading', false);

    const result = await cloudflareSeedContentBaseline(siteKey, Object.assign({}, payload, {
      request_id: payload.request_id || 'baseline-' + Date.now(),
      approval: {
        accepted: true,
        payload_hash: approval.payload_hash,
        preview_source: 'admin_content_baseline',
        previewed_at: approval.previewed_at || ''
      }
    }));

    if (result && result.ok) {
      setBaselineStatus('Baseline загружен: ' + Number(result.page_count || 0) + ' страниц. GitHub Actions не запускались.', 'done', true);
      const index = await cloudflareRuntimeContentIndex(siteKey);
      if (index && index.ok) {
        mergeRuntimeContentIndex(siteKey, index);
        setRuntimeIndexStatus(runtimeContentIndexSummary(index), runtimeContentIndexHasBaseline(index) ? 'ready' : 'blocked');
        rerenderSiteScopedContent();
      }
    } else {
      const issues = result && Array.isArray(result.issues)
        ? result.issues.join('; ')
        : result && Array.isArray(result.errors)
          ? result.errors.join('; ')
          : 'content-baseline endpoint недоступен';
      setBaselineStatus('Baseline не загружен: ' + issues, 'error', true);
    }

    await refreshReleaseStatusForActiveSite({ silent: true });
    return result;
  }

  function setDirectUploadStatus(message, state, deployEnabled) {
    const elements = releaseStatusElements();

    if (elements.directUploadStatus) {
      elements.directUploadStatus.value = message;
      elements.directUploadStatus.textContent = message;
      elements.directUploadStatus.dataset.directUploadState = state || 'idle';
    }

    if (elements.directUploadDeploy instanceof HTMLButtonElement) {
      elements.directUploadDeploy.disabled = deployEnabled !== true;
    }
  }

  function parseDirectUploadBundle(raw) {
    let bundle;

    try {
      bundle = JSON.parse(raw);
    } catch (error) {
      throw new Error('Bundle JSON не читается: ' + (error && error.message ? error.message : String(error)));
    }

    const files = bundle
      && bundle.direct_upload
      && Array.isArray(bundle.direct_upload.files)
        ? bundle.direct_upload.files
        : null;

    if (!files || files.length === 0) {
      throw new Error('В bundle нет direct_upload.files.');
    }

    files.forEach((file, index) => {
      if (!file || typeof file !== 'object') {
        throw new Error('Файл #' + (index + 1) + ' должен быть объектом.');
      }

      if (!file.path || !file.content_base64) {
        throw new Error('Файл #' + (index + 1) + ' должен иметь path и content_base64.');
      }

      const path = String(file.path);
      if (path.indexOf('..') !== -1 || path.indexOf('\\') !== -1 || path.indexOf('/') === 0) {
        throw new Error('Небезопасный путь в bundle: ' + path);
      }

      const isSpecial = path === '_headers' || path === '_redirects' || path === '_routes.json';
      if (!isSpecial && !file.hash) {
        throw new Error('Файл ' + path + ' должен иметь hash.');
      }
    });

    return bundle;
  }

  function summarizeDirectUploadBundle(bundle) {
    const files = bundle.direct_upload.files || [];
    const special = files.filter((file) => {
      const path = String(file && file.path ? file.path : '');
      return path === '_headers' || path === '_redirects' || path === '_routes.json';
    }).length;
    const bytes = files.reduce((total, file) => total + Number(file && file.size ? file.size : 0), 0);
    const project = bundle.pages_project || 'pages_project из активного сайта';

    return {
      files: files.length,
      special,
      bytes,
      project,
      text: 'Bundle готов: ' + files.length + ' файлов, special ' + special + ', ' + bytes + ' bytes, project ' + project + '.'
    };
  }

  async function sha256Hex(text) {
    if (!window.crypto || !window.crypto.subtle || typeof TextEncoder === 'undefined') {
      return 'sha256-unavailable-' + String(text || '').length;
    }

    const bytes = new TextEncoder().encode(String(text || ''));
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);

    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  function activeSiteDirectUploadKey() {
    return activeSiteKey() || cloudflareSiteIdFromProfile(activeSiteProfile()) || '';
  }

  async function ensureRuntimeIndexReadyForDirectUpload() {
    const siteKey = activeSiteDirectUploadKey();
    let payload = siteKey ? adminState.runtimeContentIndexesBySite[siteKey] : null;

    if (!siteKey) {
      setRuntimeIndexStatus('Сначала выберите Cloudflare Pages сайт.', 'blocked');
      setDirectUploadStatus('Сначала выберите Cloudflare Pages сайт.', 'error', false);
      return false;
    }

    if (!payload) {
      setRuntimeIndexStatus('Проверяю runtime content-index выбранного сайта...', 'loading');
      payload = await refreshRuntimeContentIndexForActiveSite({ silent: true });
    }

    if (!payload || payload.ok === false) {
      setRuntimeIndexStatus('Runtime content-index не загружен. Direct Upload остановлен.', 'error');
      setDirectUploadStatus('Direct Upload остановлен: сначала загрузите runtime content-index выбранного сайта.', 'error', false);
      return false;
    }

    if (!runtimeContentIndexHasBaseline(payload)) {
      setRuntimeIndexStatus(runtimeContentIndexSummary(payload) + ' Сначала загрузите baseline.', 'blocked');
      setDirectUploadStatus('Direct Upload остановлен: baseline выбранного сайта еще не загружен в Worker/R2/D1.', 'error', false);
      return false;
    }

    setRuntimeIndexStatus(runtimeContentIndexSummary(payload), 'ready');
    return true;
  }

  async function previewDirectUploadBundle() {
    const elements = releaseStatusElements();
    const siteKey = activeSiteDirectUploadKey();

    if (!siteKey) {
      setDirectUploadStatus('Сначала выберите активный Cloudflare Pages сайт.', 'error', false);
      return null;
    }

    if (!elements.directUploadJson || !String(elements.directUploadJson.value || '').trim()) {
      setDirectUploadStatus('Вставьте JSON bundle или выберите файл.', 'error', false);
      return null;
    }

    try {
      const runtimeReady = await ensureRuntimeIndexReadyForDirectUpload();
      if (!runtimeReady) {
        return null;
      }

      const raw = String(elements.directUploadJson.value || '');
      const bundle = parseDirectUploadBundle(raw);
      const summary = summarizeDirectUploadBundle(bundle);
      const payloadHash = await sha256Hex(raw);
      adminState.directUploadBundlesBySite[siteKey] = bundle;
      adminState.directUploadApprovalsBySite[siteKey] = {
        payload_hash: payloadHash,
        previewed_at: new Date().toISOString(),
        summary
      };
      setDirectUploadStatus(summary.text + ' payload sha256 ' + payloadHash.slice(0, 16) + '.', 'ready', true);
      return bundle;
    } catch (error) {
      setDirectUploadStatus(error && error.message ? error.message : String(error), 'error', false);
      return null;
    }
  }

  async function requestDirectUploadBundleDeployForActiveSite() {
    const profile = activeSiteProfile();
    const siteKey = activeSiteDirectUploadKey();
    const elements = releaseStatusElements();
    const bundle = adminState.directUploadBundlesBySite[siteKey] || await previewDirectUploadBundle();

    if (!bundle || !profile || hostingProvider(profile) !== 'cloudflare_pages') {
      setDirectUploadStatus('Direct Upload bundle доступен только для выбранного Cloudflare Pages сайта.', 'error', false);
      return { ok: false, issues: ['cloudflare_pages_site_required'] };
    }

    const siteId = cloudflareSiteIdFromProfile(profile);
    const deploy = profile && profile.deploy_profile ? profile.deploy_profile : {};
    const cloudflare = deploy && deploy.cloudflare ? deploy.cloudflare : {};
    const summary = summarizeDirectUploadBundle(bundle);
    const approval = adminState.directUploadApprovalsBySite[siteKey] || null;

    if (!siteId || !cloudflare.pages_project) {
      setDirectUploadStatus('Для deploy нужен активный site_id и pages_project.', 'error', false);
      return { ok: false, issues: ['site_context_or_pages_project_required'] };
    }

    if (!approval || !approval.payload_hash) {
      setDirectUploadStatus('Сначала выполните preview bundle и согласуйте payload sha256.', 'error', false);
      return { ok: false, issues: ['direct_upload_preview_required'] };
    }

    const runtimeReady = await ensureRuntimeIndexReadyForDirectUpload();
    if (!runtimeReady) {
      return { ok: false, issues: ['runtime_content_index_not_ready'] };
    }

    const sshRequested = sshMirrorRequested('[data-ssh-mirror-deploy]');
    const sshPayload = sshMirrorPayload(sshRequested, 'admin_prebuilt_bundle');

    setDirectUploadStatus(sshRequested
      ? 'Отправляю bundle в Cloudflare Worker; после публикации будет запрошен SSH mirror workflow...'
      : 'Отправляю bundle в Cloudflare Worker без GitHub Actions...', 'loading', false);
    resetReleaseStatusView('Отправляю prebuilt bundle в Cloudflare Pages Direct Upload...', 'loading');

    const payload = Object.assign({}, bundle, {
      request_id: bundle.request_id || 'pages-direct-' + Date.now(),
      pages_project: cloudflare.pages_project || bundle.pages_project || '',
      branch: cloudflare.branch || bundle.branch || '',
      source: 'admin_prebuilt_bundle',
      ssh_mirror_requested: sshRequested,
      ssh_mirror: sshPayload,
      approval: Object.assign({}, bundle.approval || {}, {
        accepted: true,
        payload_hash: approval.payload_hash,
        preview_source: 'admin_direct_upload_bundle',
        previewed_at: approval.previewed_at || ''
      })
    });
    const result = await cloudflareRequestPagesDeployment(siteId, payload);
    let sshMirrorResult = null;

    if (sshRequested && result && result.ok) {
      sshMirrorResult = await requestSshMirrorDeployForActiveSite('admin_prebuilt_bundle');
      result.ssh_mirror_workflow = sshMirrorResult;
    }

    if (result && result.ok) {
      const deploymentUrl = result.deployment_url ? ' URL: ' + result.deployment_url : '';
      const message = result.idempotent
        ? 'Deploy bundle уже был создан ранее. Повторный upload не запускался.' + deploymentUrl
        : 'Bundle опубликован: ' + summary.files + ' файлов.'
          + (sshRequested
            ? (sshMirrorResult && sshMirrorResult.ok
              ? ' SSH mirror workflow запрошен отдельно.'
              : ' SSH mirror не запущен: ' + ((sshMirrorResult && Array.isArray(sshMirrorResult.issues) && sshMirrorResult.issues.join('; ')) || 'проверьте deploy workflow/secrets.'))
            : ' GitHub Actions не запускались.')
          + deploymentUrl;
      setDirectUploadStatus(message, 'done', true);
      resetReleaseStatusView(result.idempotent
        ? 'Cloudflare Pages Direct Upload уже существует для этого request_id.'
        : 'Cloudflare Pages Direct Upload запрошен: ' + summary.files + ' файлов.', 'prepared');
    } else {
      const issues = result && Array.isArray(result.issues) ? result.issues.join('; ') : 'pages deployment endpoint недоступен';
      setDirectUploadStatus('Deploy bundle не выполнен: ' + issues, 'error', true);
      resetReleaseStatusView('Deploy bundle не выполнен: ' + issues, 'error');
    }

    await refreshReleaseStatusForActiveSite({ silent: true });
    return result;
  }

  function wireReleaseStatusPanel() {
    const elements = releaseStatusElements();

    if (!elements.refresh
      && !elements.prepare
      && !elements.deploy
      && !elements.runtimeIndexRefresh
      && !elements.directUploadPreview
      && !elements.directUploadDeploy
      && !elements.baselineGenerate
      && !elements.baselinePreview
      && !elements.baselineSeed) {
      return;
    }

    if (elements.refresh && elements.refresh.dataset.releaseStatusBound !== 'true') {
      elements.refresh.dataset.releaseStatusBound = 'true';
      elements.refresh.addEventListener('click', () => {
        refreshReleaseStatusForActiveSite({ silent: false });
      });
    }

    if (elements.prepare && elements.prepare.dataset.runtimeReleaseBound !== 'true') {
      elements.prepare.dataset.runtimeReleaseBound = 'true';
      elements.prepare.addEventListener('click', () => {
        prepareRuntimeReleaseForActiveSite();
      });
    }

    if (elements.deploy && elements.deploy.dataset.cloudflarePagesDeployBound !== 'true') {
      elements.deploy.dataset.cloudflarePagesDeployBound = 'true';
      elements.deploy.addEventListener('click', () => {
        requestCloudflarePagesDeployForActiveSite();
      });
    }

    if (elements.runtimeIndexRefresh && elements.runtimeIndexRefresh.dataset.runtimeIndexRefreshBound !== 'true') {
      elements.runtimeIndexRefresh.dataset.runtimeIndexRefreshBound = 'true';
      elements.runtimeIndexRefresh.addEventListener('click', async () => {
        setRuntimeIndexStatus('Проверяю runtime content-index выбранного сайта...', 'loading');
        const payload = await refreshRuntimeContentIndexForActiveSite({ silent: false });
        if (payload && payload.ok) {
          setRuntimeIndexStatus(runtimeContentIndexSummary(payload), runtimeContentIndexHasBaseline(payload) ? 'ready' : 'blocked');
        }
      });
    }

    if (elements.baselineGenerate && elements.baselineGenerate.dataset.contentBaselineGenerateBound !== 'true') {
      elements.baselineGenerate.dataset.contentBaselineGenerateBound = 'true';
      elements.baselineGenerate.addEventListener('click', async () => {
        try {
          const payload = buildRuntimeBaselinePayloadForActiveSite();
          if (elements.baselineJson) {
            elements.baselineJson.value = JSON.stringify(payload, null, 2);
          }
          await previewBaselinePayload();
        } catch (error) {
          setBaselineStatus(error && error.message ? error.message : String(error), 'error', false);
        }
      });
    }

    if (elements.baselineFile && elements.baselineFile.dataset.contentBaselineFileBound !== 'true') {
      elements.baselineFile.dataset.contentBaselineFileBound = 'true';
      elements.baselineFile.addEventListener('change', async () => {
        const file = elements.baselineFile.files && elements.baselineFile.files[0]
          ? elements.baselineFile.files[0]
          : null;

        if (!file) {
          return;
        }

        try {
          const text = await file.text();
          if (elements.baselineJson) {
            elements.baselineJson.value = text;
          }
          await previewBaselinePayload();
        } catch (error) {
          setBaselineStatus('Файл baseline не прочитан: ' + (error && error.message ? error.message : String(error)), 'error', false);
        }
      });
    }

    if (elements.baselinePreview && elements.baselinePreview.dataset.contentBaselinePreviewBound !== 'true') {
      elements.baselinePreview.dataset.contentBaselinePreviewBound = 'true';
      elements.baselinePreview.addEventListener('click', async () => {
        await previewBaselinePayload();
      });
    }

    if (elements.baselineSeed && elements.baselineSeed.dataset.contentBaselineSeedBound !== 'true') {
      elements.baselineSeed.dataset.contentBaselineSeedBound = 'true';
      elements.baselineSeed.addEventListener('click', () => {
        seedBaselineForActiveSite();
      });
    }

    if (elements.directUploadFile && elements.directUploadFile.dataset.directUploadFileBound !== 'true') {
      elements.directUploadFile.dataset.directUploadFileBound = 'true';
      elements.directUploadFile.addEventListener('change', async () => {
        const file = elements.directUploadFile.files && elements.directUploadFile.files[0]
          ? elements.directUploadFile.files[0]
          : null;

        if (!file) {
          return;
        }

        try {
          const text = await file.text();
          if (elements.directUploadJson) {
            elements.directUploadJson.value = text;
          }
          await previewDirectUploadBundle();
        } catch (error) {
          setDirectUploadStatus('Файл bundle не прочитан: ' + (error && error.message ? error.message : String(error)), 'error', false);
        }
      });
    }

    if (elements.directUploadPreview && elements.directUploadPreview.dataset.directUploadPreviewBound !== 'true') {
      elements.directUploadPreview.dataset.directUploadPreviewBound = 'true';
      elements.directUploadPreview.addEventListener('click', async () => {
        await previewDirectUploadBundle();
      });
    }

    if (elements.directUploadDeploy && elements.directUploadDeploy.dataset.directUploadDeployBound !== 'true') {
      elements.directUploadDeploy.dataset.directUploadDeployBound = 'true';
      elements.directUploadDeploy.addEventListener('click', () => {
        requestDirectUploadBundleDeployForActiveSite();
      });
    }
  }

  function renderSiteWorkflow(manifest) {
    const profiles = siteProfiles(manifest);
    const select = document.querySelector('[data-active-site-select]');
    const status = document.querySelector('[data-active-site-status]');
    const profile = activeSiteProfile();

    if (select) {
      fillSelect(select, [{ value: '', label: 'Выберите домен' }].concat(siteProfileOptions(manifest)));
      select.value = profile ? adminState.activeSiteId : '';

      if (select.dataset.activeSiteBound !== 'true') {
        select.dataset.activeSiteBound = 'true';
        select.addEventListener('change', () => setActiveSite(select.value));
      }
    }

    const fieldValue = {
      domain: profile ? String(profile.domain || '-') : '-',
      locale: profile ? String(profile.root_locale || '-') + (profile.geo_country ? ' / ' + String(profile.geo_country) : '') : '-',
      hosting: profile ? hostingModeLabel(profile) : '-',
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
        : (profiles.length > 0
          ? 'Выберите домен. До выбора редактура, публикация, MedGen, дизайн и deploy заблокированы.'
          : 'Нет профилей сайтов. Создайте профиль перед генерацией и редактурой.');
      status.textContent = status.value;
    }

    wireSiteDomainDeleteWidget();
    updateSiteDomainDeleteWidget(profile);
    syncSiteScopedDefaults(profile);
    syncActiveHostingActions(profile);
    syncSshMirrorToggles();
    syncSiteContextGate(profile, profiles);
    updateSiteStageWidget(null);
    updateMedGenStageWidget();
    wireStageWidgetActions();
    wireReleaseStatusPanel();
    if (!profile) {
      setBaselineStatus('Выберите Cloudflare Pages сайт перед baseline.', 'idle', false);
      setRuntimeIndexStatus('Выберите сайт и проверьте runtime index перед Direct Upload.', 'idle');
    } else if (hostingProvider(profile) !== 'cloudflare_pages') {
      setBaselineStatus('Baseline нужен только для Cloudflare Pages runtime.', 'idle', false);
      setRuntimeIndexStatus('Runtime content-index нужен только для Cloudflare Pages сайтов.', 'idle');
    } else {
      const cachedIndex = adminState.runtimeContentIndexesBySite[String(profile.site_id || '')] || null;
      setRuntimeIndexStatus(cachedIndex
        ? runtimeContentIndexSummary(cachedIndex)
        : 'Runtime content-index еще не проверен для выбранного сайта.', cachedIndex && runtimeContentIndexHasBaseline(cachedIndex) ? 'ready' : 'idle');
    }
    refreshRuntimeContentIndexForActiveSite({ silent: true });
    refreshReleaseStatusForActiveSite({ silent: true });
  }

  function renderSiteFleet(manifest) {
    const profiles = siteProfiles(manifest);
    const select = document.querySelector('[data-site-fleet-select]');
    const status = document.querySelector('[data-site-fleet-status]');
    const cards = document.querySelector('[data-site-fleet-cards]');
    const secrets = document.querySelector('[data-site-fleet-secret-refs]');
    const profile = activeSiteProfile();

    if (select) {
      fillSelect(select, [{ value: '', label: 'Выберите домен' }].concat(siteProfileOptions(manifest)));
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
          + '<dt>Release</dt><dd>' + escapeHtml(releaseStatusLabel(item)) + '</dd>'
          + '<dt>History</dt><dd>' + escapeHtml(releaseHistoryLabel(item)) + '</dd>'
          + (firstWorkflowLink(item)
            ? '<dt>Status</dt><dd><a href="' + escapeHtml(firstWorkflowLink(item).url) + '" target="_blank" rel="noreferrer noopener">' + escapeHtml(firstWorkflowLink(item).label || 'Workflow') + '</a></dd>'
            : '')
          + '<dt>SEO</dt><dd>' + escapeHtml((item.seo && item.seo.hreflang_policy) || 'single_locale_only') + '</dd>'
          + '</dl>'
          + '</article>';
      }).join('');
    }

    if (secrets) {
      secrets.textContent = JSON.stringify(allSecretRefs(profile), null, 2);
    }

    setSiteFleetSecretStatus(profile
      ? 'Готово к проверке GitHub Environment ' + githubEnvironmentForProfile(profile) + '.'
      : 'Выберите профиль сайта, чтобы проверить Environment secrets.');
    populateSiteFleetForm(profile);
    wireSiteFleetPanel();
  }

  function setSiteFleetFormStatus(message) {
    const status = document.querySelector('[data-site-fleet-form-status]');

    if (status) {
      status.value = message;
      status.textContent = message;
    }

    const deleteStatus = document.querySelector('[data-site-domain-delete-status]');

    if (deleteStatus && admin2TargetState.intent === 'delete_site') {
      deleteStatus.value = message;
      deleteStatus.textContent = message;
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
      document.querySelectorAll('[data-site-fleet-field], [data-site-fleet-market-field], [data-site-fleet-route-prefix], [data-site-fleet-deploy-field], [data-site-fleet-cloudflare-field], [data-site-fleet-secret-ref]').forEach((field) => {
        if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
          field.value = '';
        }
      });
      setSiteFleetField('[data-site-fleet-medgen-field="enabled"]', 'true');
      setSiteFleetField('[data-site-fleet-deploy-field="provider"]', 'cloudflare_pages');
      Object.entries(defaultDeploySecretRefs()).forEach(([key, value]) => {
        setSiteFleetField('[data-site-fleet-secret-ref="' + key + '"]', value);
      });
      syncSiteFleetHostingFields();
      return;
    }

    setSiteFleetField('[data-site-fleet-field="site_id"]', profile.site_id || '');
    setSiteFleetField('[data-site-fleet-field="display_name"]', profile.display_name || '');
    setSiteFleetField('[data-site-fleet-field="domain"]', profile.domain || '');
    setSiteFleetField('[data-site-fleet-field="base_url"]', profile.base_url || '');
    setSiteFleetField('[data-site-fleet-field="contact_email"]', profile.contact_email || contactEmailFromDomain(profile.domain || ''));
    setSiteFleetField('[data-site-fleet-field="root_locale"]', profile.root_locale || '');
    setSiteFleetField('[data-site-fleet-field="geo_country"]', profile.geo_country || '');
    setSiteFleetField('[data-site-fleet-field="status"]', profile.status || 'draft');
    setSiteFleetField('[data-site-fleet-market-field="currency"]', profile.market && profile.market.currency ? profile.market.currency : 'USD');
    setSiteFleetField('[data-site-fleet-route-prefix="supplement"]', siteRouteNamespace(profile, 'supplement') || '/bady/');
    setSiteFleetField('[data-site-fleet-route-prefix="author"]', siteRouteNamespace(profile, 'author') || '/experts/');
    setSiteFleetField('[data-site-fleet-route-prefix="article"]', siteRouteNamespace(profile, 'article') || '/guides/');
    setSiteFleetField('[data-site-fleet-deploy-field="provider"]', profile.deploy_profile && profile.deploy_profile.provider ? profile.deploy_profile.provider : 'cloudflare_pages');
    setSiteFleetField('[data-site-fleet-deploy-field="public_root"]', profile.deploy_profile && profile.deploy_profile.public_root ? profile.deploy_profile.public_root : '');
    setSiteFleetField('[data-site-fleet-deploy-field="environment"]', profile.deploy_profile && profile.deploy_profile.environment ? profile.deploy_profile.environment : cloudflareSiteIdFromProfile(profile));
    const cloudflare = profile.deploy_profile && profile.deploy_profile.cloudflare && typeof profile.deploy_profile.cloudflare === 'object'
      ? profile.deploy_profile.cloudflare
      : {};
    setSiteFleetField('[data-site-fleet-cloudflare-field="pages_project"]', cloudflare.pages_project || '');
    setSiteFleetField('[data-site-fleet-cloudflare-field="deploy_hook_url"]', cloudflare.deploy_hook_url || '');
    setSiteFleetField('[data-site-fleet-cloudflare-field="worker_script"]', cloudflare.worker_script || 'cmx-panel-api');
    setSiteFleetField('[data-site-fleet-cloudflare-field="d1_database"]', cloudflare.d1_database || 'cmx_panel');
    setSiteFleetField('[data-site-fleet-cloudflare-field="r2_bucket"]', cloudflare.r2_bucket || 'cmx-sites');
    setSiteFleetField('[data-site-fleet-cloudflare-field="kv_namespace"]', cloudflare.kv_namespace || 'cmx_sessions');
    setSiteFleetField('[data-site-fleet-cloudflare-field="custom_domain_mode"]', cloudflare.custom_domain_mode || 'manual_dns');
    const secretRefs = Object.assign(defaultDeploySecretRefs(), profile.deploy_profile && profile.deploy_profile.secret_refs && typeof profile.deploy_profile.secret_refs === 'object' ? profile.deploy_profile.secret_refs : {});
    Object.entries(secretRefs).forEach(([key, value]) => {
      setSiteFleetField('[data-site-fleet-secret-ref="' + key + '"]', value);
    });
    setSiteFleetField('[data-site-fleet-medgen-field="enabled"]', profile.medgen_profile && profile.medgen_profile.enabled === false ? 'false' : 'true');
    syncSiteFleetHostingFields();
  }

  function collectSiteFleetPayload(operation) {
    const profile = {
      market: {},
      route_namespaces: {},
      deploy_profile: {
        provider: 'cloudflare_pages',
        cloudflare: {},
        secret_refs: defaultDeploySecretRefs()
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

    if (!profile.contact_email && profile.domain) {
      profile.contact_email = contactEmailFromDomain(profile.domain);
    }

    document.querySelectorAll('[data-site-fleet-route-prefix]').forEach((field) => {
      const key = field.getAttribute('data-site-fleet-route-prefix') || '';

      if (key && field instanceof HTMLInputElement && field.value.trim()) {
        profile.route_namespaces[key] = field.value.trim();
      }
    });

    document.querySelectorAll('[data-site-fleet-deploy-field]').forEach((field) => {
      const key = field.getAttribute('data-site-fleet-deploy-field') || '';

      if (key && (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) && field.value.trim()) {
        profile.deploy_profile[key] = field.value.trim();
      }
    });

    document.querySelectorAll('[data-site-fleet-secret-ref]').forEach((field) => {
      const key = field.getAttribute('data-site-fleet-secret-ref') || '';
      const value = field instanceof HTMLInputElement ? field.value.trim() : '';

      if (key && value) {
        profile.deploy_profile.secret_refs[key] = value;
      }
    });

    if (!profile.deploy_profile.environment) {
      profile.deploy_profile.environment = cloudflareSiteIdFromProfile(profile);
    }

    document.querySelectorAll('[data-site-fleet-cloudflare-field]').forEach((field) => {
      const key = field.getAttribute('data-site-fleet-cloudflare-field') || '';

      if (key && (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) && field.value.trim()) {
        profile.deploy_profile.cloudflare[key] = field.value.trim();
      }
    });

    profile.deploy_profile.vps_mirror = {
      enabled: profile.deploy_profile.provider === 'cloudflare_pages' && Boolean(profile.deploy_profile.public_root),
      mode: 'static_copy_only',
      public_root: profile.deploy_profile.public_root || ''
    };

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

  function siteDeleteArchiveTimestamp() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[:.]/g, '-');
  }

  function siteDeleteArchivePath(siteId, timestamp) {
    return 'archives/sites/' + siteId + '/' + timestamp + '/delete-snapshot.json';
  }

  function explicitGithubSiteContentPaths(siteId) {
    const paths = new Set();
    const pages = scopedPagesList((adminState.manifest || {}).pages || []);
    const contracts = adminState.actionContracts && Array.isArray(adminState.actionContracts.pages)
      ? adminState.actionContracts.pages
      : [];

    pages.concat(contracts).forEach((page) => {
      const pageSiteId = String(page && page.site_id ? page.site_id : '').trim();
      const resource = String(page && (page.resource || page.path || page.target_path) ? (page.resource || page.path || page.target_path) : '').trim();

      if (pageSiteId === siteId && isSafeContentPagePath(resource)) {
        paths.add(resource);
      }
    });

    return [...paths].sort();
  }

  function githubSiteConfigPaths(profile, siteId) {
    const paths = new Set(['config/sites/' + siteId + '.json', 'config/sites/' + siteId + '.content-index.json']);
    const contentIndexPath = String(profile && profile.content_index_path ? profile.content_index_path : profile && profile.content_index && profile.content_index.path ? profile.content_index.path : '').trim();

    if (isSafeRepositoryPath(contentIndexPath, 'config/sites/') && contentIndexPath.endsWith('.json')) {
      paths.add(contentIndexPath);
    }

    return [...paths].sort();
  }

  async function readGithubFilesForArchive(paths) {
    const results = await mapWithConcurrency(paths, 3, async (path) => {
      const file = await githubReadTextFile(path);

      return {
        path,
        ok: file.ok,
        sha: file.sha || '',
        content: file.ok ? file.content : '',
        issues: file.issues || [],
        http_status: file.http_status || 0
      };
    });

    return results;
  }

  async function deleteGithubFiles(paths) {
    const results = [];

    for (const path of paths) {
      const current = await githubReadTextFile(path);

      if (!current.ok) {
        results.push({
          ok: current.http_status === 404,
          skipped: current.http_status === 404,
          path,
          issues: current.http_status === 404 ? [] : current.issues || ['read_failed_before_delete']
        });
        continue;
      }

      results.push(await githubDeleteFile(path, 'Delete site file: ' + path, current.sha || ''));
    }

    return results;
  }

  async function buildSiteDeleteArchive(siteId, profile) {
    const timestamp = siteDeleteArchiveTimestamp();
    const configPaths = githubSiteConfigPaths(profile, siteId);
    const contentPaths = explicitGithubSiteContentPaths(siteId);
    const githubFiles = await readGithubFilesForArchive(configPaths.concat(contentPaths));
    const runtimeSnapshot = hostingProvider(profile) === 'cloudflare_pages'
      ? await cloudflareExportSiteSnapshot(siteId)
      : { ok: true, skipped: true, issues: ['cloudflare_runtime_not_used_for_profile'] };
    const releaseStatus = hostingProvider(profile) === 'cloudflare_pages'
      ? await cloudflareReleaseStatus(siteId).catch(() => ({ ok: false, issues: ['release_status_unavailable'] }))
      : { ok: true, skipped: true };

    const archivePath = siteDeleteArchivePath(siteId, timestamp);
    const runtimeSnapshotOk = hostingProvider(profile) !== 'cloudflare_pages' || Boolean(runtimeSnapshot && runtimeSnapshot.ok);
    const runtimeSnapshotIssues = runtimeSnapshotOk
      ? []
      : (runtimeSnapshot && runtimeSnapshot.issues ? runtimeSnapshot.issues : runtimeSnapshot && runtimeSnapshot.errors ? runtimeSnapshot.errors : ['runtime_snapshot_failed']);
    const archive = {
      version: 'cmx-site-delete-archive-v1',
      created_at: new Date().toISOString(),
      site_id: siteId,
      domain: String(profile && profile.domain ? profile.domain : ''),
      profile,
      github: {
        branch: githubBranch(),
        repository: githubRepository(),
        config_paths: configPaths,
        explicit_content_paths: contentPaths,
        files: githubFiles
      },
      cloudflare: {
        runtime_snapshot: runtimeSnapshot && runtimeSnapshot.snapshot ? runtimeSnapshot.snapshot : runtimeSnapshot,
        release_status: releaseStatus
      },
      delete_plan: {
        no_github_actions: true,
        archive_path: archivePath,
        can_continue_cleanup: runtimeSnapshotOk,
        blockers: runtimeSnapshotOk ? [] : ['cloudflare_runtime_snapshot_failed'],
        steps: [
          'save_archive_to_github_contents',
          'delete_cloudflare_pages_project_and_domains',
          'delete_cloudflare_runtime_site_scope',
          'delete_github_site_config_and_explicit_content_files'
        ],
        vps_mirror: {
          configured: Boolean(profile && profile.deploy_profile && (profile.deploy_profile.public_root || profile.deploy_profile.vps_mirror && profile.deploy_profile.vps_mirror.enabled)),
          cleanup: 'not_run_from_browser_without_no_actions_cleanup_runtime'
        }
      }
    };

    return {
      ok: true,
      archive_path: archivePath,
      archive,
      runtime_snapshot_ok: runtimeSnapshotOk,
      warnings: runtimeSnapshotOk ? [] : ['Cloudflare runtime snapshot failed before cleanup: ' + runtimeSnapshotIssues.join('; ')],
      config_paths: configPaths,
      content_paths: contentPaths
    };
  }

  function removeSiteFromBrowserState(siteId) {
    const manifest = adminState.manifest || {};

    if (Array.isArray(manifest.sites)) {
      manifest.sites = manifest.sites.filter((site) => String(site && site.site_id ? site.site_id : '') !== siteId);
    }

    if (Array.isArray(manifest.pages)) {
      manifest.pages = manifest.pages.filter((page) => String(page && page.site_id ? page.site_id : '') !== siteId);
    }

    if (Array.isArray(manifest.content_indexes)) {
      manifest.content_indexes = manifest.content_indexes.filter((index) => String(index && index.site_id ? index.site_id : '') !== siteId);
    }

    if (adminState.actionContracts && Array.isArray(adminState.actionContracts.pages)) {
      adminState.actionContracts.pages = adminState.actionContracts.pages.filter((page) => String(page && page.site_id ? page.site_id : '') !== siteId);
    }

    delete adminState.releaseStatusBySite[siteId];
    delete adminState.runtimeContentIndexesBySite[siteId];
    delete adminState.medgenTaskIndexBySite[siteId];
    adminState.activeSiteId = '';
    writeStoredActiveSite('');
  }

  async function runSiteFullDeleteAction() {
    if (!isGithubMode()) {
      setSiteFleetFormStatus('Полное удаление доступно только в GitHub Pages admin с GitHub token.');
      setSiteFleetOutput({ ok: false, issues: ['github_pages_admin_required'] });
      return;
    }

    const profile = activeSiteProfile();
    const siteId = cloudflareSiteIdFromProfile(profile || {});
    const domain = String(profile && profile.domain ? profile.domain : '').trim();

    if (!profile || !siteId || !domain) {
      setSiteFleetFormStatus('Сначала выберите активный домен для удаления.');
      setSiteFleetOutput({ ok: false, issues: ['active_site_required', 'domain_required'] });
      return;
    }

    const confirmCheckbox = document.querySelector('[data-site-domain-delete-confirm]');
    if (confirmCheckbox instanceof HTMLInputElement && (!confirmCheckbox.checked || confirmCheckbox.dataset.siteId !== siteId)) {
      openSiteDomainDeleteWidget();
      setSiteFleetFormStatus('Сначала подтвердите checkbox в блоке удаления выбранного домена.');
      setSiteFleetOutput({ ok: false, issues: ['domain_delete_checkbox_required'], site_id: siteId, domain });
      scrollToAdminSection('site-workflow', 'admin-site-domain-delete-confirm');
      return;
    }

    const vpsConfigured = Boolean(profile.deploy_profile && (profile.deploy_profile.public_root || profile.deploy_profile.vps_mirror && profile.deploy_profile.vps_mirror.enabled));
    const confirmation = [
      'Полностью удалить сайт ' + domain + '?',
      '',
      'Будет создан GitHub archive snapshot с [skip ci], затем будут очищены Cloudflare Pages project/domain bindings, runtime D1/R2/KV scope и GitHub config только для site_id=' + siteId + '.',
      vpsConfigured ? 'VPS mirror с браузера не очищается: для этого нужен отдельный no-Actions cleanup runtime с SSH-доступом. GitHub Actions не будут запущены.' : '',
      '',
      'Продолжить?'
    ].filter(Boolean).join('\n');

    if (!window.confirm(confirmation)) {
      setSiteFleetFormStatus('Полное удаление отменено.');
      return;
    }

    setSiteFleetFormStatus('Готовлю обязательный архив сайта перед удалением...');
    setStatusBusy('admin-site-fleet-status', true);

    const result = {
      ok: false,
      action: 'site_full_delete_no_actions',
      site_id: siteId,
      domain,
      steps: {}
    };
    let finalDomainDeleteStatus = '';

    try {
      const archive = await buildSiteDeleteArchive(siteId, profile);
      result.steps.build_archive = archive;

      if (!archive.ok) {
        setSiteFleetOutput(result);
        setSiteFleetFormStatus('Удаление остановлено: не удалось собрать archive snapshot.');
        return;
      }

      const existingArchive = await githubReadTextFile(archive.archive_path);
      const archiveSave = await githubSaveJsonFile(archive.archive_path, archive.archive, 'Archive site before full delete: ' + siteId, existingArchive.ok ? existingArchive.sha : '');
      result.steps.save_archive = archiveSave;
      result.archive_path = archive.archive_path;

      if (!archiveSave.ok) {
        finalDomainDeleteStatus = 'Удаление остановлено: archive snapshot не сохранен в GitHub.';
        setSiteFleetOutput(result);
        setSiteFleetFormStatus(finalDomainDeleteStatus);
        return;
      }

      if (archive.runtime_snapshot_ok === false) {
        result.warnings = archive.warnings || ['cloudflare_runtime_snapshot_failed'];
        finalDomainDeleteStatus = 'Архив сохранен, но удаление остановлено: Cloudflare Worker не вернул runtime snapshot. Обновите Worker и повторите cleanup.';
        setSiteFleetOutput(result);
        setSiteFleetFormStatus(finalDomainDeleteStatus);
        return;
      }

      if (hostingProvider(profile) === 'cloudflare_pages') {
        setSiteFleetFormStatus('Удаляю Cloudflare Pages project и domain bindings...');
        const pagesDelete = await cloudflareDeletePagesProject(siteId);
        result.steps.cloudflare_pages_delete = pagesDelete;

        if (!pagesDelete.ok) {
          finalDomainDeleteStatus = 'Архив сохранен, но удаление остановлено: Cloudflare Pages/domain cleanup не прошел.';
          setSiteFleetOutput(result);
          setSiteFleetFormStatus(finalDomainDeleteStatus);
          return;
        }

        setSiteFleetFormStatus('Удаляю runtime scope сайта в Cloudflare D1/R2/KV...');
        const runtimeDelete = await cloudflareDeleteSiteRuntime(siteId, domain);
        result.steps.cloudflare_runtime_delete = runtimeDelete;

        if (!runtimeDelete.ok) {
          finalDomainDeleteStatus = 'Архив сохранен, но удаление остановлено: Cloudflare runtime cleanup не прошел.';
          setSiteFleetOutput(result);
          setSiteFleetFormStatus(finalDomainDeleteStatus);
          return;
        }
      } else {
        result.steps.cloudflare_pages_delete = { ok: true, skipped: true, reason: 'profile_provider_not_cloudflare_pages' };
        result.steps.cloudflare_runtime_delete = { ok: true, skipped: true, reason: 'profile_provider_not_cloudflare_pages' };
      }

      setSiteFleetFormStatus('Удаляю GitHub config/content только для выбранного site_id...');
      const deletePaths = archive.config_paths.concat(archive.content_paths);
      const githubDeletes = await deleteGithubFiles(deletePaths);
      result.steps.github_deletes = githubDeletes;
      result.ok = githubDeletes.every((item) => item && item.ok);
      result.archive_path = archive.archive_path;
      result.warnings = vpsConfigured
        ? ['VPS mirror не очищен: браузер не получает SSH secrets, а GitHub Actions запрещены. Нужен отдельный no-Actions cleanup runtime.']
        : [];

      if (result.ok) {
        removeSiteFromBrowserState(siteId);
        renderSiteWorkflow(adminState.manifest || {});
        renderSiteFleet(adminState.manifest || {});
        renderAdminMetrics(adminState.manifest || {});
        setSectionCounts(adminState.manifest || {}, adminState.actionContracts || {});
      }

      setSiteFleetOutput(result);
      setSiteFleetFormStatus(result.ok
        ? 'Сайт удален из Cloudflare runtime/Pages и GitHub config. Архив: ' + archive.archive_path
        : 'Удаление завершилось частично; проверьте JSON результата.');
    } finally {
      setStatusBusy('admin-site-fleet-status', false);
      updateSiteDomainDeleteWidget(activeSiteProfile());
      if (finalDomainDeleteStatus && !result.ok) {
        setSiteFleetFormStatus(finalDomainDeleteStatus);
      }
    }
  }

  async function runSiteFleetAction(operation, dryRun) {
    if (!isGithubMode()) {
      setSiteFleetFormStatus('Site Fleet сохраняется через CMS-admin_v2 на GitHub Pages.');
      setSiteFleetOutput({ ok: false, issues: ['github_pages_admin_required'] });
      return;
    }

    const collected = collectSiteFleetPayload(operation);
    const profile = collected.profile && typeof collected.profile === 'object' ? collected.profile : {};
    const provider = profile.deploy_profile && profile.deploy_profile.provider === 'static_vps' ? 'static_vps' : 'cloudflare_pages';
    const siteId = cloudflareSiteIdFromProfile(profile);
    const pendingEnvironmentSecretNames = Object.keys(collectSiteFleetEnvironmentSecretValues(profile));

    const environmentSecretConfirmSuffix = pendingEnvironmentSecretNames.length
      ? ' Заполненные Environment secrets будут зашифрованы и записаны.'
      : '';
    const confirmationMessage = operation === 'archive_site'
      ? 'Удалить сайт и домен из активной панели? Профиль будет переведен в archived; публичные Cloudflare/VPS файлы и DNS/domain binding не удаляются без отдельного workflow.'
      : (provider === 'cloudflare_pages'
          ? 'Сохранить профиль сайта в Cloudflare runtime и GitHub Contents без запуска Actions?' + environmentSecretConfirmSuffix
          : 'Сохранить legacy VPS профиль через GitHub Actions?' + environmentSecretConfirmSuffix);

    if (!dryRun && !window.confirm(confirmationMessage)) {
      setSiteFleetFormStatus('Операция отменена');
      return;
    }

    setSiteFleetFormStatus(dryRun ? 'Проверяю профиль сайта...' : 'Сохраняю профиль сайта...');
    setStatusBusy('admin-site-fleet-status', true);

    try {
      if (provider === 'cloudflare_pages') {
        const issues = [];

        if (!siteId) {
          issues.push('site_id_required');
        }
        if (!profile.domain) {
          issues.push('domain_required');
        }
        if (!profile.base_url) {
          issues.push('base_url_required');
        }

        if (operation === 'archive_site') {
          profile.status = 'archived';
        }

        if (dryRun || issues.length > 0) {
          const validation = {
            ok: issues.length === 0,
            action: 'site_fleet_low_cost_validate',
            dry_run: true,
            site_id: siteId,
            issues
          };

          setSiteFleetOutput(validation);
          setSiteFleetFormStatus(validation.ok ? 'Профиль валиден. Сохранение не запустит Actions.' : 'Профиль требует правки.');
          return;
        }

        const environmentResult = pendingEnvironmentSecretNames.length
          ? await saveEnvironmentSecretsForProfile(Object.assign({}, profile, { site_id: siteId }), { skipConfirm: true })
          : { ok: true, skipped: true, written_names: [] };

        if (!environmentResult.ok) {
          setSiteFleetOutput({
            ok: false,
            action: 'site_fleet_environment_secret_save',
            site_id: siteId,
            environment_secrets: {
              ok: false,
              environment: environmentResult.environment || githubEnvironmentForProfile(profile),
              written_names: environmentResult.written_names || [],
              issues: environmentResult.issues || []
            }
          });
          setSiteFleetFormStatus('Профиль не сохранен: Environment secrets не записаны.');
          setSiteFleetSecretSaveStatus('Environment secrets не записаны: ' + (environmentResult.issues || ['unknown error']).join('; ') + '. Поля с ошибкой оставлены для повторной попытки или ручной очистки.');
          return;
        }

        if (pendingEnvironmentSecretNames.length) {
          setSiteFleetSecretSaveStatus('Environment secrets записаны: ' + (environmentResult.written_names || []).join(', '));
        }

        const runtimeResult = await cloudflareUpsertSiteProfile(Object.assign({}, profile, { site_id: siteId }));
        const path = 'config/sites/' + siteId + '.json';
        const current = await githubReadTextFile(path);
        const githubResult = await githubSaveJsonFile(path, Object.assign({}, profile, { site_id: siteId }), 'Sync site profile: ' + siteId, current.ok ? current.sha : '');
        const result = {
          ok: runtimeResult.ok && githubResult.ok && environmentResult.ok,
          action: 'site_fleet_low_cost_save',
          site_id: siteId,
          runtime: runtimeResult,
          github: githubResult,
          environment_secrets: {
            ok: environmentResult.ok,
            environment: environmentResult.environment || githubEnvironmentForProfile(profile),
            written_names: environmentResult.written_names || [],
            issues: environmentResult.issues || []
          },
          written_paths: githubResult.written_paths || [],
          warnings: ['Cloudflare Pages профиль сохранен без GitHub Actions; commit содержит [skip ci].']
        };

        mergeRuntimeSiteProfiles([{ site_id: siteId, profile: Object.assign({}, profile, { site_id: siteId }) }]);
        setSiteFleetOutput(result);
        setSiteFleetFormStatus(result.ok
          ? 'Профиль сохранен в Cloudflare runtime и GitHub. Environment secrets: ' + (environmentResult.skipped ? 'не менялись.' : 'записаны.')
          : 'Профиль сохранен не полностью; проверьте JSON ответа.');
        if (pendingEnvironmentSecretNames.length) {
          setSiteFleetSecretSaveStatus(environmentResult.ok
            ? 'Environment secrets записаны: ' + (environmentResult.written_names || []).join(', ')
            : 'Environment secrets не записаны: ' + (environmentResult.issues || ['unknown error']).join('; '));
          await checkActiveSiteEnvironmentSecrets();
        }
        return;
      }

      if (!dryRun && pendingEnvironmentSecretNames.length) {
        const environmentResult = await saveEnvironmentSecretsForProfile(profile, { skipConfirm: true });

        if (!environmentResult.ok) {
          setSiteFleetOutput({
            ok: false,
            action: 'site_fleet_environment_secret_save',
            site_id: siteId,
            environment_secrets: {
              ok: false,
              environment: environmentResult.environment || githubEnvironmentForProfile(profile),
              written_names: environmentResult.written_names || [],
              issues: environmentResult.issues || []
            }
          });
          setSiteFleetFormStatus('Workflow не запущен: Environment secrets не записаны.');
          setSiteFleetSecretSaveStatus('Environment secrets не записаны: ' + (environmentResult.issues || ['unknown error']).join('; '));
          return;
        }

        setSiteFleetSecretSaveStatus('Environment secrets записаны: ' + (environmentResult.written_names || []).join(', '));
        await checkActiveSiteEnvironmentSecrets();
      }

      const result = await githubDispatchCommand('site_fleet', collected, dryRun);

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
    const archiveButtons = document.querySelectorAll('[data-site-fleet-archive]');
    const checkSecretsButton = document.querySelector('[data-site-fleet-check-secrets]');
    const saveEnvironmentSecretsButton = document.querySelector('[data-site-fleet-save-environment-secrets]');
    const clearEnvironmentSecretValuesButton = document.querySelector('[data-site-fleet-clear-environment-secret-values]');

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

    archiveButtons.forEach((archiveButton) => {
      if (!(archiveButton instanceof HTMLButtonElement) || archiveButton.dataset.siteFleetBound === 'true') {
        return;
      }

      archiveButton.dataset.siteFleetBound = 'true';
      archiveButton.addEventListener('click', () => {
        if (archiveButton.disabled || archiveButton.getAttribute('aria-disabled') === 'true') {
          return;
        }

        runSiteFullDeleteAction();
      });
    });

    if (checkSecretsButton && checkSecretsButton.dataset.siteFleetBound !== 'true') {
      checkSecretsButton.dataset.siteFleetBound = 'true';
      checkSecretsButton.addEventListener('click', () => checkActiveSiteEnvironmentSecrets());
    }

    if (saveEnvironmentSecretsButton && saveEnvironmentSecretsButton.dataset.siteFleetBound !== 'true') {
      saveEnvironmentSecretsButton.dataset.siteFleetBound = 'true';
      saveEnvironmentSecretsButton.addEventListener('click', () => saveActiveSiteEnvironmentSecrets());
    }

    if (clearEnvironmentSecretValuesButton && clearEnvironmentSecretValuesButton.dataset.siteFleetBound !== 'true') {
      clearEnvironmentSecretValuesButton.dataset.siteFleetBound = 'true';
      clearEnvironmentSecretValuesButton.addEventListener('click', () => clearActiveSiteEnvironmentSecretValues());
    }

    const providerField = document.querySelector('[data-site-fleet-deploy-field="provider"]');
    if (providerField && providerField.dataset.siteFleetProviderBound !== 'true') {
      providerField.dataset.siteFleetProviderBound = 'true';
      providerField.addEventListener('change', syncSiteFleetHostingFields);
    }

    syncSiteFleetHostingFields();
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
    const pages = scopedPagesList(contracts.pages);

    fillSelect(pageSelect, pages.map((page) => ({
      value: page.resource,
      label: pageOptionLabel(page)
    })));

    if (current && pages.some((page) => page.resource === current)) {
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

    if (!payload.contact_email && site.domain) {
      const contactEmail = contactEmailFromDomain(site.domain);
      if (contactEmail) {
        payload.contact_email = contactEmail;
      }
    }
    if (payload.contact_email && payload.site && typeof payload.site === 'object' && !payload.site.contact_email) {
      payload.site.contact_email = payload.contact_email;
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

  async function runMedGenWorkflow(dryRun, mode) {
    if (!isGithubMode()) {
      setMedGenStatus('MedGen доступен только в CMS-admin_v2 на GitHub Pages.');
      setMedGenOutput({ ok: false, issues: ['github_pages_admin_required'] });
      return;
    }

    if (!requireActiveSiteContext(setMedGenStatus, setMedGenOutput)) {
      return;
    }

    const workflowMode = mode || (dryRun ? 'create_task' : 'create_task');
    const isPoll = workflowMode === 'poll_task';
    const taskIdField = byId('admin-medgen-task-id');
    const taskId = taskIdField && taskIdField.value.trim() ? taskIdField.value.trim() : '';

    if (isPoll && !taskId) {
      setMedGenStatus('Укажите task_id для проверки готовности.');
      setMedGenOutput({ ok: false, issues: ['medgen_task_id_required'] });
      return;
    }

    if (!dryRun && !isPoll && !window.confirm('Создать MedGen task_id? Для Cloudflare-сайта это пройдет через Worker без GitHub Actions.')) {
      setMedGenStatus('MedGen запуск отменен');
      return;
    }

    if (!dryRun && isPoll && !window.confirm('Проверить MedGen task_id? Для Cloudflare-сайта это пройдет через Worker без GitHub Actions.')) {
      setMedGenStatus('Проверка MedGen отменена');
      return;
    }

    const config = readGithubConfig();
    const timeoutField = byId('admin-medgen-timeout');
    const intervalField = byId('admin-medgen-interval');
    const deployField = byId('admin-medgen-deploy');
    const workflow = config.medgen_workflow_id || 'medgen-content.yml';
    const payload = collectMedGenPayload();
    const siteId = activeSiteKey();

    if (cloudflareRuntimeForActiveSite()) {
      setMedGenStatus(dryRun ? 'Проверяю MedGen payload...' : (isPoll ? 'Проверяю MedGen task_id через Worker...' : 'Создаю MedGen task_id через Worker...'));
      updateMedGenStageWidget({
        state: dryRun ? 'idle' : 'running',
        summary: dryRun ? 'Проверка payload' : (isPoll ? 'Runtime poll' : 'Runtime create'),
        detail: dryRun
          ? 'Проверяется структура запроса без публикации.'
          : 'Статус пишется в Cloudflare runtime и GitHub Contents с [skip ci], GitHub Actions не запускаются.'
      });
      setStatusBusy('admin-medgen-status', true);

      try {
        if (dryRun) {
          const validation = {
            ok: Boolean(payload && payload.payload && payload.payload.type && payload.payload.page_title && siteId),
            action: 'medgen_runtime_validate',
            dry_run: true,
            site_id: siteId,
            payload,
            issues: []
          };

          if (!siteId) {
            validation.issues.push('active_site_required');
          }
          if (!payload.payload || !payload.payload.type) {
            validation.issues.push('medgen_type_required');
          }
          if (!payload.payload || !payload.payload.page_title) {
            validation.issues.push('page_title_required');
          }

          validation.ok = validation.issues.length === 0;
          setMedGenOutput(validation);
          setMedGenStatus(validation.ok ? 'Payload валиден. Runtime create не потратит Actions.' : 'Payload требует правки.');
          updateMedGenStageWidget({
            state: validation.ok ? 'ready' : 'error',
            summary: validation.ok ? 'Payload готов' : 'Payload ошибка',
            detail: validation.ok ? 'Можно создать task_id через Worker.' : validation.issues.join('; ')
          });
          return;
        }

        const runtimeResult = isPoll
          ? await cloudflarePollMedGenTask(siteId, taskId)
          : await cloudflareCreateMedGenTask(siteId, payload);
        let githubResult = null;
        let previewResult = null;

        if (runtimeResult && runtimeResult.ok && runtimeResult.task) {
          if (isPoll && medgenTaskIsReady(medgenTaskRecordFromRuntime(runtimeResult.task))) {
            previewResult = await cloudflareCreateMedGenPreview(siteId, runtimeResult.task.task_id || taskId);
          }

          githubResult = await githubBackupMedGenTask(siteId, runtimeResult.task, payload);

          if (!isPoll && taskIdField instanceof HTMLInputElement && runtimeResult.task.task_id) {
            taskIdField.value = runtimeResult.task.task_id;
          }

          adminState.medgenTaskIndexBySite[siteId] = {
            loaded_at: new Date().toISOString(),
            tasks: [medgenTaskRecordFromRuntime(runtimeResult.task)].filter(Boolean)
          };
          updateMedGenStageWidget();
        }

        const combined = {
          ok: Boolean(runtimeResult && runtimeResult.ok),
          action: isPoll ? 'medgen_runtime_poll' : 'medgen_runtime_create',
          site_id: siteId,
          runtime: runtimeResult,
          preview: previewResult,
          github: githubResult,
          warnings: ['GitHub Actions не запускались. Task state сохранен в runtime и продублирован в GitHub Contents с [skip ci].']
        };
        const status = runtimeResult && runtimeResult.task ? runtimeResult.task.status : '';

        setMedGenOutput(combined);
        setMedGenStatus(combined.ok
          ? (isPoll
            ? (previewResult && previewResult.ok ? 'MedGen task_id проверен, preview собран на Cloudflare Pages.' : 'MedGen task_id проверен через Worker.')
            : 'MedGen task_id создан через Worker и сохранен в статусах.')
          : 'MedGen runtime операция не выполнена.');
        updateMedGenStageWidget(combined.ok
          ? {
            state: status === 'succeeded' ? 'ready' : (status === 'failed' ? 'error' : 'running'),
            summary: status === 'succeeded' ? 'Контент готов' : (status === 'failed' ? 'MedGen ошибка' : 'MedGen в работе'),
            detail: runtimeResult && runtimeResult.task
              ? medgenTaskLabel(medgenTaskRecordFromRuntime(runtimeResult.task))
              : 'Runtime ответ не содержит task.',
            action: status === 'succeeded' ? 'Deploy' : 'Открыть MedGen'
          }
          : {
            state: 'error',
            summary: 'MedGen runtime ошибка',
            detail: runtimeResult && Array.isArray(runtimeResult.issues) ? runtimeResult.issues.join('; ') : 'Worker не создал/не проверил задачу.'
          });
        window.setTimeout(() => refreshMedGenTaskIndexForActiveSite({ force: true }), 8000);
      } finally {
        setStatusBusy('admin-medgen-status', false);
      }

      return;
    }

    setMedGenStatus(dryRun ? 'Проверяю MedGen payload...' : (isPoll ? 'Проверяю MedGen task_id...' : 'Создаю MedGen task_id...'));
    updateMedGenStageWidget({
      state: dryRun ? 'idle' : 'running',
      summary: dryRun ? 'Проверка payload' : (isPoll ? 'Проверка task_id' : 'Создание task_id'),
      detail: dryRun
        ? 'Проверяется структура запроса без публикации.'
        : 'Workflow должен завершиться быстро и не ждать 15-30 минут генерации MedGen.'
    });
    setStatusBusy('admin-medgen-status', true);

    try {
      const result = await githubDispatchWorkflow(workflow, {
        medgen_payload_json: JSON.stringify(payload),
        dry_run: dryRun ? 'true' : 'false',
        mode: dryRun ? 'create_task' : workflowMode,
        task_id: taskId,
        poll_timeout_seconds: timeoutField && timeoutField.value.trim() ? timeoutField.value.trim() : '1800',
        poll_interval_seconds: intervalField && intervalField.value.trim() ? intervalField.value.trim() : '5',
        deploy_static_vps: deployField && deployField.checked && !dryRun && hostingProvider(activeSiteProfile()) === 'static_vps' ? 'true' : 'false',
        target: 'production'
      }, config.medgen_actions_url || '');

      setMedGenOutput(result);
      setMedGenStatus(result.ok ? (isPoll ? 'Проверка MedGen запущена. Если задача готова, результат будет применен.' : 'MedGen task creation запущен. Workflow не будет ждать 15-30 минут.') : 'MedGen workflow не запущен.');
      const medgenReady = result && (
        result.status === 'succeeded'
        || result.medgen_status === 'succeeded'
        || (result.task && result.task.status === 'succeeded')
      );
      updateMedGenStageWidget(result.ok
        ? {
          state: medgenReady ? 'ready' : (isPoll ? 'pending' : (dryRun ? 'ready' : 'running')),
          summary: medgenReady ? 'Контент готов' : (isPoll ? 'Ожидает результат' : (dryRun ? 'Payload готов' : 'Task создан')),
          detail: medgenReady
            ? 'MedGen вернул готовый результат для выбранного сайта. Проверьте preview и запустите deploy.'
            : (isPoll
              ? 'Проверка task_id запущена. Если MedGen еще работает, Actions не должны ждать долгую генерацию.'
              : (dryRun
                ? 'Payload валиден для выбранного сайта.'
                : 'Task_id создан отдельно от долгого ожидания. Вернитесь позже и запустите проверку task_id.')),
          action: medgenReady ? 'Deploy' : ''
        }
        : {
          state: 'error',
          summary: 'MedGen не запущен',
          detail: Array.isArray(result.issues) ? result.issues.join('; ') : 'Workflow вернул ошибку.'
        });
      if (result.ok && !dryRun) {
        window.setTimeout(() => refreshMedGenTaskIndexForActiveSite({ force: true }), 12000);
      }
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

  function contactEmailFromDomain(value) {
    const domain = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .replace(/[^a-z0-9.-]+/g, '');

    return domain && domain.includes('.') ? 'support@' + domain : '';
  }

  function fillDomainDefaults() {
    const domainField = byId('admin-domain-name');
    const baseUrlField = byId('admin-domain-base-url');
    const emailField = byId('admin-domain-email');
    const tlsEmailField = byId('admin-deploy-tls-email');
    const deployEnvironmentField = byId('admin-deploy-environment');
    const deployRootField = byId('admin-deploy-root-path');
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
      emailField.value = contactEmailFromDomain(domain);
    }

    if (domain && tlsEmailField && !tlsEmailField.value.trim()) {
      tlsEmailField.value = contactEmailFromDomain(domain);
    }

    if (domain && deployEnvironmentField && !deployEnvironmentField.value.trim()) {
      deployEnvironmentField.value = slugFromDomainValue(domain);
    }

    if (domain && deployRootField && !deployRootField.value.trim()) {
      deployRootField.value = '/var/www/' + domain;
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
    payload.deploy_profile = collectDomainDeployProfilePayload();

    return payload;
  }

  function collectDomainDeployTargetPayload() {
    const target = collectDomainDeployFormPayload();

    if (target.provider === 'cloudflare_pages') {
      return {
        enabled: false,
        deploy_after_build: false,
        bootstrap_ubuntu: false,
        provision_tls: false,
        domain: '',
        tls_email: '',
        host: '',
        port: 22,
        user: '',
        root_path: '',
        identity_file: ''
      };
    }

    return target;
  }

  function collectDomainDeployFormPayload() {
    const target = {};

    document.querySelectorAll('[data-domain-deploy-field]').forEach((field) => {
      const key = field.getAttribute('data-domain-deploy-field') || '';

      if (!key || key === 'environment') {
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

  function collectDomainDeployProfilePayload() {
    const deployTarget = collectDomainDeployFormPayload();
    const provider = deployTarget.provider === 'static_vps' ? 'static_vps' : 'cloudflare_pages';
    const environmentField = byId('admin-deploy-environment');
    const domainField = byId('admin-domain-name');
    const environment = environmentField && environmentField.value.trim()
      ? environmentField.value.trim()
      : slugFromDomainValue(domainField && domainField.value ? domainField.value : '');
    const profile = {
      provider,
      environment: environment || 'production',
      secret_refs: defaultDeploySecretRefs()
    };

    if (provider === 'cloudflare_pages') {
      profile.cloudflare = {};
      document.querySelectorAll('[data-domain-cloudflare-field]').forEach((field) => {
        const key = field.getAttribute('data-domain-cloudflare-field') || '';

        if (key && (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) && field.value.trim()) {
          profile.cloudflare[key] = field.value.trim();
        }
      });
      profile.public_root = deployTarget.enabled ? (deployTarget.root_path || '') : '';
      profile.vps_mirror = {
        enabled: Boolean(deployTarget.enabled),
        mode: 'static_copy_only',
        public_root: deployTarget.enabled ? (deployTarget.root_path || '') : ''
      };
    } else {
      profile.public_root = deployTarget.root_path || '';
      profile.vps_mirror = {
        enabled: false,
        mode: 'static_copy_only',
        public_root: ''
      };
    }

    return profile;
  }

  async function runSiteRebrandAction(authContract, dryRun) {
    const contract = activeAuthContract(authContract);
    const path = siteRebrandEndpoint(contract, dryRun);
    const payload = collectDomainProfilePayload();
    const provider = payload && payload.deploy_profile && payload.deploy_profile.provider === 'static_vps'
      ? 'static_vps'
      : 'cloudflare_pages';

    if (isGithubMode() && provider === 'cloudflare_pages') {
      if (!dryRun && !window.confirm('Сохранить Cloudflare Pages профиль в Worker/D1 без запуска GitHub Actions?')) {
        setDomainStatus('Применение отменено');
        return;
      }

      setDomainStatus(dryRun ? 'Проверяю Cloudflare профиль локально...' : 'Сохраняю Cloudflare профиль в Worker/D1...');
      setStatusBusy('admin-domain-status', true);

      try {
        const siteId = cloudflareSiteIdFromProfile(payload);
        const validation = {
          ok: Boolean(siteId && payload.domain && payload.base_url && payload.deploy_profile.cloudflare && payload.deploy_profile.cloudflare.pages_project),
          action: 'cloudflare_site_profile_validate',
          dry_run: dryRun,
          site_id: siteId,
          issues: []
        };

        if (!siteId) {
          validation.issues.push('site_id_required');
        }
        if (!payload.domain) {
          validation.issues.push('domain_required');
        }
        if (!payload.base_url) {
          validation.issues.push('base_url_required');
        }
        if (!payload.deploy_profile.cloudflare || !payload.deploy_profile.cloudflare.pages_project) {
          validation.issues.push('cloudflare_pages_project_required');
        }

        if (dryRun || !validation.ok) {
          setDomainOutput(validation);
          setDomainStatus(validation.ok ? 'Cloudflare профиль валиден; Actions не нужны.' : 'Cloudflare профиль требует правки.');
          return;
        }

        const result = await cloudflareUpsertSiteProfile(Object.assign({ status: 'configured' }, payload));

        setDomainOutput(result);
        setDomainStatus(result.ok ? 'Cloudflare профиль сохранен в Worker/D1. Редактура сайта теперь может идти без Actions.' : 'Cloudflare профиль не сохранен.');
      } finally {
        setStatusBusy('admin-domain-status', false);
      }

      return;
    }

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

    const providerField = document.querySelector('[data-domain-hosting-provider-select]');
    if (providerField && providerField.value === 'cloudflare_pages') {
      setServerMaintenanceStatus('VPS обслуживание скрыто для Cloudflare Pages профиля.');
      setServerMaintenanceOutput({ ok: false, issues: ['static_vps_required'] });
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
      ? contracts.pages.filter((page) => page && page.resource && !page.create_mode && belongsToActiveSite(page))
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
    help.textContent = '?';
    help.addEventListener('mouseenter', () => showFloatingHelp(help));
    help.addEventListener('focus', () => showFloatingHelp(help));
    help.addEventListener('mouseleave', hideFloatingHelp);
    help.addEventListener('blur', hideFloatingHelp);

    return help;
  }

  function floatingHelpNode() {
    let node = document.querySelector('[data-admin-floating-help]');

    if (!node) {
      node = document.createElement('div');
      node.className = 'admin-tooltip';
      node.setAttribute('role', 'tooltip');
      node.setAttribute('data-admin-floating-help', 'true');
      node.hidden = true;
      document.body.appendChild(node);
    }

    return node;
  }

  function showFloatingHelp(help) {
    alignHelpBubble(help);

    if (!help || typeof help.getBoundingClientRect !== 'function') {
      return;
    }

    const text = help.dataset.tooltip || help.getAttribute('aria-label') || '';
    const tooltip = floatingHelpNode();

    if (!text || !tooltip) {
      return;
    }

    tooltip.textContent = text;
    tooltip.hidden = false;
    tooltip.dataset.visible = 'true';

    requestAnimationFrame(() => {
      const margin = 10;
      const helpRect = help.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      let left = helpRect.left + helpRect.width / 2 - tooltipRect.width / 2;
      let top = helpRect.top - tooltipRect.height - 8;

      if (top < margin) {
        top = helpRect.bottom + 8;
      }

      left = Math.max(margin, Math.min(left, viewportWidth - tooltipRect.width - margin));
      top = Math.max(margin, Math.min(top, viewportHeight - tooltipRect.height - margin));

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    });
  }

  function hideFloatingHelp() {
    const tooltip = document.querySelector('[data-admin-floating-help]');

    if (!tooltip) {
      return;
    }

    tooltip.dataset.visible = 'false';
    tooltip.hidden = true;
  }

  function tooltipBoundary(help) {
    return help.closest('.admin-section, .admin-spoiler, .editorial-panel, .domain-design, .design-favicon-tool, .metric, .page-row, .module-card, .workflow-card, .workflow-page, .site-fleet-card, .admin-page-card, .admin-root') || document.documentElement;
  }

  function alignHelpBubble(help) {
    if (!help || typeof help.getBoundingClientRect !== 'function') {
      return;
    }

    const margin = 14;
    const minWidth = 180;
    const preferredWidth = 352;
    const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const boundaryRect = tooltipBoundary(help).getBoundingClientRect();
    const helpRect = help.getBoundingClientRect();
    const boundaryLeft = Math.max(margin, boundaryRect.left + margin);
    const boundaryRight = Math.min(viewportWidth - margin, boundaryRect.right - margin);
    const availableWidth = Math.max(minWidth, boundaryRight - boundaryLeft);
    const width = Math.max(minWidth, Math.min(preferredWidth, availableWidth, viewportWidth - margin * 2));
    const centerLeft = helpRect.left + helpRect.width / 2 - width / 2;
    const centerRight = centerLeft + width;

    help.style.setProperty('--tooltip-max-width', width + 'px');

    if (centerLeft < boundaryLeft) {
      help.dataset.tooltipAlign = 'start';
      return;
    }

    if (centerRight > boundaryRight) {
      help.dataset.tooltipAlign = 'end';
      return;
    }

    help.dataset.tooltipAlign = 'center';
  }

  function insertHelpBubble(container, afterNode, text, type) {
    if (!container || !text) {
      return;
    }

    const marker = type || 'static';

    if (container.querySelector('.field-help[data-admin-help="' + marker + '"]')) {
      return;
    }

    const help = createHelpBubble(text);

    help.dataset.adminHelp = marker;
    help.classList.add('field-help--' + marker);

    if (afterNode && afterNode.parentNode === container && typeof afterNode.after === 'function') {
      afterNode.after(help);
      return;
    }

    container.appendChild(help);
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

  function enhanceSectionSummaryHelp() {
    const helps = {
      'site-workflow': 'Главный сценарий CMS. Здесь сначала выбирается активный домен. Пока домен не выбран, редактура, карточки, MedGen, дизайн и deploy заблокированы.',
      'main-workspace': 'Рабочая область выбранного сайта. Внутри находятся редактура страниц и карточки товаров для активного домена.',
      editorial: 'Редактирует существующие страницы или создает новые страницы сайта. Матрица показывает только поля, которые относятся к выбранному типу или странице.',
      'product-cards': 'Создает и редактирует карточки товаров. Без выбранного домена поля заблокированы, чтобы случайно не изменить другой сайт.',
      'role-permissions': 'Раздел пользователей, ролей и API-ключей ИИ-агента. Human-профили admin и editor имеют одинаковые права; agent keys можно ограничивать отдельно.',
      'site-launch': 'Отдельный поток для нового домена: профиль сайта, GEO, дизайн, сервер, SSL и первый статический deploy.',
      medgen: 'Раздел для задач внешнего генератора контента. MedGen не пишет сайт напрямую: сначала создается задача, затем preview и только потом сохранение.',
      sites: 'Список профилей сайтов. Здесь хранится домен, GEO, locale, deploy profile и имена secret_refs без вывода реальных секретов.',
      design: 'Настройки визуального профиля, логотипа и favicon выбранного сайта. Изменения применяются только к активному домену.',
      technical: 'Технические инструменты выбранного сайта: контент, legacy payload composer, модули и системные сведения.',
      content: 'Инвентарь страниц. Здесь видно route, тип страницы, статус и быстрый переход в редактор выбранной страницы.',
      workflow: 'Legacy payload composer для ручного контроля старых draft-команд. Для обычной редактуры лучше использовать редактор публикаций.',
      modules: 'Справочник модулей страниц: где модуль может использоваться и какие SEO hooks он дает.',
      system: 'Системная информация админки: auth endpoints, runtime роли, audit и диагностические данные.'
    };

    document.querySelectorAll('[data-section-panel]').forEach((panel) => {
      const name = panel.getAttribute('data-section-panel') || '';
      const summary = Array.from(panel.children).find((child) => child.tagName && child.tagName.toLowerCase() === 'summary');
      const label = summary ? summary.querySelector('span') : null;

      if (!summary || !helps[name]) {
        return;
      }

      insertHelpBubble(summary, label, helps[name], 'section');
    });

    document.querySelectorAll('.editorial-panel > summary, .domain-design > summary, .design-favicon-tool > summary, .workflow-page > summary, .site-workflow__direct-upload > summary').forEach((summary) => {
      const text = String(summary.textContent || '').trim();
      const lower = text.toLowerCase();
      let help = '';

      if (lower.includes('матрица')) {
        help = 'Матрица определяет, какие строки и блоки будут доступны для заполнения или публикации на выбранной странице.';
      } else if (lower.includes('выбран')) {
        help = 'В этом блоке появляются поля, которые отмечены в матрице. Изменения попадут в payload сохранения.';
      } else if (lower.includes('медиа')) {
        help = 'Здесь загружается или привязывается изображение. Для публикации нужен корректный путь и понятный alt-текст.';
      } else if (lower.includes('связ')) {
        help = 'Связи управляют тем, где новая или измененная страница будет появляться: главная, каталог, связанные блоки, подвал.';
      } else if (lower.includes('очеред') || lower.includes('публикац')) {
        help = 'Здесь выполняется проверка, сохранение в GitHub и отдельный запуск сборки/deploy после подтверждения.';
      } else if (lower.includes('удал')) {
        help = 'Архивирует выбранную страницу или карточку. Это рискованное действие, его нужно применять только к выбранному домену.';
      } else if (lower.includes('шапка') || lower.includes('подвал')) {
        help = 'Редактирует навигацию сайта: пункты меню в шапке и ссылки в подвале.';
      } else if (lower.includes('домен')) {
        help = 'Поля доменного профиля задают новый сайт: домен, GEO, root locale, route prefixes и SEO-основу.';
      } else if (lower.includes('favicon')) {
        help = 'Позволяет заменить favicon выбранного сайта без полной генерации нового дизайна.';
      } else if (lower.includes('baseline')) {
        help = 'Первично загружает skeleton-страницы выбранного Cloudflare Pages сайта в runtime, чтобы редактор увидел страницы без запуска GitHub Actions.';
      } else {
        help = 'Этот спойлер разворачивает связанный рабочий блок. Наведи курсор на поля внутри, чтобы увидеть точные подсказки.';
      }

      insertHelpBubble(summary, summary.firstElementChild, help, 'subsection');
    });
  }

  function enhanceButtonHelp() {
    const helps = {
      'data-site-navigation-validate': 'Проверяет формат меню шапки и подвала без сохранения.',
      'data-site-navigation-apply': 'Сохраняет меню выбранного сайта через GitHub Contents API.',
      'data-release-status-refresh': 'Показывает, какие правки уже приняты Cloudflare runtime и сколько пакетов уйдет в следующий batch deploy.',
      'data-content-baseline-generate': 'Собирает первичный runtime content-index из текущего bootstrap выбранного сайта. Это нужно один раз для нового Cloudflare Pages сайта, чтобы страницы стали редактируемыми без GitHub Actions.',
      'data-content-baseline-preview': 'Проверяет baseline JSON, считает страницы и показывает sha256 payload для согласования перед загрузкой в Worker.',
      'data-content-baseline-seed': 'Загружает baseline страницы выбранного сайта в Cloudflare Worker/R2/D1 без запуска GitHub Actions.',
      'data-editorial-media-save': 'Сохраняет изображение страницы или карточки в безопасный media path.',
      'data-editorial-queue-validate': 'Проверяет payload страницы: обязательные поля, route, SEO и безопасный target_path.',
      'data-editorial-publish': 'Сохраняет страницу в GitHub без автоматического запуска Actions.',
      'data-github-static-deploy': 'Запускает один batch build/deploy для всех накопленных правок выбранного домена. Если новых правок нет, админка спросит подтверждение и не потратит Actions случайно.',
      'data-editorial-archive-submit': 'Архивирует выбранную страницу или карточку после проверки прав и target_path.',
      'data-product-card-media-save': 'Сохраняет фото товара для карточки и страницы продукта.',
      'data-product-card-validate': 'Проверяет карточку товара перед сохранением.',
      'data-product-card-publish': 'Сохраняет карточку товара в GitHub без автоматического deploy.',
      'data-design-generate': 'Генерирует черновой визуальный профиль по seed для выбранного сайта.',
      'data-design-save-draft': 'Сохраняет значения дизайн-полей как черновик.',
      'data-design-preview': 'Создает preview дизайна до применения.',
      'data-design-apply': 'Применяет выбранный дизайн к текущему сайту после проверки.',
      'data-design-deploy': 'Готовит deploy package с текущим дизайном.',
      'data-design-upload-run': 'Загружает logo/favicon assets в выбранный дизайн.',
      'data-design-favicon-apply': 'Меняет favicon выбранного сайта без полной генерации дизайна.',
      'data-design-favicon-generate': 'Генерирует favicon по seed и готовит его к применению.',
      'data-site-fleet-dry-run': 'Проверяет профиль сайта без записи.',
      'data-site-fleet-save': 'Сохраняет профиль сайта: домен, GEO, deploy и secret_refs.',
      'data-site-fleet-new': 'Очищает форму для нового профиля сайта.',
      'data-site-fleet-archive': 'Запускает полное удаление выбранного сайта: GitHub archive snapshot, Cloudflare Pages/domain cleanup, runtime cleanup и GitHub config cleanup без GitHub Actions.',
      'data-site-fleet-check-secrets': 'Проверяет в GitHub Environment выбранного сайта только наличие нужных secret refs. Значения секретов админка не получает и не показывает.',
      'data-site-fleet-save-environment-secrets': 'Создает GitHub Environment выбранного сайта и сохраняет заполненные SSH/Cloudflare значения как encrypted secrets. Сырые значения после записи очищаются из формы.',
      'data-site-fleet-clear-environment-secret-values': 'Очищает введенные SSH/Cloudflare значения из формы без изменения GitHub Environment.',
      'data-domain-hosting-provider-select': 'Выбирает основную среду нового сайта. По умолчанию это Pages-хостинг; VPS используется только как optional static mirror после отдельного подтверждения.',
      'data-medgen-dry-run': 'Проверяет задачу MedGen без публикации и deploy.',
      'data-medgen-run': 'Для Cloudflare-сайта создает MedGen task_id через Worker без GitHub Actions и сразу сохраняет статус в админке.',
      'data-medgen-poll': 'Проверяет ранее созданный task_id через Worker без GitHub Actions. Если задача готова, статус обновится в виджете.',
      'data-agent-key-generate': 'Создает новый API-ключ для ИИ-агента. Raw key показывается только один раз.',
      'data-agent-key-save': 'Сохраняет hash/fingerprint и права agent key, не сохраняя raw key.',
      'data-admin-user-save': 'Сохраняет GitHub-пользователя, роль и права редактора.',
      'data-admin-user-new': 'Очищает форму для новой учетной записи.',
      'data-admin-role-save': 'Сохраняет матрицу прав роли editor.',
      'data-draft-run-dry-run': 'Запускает dry-run legacy draft action без изменения файлов.',
      'data-draft-run-execute': 'Выполняет legacy draft action. Использовать только после dry-run.',
      'data-copy-target': 'Копирует команду или payload в буфер обмена.',
      'data-draft-status-refresh': 'Обновляет статусы draft/preview для страниц.',
      'data-audit-refresh': 'Обновляет последние события audit log.'
    };

    Object.entries(helps).forEach(([attribute, helpText]) => {
      document.querySelectorAll('button[' + attribute + ']').forEach((button) => {
        insertHelpBubble(button.parentElement, button, helpText, attribute);
      });
    });
  }

  function enhanceMetricHelp() {
    const helps = {
      'Статус': 'Показывает короткое состояние панели. Если текст длинный, он прокручивается внутри карточки.',
      'Сайты': 'Без выбранного домена показывает общую статистику: сколько live-страниц есть в панели и сколько сайтов зарегистрировано.',
      'Сайт': 'После выбора домена показывает статистику конкретного сайта: технические страницы, карточки товаров и общее число live-страниц.',
      'Версия': 'Версия сборщика админки и схемы панели.',
      'Лимиты': 'Показывает главный расходуемый лимит GitHub Actions и контрольный лимит Cloudflare Workers для CMS API.'
    };

    document.querySelectorAll('.metric').forEach((metric) => {
      const labelNode = metric.querySelector('span, h1');
      const label = labelNode ? String(labelNode.textContent || '').trim() : '';

      if (!helps[label]) {
        return;
      }

      insertHelpBubble(metric, labelNode, helps[label], 'metric');
    });
  }

  function enhanceCardHelp() {
    const cardHelp = [
      ['.page-row', 'Карточка страницы показывает route, тип, статус и модули. Ссылка «Редактировать» переносит выбранную страницу в редактор публикаций.'],
      ['.module-card', 'Карточка модуля описывает, где модуль можно использовать и какие данные/SEO hooks он добавляет в страницу.'],
      ['.workflow-card', 'Legacy-команда draft workflow. Используй только если обычная редактура через Contents API не подходит.'],
      ['.workflow-page', 'Legacy-сводка по странице: source JSON, draft и preview paths. Для обычной правки используй «Редактура сайта».'],
      ['.site-fleet-card', 'Профиль сайта: домен, GEO, root locale, deploy target и secret_refs. Выбор профиля определяет, с каким доменом работает CMS.'],
      ['.admin-page-card', 'Быстрый переход к странице/разделу админки. Сам по себе не меняет сайт.']
    ];

    cardHelp.forEach(([selector, helpText]) => {
      document.querySelectorAll(selector).forEach((card) => {
        insertHelpBubble(card, card.firstElementChild, helpText, 'card');
      });
    });
  }

  function enhanceStaticAdminHelp() {
    const helps = {
      'admin-active-site': 'Главный обязательный выбор. Пока домен не выбран, CMS не даст редактировать страницы, карточки, дизайн, MedGen или deploy.',
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
      'admin-site-footer-nav': 'Редактирует подвал сайта: колонки, подписи ссылок и пути внизу каждой страницы.',
      'admin-page-search': 'Фильтрует список страниц по названию, route или типу.',
      'admin-page-type-filter': 'Показывает только страницы выбранного типа.',
      'admin-page-editor-title': 'Меняет title страницы в legacy SEO editor.',
      'admin-page-editor-route': 'Меняет публичный route. Используй осторожно: route влияет на canonical, sitemap и внутренние ссылки.',
      'admin-page-editor-seo-title': 'Меняет SEO title для поискового сниппета.',
      'admin-page-editor-seo-description': 'Меняет meta description для поискового сниппета.',
      'admin-page-editor-seo-robots': 'Управляет индексацией страницы: index/follow или noindex.',
      'admin-payload-page': 'Выбирает страницу для legacy payload composer.',
      'admin-payload-action': 'Выбирает legacy действие для выбранной страницы.',
      'admin-module-editor-module': 'Выбирает модуль для просмотра или ручной правки props JSON.',
      'admin-module-editor-props': 'Показывает JSON props выбранного модуля. Ошибка здесь может сломать рендер страницы.',
      'admin-create-kind': 'Выбирает тип новой страницы в legacy create flow.',
      'admin-design-seed': 'Seed задает направление генерации визуального профиля.',
      'admin-design-brand': 'Меняет название бренда в дизайн-профиле.',
      'admin-design-logo': 'Загружает логотип для выбранного сайта.',
      'admin-design-favicon': 'Загружает favicon для выбранного сайта.',
      'admin-domain-name': 'Домен нового сайта без https и без www. Используется как seed для SEO, route и обфускации.',
      'admin-domain-brand': 'Название бренда нового сайта.',
      'admin-domain-email': 'Публичный контактный email нового сайта.',
      'admin-domain-base-url': 'Canonical base URL нового сайта, обычно https://domain.',
      'admin-domain-default-locale': 'Root locale/GEO сайта. Сайт публикуется в корне домена без языковых папок.',
      'admin-domain-deploy-provider': 'Главное правило установки: выберите VPS или Cloudflare. Админка переключит поля и запретит действия, не подходящие выбранной среде.',
      'admin-domain-cf-pages-project': 'Cloudflare Pages project для нового статического сайта.',
      'admin-domain-cf-worker': 'Cloudflare Worker, который будет обслуживать API/preview для CMS-режима без VPS runtime.',
      'admin-domain-cf-d1': 'Cloudflare D1 база для служебных данных нового сайта.',
      'admin-domain-cf-r2': 'Cloudflare R2 bucket для медиа и контент-пакетов нового сайта.',
      'admin-domain-cf-kv': 'Cloudflare KV namespace для быстрых настроек и locks нового сайта.',
      'admin-site-fleet-select': 'Выбирает профиль сайта в разделе управления сайтами.',
      'admin-site-fleet-id': 'Стабильный site_id профиля. Используется в config/sites/*.json.',
      'admin-site-fleet-domain': 'Домен профиля сайта.',
      'admin-site-fleet-contact-email': 'Контактная почта сайта. Если поле пустое, CMX подставит support@домен.',
      'admin-site-fleet-locale': 'Язык сайта в single-root модели.',
      'admin-site-fleet-country': 'Страна/гео, под которую оптимизируется сайт.',
      'admin-site-fleet-deploy-provider': 'Выбирает, куда публиковать статический сайт: на VPS через SSH или в Cloudflare Pages без VPS runtime.',
      'admin-site-fleet-cf-pages-project': 'Имя Cloudflare Pages проекта, который будет принимать статическую сборку сайта.',
      'admin-site-fleet-cf-worker': 'Имя Cloudflare Worker API для CMS-операций, если сайт работает в Cloudflare-first режиме.',
      'admin-site-fleet-cf-d1': 'D1 база для списка сайтов, ролей, истории публикаций и служебных статусов.',
      'admin-site-fleet-cf-r2': 'R2 bucket для медиа, JSON-пакетов контента, preview и release artifacts.',
      'admin-site-fleet-cf-kv': 'KV namespace для короткоживущих сессий, locks и быстрых runtime-настроек.'
    };

    Object.keys(helps).forEach((id) => enhanceStaticLabelHelp(id, helps[id]));
    enhanceSectionSummaryHelp();
    enhanceButtonHelp();
    enhanceMetricHelp();
    enhanceCardHelp();
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
    if (!requireActiveSiteContext(setSiteNavigationStatus, setSiteNavigationOutput)) {
      return siteContextError();
    }

    const payload = siteNavigationPayload();

    setSiteNavigationOutput(payload);
    setSiteNavigationStatus(dryRun ? 'Проверяю шапку и подвал...' : 'Сохраняю шапку и подвал через GitHub Contents API...');

    if (!isGithubMode()) {
      const result = { ok: false, issues: ['Редактирование шапки и подвала доступно через CMS-admin_v2 на GitHub Pages.'] };

      setSiteNavigationOutput(result);
      setSiteNavigationStatus('GitHub-режим не активен.');
      return result;
    }

    const result = await githubSaveNavigation(payload, dryRun);

    setSiteNavigationOutput(result);
    setSiteNavigationStatus(result.ok ? (dryRun ? 'Проверка меню выполнена локально.' : 'Меню сохранено в GitHub без запуска Actions.') : 'Меню не сохранено.');

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
    if (!requireActiveSiteContext(setEditorialStatus, setEditorialOutput)) {
      return siteContextError();
    }

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
    if (!requireActiveSiteContext(setEditorialStatus, setEditorialOutput)) {
      return siteContextError();
    }

    const payload = currentEditorialPayload(contracts);

    setEditorialStatus('Проверка очереди публикации...');
    setEditorialOutput(payload);

    if (isGithubMode()) {
      const result = clientValidateEditorialPayload(payload, contracts);

      setEditorialOutput(result);
      setEditorialStatus(result.ok ? 'Проверка выполнена локально. Actions не запускались.' : 'Проверка нашла ошибки.');

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
          message: 'Upload CMS media: ' + relativePath + ' [skip ci]',
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

  function githubBranch() {
    const config = readGithubConfig();
    const branchInput = document.querySelector('[data-github-branch]');

    return branchInput && branchInput.value ? branchInput.value.trim() : (config.branch || 'main');
  }

  function githubRepository() {
    const config = readGithubConfig();

    return config.repository || '';
  }

  function utf8ToBase64(value) {
    const bytes = new TextEncoder().encode(String(value || ''));
    let binary = '';

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary);
  }

  function base64ToUtf8(value) {
    const binary = atob(String(value || '').replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new TextDecoder().decode(bytes);
  }

  function isSafeRepositoryPath(path, prefix) {
    const normalized = String(path || '').trim();

    return normalized !== ''
      && normalized.startsWith(prefix)
      && !normalized.includes('..')
      && !normalized.includes('//')
      && /^[a-zA-Z0-9_./-]+$/.test(normalized);
  }

  function isSafeContentPagePath(path) {
    return isSafeRepositoryPath(path, 'content/pages/') && String(path || '').endsWith('.json');
  }

  async function githubReadTextFile(relativePath) {
    const repository = githubRepository();
    const ref = githubBranch();

    if (!repository) {
      return { ok: false, issues: ['GitHub repository config is missing.'] };
    }

    const response = await fetch(githubApiUrl('/repos/' + repository + '/contents/' + githubContentsPath(relativePath) + '?ref=' + encodeURIComponent(ref)), {
      method: 'GET',
      headers: githubHeaders()
    });
    const payload = await readResponseJson(response);

    if (!response.ok) {
      return {
        ok: false,
        http_status: response.status,
        issues: [payload.message || 'GitHub Contents read failed.'],
        data: payload
      };
    }

    return {
      ok: true,
      sha: payload.sha || '',
      content: base64ToUtf8(payload.content || ''),
      data: payload
    };
  }

  async function githubListDirectory(relativePath) {
    const repository = githubRepository();
    const ref = githubBranch();

    if (!repository) {
      return { ok: false, issues: ['GitHub repository config is missing.'] };
    }

    const response = await fetch(githubApiUrl('/repos/' + repository + '/contents/' + githubContentsPath(relativePath) + '?ref=' + encodeURIComponent(ref)), {
      method: 'GET',
      headers: githubHeaders()
    });
    const payload = await readResponseJson(response);

    if (!response.ok) {
      return {
        ok: false,
        http_status: response.status,
        issues: [payload.message || 'GitHub Contents directory read failed.'],
        data: payload
      };
    }

    return {
      ok: true,
      entries: Array.isArray(payload) ? payload : [],
      data: payload
    };
  }

  async function githubWriteTextFile(relativePath, content, message, sha) {
    const repository = githubRepository();
    const ref = githubBranch();
    const body = {
      message: String(message || 'Save CMS edit') + ' [skip ci]',
      content: utf8ToBase64(content),
      branch: ref
    };

    if (sha) {
      body.sha = sha;
    }

    if (!repository) {
      return { ok: false, issues: ['GitHub repository config is missing.'] };
    }

    if (!githubToken()) {
      return { ok: false, issues: ['GitHub token не подключен.'] };
    }

    try {
      const response = await fetch(githubApiUrl('/repos/' + repository + '/contents/' + githubContentsPath(relativePath)), {
        method: 'PUT',
        headers: Object.assign({}, githubHeaders(), {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(body)
      });
      const payload = await readResponseJson(response);

      if (!response.ok) {
        return {
          ok: false,
          http_status: response.status,
          errors: [{
            field: 'github_contents',
            code: 'save_failed',
            human: payload.message || 'GitHub Contents save failed.',
            ai_hint: 'Check token Contents write permission, branch protection, and the target path.'
          }],
          data: payload
        };
      }

      return {
        ok: true,
        action: 'github_contents_save',
        data: {
          path: relativePath,
          commit: payload && payload.commit ? payload.commit.sha : '',
          html_url: payload && payload.content ? payload.content.html_url : ''
        },
        written_paths: [relativePath],
        warnings: ['Сохранено прямым GitHub Contents commit с [skip ci]; Actions не запускались. Для публикации статического сайта нажмите «Собрать и деплой».']
      };
    } catch (error) {
      return {
        ok: false,
        action: 'github_contents_save',
        issues: ['GitHub Contents save failed: ' + (error && error.message ? error.message : 'network error')]
      };
    }
  }

  async function githubSaveJsonFile(relativePath, payload, message, existingSha) {
    return githubWriteTextFile(
      relativePath,
      JSON.stringify(payload, null, 2) + '\n',
      message,
      existingSha
    );
  }

  async function githubDeleteFile(relativePath, message, sha) {
    const repository = githubRepository();
    const ref = githubBranch();

    if (!repository) {
      return { ok: false, issues: ['GitHub repository config is missing.'], path: relativePath };
    }

    if (!githubToken()) {
      return { ok: false, issues: ['GitHub token не подключен.'], path: relativePath };
    }

    if (!sha) {
      return { ok: false, issues: ['GitHub file sha is required for delete.'], path: relativePath };
    }

    try {
      const response = await fetch(githubApiUrl('/repos/' + repository + '/contents/' + githubContentsPath(relativePath)), {
        method: 'DELETE',
        headers: Object.assign({}, githubHeaders(), {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          message: String(message || 'Delete CMS file') + ' [skip ci]',
          sha,
          branch: ref
        })
      });
      const payload = await readResponseJson(response);

      if (!response.ok) {
        return {
          ok: false,
          http_status: response.status,
          path: relativePath,
          issues: [payload.message || 'GitHub Contents delete failed.'],
          data: payload
        };
      }

      return {
        ok: true,
        action: 'github_contents_delete',
        path: relativePath,
        commit: payload && payload.commit ? payload.commit.sha : '',
        warnings: ['Удалено прямым GitHub Contents commit с [skip ci]; Actions не запускались.']
      };
    } catch (error) {
      return {
        ok: false,
        action: 'github_contents_delete',
        path: relativePath,
        issues: ['GitHub Contents delete failed: ' + (error && error.message ? error.message : 'network error')]
      };
    }
  }

  function pageTargetPathForPayload(payload, contracts) {
    if (payload && payload.mode === 'edit' && payload.target_path) {
      return String(payload.target_path);
    }

    const config = editorialConfig(contracts);
    const preset = editorialPreset(config, payload && payload.content_type ? payload.content_type : 'technical');
    const slug = payload && payload.slug ? payload.slug : 'page';

    return replacePlaceholders(preset.resource_template || 'content/pages/technical/{{slug}}.json', { '{{slug}}': slug });
  }

  function parsePipeRows(value, keys) {
    return String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split('|').map((part) => part.trim());
      const row = {};

      keys.forEach((key, index) => {
        row[key] = parts[index] || '';
      });

      return row;
    }).filter((row) => Object.values(row).some((part) => String(part || '').trim() !== ''));
  }

  function parseSimpleList(value) {
    return Array.isArray(value)
      ? value.map((item) => String(item || '').trim()).filter(Boolean)
      : String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  }

  function parseContentBlocks(value) {
    const blocks = parsePipeRows(value, ['heading', 'body']);

    if (blocks.length > 0) {
      return blocks.map((block) => [block.heading, block.body].filter(Boolean).join('\n')).filter(Boolean);
    }

    return String(value || '').split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  }

  function parseFaqItems(value) {
    return parsePipeRows(value, ['question', 'answer']).filter((item) => item.question && item.answer);
  }

  function safePublicImage(path, fallback) {
    const value = String(path || '').trim();

    return value.startsWith('/assets/media/') ? value : fallback;
  }

  function seoForPage(title, description, route, image, type) {
    const safeTitle = title || 'Untitled page';
    const safeDescription = description || 'Editorial page created in CMX admin.';
    const safeImage = safePublicImage(image, '/assets/media/seo/default-share.webp');

    return {
      title: safeTitle,
      description: safeDescription,
      canonical: route,
      robots: 'index,follow',
      open_graph: {
        title: safeTitle,
        description: safeDescription,
        type: type || 'website',
        url: route,
        image: safeImage
      },
      twitter: {
        card: 'summary_large_image',
        title: safeTitle,
        description: safeDescription,
        image: safeImage
      }
    };
  }

  function breadcrumbsForRoute(route, title, contentType) {
    const crumbs = [{ title: 'Home', route: '/' }];

    if (contentType === 'product') {
      crumbs.push({ title: 'Popular products', route: '/bady/' });
    } else if (contentType === 'author') {
      crumbs.push({ title: 'Experts', route: '/experts/' });
    } else if (contentType === 'article') {
      crumbs.push({ title: 'Guides', route: '/guides/' });
    } else if (contentType === 'review') {
      crumbs.push({ title: 'Reviews', route: '/obzory/' });
    }

    crumbs.push({ title: title || 'Untitled page', route });

    return crumbs;
  }

  function ensureModule(page, type, fallback) {
    page.modules = Array.isArray(page.modules) ? page.modules : [];
    let module = page.modules.find((item) => item && item.type === type);

    if (!module) {
      module = fallback;
      page.modules.push(module);
    }

    module.props = module.props && typeof module.props === 'object' ? module.props : {};

    return module;
  }

  function generatedPageFromPayload(payload, contracts) {
    const config = editorialConfig(contracts);
    const preset = editorialPreset(config, payload.content_type || 'technical');
    const fields = payload.fields || {};
    const title = String(fields.title || fields.author_name || payload.slug || 'Untitled page').trim();
    const description = String(fields.description || fields.bio || fields.verdict || 'Editorial page created in CMX admin.').trim();
    const image = payload.media && payload.media.primary_image ? payload.media.primary_image.path : '';
    const route = payload.route || replacePlaceholders(preset.route_template || '/{{slug}}/', { '{{slug}}': payload.slug || 'page' });
    const id = payload.slug || normalizeSlug(title);
    const pageType = preset.page_type || (payload.content_type === 'product' ? 'supplement' : 'technical');
    const schemaOrg = Array.isArray(preset.schema_org) ? preset.schema_org : ['WebPage', 'BreadcrumbList'];
    const page = {
      id,
      route,
      page_type: pageType,
      status: 'published',
      locale: 'bg-BG',
      locale_folder: '',
      title,
      updated_at: new Date().toISOString(),
      seo: seoForPage(title, description, route, image, payload.content_type === 'author' ? 'profile' : payload.content_type === 'product' ? 'article' : 'website'),
      breadcrumbs: breadcrumbsForRoute(route, title, payload.content_type),
      modules: [],
      cache: {
        strategy: 'static',
        ttl_seconds: 86400
      },
      schema_org: schemaOrg
    };

    applyFieldsToPage(page, payload);

    return page;
  }

  function setEditablePagePath(page, fieldKey, value) {
    if (!/^page\.(?:updated_at|seo\.(?:title|description|canonical|robots|open_graph\.(?:title|description|type|url|image)|twitter\.(?:card|title|description|image))|modules\.[0-9]+\.props\.[a-zA-Z0-9_]+(?:\.(?:[a-zA-Z0-9_]+|[0-9]+))*)$/.test(fieldKey)) {
      return false;
    }

    const segments = fieldKey.slice('page.'.length).split('.');
    let target = page;

    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = /^\d+$/.test(segments[index]) ? Number(segments[index]) : segments[index];

      if (!target || typeof target !== 'object' || !(segment in target)) {
        return false;
      }

      target = target[segment];
    }

    const last = segments[segments.length - 1];
    const key = /^\d+$/.test(last) ? Number(last) : last;
    const current = target[key];

    if (Array.isArray(current)) {
      try {
        const decoded = JSON.parse(String(value || '').trim());
        target[key] = Array.isArray(decoded) ? decoded : current;
      } catch (error) {
        target[key] = parseSimpleList(value);
      }
    } else if (typeof current === 'number') {
      target[key] = Number.isFinite(Number(value)) ? Number(value) : current;
    } else if (typeof current === 'boolean') {
      target[key] = ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
    } else {
      target[key] = String(value || '').trim();
    }

    return true;
  }

  function applyProductFields(page, fields, payload) {
    const image = payload.media && payload.media.primary_image ? payload.media.primary_image.path : '';
    const alt = payload.media && payload.media.primary_image ? payload.media.primary_image.alt : '';
    const module = ensureModule(page, 'supplement_profile', {
      id: (payload.slug || page.id || 'product') + '-profile',
      type: 'supplement_profile',
      slot: 'main',
      props: {}
    });
    const props = module.props;

    props.name = fields.title || page.title || props.name || '';
    props.brand = fields.brand || props.brand || '';
    props.summary = fields.description || props.summary || page.seo.description || '';
    props.rating = fields.rating !== undefined && fields.rating !== '' ? Number(fields.rating) : props.rating;
    props.price = fields.price_range || props.price || '';
    props.seller_label = fields.buy_button || props.seller_label || 'Buy';
    props.seller_url = fields.buy_url || props.seller_url || '#';
    props.review_cta_label = fields.review_cta_label || props.review_cta_label || '';
    props.review_route = fields.review_route || props.review_route || '';
    props.review_title = fields.review_title || props.review_title || '';
    props.review_preview = fields.review_preview || props.review_preview || '';
    props.review_link_label = fields.review_link_label || props.review_link_label || 'View review';
    props.compare_label = fields.compare_label || props.compare_label || 'Compare';
    props.compare_route = fields.compare_route || props.compare_route || '/comparisons/';
    props.category_label = fields.category_label || props.category_label || '';
    props.reviewer = fields.reviewer || props.reviewer || '';
    props.reviewer_role = fields.reviewer_role || props.reviewer_role || '';
    props.reviewer_route = fields.reviewer_route || props.reviewer_route || '';
    props.reviewer_image = fields.reviewer_image || props.reviewer_image || '';
    props.reviewer_social_links = fields.reviewer_social_links ? parsePipeRows(fields.reviewer_social_links, ['label', 'url']) : (props.reviewer_social_links || []);
    props.updated = fields.updated || props.updated || '';
    props.verdict = fields.verdict || props.verdict || '';
    props.availability = fields.availability || props.availability || 'available';
    props.facts = fields.facts ? parsePipeRows(fields.facts, ['label', 'value']) : (props.facts || []);
    props.ingredients = fields.ingredients ? parsePipeRows(fields.ingredients, ['name', 'amount', 'note']) : (props.ingredients || []);
    props.safety_notes = fields.safety_notes ? parseSimpleList(fields.safety_notes) : (props.safety_notes || []);
    props.pros = fields.pros ? parseSimpleList(fields.pros) : (props.pros || []);
    props.cons = fields.cons ? parseSimpleList(fields.cons) : (props.cons || []);
    props.sources = fields.sources ? parsePipeRows(fields.sources, ['title', 'url', 'note']) : (props.sources || []);
    props.disclaimer = fields.disclaimer || props.disclaimer || '';
    props.affiliate_note = fields.affiliate_note || props.affiliate_note || '';
    props.author_name = fields.author_name || props.author_name || '';
    props.author_role = fields.author_role || props.author_role || '';
    props.author_route = fields.author_route || props.author_route || '';
    props.author_image = fields.author_image || props.author_image || '';
    props.author_social_links = fields.author_social_links ? parsePipeRows(fields.author_social_links, ['label', 'url']) : (props.author_social_links || []);

    if (image) {
      props.image = image;
      props.gallery = Array.isArray(props.gallery) && props.gallery.length > 0 ? props.gallery : [image, image, image, image, image];
    }

    if (alt) {
      props.image_alt = alt;
    }
  }

  function applyAuthorFields(page, fields, payload) {
    const image = payload.media && payload.media.primary_image ? payload.media.primary_image.path : '';
    const alt = payload.media && payload.media.primary_image ? payload.media.primary_image.alt : '';
    const module = ensureModule(page, 'author_profile', {
      id: (payload.slug || page.id || 'author') + '-profile',
      type: 'author_profile',
      slot: 'main',
      props: {}
    });
    const props = module.props;

    props.name = fields.author_name || fields.title || page.title || props.name || '';
    props.role = fields.role || props.role || '';
    props.bio = fields.bio || fields.description || props.bio || '';
    props.reviews_route = fields.reviews_route || props.reviews_route || '/obzory/';
    props.social_links = fields.social_links ? parsePipeRows(fields.social_links, ['label', 'url']) : (props.social_links || []);

    if (image) {
      props.image = image;
    }

    if (alt) {
      props.image_alt = alt;
    }
  }

  function applyContentFields(page, fields, payload) {
    const header = ensureModule(page, 'page_header', {
      id: (payload.slug || page.id || 'page') + '-header',
      type: 'page_header',
      slot: 'header',
      props: {}
    });
    const rich = ensureModule(page, 'rich_text', {
      id: (payload.slug || page.id || 'page') + '-content',
      type: 'rich_text',
      slot: 'main',
      props: {}
    });

    header.props.heading = fields.title || page.title || header.props.heading || '';
    header.props.lead = fields.description || header.props.lead || page.seo.description || '';

    if (fields.body_sections || fields.policy_sections || fields.description) {
      rich.props.content = parseContentBlocks(fields.body_sections || fields.policy_sections || fields.description);
    }

    if (fields.faq) {
      const faq = ensureModule(page, 'faq', {
        id: (payload.slug || page.id || 'page') + '-faq',
        type: 'faq',
        slot: 'main',
        props: {}
      });
      faq.props.items = parseFaqItems(fields.faq);
    }
  }

  function applyFieldsToPage(page, payload) {
    const fields = payload.fields || {};
    const title = String(fields.title || fields.author_name || page.title || '').trim();
    const description = String(fields.description || fields.bio || fields.verdict || (page.seo && page.seo.description) || '').trim();
    const image = payload.media && payload.media.primary_image ? payload.media.primary_image.path : '';

    page.status = 'published';
    page.updated_at = new Date().toISOString();

    Object.entries(fields).forEach(([key, value]) => {
      if (key.startsWith('page.')) {
        setEditablePagePath(page, key, value);
      }
    });

    if (title) {
      page.title = title;
      if (Array.isArray(page.breadcrumbs) && page.breadcrumbs.length > 0) {
        page.breadcrumbs[page.breadcrumbs.length - 1].title = title;
      }
    }

    page.seo = page.seo && typeof page.seo === 'object' ? page.seo : seoForPage(page.title, description, page.route, image, 'website');
    if (title) {
      page.seo.title = title;
    }
    if (description) {
      page.seo.description = description;
    }
    page.seo.canonical = page.route;
    page.seo.robots = page.seo.robots || 'index,follow';
    page.seo.open_graph = page.seo.open_graph && typeof page.seo.open_graph === 'object' ? page.seo.open_graph : {};
    page.seo.twitter = page.seo.twitter && typeof page.seo.twitter === 'object' ? page.seo.twitter : {};
    page.seo.open_graph.title = page.seo.title;
    page.seo.open_graph.description = page.seo.description;
    page.seo.open_graph.url = page.route;
    page.seo.twitter.title = page.seo.title;
    page.seo.twitter.description = page.seo.description;

    if (image) {
      page.seo.open_graph.image = image;
      page.seo.twitter.image = image;
    }

    if (payload.content_type === 'product') {
      applyProductFields(page, fields, payload);
    } else if (payload.content_type === 'author') {
      applyAuthorFields(page, fields, payload);
    } else {
      applyContentFields(page, fields, payload);
    }

    return page;
  }

  function clientValidateEditorialPayload(payload, contracts) {
    const issues = [];
    const targetPath = pageTargetPathForPayload(payload, contracts);

    if (!payload || !payload.slug) {
      issues.push('Slug is required.');
    }

    if (!isSafeContentPagePath(targetPath)) {
      issues.push('Target path must be a safe content/pages/*.json path.');
    }

    if (!payload.fields || !String(payload.fields.title || payload.fields.author_name || '').trim()) {
      issues.push('Title or author name is required.');
    }

    return {
      ok: issues.length === 0,
      action: 'github_contents_editorial_validate',
      dry_run: true,
      target_path: targetPath,
      issues,
      warnings: issues.length === 0 ? ['Проверка выполнена в браузере; GitHub Actions не запускались.'] : []
    };
  }

  async function githubSaveEditorialPayload(payload, contracts) {
    const targetPath = pageTargetPathForPayload(payload, contracts);
    const validation = clientValidateEditorialPayload(payload, contracts);

    if (!validation.ok) {
      return validation;
    }

    let page = null;
    let sha = '';

    if (payload.mode === 'edit') {
      const current = await githubReadTextFile(targetPath);

      if (!current.ok) {
        return current;
      }

      try {
        page = JSON.parse(current.content);
      } catch (error) {
        return { ok: false, issues: ['Existing page JSON is invalid: ' + (error && error.message ? error.message : 'parse error')] };
      }

      sha = current.sha || '';
      applyFieldsToPage(page, payload);
    } else {
      page = generatedPageFromPayload(payload, contracts);
    }

    return githubSaveJsonFile(targetPath, page, 'Save CMS editorial edit: ' + targetPath, sha);
  }

  async function githubArchivePageContent(relativePath) {
    if (!isSafeContentPagePath(relativePath)) {
      return { ok: false, issues: ['Archive target must be a safe content/pages/*.json path.'] };
    }

    const current = await githubReadTextFile(relativePath);

    if (!current.ok) {
      return current;
    }

    let page = null;
    try {
      page = JSON.parse(current.content);
    } catch (error) {
      return { ok: false, issues: ['Existing page JSON is invalid: ' + (error && error.message ? error.message : 'parse error')] };
    }

    page.status = 'archived';
    page.updated_at = new Date().toISOString();
    page.seo = page.seo && typeof page.seo === 'object' ? page.seo : {};
    page.seo.robots = 'noindex,nofollow';

    return githubSaveJsonFile(relativePath, page, 'Archive CMS page: ' + relativePath, current.sha || '');
  }

  async function githubSaveNavigation(payload, dryRun) {
    const issues = [];
    const navigation = payload && payload.navigation ? payload.navigation : {};

    if (!Array.isArray(navigation.header) || navigation.header.length === 0) {
      issues.push('Header navigation must contain at least one group.');
    }

    if (!Array.isArray(navigation.footer) || navigation.footer.length === 0) {
      issues.push('Footer navigation must contain at least one group.');
    }

    if (issues.length > 0 || dryRun) {
      return {
        ok: issues.length === 0,
        action: 'github_contents_site_navigation_validate',
        dry_run: dryRun,
        issues,
        warnings: dryRun && issues.length === 0 ? ['Проверка меню выполнена в браузере; Actions не запускались.'] : []
      };
    }

    const current = await githubReadTextFile('config/navigation.json');
    const sha = current.ok ? current.sha : '';

    return githubSaveJsonFile('config/navigation.json', {
      header: navigation.header,
      footer: navigation.footer
    }, 'Save CMS navigation', sha);
  }

  async function githubDispatchStaticDeploy(statusSetter, outputSetter) {
    const config = readGithubConfig();

    if (!requireActiveSiteContext(statusSetter, outputSetter)) {
      return siteContextError();
    }

    if (hostingProvider(activeSiteProfile()) !== 'static_vps') {
      statusSetter('Готовлю Cloudflare runtime release без GitHub Actions...');
      setStatusBusy('admin-draft-action-status', true);

      try {
        const result = await cloudflarePublishActiveSite();

        outputSetter(result);
        statusSetter(result.ok ? 'Cloudflare runtime release подготовлен. GitHub Actions не запускались.' : 'Cloudflare publish/runtime release не выполнен.');
        return result;
      } finally {
        setStatusBusy('admin-draft-action-status', false);
      }
    }

    if (!githubToken()) {
      const result = { ok: false, issues: ['GitHub token не подключен.'] };
      outputSetter(result);
      statusSetter('Deploy не запущен: token не подключен.');
      return result;
    }

    statusSetter('Запускаю отдельный build/deploy workflow...');
    const result = await githubDispatchWorkflow(config.deploy_workflow_id || 'deploy.yml', {
      target: 'production',
      verification_mode: 'content_fast'
    }, config.deploy_actions_url || '');

    outputSetter(result);
    statusSetter(result.ok ? 'Build/deploy workflow запущен. Это единственный Actions-этап после пачки сохранений.' : 'Build/deploy workflow не запущен.');

    return result;
  }

  async function cloudflarePublishActiveSite() {
    const profile = activeSiteProfile();
    const siteId = cloudflareSiteIdFromProfile(profile || {});

    if (!siteId) {
      return { ok: false, issues: ['site_context_required'] };
    }

    const deploy = profile && profile.deploy_profile ? profile.deploy_profile : {};
    const cloudflare = deploy && deploy.cloudflare ? deploy.cloudflare : {};

    if (!cloudflare.pages_project) {
      return {
        ok: false,
        issues: ['cloudflare_pages_project_required'],
        human: 'В активном профиле сайта нужно указать Cloudflare Pages project.'
      };
    }

    const releaseStatus = await cloudflareReleaseStatus(siteId);
    const pendingPackageCount = releaseStatus && releaseStatus.ok ? Number(releaseStatus.pending_package_count || 0) : null;

    if (pendingPackageCount === 0 && !window.confirm('Cloudflare runtime не видит новых опубликованных правок для деплоя. Всё равно запустить Pages build/deploy?')) {
      return {
        ok: true,
        status: 'no_changes_to_deploy',
        release_status: releaseStatus,
        warnings: ['Deploy не запускался: нет pending правок, Actions не расходуются.']
      };
    }

    const requestId = 'req-cloudflare-publish-' + Date.now();
    const packagePayload = {
      request_id: requestId,
      site_id: siteId,
      package_type: 'static_release_request',
      summary: {
        domain: profile.domain || '',
        base_url: profile.base_url || '',
        pages_project: cloudflare.pages_project || '',
        provider: 'cloudflare_pages',
        pending_package_count: pendingPackageCount
      },
      profile
    };
    const stored = await cloudflareStoreContentPackage(siteId, packagePayload, 'static_release_request');

    if (!stored.ok) {
      return stored;
    }

    const preview = await cloudflareCreatePreview(siteId, {
      request_id: requestId,
      package_r2_key: stored.r2_key,
      summary: packagePayload.summary
    });

    if (!preview.ok) {
      return preview;
    }

    const approved = window.prompt(
      'Cloudflare preview создан. Для публикации вставьте approval token из ответа. Отмена оставит preview без публикации.',
      preview.preview_token || ''
    );

    if (!approved) {
      const result = Object.assign({}, preview, {
        ok: true,
        status: 'preview_ready',
        warnings: ['Публикация остановлена до явного approval token. Actions не запускались.']
      });

      refreshReleaseStatusForActiveSite({ silent: true });
      return result;
    }

    const published = await cloudflarePublish(siteId, {
      request_id: requestId,
      approval_token: approved,
      pages_project: cloudflare.pages_project || ''
    });

    if (!published.ok) {
      return published;
    }

    const runtimeRelease = await cloudflarePrepareRuntimeRelease(siteId, {
      request_id: 'runtime-release-' + Date.now(),
      pages_project: cloudflare.pages_project || '',
      source: 'admin_publish_action',
      build_profile: cloudflareBuildProfile(profile, siteId),
      environment: deploy.environment || 'production'
    });
    const pagesDeploy = runtimeRelease && runtimeRelease.ok && runtimeRelease.status !== 'no_changes'
      ? await cloudflareRequestPagesDeployment(siteId, {
        request_id: 'pages-deploy-' + Date.now(),
        pages_project: cloudflare.pages_project || '',
        branch: cloudflare.branch || '',
        source: 'admin_publish_action',
        runtime_release_request_id: runtimeRelease.request_id || ''
      })
      : {
        ok: true,
        skipped: true,
        status: 'no_runtime_release_to_deploy'
      };
    const deployOk = runtimeRelease.ok === true && pagesDeploy.ok === true;
    const deployStatus = pagesDeploy.skipped
      ? 'runtime_release_no_changes'
      : (deployOk ? 'cloudflare_pages_deploy_requested' : 'publish_accepted_cloudflare_deploy_failed');

    const result = Object.assign({}, published, {
      ok: deployOk,
      status: deployStatus,
      pages_deploy: {
        ok: Boolean(pagesDeploy.ok),
        skipped: Boolean(pagesDeploy.skipped),
        status: pagesDeploy.status || '',
        deployment_id: pagesDeploy.deployment_id || '',
        deployment_url: pagesDeploy.deployment_url || '',
        reason: pagesDeploy.skipped ? 'No runtime release was available to deploy.' : ''
      },
      release_status: releaseStatus,
      runtime_release: runtimeRelease,
      warnings: deployOk
        ? ['Cloudflare runtime подготовил release и запросил Cloudflare Pages deployment без GitHub Actions.']
        : ['Cloudflare runtime принял release, но Cloudflare Pages deployment не был запрошен. GitHub Actions не запускались.']
    });

    refreshReleaseStatusForActiveSite({ silent: true });
    return result;
  }

  function cloudflareBuildProfile(profile, siteId) {
    const release = profile && profile.release && typeof profile.release === 'object' ? profile.release : {};

    if (String(release.workflow || '') === 'cloudflare_pages_direct_upload' && siteId === 'workerwp-com') {
      return 'workerwp-com';
    }

    if (siteId === 'workerwp-com') {
      return 'workerwp-com';
    }

    return 'cms';
  }

  async function submitEditorialMedia(contracts, authContract) {
    if (!requireActiveSiteContext(setEditorialStatus, setEditorialOutput)) {
      return siteContextError();
    }

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

      if (cloudflareRuntimeForActiveSite()) {
        const result = await cloudflareUploadMediaFile(file, contentType, alt, 'editorial');

        if (result && result.ok && result.data && result.data.media) {
          editorialState.media.primary_image = result.data.media;

          if (byId('admin-editorial-media-path') && result.data.media.path) {
            byId('admin-editorial-media-path').value = result.data.media.path;
          }
        }

        setEditorialOutput(result);
        setEditorialStatus(result.ok ? 'Медиа сохранено в Cloudflare R2/KV без GitHub Actions.' : 'Cloudflare media upload вернул ошибку.');

        return result;
      }

      if (isGithubMode()) {
        const result = await githubUploadMediaFile(file, contentType, alt, 'editorial');

        if (result && result.ok && result.data && result.data.media) {
          editorialState.media.primary_image = result.data.media;

          if (byId('admin-editorial-media-path') && result.data.media.path) {
            byId('admin-editorial-media-path').value = result.data.media.path;
          }
        }

        setEditorialOutput(result);
        setEditorialStatus(result.ok ? 'Медиа сохранено в GitHub без запуска Actions.' : 'GitHub media upload вернул ошибку.');

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
    if (!requireActiveSiteContext(setEditorialStatus, setEditorialOutput)) {
      return siteContextError();
    }

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
    if (!requireActiveSiteContext(setEditorialStatus, setEditorialOutput)) {
      return siteContextError();
    }

    if (cloudflareRuntimeForActiveSite()) {
      const payload = currentEditorialPayload(contracts);

      editorialState.lastQueuePayload = payload;
      setEditorialStatus('Сохраняю пакет в Cloudflare Worker и создаю preview...');
      setEditorialOutput(payload);

      const result = await cloudflareSaveEditorialPackage(payload, contracts, 'editorial');

      setEditorialOutput(result);
      setEditorialStatus(result.ok
        ? (result.status === 'preview_ready' ? 'Preview сохранен в Cloudflare. Публикация ждет approval token.' : 'Пакет принят Cloudflare runtime, источник сохранен без CI. Для обновления сайта нажмите «Собрать и деплой».')
        : 'Cloudflare runtime вернул ошибку.');

      return result;
    }

    if (isGithubMode()) {
      const payload = currentEditorialPayload(contracts);

      editorialState.lastQueuePayload = payload;
      setEditorialStatus('Сохраняю редакторскую правку через GitHub Contents API...');
      setEditorialOutput(payload);

      const result = await githubSaveEditorialPayload(payload, contracts);

      setEditorialOutput(result);
      setEditorialStatus(result.ok ? 'Сохранено в GitHub без запуска Actions. Для обновления сайта нажмите «Собрать и деплой».' : 'Сохранение в GitHub вернуло ошибку.');

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
    if (!requireActiveSiteContext(setEditorialStatus, setEditorialOutput)) {
      return siteContextError();
    }

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

    if (cloudflareRuntimeForActiveSite()) {
      const result = await cloudflareArchivePagePackage(selectedResource);

      setEditorialOutput(result);
      setEditorialStatus(result.ok
        ? (result.status === 'preview_ready' ? 'Preview архивации сохранен в Cloudflare; требуется approval token.' : 'Архивация принята Cloudflare runtime без Actions.')
        : 'Cloudflare archive вернул ошибку.');

      return result;
    }

    if (isGithubMode()) {
      const result = await githubArchivePageContent(selectedResource);

      setEditorialOutput(result);
      setEditorialStatus(result.ok ? 'Страница помечена archived/noindex в GitHub без запуска Actions.' : 'Архивация через GitHub Contents вернула ошибку.');

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
      const deployButton = widget.querySelector('[data-github-static-deploy]');
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

      if (deployButton) {
        deployButton.addEventListener('click', () => githubDispatchStaticDeploy(setEditorialStatus, setEditorialOutput));
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
    fillSelect(document.querySelector('[data-product-card-delete-page]'), options);
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
      const field = editorialFieldsFor(config, 'product').find((item) => item && item.key === key) || null;

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
    if (!requireActiveSiteContext(setProductCardStatus, setProductCardOutput)) {
      return siteContextError();
    }

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
    if (!requireActiveSiteContext(setProductCardStatus, setProductCardOutput)) {
      return siteContextError();
    }

    const payload = currentProductCardPayload(contracts);

    setProductCardStatus('Проверка карточки товара...');
    setProductCardOutput(payload);

    if (isGithubMode()) {
      const result = clientValidateEditorialPayload(payload, contracts);

      setProductCardOutput(result);
      setProductCardStatus(result.ok ? 'Проверка карточки выполнена локально. Actions не запускались.' : 'Проверка карточки нашла ошибки.');

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
    if (!requireActiveSiteContext(setProductCardStatus, setProductCardOutput)) {
      return siteContextError();
    }

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

      if (cloudflareRuntimeForActiveSite()) {
        const result = await cloudflareUploadMediaFile(file, 'product', alt, 'product');

        if (result && result.ok && result.data && result.data.media) {
          productCardState.media.primary_image = result.data.media;

          if (byId('admin-product-card-media-path') && result.data.media.path) {
            byId('admin-product-card-media-path').value = result.data.media.path;
          }
        }

        setProductCardOutput(result);
        setProductCardStatus(result.ok ? 'Медиа карточки сохранено в Cloudflare R2/KV без GitHub Actions.' : 'Cloudflare media upload карточки вернул ошибку.');

        return result;
      }

      if (isGithubMode()) {
        const result = await githubUploadMediaFile(file, 'product', alt, 'product');

        if (result && result.ok && result.data && result.data.media) {
          productCardState.media.primary_image = result.data.media;

          if (byId('admin-product-card-media-path') && result.data.media.path) {
            byId('admin-product-card-media-path').value = result.data.media.path;
          }
        }

        setProductCardOutput(result);
        setProductCardStatus(result.ok ? 'Медиа карточки сохранено в GitHub без запуска Actions.' : 'GitHub media upload карточки вернул ошибку.');

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
    if (!requireActiveSiteContext(setProductCardStatus, setProductCardOutput)) {
      return siteContextError();
    }

    if (cloudflareRuntimeForActiveSite()) {
      const payload = currentProductCardPayload(contracts);

      productCardState.lastQueuePayload = payload;
      setProductCardStatus('Сохраняю карточку в Cloudflare Worker и создаю preview...');
      setProductCardOutput(payload);

      const result = await cloudflareSaveEditorialPackage(payload, contracts, 'product_card');

      setProductCardOutput(result);
      setProductCardStatus(result.ok
        ? (result.status === 'preview_ready' ? 'Preview карточки сохранен в Cloudflare. Публикация ждет approval token.' : 'Карточка принята Cloudflare runtime, источник сохранен без CI. Для обновления сайта нажмите «Собрать и деплой».')
        : 'Cloudflare runtime вернул ошибку карточки.');

      return result;
    }

    if (isGithubMode()) {
      const payload = currentProductCardPayload(contracts);

      productCardState.lastQueuePayload = payload;
      setProductCardStatus('Сохраняю карточку через GitHub Contents API...');
      setProductCardOutput(payload);

      const result = await githubSaveEditorialPayload(payload, contracts);

      setProductCardOutput(result);
      setProductCardStatus(result.ok ? 'Карточка сохранена в GitHub без запуска Actions. Для обновления сайта нажмите «Собрать и деплой».' : 'Сохранение карточки вернуло ошибку.');

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

  async function submitProductCardArchive(authContract) {
    if (!requireActiveSiteContext(setProductCardStatus, setProductCardOutput)) {
      return siteContextError();
    }

    const deleteSelect = document.querySelector('[data-product-card-delete-page]');
    const selectedResource = deleteSelect ? deleteSelect.value : '';

    if (!selectedResource) {
      const result = { ok: false, issues: ['Выберите карточку товара для удаления.'] };

      setProductCardOutput(result);
      setProductCardStatus('Удаление карточки остановлено: товар не выбран.');

      return result;
    }

    const payload = {
      request_id: requestId('req-product-card-archive'),
      actor: editorialActorPayload(),
      items: [{ resource: selectedResource, mode: '410' }]
    };

    setProductCardStatus('Запрос archive endpoint для карточки...');
    setProductCardOutput(payload);

    if (cloudflareRuntimeForActiveSite()) {
      const result = await cloudflareArchivePagePackage(selectedResource);

      setProductCardOutput(result);
      setProductCardStatus(result.ok
        ? (result.status === 'preview_ready' ? 'Preview удаления карточки сохранен в Cloudflare; требуется approval token.' : 'Карточка удалена из runtime без GitHub Actions.')
        : 'Cloudflare archive карточки вернул ошибку.');

      return result;
    }

    if (isGithubMode()) {
      const result = await githubArchivePageContent(selectedResource);

      setProductCardOutput(result);
      setProductCardStatus(result.ok ? 'Карточка помечена archived/noindex в GitHub без запуска Actions.' : 'Архивация карточки через GitHub Contents вернула ошибку.');

      return result;
    }

    try {
      const result = await editorialFetch(authContract, 'editorial_archive', payload);

      setProductCardOutput(result);
      setProductCardStatus(result.ok ? 'Карточка удалена; страница исключена из публичной сборки.' : 'Delete endpoint карточки вернул ответ сервера.');

      if (result.ok) {
        loadAdminBootstrap(readAuthContract() || authContract);
      }

      return result;
    } catch (error) {
      const result = { ok: false, issues: ['product card archive endpoint unavailable'] };

      setProductCardOutput(result);
      setProductCardStatus('Endpoint удаления карточки недоступен.');

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
      const deployButton = widget.querySelector('[data-github-static-deploy]');
      const deleteButton = widget.querySelector('[data-product-card-delete-submit]');

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

      if (deployButton) {
        deployButton.addEventListener('click', () => githubDispatchStaticDeploy(setProductCardStatus, setProductCardOutput));
      }

      if (deleteButton) {
        deleteButton.addEventListener('click', () => submitProductCardArchive(activeAuthContract(authContract)));
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

    if (!requireActiveSiteContext(setDesignStatus, setDesignOutput)) {
      return siteContextError();
    }

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
    syncDomainHostingFields();

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
    const domainHostingProvider = siteLaunch ? siteLaunch.querySelector('[data-domain-hosting-provider-select]') : null;

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
          deploy_target: collectDomainDeployTargetPayload(),
          deploy_profile: collectDomainDeployProfilePayload()
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

    if (domainHostingProvider) {
      domainHostingProvider.addEventListener('change', syncDomainHostingFields);
      syncDomainHostingFields();
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
    const poll = panel.querySelector('[data-medgen-poll]');

    if (dryRun) {
      dryRun.addEventListener('click', () => runMedGenWorkflow(true, 'create_task'));
    }

    if (run) {
      run.addEventListener('click', () => runMedGenWorkflow(false, 'create_task'));
    }

    if (poll) {
      poll.addEventListener('click', () => runMedGenWorkflow(false, 'poll_task'));
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

  function pageIsLive(page) {
    return String(page && page.status ? page.status : '') === 'published';
  }

  function pageIsTechnical(page) {
    return String(page && page.page_type ? page.page_type : '') === 'technical';
  }

  function pageIsProductCard(page) {
    return editorialContentTypeForPage(page) === 'product';
  }

  function livePagesFromManifest(manifest) {
    return manifest && Array.isArray(manifest.pages)
      ? manifest.pages.filter(pageIsLive)
      : [];
  }

  function siteContentMetric(manifest, summary) {
    const profile = activeSiteProfile();
    const sites = manifest && Array.isArray(manifest.sites) ? manifest.sites.length : 0;

    if (profile) {
      const scopedLivePages = scopedPagesList(manifest && manifest.pages ? manifest.pages : []).filter(pageIsLive);
      const technicalPages = scopedLivePages.filter(pageIsTechnical).length;
      const productPages = scopedLivePages.filter(pageIsProductCard).length;
      const siteId = activeSiteKey();
      const medgenIndex = siteId ? adminState.medgenTaskIndexBySite[siteId] : null;
      const medgenCounts = medgenTaskCounts(medgenIndex && Array.isArray(medgenIndex.tasks) ? medgenIndex.tasks : []);

      if (scopedLivePages.length === 0 && medgenCounts.total > 0) {
        return {
          label: 'Сайт',
          value: '0/' + medgenCounts.total,
          detail: 'live pages / MedGen preview · ready ' + medgenCounts.ready
        };
      }

      return {
        label: 'Сайт',
        value: technicalPages + '/' + productPages,
        detail: 'технические / карточки товаров · live ' + scopedLivePages.length + (medgenCounts.total ? ' · MedGen ' + medgenCounts.total : '')
      };
    }

    const livePages = Number(summary.published_pages || 0) || livePagesFromManifest(manifest).length;

    return {
      label: 'Сайты',
      value: livePages + '/' + sites,
      detail: 'live-страниц / сайтов всего'
    };
  }

  function githubMetricHtml(value) {
    return '<article class="metric metric--github-rate" data-github-rate-limit data-rate-state="' + (githubState.rateLimitVisible ? 'ready' : 'pending') + '">'
      + '<h1>Лимиты</h1><h3 data-github-rate-limit-value>' + escapeHtml(value) + '</h3></article>';
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
    const profile = activeSiteProfile();
    const scopedPages = scopedPagesList(manifest && manifest.pages ? manifest.pages : []);
    const totalPages = profile ? scopedPages.length : Number(summary.total_pages || 0);
    const publishedPages = profile
      ? scopedPages.filter(pageIsLive).length
      : Number(summary.published_pages || 0);
    const modules = Number(summary.modules || 0);
    const sites = manifest && Array.isArray(manifest.sites) ? manifest.sites.length : 0;
    const contentMetric = siteContentMetric(manifest, summary);
    const statusMessage = totalPages || modules
      ? 'Готово'
      : 'Ожидание';
    const statusDetail = totalPages || modules
      ? (profile
          ? 'Активный сайт: ' + activeSiteLabel() + '. Страниц ' + totalPages + ', live ' + publishedPages + '.'
          : 'Краткая сводка: структура загружена. Live-страниц ' + publishedPages + ', сайтов ' + sites + '.')
      : 'Данные еще загружаются';

    target.innerHTML = [
      metricHtml('Статус', statusMessage, statusDetail, 'metric--status'),
      metricHtml(contentMetric.label, contentMetric.value, contentMetric.detail),
      metricHtml('Версия', manifest && manifest.version ? manifest.version : 'n/a'),
      githubMetricHtml(githubRateMessage)
    ].join('');

    enhanceMetricHelp();
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

    const profile = activeSiteProfile();
    const siteId = activeSiteKey();
    const medgenIndex = siteId ? adminState.medgenTaskIndexBySite[siteId] : null;
    const medgenTasks = medgenIndex && Array.isArray(medgenIndex.tasks) ? medgenIndex.tasks : [];
    const medgenPreviewHtml = profile && (!Array.isArray(pages) || pages.length === 0) && medgenTasks.length > 0
      ? '<div class="medgen-preview-pages" aria-label="MedGen preview pages">' + medgenTaskMonitorHtml(medgenTasks) + '</div>'
      : '';
    const emptyText = profile
      ? (runtimeContentIndexLoading(profile.site_id)
          ? 'Загружаю структуру выбранного сайта из Cloudflare runtime...'
          : (medgenTasks.length > 0
            ? 'Runtime pages еще не опубликованы. Ниже показаны MedGen-страницы, ожидающие preview/publish для выбранного сайта.'
            : 'Для выбранного сайта нет страниц в текущем bootstrap. Выберите профиль, совпадающий с content_site, или загрузите структуру этого сайта через Cloudflare runtime.'))
      : 'Сначала выберите домен в блоке "Рабочий сценарий CMS".';

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
      : '<p class="empty-state">' + escapeHtml(emptyText) + '</p>' + medgenPreviewHtml;
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
    const pages = contracts && Array.isArray(contracts.pages) ? scopedPagesList(contracts.pages) : [];

    if (!target) {
      return;
    }

    target.innerHTML = pages.length > 0 ? pages.map((page) => '<details class="workflow-page">'
      + '<summary>' + escapeHtml(page.route || page.resource || '') + '</summary>'
      + '<div><span class="pill">' + escapeHtml(page.page_type || '') + '</span>'
      + '<h3>' + escapeHtml(page.title || '') + '</h3>'
      + '<p><code>' + escapeHtml(page.resource || '') + '</code></p></div>'
      + '<dl><dt>Draft</dt><dd><code>' + escapeHtml(page.draft_path || '') + '</code></dd>'
      + '<dt>Preview</dt><dd><code>' + escapeHtml(page.preview_path || '') + '</code></dd></dl>'
      + '</details>').join('') : '<p class="empty-state">Выберите домен, чтобы увидеть workflow-страницы именно этого сайта.</p>';
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

    return capabilities.roles === true;
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

      return editor && editor.capabilities ? Object.assign({}, roleDefaultCapabilities('editor'), editor.capabilities, { read: true, roles: true }) : roleDefaultCapabilities('editor');
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
      setRolePermissionsStatus('Отправляю права профиля editor в Actions...');
      setStatusBusy('admin-role-permissions-status', true);

      try {
        const result = await githubDispatchCommand('github_roles', {
          operation: 'update_editor_capabilities',
          capabilities
        }, false);

        if (result.ok === false) {
          const issues = result.issues || (result.errors || []).map((error) => error.human || error.code || 'Права профиля editor не сохранены');
          setRolePermissionsStatus((issues.length > 0 ? issues : ['Права профиля editor не сохранены']).join('; '));
          setStatusBusy('admin-role-permissions-status', false);
          return;
        }

        const roles = githubRolesConfig();
        const users = roles && roles.users ? roles.users : {};
        Object.keys(users).forEach((login) => {
          if (users[login] && users[login].role === 'editor') {
            users[login].capabilities = Object.assign({}, capabilities, { read: true, roles: true });
          }
        });
        renderAdminUsersList({ users: githubRoleUsers() }, {});
        setRolePermissionsStatus('Права профиля editor отправлены в Actions. Human-профили admin и editor имеют одинаковую матрицу прав.');
        setStatusBusy('admin-role-permissions-status', false);
        return;
      } catch (error) {
        setRolePermissionsStatus('GitHub Actions недоступен: ' + (error && error.message ? error.message : 'network error'));
        setStatusBusy('admin-role-permissions-status', false);
        return;
      }
    }

    if (!path) {
      setRolePermissionsStatus('Endpoint прав профиля editor недоступен');
      return;
    }

    setRolePermissionsStatus('Сохраняю права профиля editor...');
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
        setRolePermissionsStatus('Права профиля editor сохранены');
        setStatusBusy('admin-role-permissions-status', false);
        loadAdminBootstrap(authContract);
        return;
      }

      setRolePermissionsStatus((payload.issues || [payload.issue || 'Права профиля editor не сохранены']).join('; '));
      setStatusBusy('admin-role-permissions-status', false);
    } catch (error) {
      setRolePermissionsStatus('Endpoint прав профиля editor недоступен');
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
    const manifestPages = manifest && Array.isArray(manifest.pages) ? manifest.pages : [];
    const contractPages = contracts && Array.isArray(contracts.pages) ? contracts.pages : [];
    const pages = activeSiteProfile() ? scopedPagesList(manifestPages).length : manifestPages.length;
    const modules = manifest && Array.isArray(manifest.modules) ? manifest.modules.length : 0;
    const actions = contracts && contracts.actions ? Object.keys(contracts.actions).length : 0;
    const createTemplates = contracts && Array.isArray(contracts.create_templates) ? contracts.create_templates.length : 0;
    const editorialTypes = contracts && contracts.editorial_widget && Array.isArray(contracts.editorial_widget.content_types)
      ? contracts.editorial_widget.content_types.length
      : 0;
    const system = manifest && manifest.runtime ? Object.keys(manifest.runtime).length : 0;
    const productScope = activeSiteProfile() ? scopedPagesList(contractPages) : contractPages;
    const productCards = productScope.filter((page) => editorialContentTypeForPage(page) === 'product').length;
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
    adminState.releaseStatusBySite = {};
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
    if (!adminState.activeSiteId) {
      const storedSiteId = readStoredActiveSite();
      if (storedSiteId && siteProfileById(storedSiteId)) {
        adminState.activeSiteId = storedSiteId;
      }
    }
    if (adminState.activeSiteId && !siteProfileById(adminState.activeSiteId)) {
      adminState.activeSiteId = '';
      writeStoredActiveSite('');
    }
    setGatedVisible(true);
    renderAdminMetrics(manifest);
    if (isGithubMode() && githubToken()) {
      loadGithubRateLimit();
    }
    renderTypeOptions(manifest.page_types || []);
    renderPages(scopedPagesList(manifest.pages || []));
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
    wireAdmin2CommandCenter();
    wireAdmin2TargetSelector();
    wireAdmin2ReviewSummary();
    updateAdmin2PipelineState();
    wirePageFilters();
    wireMedGenPanel();
    bootComposer();
    wireEditorialWidget(adminState.actionContracts, adminState.authContract);
    wireProductCardEditor(adminState.actionContracts, adminState.authContract);
    syncSiteContextGate(activeSiteProfile(), siteProfiles(manifest));
    refreshRuntimeContentIndexForActiveSite({ silent: true });
    refreshMedGenTaskIndexForActiveSite({ force: true });
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
      refreshRuntimeSiteProfiles({ silent: true });
      setGithubStatus('GitHub подключен: ' + (authState.actor ? authState.actor.username + ' / ' + authState.actor.role : 'unknown') + '. Редакторские сохранения пишутся через Contents API; Actions запускаются только для build/deploy.');
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
    const deployStaticVps = deployAfter && !dryRun && hostingProvider(activeSiteProfile()) === 'static_vps';
    const body = {
      ref,
      inputs: {
        command,
        payload_json: JSON.stringify(payload || {}),
        dry_run: dryRun ? 'true' : 'false',
        deploy_static_vps: deployStaticVps ? 'true' : 'false',
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
            deploy_static_vps: deployStaticVps,
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
      setGithubRateLimit('Act n/a · CF Workers 100k/day', false);
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

  if (window.__CMX_ADMIN_TEST_HOOKS__ === true && window.location && window.location.protocol === 'file:') {
    Object.defineProperty(window, '__cmxAdminTestHooks', {
      configurable: true,
      enumerable: false,
      value: {
        collectSiteFleetEnvironmentSecretValues,
        clearSiteFleetEnvironmentSecretValues,
        encryptGithubEnvironmentSecret,
        githubPutEnvironmentSecret,
        saveEnvironmentSecretsForProfile,
        roleDefaultCapabilities,
        githubProfileForLogin,
        canManageRolePermissions
      }
    });
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
