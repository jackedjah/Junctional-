'use strict';
/* ══ MEAL GRADE :: API ═════════════════════════════════════════════════════
   One endpoint, one data set, two callers.

   AUTHORIZATION, and this is the load-bearing part:
     COACH   an admin session (S.isAuthed) may act for any member, because
             selecting a member is what the console is for.
     MEMBER  a My Gym token may act for EXACTLY ONE member: the one inside
             the token. A member_id in the request body is ignored entirely
             for member callers, so changing it in devtools cannot reach
             another person's meals.

   Photos live in the private meal-gradient bucket under member_id/entry_id/,
   and are only ever handed out as short-lived signed URLs. They are never
   publicly enumerable.
   ═══════════════════════════════════════════════════════════════════════ */

const S = require('./_session');
const P = require('./_payment');
const MG = require('./mygym');
const Role = require('./_mahfitt-role-context');
const VISION = require('./_meal-vision');

const H = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive'
};
const out = (c, b) => ({ statusCode: c, headers: H, body: JSON.stringify(b) });
const uuid = v => /^[0-9a-fA-F-]{36}$/.test(String(v || ''));
const BUCKET = 'meal-gradient';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hdyuolirdxnggmnpbhag.supabase.co';
const TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const SCORES = ['green', 'yellow', 'red'];
const REVIEW_RATINGS = ['down', 'neutral', 'up'];
const REVIEW_MAX_LENGTH = 2000;
const MAH_CONTEXT_MAX_LENGTH = 250;
/* Keep the server budget outside the provider budget so a slow but healthy
   multi-image read can finish and still return its specific provider result.
   This is an outer reliability bound, not the expected Meal Grade latency. */
const ANALYSIS_DEADLINE_MS = 30000;

async function withinDeadline(promise, deadlineAt, onTimeout) {
  let timer;
  const remaining = Math.max(0, deadlineAt - Date.now());
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      if (onTimeout) onTimeout();
      reject(Object.assign(new Error('analysis deadline'), { code: 'ANALYSIS_TIMEOUT' }));
    }, remaining);
  });
  try { return await Promise.race([promise, timeout]); }
  finally { clearTimeout(timer); }
}

/* Preserve the provider's safe failure class all the way to the member UI.
   v301 collapsed every OpenAI error into ANALYSIS_FAILED, which made a bad
   credential, rate limit, rejected model and timeout look identical and left
   the deployment impossible to diagnose. No provider response body or secret
   material is exposed here. */
function visionFailure(error) {
  const code = error && error.code;
  const status = Number(error && error.status) || 0;
  if (code === 'NO_PROVIDER') {
    return { status: 503, code: 'NO_PROVIDER', error: 'Meal analysis is not configured. Your photos are saved.' };
  }
  if (code === 'VISION_TIMEOUT' || code === 'ANALYSIS_TIMEOUT') {
    return { status: 504, code: 'ANALYSIS_TIMEOUT', error: 'Meal analysis timed out. Your photos are saved.' };
  }
  if (code === 'VISION_REFUSAL') {
    return { status: 422, code: 'ANALYSIS_REFUSED', error: 'The meal could not be read. Your photos are saved.' };
  }
  if (code === 'VISION_INCOMPLETE') {
    return { status: 502, code: 'ANALYSIS_INVALID', error: 'The meal reading was incomplete. Your photos are saved.' };
  }
  if (code === 'VISION_HTTP') {
    if (status === 401) return { status: 502, code: 'AI_AUTH_FAILED', error: 'The Meal Grade AI connection was rejected. Your photos are saved.' };
    if (status === 403) return { status: 502, code: 'AI_ACCESS_DENIED', error: 'The Meal Grade AI account cannot use the selected model. Your photos are saved.' };
    if (status === 404) return { status: 502, code: 'MODEL_UNSUPPORTED', error: 'The selected Meal Grade AI model is unavailable. Your photos are saved.' };
    if (status === 429) return { status: 503, code: 'AI_RATE_LIMITED', error: 'Meal analysis is temporarily busy. Your photos are saved.' };
    if (status >= 500) return { status: 503, code: 'AI_PROVIDER_UNAVAILABLE', error: 'The Meal Grade AI provider is temporarily unavailable. Your photos are saved.' };
    return { status: 502, code: 'ANALYSIS_REQUEST_REJECTED', error: 'The Meal Grade AI request was rejected. Your photos are saved.' };
  }
  return { status: 502, code: 'ANALYSIS_FAILED', error: 'Meal analysis was interrupted. Your photos are saved.' };
}

/* Resolve who this request may act for. Returns null when it may act for
   nobody, which is the safe default for anything unrecognised. */
async function actor(event, body) {
  /* A tester can legitimately have BOTH the coach cookie and a My Gym member
     cookie in the same browser. Do not let the presence of the coach cookie
     short-circuit a valid member request that intentionally has no memberId. */
  if (S.isAuthed(event) && uuid(body.memberId)) {
    return { memberId: body.memberId, who: 'coach' };
  }
  const claim = (MG.memberFromRequest && MG.memberFromRequest(event, body))
    || (MG.memberFromToken && MG.memberFromToken(body.memberToken));
  if (claim && uuid(claim.id)) {
    const member = await P.memberWithAccess(claim.id, 'id,first_name,last_name,sesh_left,active,gym_only,preferred_park');
    if (!member) return null;
    /* R90: a member token still authenticates the real human. When that human
       is an authorized coach and explicitly targets another profile, resolve
       the relationship server-side instead of pretending the token belongs to
       the client. This allows the existing non-AI Meal Log/review surface to
       work for relationship coaches while keeping sender/auth identity intact. */
    if (uuid(body.memberId) && String(body.memberId).toLowerCase() !== String(member.id).toLowerCase()) {
      const resolved = await Role.resolve(event, member, { action: 'mealLog', activeProfileId: body.memberId });
      if (!resolved.ok || !resolved.context || !resolved.context.isClientContext) return null;
      return { memberId: resolved.activeMember.id, who: 'coach', roleContext: resolved.context };
    }
    return { memberId: member.id, who: 'member' };
  }
  return null;
}

async function storage(path, opts) {
  const url = SUPABASE_URL + '/storage/v1/' + path;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const res = await fetch(url, Object.assign({}, opts, {
    headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key }, (opts && opts.headers) || {})
  }));
  if (res.status === 404 && opts && opts.allowMissing) return null;
  if (!res.ok) throw new Error('storage ' + res.status);
  const ct = res.headers.get('content-type') || '';
  return ct.indexOf('json') >= 0 ? res.json() : res.arrayBuffer();
}

/* Short-lived signed URLs. The bucket is private, so this is the only way a
   photo is ever readable, and the link expires. */
async function signPhotos(rows, secs) {
  if (!rows || !rows.length) return {};
  const map = {};
  const unique = [];
  const seen = new Set();
  rows.forEach(r => {
    const path = String(r.storage_path || '');
    if (path && !seen.has(path)) { seen.add(path); unique.push({ id: r.id, path }); }
  });
  /* Supabase supports signing multiple private objects in one request. The
     earlier one-request-per-thumbnail implementation made a 60-entry Log wait
     on up to 60 storage calls and could exhaust a serverless connection pool. */
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100);
    try {
      const signed = await storage('object/sign/' + BUCKET, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: batch.map(item => item.path), expiresIn: secs || 3600 })
      });
      (Array.isArray(signed) ? signed : []).forEach((item, index) => {
        const source = item && item.path
          ? batch.find(candidate => candidate.path === item.path)
          : batch[index];
        const signedPath = item && (item.signedURL || item.signedUrl);
        if (!source || !signedPath) return;
        map[source.id] = /^https?:\/\//.test(signedPath)
          ? signedPath : SUPABASE_URL + '/storage/v1' + signedPath;
      });
    } catch (e) { /* a missing photo must never break the log */ }
  }
  return map;
}

async function removeStorage(paths) {
  const unique = [...new Set((paths || []).map(String).filter(Boolean))];
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100);
    await storage('object/' + BUCKET, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: batch })
    });
  }
  return unique.length;
}

function configuredStorageLimit() {
  if (!process.env.MEAL_GRADIENT_MEMBER_STORAGE_MB) return null;
  const mb = Number(process.env.MEAL_GRADIENT_MEMBER_STORAGE_MB);
  return Number.isFinite(mb) && mb > 0 ? mb * 1024 * 1024 : null;
}

async function memberStorageUsage(memberId) {
  const rows = await P.db('meal_gradient_photos?select=storage_path&member_id=eq.' + memberId + '&limit=5000') || [];
  const limit = configuredStorageLimit();
  /* A photo count is real backend information. A percentage is only real when
     an operator has explicitly defined a per-member allowance. */
  if (!limit) return { usedBytes: null, limitBytes: null, percent: null, photoCount: rows.length };
  const folders = [...new Set(rows.map(r => String(r.storage_path || '').split('/').slice(0, -1).join('/')).filter(Boolean))];
  let used = 0;
  let failed = false;
  /* Supabase Storage list returns object metadata, including byte size. Work
     folder-by-folder because the first level under a member is an entry id. */
  for (let i = 0; i < folders.length; i += 8) {
    const batch = folders.slice(i, i + 8);
    const parts = await Promise.all(batch.map(async prefix => {
      try {
        const list = await storage('object/list/' + BUCKET, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix, limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } })
        });
        return (Array.isArray(list) ? list : []).reduce((n, o) => n + Number((o.metadata && o.metadata.size) || o.size || 0), 0);
      } catch (e) { failed = true; return 0; }
    }));
    used += parts.reduce((a, b) => a + b, 0);
  }
  if (failed) return { usedBytes: null, limitBytes: limit, percent: null, photoCount: rows.length };
  return { usedBytes: used, limitBytes: limit,
    percent: Math.min(100, used / limit * 100),
    photoCount: rows.length };
}

function analysisObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch (e) { return {}; }
}

const LEGACY_BETA_REASON = 'Beta placeholder — vision meal scoring is not connected yet.';
const LEGACY_PENDING_AI_REASON = 'AI analysis pending — your photos are saved and will be analyzed automatically.';
const DEFERRED_AI_REASON = 'Meal analysis was interrupted. Open this entry to retry.';

/* Historical beta rows were permanently painted Yellow even though no model
   had judged them, while some interrupted builds left reason_short blank.
   Treat those compatibility shapes as retryable; genuine scored entries
   remain untouched. */
function analysisPending(row) {
  const analysis = analysisObject(row && row.analysis_json);
  const reason = String(row && row.reason_short || '');
  return !!row && !row.ai_score && !Object.keys(analysis).length
    && (!reason
      || reason === LEGACY_BETA_REASON
      || reason === LEGACY_PENDING_AI_REASON
      || reason === DEFERRED_AI_REASON);
}

/* Keep Log payloads small: the full evidence object stays on the entry detail,
   while daily totals receive only the explicitly estimated nutrition fields. */
function nutritionSummary(value) {
  const analysis = analysisObject(value);
  const n = analysis.nutrition_estimate && typeof analysis.nutrition_estimate === 'object'
    ? analysis.nutrition_estimate : {};
  const number = key => n[key] == null || n[key] === '' || !Number.isFinite(Number(n[key]))
    ? null : Number(n[key]);
  return {
    available: n.available === true && number('calories_estimate') != null,
    estimated: true,
    caloriesEstimate: number('calories_estimate'),
    caloriesLow: number('calories_low'),
    caloriesHigh: number('calories_high'),
    proteinG: number('protein_g_estimate'),
    proteinGLow: number('protein_g_low'),
    proteinGHigh: number('protein_g_high'),
    carbsG: number('carbs_g_estimate'),
    carbsGLow: number('carbs_g_low'),
    carbsGHigh: number('carbs_g_high'),
    fatG: number('fat_g_estimate'),
    fatGLow: number('fat_g_low'),
    fatGHigh: number('fat_g_high'),
    confidence: number('confidence'),
    portionBasis: String(n.portion_basis || 'unclear').slice(0, 48),
    assumptions: Array.isArray(n.assumptions) ? n.assumptions.slice(0, 6).map(item => String(item).slice(0, 160)) : []
  };
}

function reviewForClient(row) {
  if (!row) return null;
  const rating = REVIEW_RATINGS.includes(String(row.ai_accuracy_rating || ''))
    ? String(row.ai_accuracy_rating) : null;
  return {
    feedback: String(row.coach_feedback || ''),
    aiAccuracyRating: rating,
    reviewedAt: row.reviewed_at || row.updated_at || row.created_at || null
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return out(405, { ok: false, error: 'Method not allowed.' });
  let b = {};
  try { b = JSON.parse(event.body || '{}'); } catch (e) {}
  const action = String(b.action || '');

  let who = null;
  try { who = await actor(event, b); } catch (e) {
    console.error('meal-gradient access check', e && e.message);
    return out(503, { ok: false, code: 'ACCESS_CHECK_FAILED', error: 'Member access could not be checked right now.' });
  }
  if (!who) return out(401, { ok: false, code: 'AUTH_REQUIRED', error: 'Member access is not active. Contact Jah directly.' });
  const memberId = who.memberId;               /* never from the body for members */
  if(who.roleContext&&!Role.permissionAllowed(who.roleContext,'logs')){const denied=Role.permissionError('logs');return out(denied.status,{ok:false,code:denied.code,error:denied.error});}
  /* R90: the existing FOB admin may review/log authorized client nutrition,
     but Meal Scan vision is personal AI.  Coach authorization therefore does
     not inherit the client's AI operation merely because the meal data owner
     is the client. */
  if(who.who==='coach'&&action==='analyze')return out(403,{ok:false,code:'CLIENT_AI_PROTECTED',error:'Meal Scan AI is personal to the member. Coach Mode can review the MAH LOG without running the client’s AI.'});

  /* Netlify AI Gateway runtime guard. The public /api/meal-gradient route is
     routed to meal-gradient-runtime.mjs, which marks the event after the
     request has entered the modern Netlify Functions runtime. Keep the legacy
     handler available for non-AI compatibility, but never let it own vision. */
  if (action === 'analyze' && event.__netlifyModernAiRuntime !== true && typeof event.path === 'string' && event.path) {
    return out(503, { ok: false, code: 'AI_RUNTIME_REQUIRED',
      error: 'Meal analysis requires the modern Netlify Functions runtime.' });
  }

  try {
    /* ---- coach reviews: separate from the AI result and coach-write only ---- */
    if (action === 'saveReview') {
      if (who.who !== 'coach') return out(403, { ok: false, error: 'Coach authorization is required.' });
      if (!uuid(b.entryId)) return out(400, { ok: false, error: 'Bad entry.' });

      const feedback = b.feedback == null ? '' : String(b.feedback).trim();
      if (feedback.length > REVIEW_MAX_LENGTH) {
        return out(400, { ok: false, error: 'Coach feedback is too long.' });
      }
      const rawRating = b.aiAccuracyRating == null ? '' : String(b.aiAccuracyRating);
      const rating = rawRating ? (REVIEW_RATINGS.includes(rawRating) ? rawRating : null) : null;
      if (rawRating && !rating) return out(400, { ok: false, error: 'Invalid AI accuracy rating.' });
      if (!feedback && !rating) {
        return out(400, { ok: false, error: 'Add coach feedback or an AI accuracy reaction before saving.' });
      }

      /* The selected member is part of the authorization boundary. An entry id
         copied from another member cannot be reviewed in this context. */
      const own = await P.db('meal_gradient_entries?select=id&member_id=eq.' + memberId
        + '&id=eq.' + b.entryId + '&limit=1') || [];
      if (!own.length) return out(404, { ok: false, error: 'Meal entry not found for this member.' });

      const now = new Date().toISOString();
      const saved = await P.db('meal_gradient_reviews?on_conflict=entry_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          entry_id: b.entryId,
          member_id: memberId,
          coach_feedback: feedback || null,
          ai_accuracy_rating: rating,
          reviewed_at: now,
          updated_at: now
        })
      }) || [];
      return out(200, { ok: true, review: reviewForClient(saved[0] || {
        coach_feedback: feedback, ai_accuracy_rating: rating, reviewed_at: now
      }) });
    }

    if (action === 'removeReview') {
      if (who.who !== 'coach') return out(403, { ok: false, error: 'Coach authorization is required.' });
      if (!uuid(b.entryId)) return out(400, { ok: false, error: 'Bad entry.' });
      const own = await P.db('meal_gradient_entries?select=id&member_id=eq.' + memberId
        + '&id=eq.' + b.entryId + '&limit=1') || [];
      if (!own.length) return out(404, { ok: false, error: 'Meal entry not found for this member.' });
      await P.db('meal_gradient_reviews?entry_id=eq.' + b.entryId + '&member_id=eq.' + memberId, {
        method: 'DELETE', headers: { Prefer: 'return=minimal' }
      });
      return out(200, { ok: true });
    }

    /* ---- settings ---- */
    if (action === 'settings') {
      const rows = await P.db('meal_gradient_settings?select=*&member_id=eq.' + memberId + '&limit=1');
      const row = rows && rows[0] || {};
      const physiqueGoal = ['gain', 'maintain', 'lose'].includes(String(row.physique_goal || ''))
        ? String(row.physique_goal) : 'maintain';
      return out(200, { ok: true, calorieGoal: row.daily_calorie_goal || null, physiqueGoal });
    }
    if (action === 'saveSettings') {
      /* Merge with the existing row so changing one setting can never silently
         reset the other. This also keeps older clients that only send
         calorieGoal compatible with the new physique-goal field. */
      const existingRows = await P.db('meal_gradient_settings?select=*&member_id=eq.' + memberId + '&limit=1') || [];
      const existing = existingRows[0] || {};
      const goal = b.calorieGoal == null
        ? (existing.daily_calorie_goal == null ? null : Number(existing.daily_calorie_goal))
        : b.calorieGoal === '' ? null
          : Math.max(0, Math.min(20000, parseInt(b.calorieGoal, 10) || 0));
      const requestedPhysique = String(b.physiqueGoal == null ? existing.physique_goal || 'maintain' : b.physiqueGoal).toLowerCase();
      const physiqueGoal = ['gain', 'maintain', 'lose'].includes(requestedPhysique) ? requestedPhysique : 'maintain';
      const fullSettings = {
        member_id: memberId,
        daily_calorie_goal: goal,
        physique_goal: physiqueGoal,
        updated_at: new Date().toISOString()
      };
      let physiqueGoalPersisted = true;
      try {
        await P.db('meal_gradient_settings?on_conflict=member_id', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(fullSettings)
        });
      } catch (settingsWriteError) {
        /* The AI path must remain operational during a staged deploy where the
           additive 035 migration has not reached Supabase yet. Preserve the
           calorie setting and keep the requested physique goal in the UI for
           this session, while explicitly reporting that persistence still
           needs the migration. Do not swallow unrelated database failures. */
        const detail = settingsWriteError && settingsWriteError.detail;
        const detailText = JSON.stringify(detail || '').toLowerCase();
        const missingPhysiqueColumn = Number(settingsWriteError && settingsWriteError.status) === 400
          && detailText.indexOf('physique_goal') >= 0;
        if (!missingPhysiqueColumn) throw settingsWriteError;
        physiqueGoalPersisted = false;
        await P.db('meal_gradient_settings?on_conflict=member_id', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            member_id: memberId,
            daily_calorie_goal: goal,
            updated_at: fullSettings.updated_at
          })
        });
      }
      return out(200, { ok: true, calorieGoal: goal, physiqueGoal, physiqueGoalPersisted });
    }

    /* ---- private member storage ---- */
    if (action === 'storageStats') {
      const st = await memberStorageUsage(memberId);
      return out(200, Object.assign({ ok: true }, st));
    }

    if (action === 'wipeAll') {
      const ph = await P.db('meal_gradient_photos?select=storage_path&member_id=eq.' + memberId + '&limit=5000') || [];
      try { await removeStorage(ph.map(p => p.storage_path)); }
      catch (e) {
        return out(502, { ok: false, code: 'STORAGE_FAILED', error: 'Private photo deletion was interrupted. Nothing else was deleted.' });
      }
      await P.db('meal_gradient_entries?member_id=eq.' + memberId,
        { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      await P.db('meal_gradient_settings?member_id=eq.' + memberId,
        { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return out(200, { ok: true, deletedPhotos: ph.length });
    }

    /* ---- log ---- */
    if (action === 'nutritionHistory') {
      const rows = await P.db('meal_gradient_entries?select=id,meal_type,captured_at,created_at,analysis_json'
        + '&member_id=eq.' + memberId + '&order=captured_at.desc&limit=1000') || [];
      return out(200, {
        ok: true,
        entries: rows.map(r => ({
          id: r.id,
          mealType: r.meal_type,
          capturedAt: r.captured_at || r.created_at,
          nutrition: nutritionSummary(r.analysis_json)
        }))
      });
    }

    if (action === 'log') {
      const type = TYPES.indexOf(String(b.mealType || '')) >= 0 ? String(b.mealType) : null;
      const limit = Math.min(120, parseInt(b.limit, 10) || 60);
      /* Keep the Log resilient across additive schema revisions: select the
         whole entry row rather than making one optional column able to break
         every historical meal. */
      const rows = await P.db('meal_gradient_entries?select=*&member_id=eq.' + memberId
        + (type ? '&meal_type=eq.' + type : '')
        + '&order=captured_at.desc&limit=' + limit) || [];
      let photos = [];
      try {
        /* Query by member rather than a generated in.(uuid,uuid,...) clause.
           This also keeps one malformed/legacy entry id from taking down Log. */
        const allPhotos = await P.db('meal_gradient_photos?select=*&member_id=eq.' + memberId
          + '&order=created_at.desc&limit=500') || [];
        const wanted = new Set(rows.map(r => r.id));
        photos = allPhotos.filter(p => wanted.has(p.entry_id));
      } catch (e) {
        console.error('meal-gradient log photos', e && e.message);
        photos = [];
      }
      let reviews = [];
      try {
        reviews = await P.db('meal_gradient_reviews?select=entry_id,coach_feedback,ai_accuracy_rating,reviewed_at,created_at,updated_at'
          + '&member_id=eq.' + memberId + '&limit=120') || [];
      } catch (e) {
        /* Keep the established Meal Grade Log available if application code is
           deployed before the additive review migration. Review writes still
           require the migration and will fail closed. */
        console.error('meal-gradient log reviews', e && e.message);
        reviews = [];
      }
      const reviewByEntry = {};
      reviews.forEach(review => { if (review && review.entry_id) reviewByEntry[review.entry_id] = review; });

      const first = {};
      const photoCounts = {};
      photos.slice().sort((a,b) => Number(a.angle_index||0)-Number(b.angle_index||0))
        .forEach(p => {
          photoCounts[p.entry_id] = (photoCounts[p.entry_id] || 0) + 1;
          if (!first[p.entry_id]) first[p.entry_id] = p;
        });
      const signed = await signPhotos(Object.keys(first).map(k => first[k]), 3600);
      return out(200, {
        ok: true, who: who.who,
        entries: rows.map(r => {
          const analysis = analysisObject(r.analysis_json);
          const pending = analysisPending(r);
          return {
            id: r.id, mealType: r.meal_type, capturedAt: r.captured_at || r.created_at,
            aiScore: r.ai_score, score: pending ? null : (r.final_score || r.ai_score),
            confidence: r.ai_confidence, name: r.meal_name,
            reason: pending ? DEFERRED_AI_REASON : r.reason_short,
            analysisPending: pending,
            improvement: r.improvement_short, note: r.user_note,
            needsMore: r.needs_more_evidence, scoringVersion: r.scoring_version,
            numericScore: analysis.final_numeric_score == null ? null : Number(analysis.final_numeric_score),
            nutrition: nutritionSummary(analysis),
            thumb: (first[r.id] && signed[first[r.id].id]) || null,
            photoCount: photoCounts[r.id] || 0,
            review: reviewForClient(reviewByEntry[r.id])
          };
        })
      });
    }

    if (action === 'entry') {
      if (!uuid(b.id)) return out(400, { ok: false, error: 'Bad entry.' });
      const rows = await P.db('meal_gradient_entries?select=*&id=eq.' + b.id
        + '&member_id=eq.' + memberId + '&limit=1');
      if (!rows || !rows.length) return out(404, { ok: false, error: 'Not found.' });
      const ph = await P.db('meal_gradient_photos?select=id,storage_path,angle_index,photo_type'
        + '&entry_id=eq.' + b.id + '&member_id=eq.' + memberId + '&order=angle_index.asc') || [];
      const signed = await signPhotos(ph, 3600);
      const r = rows[0];
      const pending = analysisPending(r);
      return out(200, {
        ok: true,
        entry: {
          id: r.id, mealType: r.meal_type, capturedAt: r.captured_at,
          aiScore: r.ai_score, score: pending ? null : (r.final_score || r.ai_score),
          confidence: r.ai_confidence, name: r.meal_name,
          reason: pending ? DEFERRED_AI_REASON : r.reason_short,
          analysisPending: pending,
          improvement: r.improvement_short, note: r.user_note,
          needsMore: r.needs_more_evidence, analysis: r.analysis_json,
          nutrition: nutritionSummary(r.analysis_json),
          model: r.analysis_model, scoringVersion: r.scoring_version,
          photos: ph.map(p => ({ id: p.id, url: signed[p.id] || null, type: p.photo_type, index: p.angle_index }))
        }
      });
    }

    /* ---- upload one photo into a draft entry ---- */
    if (action === 'uploadPhoto') {
      const dataUrl = String(b.image || '');
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
      if (!m) return out(400, { ok: false, error: 'Unsupported image.' });
      const bytes = Buffer.from(m[2], 'base64');
      if (bytes.length > 12 * 1024 * 1024) return out(400, { ok: false, error: 'Image too large.' });

      let entryId = uuid(b.entryId) ? b.entryId : null;
      const sub = String(b.submissionId || '').slice(0, 64) || null;
      if (entryId) {
        const own = await P.db('meal_gradient_entries?select=id&member_id=eq.' + memberId
          + '&id=eq.' + entryId + '&limit=1');
        if (!own || !own.length) return out(404, { ok: false, error: 'Meal entry not found.' });
      }
      if (!entryId) {
        /* The draft entry is created on the first photo, keyed by the client's
           submission id, so a double tap can only ever produce one entry. */
        const type = TYPES.indexOf(String(b.mealType || '')) >= 0 ? String(b.mealType) : 'lunch';
        if (sub) {
          const dup = await P.db('meal_gradient_entries?select=id&member_id=eq.' + memberId
            + '&submission_id=eq.' + encodeURIComponent(sub) + '&limit=1');
          if (dup && dup[0]) entryId = dup[0].id;
        }
        if (!entryId) {
          try {
            const made = await P.db('meal_gradient_entries', {
              method: 'POST', headers: { Prefer: 'return=representation' },
              body: JSON.stringify({
                member_id: memberId, meal_type: type, submission_id: sub,
                created_by: who.who, scoring_version: VISION.SCORING_VERSION
              })
            });
            entryId = made && made[0] && made[0].id;
          } catch (createError) {
            /* Two slow uploads from the same old client can reach this point at
               once. The unique submission index is the authority; recover the
               winner instead of turning the losing request into a failed meal. */
            if (sub) {
              const duplicate = await P.db('meal_gradient_entries?select=id&member_id=eq.' + memberId
                + '&submission_id=eq.' + encodeURIComponent(sub) + '&limit=1');
              if (duplicate && duplicate[0]) entryId = duplicate[0].id;
              else throw createError;
            } else throw createError;
          }
        }
      }
      if (!entryId) return out(500, { ok: false, error: 'Could not start the entry.' });

      const idx = Math.max(0, Math.min(3, parseInt(b.angleIndex, 10) || 0));
      const dbIdx = idx + 1; /* DB constraint is 1..4; frontend capture slots are 0..3. */
      const path = memberId + '/' + entryId + '/' + String(dbIdx).padStart(2, '0') + '.jpg';
      const existing = await P.db('meal_gradient_photos?select=id,storage_path&entry_id=eq.' + entryId
        + '&member_id=eq.' + memberId + '&angle_index=eq.' + dbIdx + '&limit=10') || [];
      await storage('object/' + BUCKET + '/' + path, {
        method: 'POST',
        headers: { 'Content-Type': m[1], 'x-upsert': 'true' },
        body: bytes
      });
      const photoType = ['meal', 'label', 'ingredients', 'other'].includes(String(b.photoType))
        ? String(b.photoType) : 'meal';
      if (existing.length === 1) {
        await P.db('meal_gradient_photos?id=eq.' + existing[0].id + '&member_id=eq.' + memberId, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ storage_path: path, photo_type: photoType })
        });
        if (existing[0].storage_path && existing[0].storage_path !== path) {
          try { await removeStorage([existing[0].storage_path]); } catch (e) {}
        }
      } else {
        if (existing.length > 1) {
          await P.db('meal_gradient_photos?entry_id=eq.' + entryId + '&member_id=eq.' + memberId + '&angle_index=eq.' + dbIdx,
            { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
        }
        try {
          const madePhoto = await P.db('meal_gradient_photos', {
            method: 'POST', headers: { Prefer: 'return=representation' },
            body: JSON.stringify({
              entry_id: entryId, member_id: memberId, storage_path: path,
              angle_index: dbIdx, photo_type: photoType
            })
          });
          /* The current migration predates a unique angle constraint. Current
             clients serialize uploads, but normalize a simultaneous legacy
             request too. Every contender chooses the same UUID winner, so two
             serverless instances cannot delete each other's winner. */
          const slotRows = await P.db('meal_gradient_photos?select=id&entry_id=eq.' + entryId
            + '&member_id=eq.' + memberId + '&angle_index=eq.' + dbIdx + '&limit=10') || [];
          if (slotRows.length > 1) {
            const keepId = slotRows.map(row => row.id).filter(Boolean).sort()[0]
              || (madePhoto && madePhoto[0] && madePhoto[0].id);
            await Promise.all(slotRows.filter(row => row.id && row.id !== keepId).map(row =>
              P.db('meal_gradient_photos?id=eq.' + row.id + '&member_id=eq.' + memberId,
                { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
            ));
          }
        } catch (photoError) {
          const winner = await P.db('meal_gradient_photos?select=id&entry_id=eq.' + entryId
            + '&member_id=eq.' + memberId + '&angle_index=eq.' + dbIdx + '&limit=1').catch(() => []);
          if (!winner || !winner.length) {
            try { await removeStorage([path]); } catch (e) {}
          }
          if (winner && winner.length) return out(200, { ok: true, entryId: entryId, angleIndex: idx });
          throw photoError;
        }
      }
      return out(200, { ok: true, entryId: entryId, angleIndex: idx });
    }

    if (action === 'deletePhoto') {
      if (!uuid(b.entryId)) return out(400, { ok: false, error: 'Bad entry.' });
      const idx = Math.max(0, Math.min(3, parseInt(b.angleIndex, 10) || 0));
      const dbIdx = idx + 1;
      const rows = await P.db('meal_gradient_photos?select=id,storage_path&entry_id=eq.' + b.entryId
        + '&member_id=eq.' + memberId + '&angle_index=eq.' + dbIdx + '&limit=10') || [];
      try { await removeStorage(rows.map(p => p.storage_path)); }
      catch (e) { return out(502, { ok: false, code: 'STORAGE_FAILED', error: 'The photo could not be removed right now.' }); }
      await P.db('meal_gradient_photos?entry_id=eq.' + b.entryId + '&member_id=eq.' + memberId + '&angle_index=eq.' + dbIdx,
        { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return out(200, { ok: true });
    }

    /* Cancelled camera sessions are removed only while still ungraded. A
       finalized historical entry can never be erased through this cleanup. */
    if (action === 'discardDraft') {
      const sub = String(b.submissionId || '').slice(0, 64);
      if (!sub) return out(200, { ok: true, discarded: false });
      const drafts = await P.db('meal_gradient_entries?select=id,final_score,ai_score&member_id=eq.' + memberId
        + '&submission_id=eq.' + encodeURIComponent(sub) + '&limit=1') || [];
      const draft = drafts[0];
      if (!draft || draft.final_score || draft.ai_score) return out(200, { ok: true, discarded: false });
      const draftPhotos = await P.db('meal_gradient_photos?select=storage_path&entry_id=eq.' + draft.id
        + '&member_id=eq.' + memberId + '&limit=10') || [];
      try { await removeStorage(draftPhotos.map(p => p.storage_path)); }
      catch (e) { return out(502, { ok: false, code: 'STORAGE_FAILED', error: 'Draft cleanup will be retried later.' }); }
      await P.db('meal_gradient_entries?id=eq.' + draft.id + '&member_id=eq.' + memberId,
        { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return out(200, { ok: true, discarded: true });
    }

    /* ---- finalize a photographed meal into the persistent Log ----
       Uploading creates the durable draft immediately; finalize makes the
       selected meal type/date explicit before the client transitions to Log. */
    if (action === 'finalize') {
      if (!uuid(b.id)) return out(400, { ok: false, error: 'Bad entry.' });
      const type = TYPES.indexOf(String(b.mealType || '')) >= 0 ? String(b.mealType) : null;
      const rows = await P.db('meal_gradient_entries?select=id,meal_type,final_score,ai_score,meal_name,reason_short&id=eq.' + b.id
        + '&member_id=eq.' + memberId + '&limit=1');
      if (!rows || !rows.length) return out(404, { ok: false, error: 'Meal entry not found.' });
      const ph = await P.db('meal_gradient_photos?select=id&entry_id=eq.' + b.id
        + '&member_id=eq.' + memberId + '&limit=4') || [];
      if (!ph.length) return out(400, { ok: false, error: 'Add at least one photo before logging.' });
      const finalizePatch = {
        meal_type: type || rows[0].meal_type,
        updated_at: new Date().toISOString()
      };
      /* Analysis failure must never discard an uploaded meal or fabricate a
         grade. Keep it honestly retryable so it can be analyzed in place. A
         legacy betaFallback request is accepted only for old deployed clients. */
      const analysisDeferred = !!(b.analysisDeferred || b.betaFallback);
      if (analysisDeferred) {
        if (!rows[0].ai_score) {
          finalizePatch.meal_name = rows[0].meal_name || 'Meal photo';
          finalizePatch.reason_short = DEFERRED_AI_REASON;
        }
      }
      await P.db('meal_gradient_entries?id=eq.' + b.id + '&member_id=eq.' + memberId, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(finalizePatch)
      });
      return out(200, {
        ok: true, id: b.id, photoCount: ph.length,
        score: finalizePatch.final_score || rows[0].final_score || rows[0].ai_score || null,
        name: finalizePatch.meal_name || rows[0].meal_name || 'Meal photo',
        analysisDeferred,
        analysisPending: analysisDeferred && !rows[0].ai_score
      });
    }

    /* ---- analyse every photo of the entry together ---- */
    /* Safe diagnostics. Reports ONLY whether a provider is configured, which
       one was selected, the deploy context, and whether a present value failed
       validation. Never the key, never a prefix, never a length. Admin only,
       because the deploy context is operational detail. */
    if (action === 'providerStatus') {
      if (!S.isAuthed(event)) return out(401, { ok: false, error: 'Not authorized.' });
      return out(200, { ok: true, provider: VISION.providerDiagnostics() });
    }

    if (action === 'analyze') {
      const analysisDeadline = Date.now() + ANALYSIS_DEADLINE_MS;
      if (!uuid(b.entryId)) return out(400, { ok: false, error: 'Bad entry.' });
      const own = await P.db('meal_gradient_entries?select=id,meal_type,user_note,ai_score,analysis_json,analysis_model,scoring_version&id=eq.' + b.entryId
        + '&member_id=eq.' + memberId + '&limit=1');
      if (!own || !own.length) return out(404, { ok: false, error: 'Not found.' });
      if (own[0].ai_score && own[0].analysis_json) {
        return out(200, { ok: true, result: own[0].analysis_json,
          model: own[0].analysis_model, scoringVersion: own[0].scoring_version });
      }

      /* Job III MAH Context is a strict scanner contract. A current client may
         send at most 250 JavaScript/HTML characters (the same unit used by
         textarea maxlength). Persist the resolved context BEFORE the provider
         call so a timeout/provider failure can be retried without re-entry.
         Legacy stored notes are tolerated but only the first 250 characters
         are ever supplied to Meal Grade analysis. */
      let analysisNote = own[0].user_note == null ? ''
        : String(own[0].user_note).slice(0, MAH_CONTEXT_MAX_LENGTH);
      if (b.note != null) {
        const incomingNote = String(b.note);
        if (incomingNote.length > MAH_CONTEXT_MAX_LENGTH) {
          return out(400, { ok: false, code: 'MAH_CONTEXT_TOO_LONG',
            error: 'MAH Context is limited to 250 characters.' });
        }
        analysisNote = incomingNote;
        await P.db('meal_gradient_entries?id=eq.' + b.entryId + '&member_id=eq.' + memberId, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ user_note: analysisNote, updated_at: new Date().toISOString() })
        });
      }

      if (!VISION.provider()) {
        return out(503, { ok: false, code: 'NO_PROVIDER',
          error: 'Meal analysis is not configured yet. Your photos are saved.' });
      }

      const ph = await P.db('meal_gradient_photos?select=id,storage_path,photo_type'
        + '&entry_id=eq.' + b.entryId + '&member_id=eq.' + memberId + '&order=angle_index.asc&limit=4') || [];
      if (!ph.length) return out(400, { ok: false, error: 'No photos to read.' });

      const downloadController = typeof AbortController === 'function' ? new AbortController() : null;
      let imageResults;
      try {
        /* Only private-photo reads are part of the hard preparation deadline.
           Settings are useful scoring context, but a missing/new optional
           settings column must NEVER prevent the already-working AI grade from
           running. v310/v311 accidentally coupled the new physique_goal query
           to Promise.all(), so an older live schema could be mislabeled as an
           AI timeout before the provider was even called. */
        imageResults = await withinDeadline(Promise.all(ph.map(async p => {
          try {
            const buf = await storage('object/' + BUCKET + '/' + p.storage_path, {
              method: 'GET', signal: downloadController ? downloadController.signal : undefined
            });
            return {
              base64: Buffer.from(buf).toString('base64'),
              mediaType: 'image/jpeg',
              photoType: p.photo_type || 'meal'
            };
          } catch (e) { return null; }
        })), analysisDeadline, () => { if (downloadController) downloadController.abort(); });
      } catch (e) {
        return out(504, { ok: false, code: 'ANALYSIS_TIMEOUT',
          error: 'Analysis timed out while reading your saved photos. Your meal photos are saved.' });
      }

      /* Read the complete settings row for backward compatibility. `select=*`
         works whether physique_goal has already been migrated or the live site
         still has the older calorie-only schema. If settings are unavailable,
         grading still proceeds with safe defaults instead of being blocked. */
      let settings = [];
      try {
        settings = await P.db('meal_gradient_settings?select=*&member_id=eq.' + memberId + '&limit=1') || [];
      } catch (settingsError) {
        console.error('meal settings context unavailable', Number(settingsError && settingsError.status) || 0);
        settings = [];
      }

      const images = imageResults.filter(Boolean);
      if (!images.length) return out(500, { ok: false, error: 'Photos could not be read.' });

      let res;
      try {
        res = await VISION.analyzeMeal(images, {
          mealType: b.mealType || own[0].meal_type,
          calorieGoal: settings && settings[0] && settings[0].daily_calorie_goal,
          physiqueGoal: settings && settings[0] && settings[0].physique_goal || 'maintain',
          note: analysisNote,
          deadlineAt: analysisDeadline
        });
      } catch (e) {
        const failure = visionFailure(e);
        console.error('meal vision', failure.code, Number(e && e.status) || 0);
        return out(failure.status, { ok: false, code: failure.code, error: failure.error });
      }
      if (!res || !res.result) {
        return out(502, { ok: false, code: 'ANALYSIS_INVALID',
          error: 'The reading came back unclear. Your meal photos are saved.' });
      }
      const r = res.result;
      await P.db('meal_gradient_entries?id=eq.' + b.entryId + '&member_id=eq.' + memberId, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          meal_type: TYPES.indexOf(String(b.mealType || '')) >= 0 ? String(b.mealType) : own[0].meal_type,
          ai_score: r.score, final_score: r.score, ai_confidence: r.confidence,
          meal_name: r.meal_name, reason_short: r.reason_short,
          improvement_short: r.improvement_short, needs_more_evidence: r.needs_more_evidence,
          analysis_json: r, analysis_model: res.model, analysis_version: res.version,
          scoring_version: VISION.SCORING_VERSION,
          user_note: analysisNote,
          updated_at: new Date().toISOString()
        })
      });
      return out(200, { ok: true, result: r, model: res.model, scoringVersion: VISION.SCORING_VERSION });
    }

    /* ---- edits ---- */
    if (action === 'update') {
      if (!uuid(b.id)) return out(400, { ok: false, error: 'Bad entry.' });
      const patch = { updated_at: new Date().toISOString() };
      if (TYPES.indexOf(String(b.mealType)) >= 0) patch.meal_type = String(b.mealType);
      /* An override never erases the AI result: ai_score is left alone. */
      if (SCORES.indexOf(String(b.finalScore)) >= 0) patch.final_score = String(b.finalScore);
      if (b.note != null) patch.user_note = String(b.note).slice(0, 600);
      if (b.mealName != null) patch.meal_name = String(b.mealName).slice(0, 120);
      await P.db('meal_gradient_entries?id=eq.' + b.id + '&member_id=eq.' + memberId, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch)
      });
      return out(200, { ok: true });
    }

    if (action === 'delete') {
      if (!uuid(b.id)) return out(400, { ok: false, error: 'Bad entry.' });
      const ph = await P.db('meal_gradient_photos?select=storage_path&entry_id=eq.' + b.id
        + '&member_id=eq.' + memberId) || [];
      try { await removeStorage(ph.map(p => p.storage_path)); }
      catch (e) { return out(502, { ok: false, code: 'STORAGE_FAILED', error: 'Private photo deletion was interrupted. The entry was kept.' }); }
      await P.db('meal_gradient_entries?id=eq.' + b.id + '&member_id=eq.' + memberId,
        { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return out(200, { ok: true });
    }

    return out(400, { ok: false, error: 'Unknown action.' });
  } catch (e) {
    console.error('meal-gradient', e && e.message, e && e.detail);
    return out(500, { ok: false, code: 'SERVER_FAILED', error: 'Meal Grade is unavailable right now.' });
  }
};
