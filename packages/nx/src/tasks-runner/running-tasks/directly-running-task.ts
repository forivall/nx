import {
  getLastValueFromAsyncIterableIterator,
  isAsyncIterator,
} from '../../utils/async-iterator';
import { Executor } from '../../config/misc-interfaces';
import { RunningTask } from './running-task';

export class DirectlyRunningTask implements RunningTask {
  constructor(private results: ReturnType<Executor>) {}

  send(): void {}

  async getResults(): Promise<{ code: number; terminalOutput: string }> {
    const results = isAsyncIterator(this.results)
      ? await getLastValueFromAsyncIterableIterator(this.results)
      : await this.results;
    return { code: results.success ? 0 : 1, terminalOutput: '' };
  }

  kill(): void {
    return;
  }

  onExit(cb: (code: number, terminalOutput: string) => void): void {
    this.getResults().then(({ code, terminalOutput }) =>
      cb(code, terminalOutput)
    );
  }

  onOutput(cb: (terminalOutput: string) => void): void {
    cb('');
  }
}
