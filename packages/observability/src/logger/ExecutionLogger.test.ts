import type { ILogger } from '@aidex/core';
import { describe, expect, it, vi } from 'vitest';
import { ExecutionLogger } from './ExecutionLogger.js';

function makeLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('ExecutionLogger', () => {
  describe('with a logger configured', () => {
    it('logs the strategy name on start', () => {
      const logger = makeLogger();
      new ExecutionLogger(logger).logStart('summarize');

      expect(logger.info).toHaveBeenCalledWith('[execution] start', 'summarize');
    });

    it('logs the strategy name and duration on finish', () => {
      const logger = makeLogger();
      new ExecutionLogger(logger).logFinish('summarize', 250);

      expect(logger.info).toHaveBeenCalledWith('[execution] finish', 'summarize', 250);
    });

    it('logs finish without a duration when none is supplied', () => {
      const logger = makeLogger();
      new ExecutionLogger(logger).logFinish('summarize');

      expect(logger.info).toHaveBeenCalledWith('[execution] finish', 'summarize', undefined);
    });
  });

  describe('without a logger configured', () => {
    it('safely no-ops on logStart instead of throwing', () => {
      const executionLogger = new ExecutionLogger();
      expect(() => executionLogger.logStart('summarize')).not.toThrow();
    });

    it('safely no-ops on logFinish instead of throwing', () => {
      const executionLogger = new ExecutionLogger();
      expect(() => executionLogger.logFinish('summarize', 100)).not.toThrow();
    });
  });

  describe('when the supplied logger itself throws', () => {
    it('never lets logStart propagate the logger error', () => {
      const logger: ILogger = {
        debug: vi.fn(),
        info: vi.fn(() => {
          throw new Error('logger blew up');
        }),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const executionLogger = new ExecutionLogger(logger);

      expect(() => executionLogger.logStart('summarize')).not.toThrow();
    });

    it('never lets logFinish propagate the logger error', () => {
      const logger: ILogger = {
        debug: vi.fn(),
        info: vi.fn(() => {
          throw new Error('logger blew up');
        }),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const executionLogger = new ExecutionLogger(logger);

      expect(() => executionLogger.logFinish('summarize', 100)).not.toThrow();
    });
  });
});
