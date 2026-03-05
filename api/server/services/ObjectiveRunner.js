'use strict';

/**
 * ObjectiveRunner — HandsAI proactive agent execution engine
 *
 * Runs as a background service inside the Node process.
 * Every POLL_INTERVAL_MS it queries MongoDB for active Objectives that are due,
 * then invokes the LLM agent via the internal HTTP API.
 * 
 * Objectives are different from Tasks: they are standalone recurring instructions
 * with their own state, cron schedule, and a required agent assignment.
 */

const jwt = require('jsonwebtoken');
const { logger } = require('@librechat/data-schemas');
const { CronExpressionParser } = require('cron-parser');

const POLL_INTERVAL_MS = 60_000; // every 60 seconds
const TASK_JWT_EXPIRY = '5m'; // short-lived for security
const MAX_CONCURRENT = 3; // max objectives running simultaneously

let running = false;
let timer = null;
const activeObjectives = new Set();

/**
 * Generate a short-lived internal JWT for a userId.
 * Signs with the same JWT_SECRET the server uses for user sessions.
 * @param {string} userId
 * @returns {string}
 */
function createInternalToken(userId) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('[ObjectiveRunner] JWT_SECRET is not set');
    }
    return jwt.sign(
        {
            id: userId,
            _taskRunner: true, // Identify as internal runner
        },
        secret,
        { expiresIn: TASK_JWT_EXPIRY },
    );
}

/**
 * Get the base URL for internal API calls.
 */
function getBaseUrl() {
    const port = process.env.PORT || 3080;
    const host = process.env.HOST || 'localhost';
    return `http://${host}:${port}`;
}

function getNextCronDate(cronExpression, fromDate = null) {
    try {
        const options = fromDate ? { currentDate: fromDate } : {};
        const interval = CronExpressionParser.parse(cronExpression, options);
        return interval.next().toDate();
    } catch (err) {
        logger.warn(`[ObjectiveRunner] Invalid cron expression: "${cronExpression}" - ${err.message}`);
        return new Date(Date.now() + 3600_000);
    }
}

/**
 * Parse SSE event-stream response and extract the final aggregated text.
 */
async function parseSSEResponse(response) {
    const text = await response.text().catch(() => '');
    const lines = text.split('\n');
    let finalText = '';

    for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
            const payload = JSON.parse(line.slice(6));
            if (payload.text) {
                finalText += payload.text;
            }
            if (payload.final === true && payload.text) {
                finalText = payload.text;
            }
        } catch {
            // ignore
        }
    }

    return { ok: true, text: finalText || '(No response text extracted)' };
}

/**
 * Call the agent chat endpoint internally on behalf of a user.
 */
async function invokeAgent(objective, token) {
    const baseUrl = getBaseUrl();
    const endpoint = 'agents';

    // Fetch the proper string ID for the agent (e.g. 'agent_IEt...')
    // LibreChat expects this string ID, otherwise it treats it as an ephemeral agent and throws missing_model
    let agentStringId = objective.agentId?.toString();
    try {
        const mongoose = require('mongoose');
        const Agent = mongoose.model('Agent');
        const agentDoc = await Agent.findById(objective.agentId).select('id').lean();
        if (agentDoc && agentDoc.id) {
            agentStringId = agentDoc.id;
        }
    } catch (err) {
        logger.warn(`[ObjectiveRunner] Could not fetch string ID for agent ${objective.agentId}:`, err.message);
    }

    const body = {
        endpoint,
        conversationId: 'new',
        parentMessageId: '00000000-0000-0000-0000-000000000000',
        // Build context out of the Objective
        text: `System Alert: This is an automated execution for your continuous Objective.\n\n[Objective Title]: ${objective.title}\n\n[Objective Details]: ${objective.description}\n\nPlease proceed with your objective autonomously.`,
        agent_id: agentStringId,
        isTask: true, // Reuse the task runner logic on the agent API side to avoid UI popups
    };

    let response;
    try {
        response = await fetch(`${baseUrl}/api/agents/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'x-task-runner': '1',
                // Prevents LibreChat's non_browser violation detector from banning the runner's userId
                'User-Agent': 'Mozilla/5.0 (compatible; HandsAI-ObjectiveRunner/1.0)',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(5 * 60_000),
        });
    } catch (err) {
        return { ok: false, text: '', error: `Fetch failed: ${err.message}` };
    }

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        return { ok: false, text: '', error: `HTTP ${response.status}: ${errText.slice(0, 200)}` };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
        return await parseSSEResponse(response);
    }

    try {
        const json = await response.json();
        const text = json.text || json.message?.text || JSON.stringify(json);
        return { ok: true, text };
    } catch {
        const text = await response.text().catch(() => '');
        return { ok: true, text };
    }
}

/**
 * Execute a single objective: skip if no agent, invoke agent, save status.
 */
async function executeObjective(objective) {
    const objId = objective._id.toString();
    activeObjectives.add(objId);
    const startedAt = Date.now();

    logger.info(`[ObjectiveRunner] Starting objective ${objId}: "${objective.title}"`);

    // Forcefully update the nextRunAt before we actually invoke, to avoid double hits if invoke hangs
    if (objective.runner?.cronExpression) {
        objective.runner.lastRunAt = new Date();
        objective.runner.nextRunAt = getNextCronDate(objective.runner.cronExpression, new Date());
        await objective.save();
    }

    try {
        const token = createInternalToken(objective.userId.toString());
        const { ok, text, error } = await invokeAgent(objective, token);

        const durationMs = Date.now() - startedAt;

        if (ok) {
            objective.summary = text.slice(0, 4000);
            objective.tasksGenerated = (objective.tasksGenerated || 0) + 1;
            logger.info(`[ObjectiveRunner] Objective ${objId} run finished in ${durationMs}ms`);
        } else {
            throw new Error(error || 'Agent invocation failed');
        }
    } catch (err) {
        logger.error(`[ObjectiveRunner] Objective ${objId} failed: ${err.message}`);
    }

    await objective.save();
    activeObjectives.delete(objId);
}

/**
 * Main poll cycle — queries for due objectives and executes them.
 */
async function pollAndExecute() {
    if (!running) return;

    const mongoose = require('mongoose');
    let Objective;
    try {
        // Lazily pull the schema
        Objective = mongoose.model('Objective');
    } catch {
        // Model not registered yet
        return;
    }

    const now = new Date();
    const availableSlots = MAX_CONCURRENT - activeObjectives.size;
    if (availableSlots <= 0) {
        logger.debug('[ObjectiveRunner] All slots occupied, skipping poll');
        return;
    }

    try {
        // Find active objectives whose nextRunAt has passed
        const objectives = await Objective.find({
            status: 'active',
            'runner.enabled': true,
            $or: [
                { 'runner.nextRunAt': { $lte: now } },
                { 'runner.nextRunAt': { $exists: false } } // For newly created ones that somehow missed the pre-save hook
            ]
        })
            .limit(availableSlots)
            .lean(false);

        for (const obj of objectives) {
            if (!obj.agentId) continue; // safety net
            if (activeObjectives.has(obj._id.toString())) continue;

            executeObjective(obj).catch((err) => {
                logger.error(`[ObjectiveRunner] Unhandled error in objective ${obj._id}:`, err);
                activeObjectives.delete(obj._id.toString());
            });
        }
    } catch (err) {
        logger.error('[ObjectiveRunner] Poll error:', err);
    }
}

function start() {
    if (running) {
        logger.warn('[ObjectiveRunner] Already running');
        return;
    }
    running = true;
    logger.info(`[ObjectiveRunner] Started — polling every ${POLL_INTERVAL_MS / 1000}s`);

    setTimeout(() => {
        pollAndExecute();
        timer = setInterval(pollAndExecute, POLL_INTERVAL_MS);
    }, 10000); // 10s initial delay
}

function stop() {
    running = false;
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    logger.info('[ObjectiveRunner] Stopped');
}

module.exports = { start, stop };
