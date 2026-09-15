'use strict';

const VERSION = '0.8.11';
const DEFAULT_HISTORY_LIMIT = 256;

function safeClone(value) {
  if (value === undefined) return undefined;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    return {
      type: typeof value,
      unserializable: true
    };
  }
}

function stableSerialize(value) {
  const seen = new WeakSet();

  function walk(input) {
    if (
      input === null ||
      typeof input !== 'object'
    ) {
      return input;
    }

    if (seen.has(input)) {
      return '[Circular]';
    }

    seen.add(input);

    if (Array.isArray(input)) {
      return input.map(walk);
    }

    const out = {};

    Object.keys(input)
      .sort()
      .forEach(key => {
        out[key] = walk(input[key]);
      });

    return out;
  }

  try {
    return JSON.stringify(walk(value));
  } catch (error) {
    return String(value);
  }
}

function patternMatches(pattern, type) {
  if (pattern === '*') return true;
  if (pattern === type) return true;

  if (
    pattern.endsWith('*') &&
    type.startsWith(
      pattern.slice(0, -1)
    )
  ) {
    return true;
  }

  return false;
}

function createBus(options) {
  const opts = options || {};

  const historyLimit =
    Math.max(
      16,
      Math.floor(
        Number(opts.historyLimit) ||
        DEFAULT_HISTORY_LIMIT
      )
    );

  let sequence = 0;
  let listenerSequence = 0;
  let transactionSequence = 0;
  let transactionDepth = 0;
  let activeTransaction = null;
  let pendingEvents = [];

  const listeners = new Map();
  const history = [];
  const listenerErrors = [];
  const domains = new Map();

  function recordHistory(event) {
    history.push(event);

    if (history.length > historyLimit) {
      history.splice(
        0,
        history.length - historyLimit
      );
    }
  }

  function recordListenerError(error, event, listener) {
    const item = {
      at: Date.now(),
      eventType: event.type,
      pattern: listener.pattern,
      message:
        error && error.message
          ? String(error.message)
          : String(error)
    };

    listenerErrors.push(item);

    if (listenerErrors.length > 32) {
      listenerErrors.splice(
        0,
        listenerErrors.length - 32
      );
    }
  }

  function dispatch(event) {
    recordHistory(event);

    const snapshot =
      Array.from(
        listeners.values()
      );

    for (const listener of snapshot) {
      if (
        !patternMatches(
          listener.pattern,
          event.type
        )
      ) {
        continue;
      }

      try {
        listener.handler(event);
      } catch (error) {
        recordListenerError(
          error,
          event,
          listener
        );
      }

      if (listener.once) {
        listeners.delete(listener.id);
      }
    }

    return event;
  }

  function buildEvent(type, payload, meta) {
    const info = meta || {};

    return Object.freeze({
      sequence: ++sequence,
      type: String(type || 'unknown'),
      at:
        Number(info.at) ||
        Date.now(),
      transactionId:
        info.transactionId ||
        (
          activeTransaction &&
          activeTransaction.id
        ) ||
        null,
      source:
        info.source ||
        null,
      payload:
        safeClone(payload)
    });
  }

  function emit(type, payload, meta) {
    const event =
      buildEvent(
        type,
        payload,
        meta
      );

    if (transactionDepth > 0) {
      pendingEvents.push(event);
      return event;
    }

    return dispatch(event);
  }

  function on(pattern, handler) {
    if (
      typeof pattern !== 'string' ||
      !pattern.trim() ||
      typeof handler !== 'function'
    ) {
      return null;
    }

    const id =
      'listener-' +
      (++listenerSequence);

    listeners.set(id, {
      id,
      pattern: pattern.trim(),
      handler,
      once: false
    });

    return function unsubscribe() {
      listeners.delete(id);
    };
  }

  function once(pattern, handler) {
    if (
      typeof pattern !== 'string' ||
      !pattern.trim() ||
      typeof handler !== 'function'
    ) {
      return null;
    }

    const id =
      'listener-' +
      (++listenerSequence);

    listeners.set(id, {
      id,
      pattern: pattern.trim(),
      handler,
      once: true
    });

    return function unsubscribe() {
      listeners.delete(id);
    };
  }

  function off(target) {
    if (!target) return 0;

    let removed = 0;

    for (const [id, listener] of listeners) {
      if (
        id === target ||
        listener.handler === target ||
        listener.pattern === target
      ) {
        listeners.delete(id);
        removed++;
      }
    }

    return removed;
  }

  function transaction(label, fn, meta) {
    if (typeof fn !== 'function') {
      return undefined;
    }

    const outermost =
      transactionDepth === 0;

    if (outermost) {
      activeTransaction = {
        id:
          'tx-' +
          (++transactionSequence),
        label:
          String(label || 'transaction'),
        startedAt: Date.now(),
        source:
          meta && meta.source ||
          null
      };
      pendingEvents = [];
    }

    transactionDepth++;

    try {
      const result = fn();
      transactionDepth--;

      if (outermost) {
        const tx = activeTransaction;
        const queued = pendingEvents.slice();

        activeTransaction = null;
        pendingEvents = [];

        for (const event of queued) {
          dispatch(event);
        }

        dispatch(
          buildEvent(
            'transaction.committed',
            {
              id: tx.id,
              label: tx.label,
              eventCount: queued.length,
              durationMs:
                Math.max(
                  0,
                  Date.now() -
                  tx.startedAt
                )
            },
            {
              transactionId: tx.id,
              source: tx.source
            }
          )
        );
      }

      return result;
    } catch (error) {
      transactionDepth--;

      if (outermost) {
        const tx = activeTransaction;

        activeTransaction = null;
        pendingEvents = [];

        dispatch(
          buildEvent(
            'transaction.failed',
            {
              id: tx && tx.id,
              label:
                tx && tx.label,
              message:
                error && error.message
                  ? String(error.message)
                  : String(error)
            },
            {
              transactionId:
                tx && tx.id,
              source:
                tx && tx.source
            }
          )
        );
      }

      throw error;
    }
  }

  function registerDomain(name, getter) {
    const key =
      String(name || '').trim();

    if (
      !key ||
      typeof getter !== 'function'
    ) {
      return false;
    }

    const previous =
      domains.get(key);

    domains.set(key, {
      name: key,
      getter,
      fingerprint:
        previous
          ? previous.fingerprint
          : null,
      revision:
        previous
          ? previous.revision
          : 0,
      snapshot:
        previous
          ? previous.snapshot
          : undefined
    });

    return true;
  }

  function syncDomain(name, reason, force) {
    const key =
      String(name || '').trim();

    const domain =
      domains.get(key);

    if (!domain) {
      return false;
    }

    let raw;

    try {
      raw = domain.getter();
    } catch (error) {
      emit(
        'domain.sync.failed',
        {
          domain: key,
          reason:
            reason ||
            null,
          message:
            error && error.message
              ? String(error.message)
              : String(error)
        },
        {
          source: 'globalStateBus'
        }
      );
      return false;
    }

    const snapshot =
      safeClone(raw);

    const fingerprint =
      stableSerialize(snapshot);

    if (
      !force &&
      fingerprint ===
      domain.fingerprint
    ) {
      return false;
    }

    domain.fingerprint =
      fingerprint;

    domain.snapshot =
      snapshot;

    domain.revision++;

    const payload = {
      domain: key,
      revision: domain.revision,
      reason:
        reason ||
        'sync'
    };

    emit(
      'domain.changed',
      payload,
      {
        source: 'globalStateBus'
      }
    );

    emit(
      key + '.changed',
      payload,
      {
        source: 'globalStateBus'
      }
    );

    return true;
  }

  function syncAll(reason, force) {
    let changed = 0;

    for (const key of domains.keys()) {
      if (
        syncDomain(
          key,
          reason,
          force
        )
      ) {
        changed++;
      }
    }

    return changed;
  }

  function getDomainSnapshot(name) {
    const domain =
      domains.get(
        String(name || '')
      );

    return domain
      ? safeClone(domain.snapshot)
      : undefined;
  }

  function getDomainRevision(name) {
    const domain =
      domains.get(
        String(name || '')
      );

    return domain
      ? domain.revision
      : 0;
  }

  function getHistory(filter) {
    let items = history;

    if (typeof filter === 'string' && filter) {
      items = items.filter(
        event =>
          patternMatches(
            filter,
            event.type
          )
      );
    }

    return items.map(event => ({
      sequence: event.sequence,
      type: event.type,
      at: event.at,
      transactionId: event.transactionId,
      source: event.source,
      payload: safeClone(event.payload)
    }));
  }

  function clearHistory() {
    history.length = 0;
  }

  function diagnose() {
    const domainState = {};

    for (const [key, value] of domains) {
      domainState[key] = {
        revision: value.revision,
        initialized:
          value.fingerprint !== null
      };
    }

    return {
      version: VERSION,
      listenerCount: listeners.size,
      historyDepth: history.length,
      historyLimit,
      transactionDepth,
      domains: domainState,
      listenerErrors:
        listenerErrors.map(
          item => ({ ...item })
        )
    };
  }

  function resetForTests() {
    sequence = 0;
    listenerSequence = 0;
    transactionSequence = 0;
    transactionDepth = 0;
    activeTransaction = null;
    pendingEvents = [];
    listeners.clear();
    history.length = 0;
    listenerErrors.length = 0;
    domains.clear();
  }

  return {
    VERSION,
    HISTORY_LIMIT: historyLimit,
    on,
    once,
    off,
    emit,
    transaction,
    registerDomain,
    syncDomain,
    syncAll,
    getDomainSnapshot,
    getDomainRevision,
    getHistory,
    clearHistory,
    diagnose,
    resetForTests
  };
}

const defaultBus =
  createBus();

defaultBus.createBus =
  createBus;

defaultBus.safeClone =
  safeClone;

module.exports =
  defaultBus;
