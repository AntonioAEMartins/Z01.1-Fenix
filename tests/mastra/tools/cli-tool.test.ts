import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest';
import type { ExecException } from 'child_process';

// We import the module under test via a relative path. The source may not exist in this environment,
// but tests are written assuming the implementation matches the spec.
import { cliTool } from '../../../src/mastra/tools/cli-tool';

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('@mastra/core', () => ({
  metrics: {
    increment: vi.fn(),
  },
}));

const child_process = require('child_process');
const mastraCore = require('@mastra/core');

describe('cliTool', () => {
  const mockExec = child_process.exec as unknown as jest.MockedFunction<typeof child_process.exec>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('execute', () => {
    it('should execute command successfully with valid parameters', async () => {
      mockExec.mockImplementation((cmd: string, opts: any, cb: any) => {
        // callback signature: (error, stdout, stderr)
        cb(null, 'ok output', '');
        return {} as any;
      });

      const res = await cliTool.execute({ command: 'echo hi', timeout: 5000 });
      expect(res).toEqual({ stdout: 'ok output', stderr: '' });
      expect(child_process.exec).toHaveBeenCalled();
      expect(mastraCore.metrics.increment).toHaveBeenCalled();
    });

    it('should reject with proper error when execution fails', async () => {
      const execErr: ExecException = new Error('boom') as ExecException;
      mockExec.mockImplementation((cmd: string, opts: any, cb: any) => {
        cb(execErr, '', 'some stderr');
        return {} as any;
      });

      await expect(cliTool.execute({ command: 'bad', timeout: 1000 })).rejects.toThrow('boom');
      expect(mastraCore.metrics.increment).not.toHaveBeenCalled();
    });

    it('should validate input parameters and throw on invalid input', async () => {
      // missing command
      // @ts-ignore
      await expect(cliTool.execute({ timeout: 100 })).rejects.toThrow();

      // invalid timeout type
      // @ts-ignore
      await expect(cliTool.execute({ command: 'x', timeout: 'nope' })).rejects.toThrow();
    });

    it('should handle timeout scenarios appropriately', async () => {
      jest.useFakeTimers?.();
      mockExec.mockImplementation((cmd: string, opts: any, cb: any) => {
        // never call cb to simulate hang; implementation should use timeout to reject
        return {} as any;
      });

      // Assume cliTool uses options.timeout ms to reject
      const p = cliTool.execute({ command: 'hang', timeout: 10 });
      // advance timers if available
      try {
        // if using real timers, wait a bit
        await new Promise(resolve => setTimeout(resolve, 20));
      } catch {}
      await expect(p).rejects.toBeDefined();
      jest.useRealTimers?.();
    });

    it('should increment metrics on successful calls', async () => {
      mockExec.mockImplementation((cmd: string, opts: any, cb: any) => {
        cb(null, 'done', '');
        return {} as any;
      });

      await cliTool.execute({ command: 'ok', timeout: 1000 });
      expect(mastraCore.metrics.increment).toHaveBeenCalledWith('cliTool.execute.success');
    });

    it('should handle stderr output correctly', async () => {
      mockExec.mockImplementation((cmd: string, opts: any, cb: any) => {
        cb(null, 'stdout here', 'there was an error on stderr');
        return {} as any;
      });

      const res = await cliTool.execute({ command: 'with-stderr', timeout: 1000 });
      expect(res.stdout).toBe('stdout here');
      expect(res.stderr).toBe('there was an error on stderr');
    });
  });
});
