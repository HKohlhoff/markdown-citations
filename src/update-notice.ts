/** One dialog per version; opening is not acknowledgement, user dismissal is. */
export class UpdateNoticeController {
  private pending: Promise<void> | undefined;

  constructor(
    private readonly version: string,
    private readonly lastReadVersion: () => string,
    private readonly open: () => Promise<boolean>,
    private readonly markRead: (version: string) => Promise<void>,
    private readonly isActive: () => boolean,
  ) {}

  show(force = false): Promise<void> {
    if (this.pending) return this.pending;
    if (!this.isActive() || (!force && this.lastReadVersion() === this.version)) return Promise.resolve();
    this.pending = this.display().finally(() => { this.pending = undefined; });
    return this.pending;
  }

  private async display(): Promise<void> {
    const dismissed = await this.open();
    if (dismissed && this.isActive() && this.lastReadVersion() !== this.version) await this.markRead(this.version);
  }
}
