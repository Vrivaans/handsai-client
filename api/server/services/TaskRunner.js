'use strict';

/**
 * TaskRunner — HandsAI proactive task execution engine
 *
 * Runs as a background service inside the Node process.
 * Every POLL_INTERVAL_MS it queries MongoDB for pending/overdue Tasks,
 * resolves dependencies, then invokes the LLM agent via the internal HTTP API.
 *
 * Auth: generates a short-lived JWT signed with JWT_SECRET on behalf of each task's userId.
 * LLM invocation: POST /api/agents/chat/:endpoint (ephemeral agent, tools from task.tools)
 */

const jwt = require('jsonwebtoken');
const { logger } = require('@librechat/data-schemas');

const POLL_INTERVAL_MS = 60_000; // every 60 seconds
const TASK_JWT_EXPIRY = '5m'; // short-lived for security
const MAX_CONCURRENT = 3; // max tasks running simultaneously

let running = false;
let timer = null;
const activeTasks = new Set();

/**
 * Generate a short-lived internal JWT for a userId.
 * Signs with the same JWT_SECRET the server uses for user sessions.
 * @param {string} userId
 * @returns {string}
 */
function createInternalToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('[TaskRunner] JWT_SECRET is not set');
  }
  return jwt.sign(
    {
      id: userId,
      // Mark as internal so logs can distinguish runner calls from user calls
      _taskRunner: true,
    },
    secret,
    { expiresIn: TASK_JWT_EXPIRY },
  );
}

/**
 * Get the base URL for internal API calls.
 * Uses HOST/PORT from env, same as the server.
 */
function getBaseUrl() {
  const port = process.env.PORT || 3080;
  const host = process.env.HOST || 'localhost';
  return `http://${host}:${port}`;
}

/**
 * Check that all task dependencies are in 'done' status.
 * @param {import('@librechat/data-schemas').ITask} task
 * @param {typeof import('@librechat/data-schemas').Task} TaskModel
 * @returns {Promise<boolean>}
 */
async function areDependenciesResolved(task, TaskModel) {
  if (!task.dependencies || task.dependencies.length === 0) {
    return true;
  }
  const deps = await TaskModel.find({
    _id: { $in: task.dependencies },
  }).select('status');
  return deps.every((d) => d.status === 'done');
}

/**
 * Build the next cron run date from a cron expression.
 * Uses a simple approach: parse cron and compute next Date.
 * Falls back to +1h if the cron is invalid.
 * @param {string} cronExpression
 * @returns {Date}
 */
function getNextCronDate(cronExpression) {
  try {
    // Minimal cron interpreter: only supports "*/N * * * *" and "0 */N * * *" patterns
    // For full cron support, add node-cron or cron-parser as a dependency later
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) throw new Error('Invalid cron');
    const minutePart = parts[0];
    const match = minutePart.match(/^\*\/(\d+)$/);
    if (match) {
      const intervalMinutes = parseInt(match[1], 10);
      return new Date(Date.now() + intervalMinutes * 60_000);
    }
    // Default: 1 hour
    return new Date(Date.now() + 3600_000);
  } catch {
    return new Date(Date.now() + 3600_000);
  }
}

/**
 * Call the agent chat endpoint internally on behalf of a user.
 * Uses an ephemeral agent with the task's tools and a prompt from task description + context.
 *
 * @param {import('@librechat/data-schemas').ITask} task
 * @param {string} token - Internal JWT for this user
 * @returns {Promise<{text: string, ok: boolean, error?: string}>}
 */
async function invokeAgent(task, token) {
  const baseUrl = getBaseUrl();
  const endpoint = task.tools?.length > 0 ? 'agents' : 'groq'; // use configured endpoint

  // Ephemeral agent config — no stored agent needed
  const body = {
    model: process.env.TASK_RUNNER_MODEL || 'llama-3.1-8b-instant',
    endpoint,
    conversationId: 'new',
    parentMessageId: '00000000-0000-0000-0000-000000000000',
    // The task description + context forms the prompt
    text: [task.description, task.context].filter(Boolean).join('\n\n---\n\n'),
    // Pass tools from the task (HandsAI MCP tools)
    tools: task.tools || [],
    // Ephemeral agent metadata
    ephemeralAgent: {
      name: `TaskRunner:${task._id}`,
      instructions: `You are an autonomous task executor. Complete the following task and respond with a concise summary of what you did and the result. If you cannot complete the task, explain why clearly.\n\nTask: ${task.title}`,
      provider: process.env.TASK_RUNNER_PROVIDER || 'groq',
      model: process.env.TASK_RUNNER_MODEL || 'llama-3.1-8b-instant',
      tools: task.tools || [],
    },
    isTask: true,
  };

  let response;
  try {
    response = await fetch(`${baseUrl}/api/agents/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-task-runner': '1', // Internal marker
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5 * 60_000), // 5 minute timeout
    });
  } catch (err) {
    return { ok: false, text: '', error: `Fetch failed: ${err.message}` };
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    return { ok: false, text: '', error: `HTTP ${response.status}: ${errText.slice(0, 200)}` };
  }

  // The agent endpoint returns SSE text/event-stream or JSON depending on GenerationJobManager mode
  // Parse the streaming response to extract the final text
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    return await parseSSEResponse(response);
  }

  // JSON response (non-streaming)
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
 * Parse SSE event-stream response and extract the final aggregated text.
 * @param {Response} response
 * @returns {Promise<{ok: boolean, text: string, error?: string}>}
 */
async function parseSSEResponse(response) {
  const text = await response.text().catch(() => '');
  // SSE lines look like: data: {"event":"...","data":{...}}
  const lines = text.split('\n');
  let finalText = '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    try {
      const payload = JSON.parse(line.slice(6));
      // LibreChat SSE tokens
      if (payload.text) {
        finalText += payload.text;
      }
      if (payload.final === true && payload.text) {
        finalText = payload.text;
      }
    } catch {
      // ignore malformed lines
    }
  }

  return { ok: true, text: finalText || '(No response text extracted)' };
}

/**
 * Execute a single task: mark running → invoke agent → save result → mark done/failed.
 * @param {import('@librechat/data-schemas').ITask} task - Mongoose document
 */
async function executeTask(task) {
  const taskId = task._id.toString();
  activeTasks.add(taskId);
  const startedAt = Date.now();

  logger.info(`[TaskRunner] Starting task ${taskId}: "${task.title}"`);

  // Mark as running
  task.status = 'running';
  await task.save();

  try {
    const token = createInternalToken(task.userId.toString());
    const { ok, text, error } = await invokeAgent(task, token);

    const durationMs = Date.now() - startedAt;

    if (ok) {
      task.status = 'done';
      task.result = {
        summary: text.slice(0, 4000), // cap at 4k chars
        completedAt: new Date(),
        durationMs,
        toolsUsed: task.tools || [],
      };
      logger.info(`[TaskRunner] Task ${taskId} done in ${durationMs}ms`);
    } else {
      throw new Error(error || 'Agent invocation failed');
    }
  } catch (err) {
    const retryCount = (task.error?.retryCount || 0) + 1;
    task.status = retryCount < 3 ? 'pending' : 'failed'; // retry up to 3 times
    task.error = {
      message: err.message,
      failedAt: new Date(),
      retryCount,
    };
    logger.error(`[TaskRunner] Task ${taskId} failed (attempt ${retryCount}): ${err.message}`);
  }

  // Handle recurring tasks: recalculate nextRunAt if has cronExpression
  if (task.status === 'done' && task.schedule?.cronExpression) {
    task.status = 'pending'; // reset to pending for next run
    task.schedule.lastRunAt = new Date();
    task.schedule.nextRunAt = getNextCronDate(task.schedule.cronExpression);
    task.schedule.runCount = (task.schedule.runCount || 0) + 1;

    // Check maxRuns
    if (task.schedule.maxRuns && task.schedule.runCount >= task.schedule.maxRuns) {
      task.status = 'done';
      logger.info(`[TaskRunner] Task ${taskId} reached maxRuns (${task.schedule.maxRuns}), marking done`);
    }
  }

  await task.save();
  activeTasks.delete(taskId);
}

/**
 * Main poll cycle — queries for due tasks and executes them.
 */
async function pollAndExecute() {
  if (!running) return;

  // Import Task model lazily to avoid circular deps at module load time
  let Task;
  try {
    Task = require('~/models/Task');
    // Guard: if the export is undefined (schema not registered yet), skip silently
    if (!Task || typeof Task.find !== 'function') {
      return;
    }
  } catch {
    // Task model may not exist yet (Jules PR not merged) — skip silently
    return;
  }

  const now = new Date();
  const availableSlots = MAX_CONCURRENT - activeTasks.size;
  if (availableSlots <= 0) {
    logger.debug('[TaskRunner] All slots occupied, skipping poll');
    return;
  }

  try {
    // Find pending tasks that are due
    const tasks = await Task.find({
      status: 'pending',
      $or: [
        { 'schedule.nextRunAt': { $lte: now } },
        { 'schedule.nextRunAt': { $exists: false } }, // no schedule = run immediately
        { 'schedule.runAt': { $lte: now } },
      ],
    })
      .limit(availableSlots)
      .lean(false); // need mongoose docs for .save()

    for (const task of tasks) {
      if (activeTasks.has(task._id.toString())) continue;
      const ready = await areDependenciesResolved(task, Task);
      if (!ready) {
        logger.debug(`[TaskRunner] Task ${task._id} waiting on dependencies`);
        continue;
      }
      // Fire and forget — run in background, don't await
      executeTask(task).catch((err) => {
        logger.error(`[TaskRunner] Unhandled error in task ${task._id}:`, err);
        activeTasks.delete(task._id.toString());
      });
    }
  } catch (err) {
    logger.error('[TaskRunner] Poll error:', err);
  }
}

/**
 * Start the TaskRunner background service.
 * Called once from api/server/index.js after server starts.
 */
function start() {
  if (running) {
    logger.warn('[TaskRunner] Already running');
    return;
  }
  running = true;
  logger.info(`[TaskRunner] Started — polling every ${POLL_INTERVAL_MS / 1000}s`);

  // Run first poll after a short delay to let the server fully initialize
  setTimeout(() => {
    pollAndExecute();
    timer = setInterval(pollAndExecute, POLL_INTERVAL_MS);
  }, 5000);
}

/**
 * Stop the TaskRunner (for graceful shutdown).
 */
function stop() {
  running = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  logger.info('[TaskRunner] Stopped');
}

module.exports = { start, stop };
