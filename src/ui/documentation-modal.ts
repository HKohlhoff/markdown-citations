import { App, Component, MarkdownRenderer, Modal } from "obsidian";

export class DocumentationModal extends Modal {
  private readonly renderer = new Component();
  private closed = false;

  constructor(app: App, private readonly title: string, private readonly markdown: string, private readonly onClosed: () => void) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(this.title);
    this.modalEl.addClass("markdown-citations-documentation-modal");
    this.renderer.load();
    const body = this.contentEl.createDiv({ cls: "markdown-rendered" });
    void MarkdownRenderer.render(this.app, this.markdown, body, "", this.renderer).catch((error: unknown) => {
      console.error("[markdown-citations] Could not render documentation", error);
      body.setText(this.markdown);
    });
    const actions = this.contentEl.createDiv({ cls: "markdown-citations-documentation-actions" });
    const close = actions.createEl("button", { text: "Close", cls: "mod-cta" });
    close.addEventListener("click", () => this.close());
  }

  onClose(): void {
    if (this.closed) return;
    this.closed = true;
    this.renderer.unload();
    this.contentEl.empty();
    this.onClosed();
  }
}
