import assert from "node:assert/strict";
import test from "node:test";
import { UpdateNoticeController } from "../src/update-notice";

test("one update dialog is shared by concurrent requests and acknowledged only after closing", async () => {
  let read = "";
  let opened = 0;
  let close: (dismissed: boolean) => void = () => undefined;
  const controller = new UpdateNoticeController("0.1.0", () => read,
    () => { opened += 1; return new Promise(resolve => { close = resolve; }); },
    version => { read = version; return Promise.resolve(); }, () => true);
  const pending = controller.show();
  const duplicate = controller.show(true);
  assert.equal(pending, duplicate);
  assert.equal(opened, 1);
  assert.equal(read, "");
  close(true);
  await pending;
  assert.equal(read, "0.1.0");
  await controller.show();
  assert.equal(opened, 1);
  const manual = controller.show(true);
  assert.equal(opened, 2);
  close(true);
  await manual;
});

test("a previously read version does not suppress the next version", async () => {
  let read = "0.1.0";
  let opened = 0;
  const controller = new UpdateNoticeController("0.2.0", () => read,
    () => { opened += 1; return Promise.resolve(true); },
    version => { read = version; return Promise.resolve(); }, () => true);
  await controller.show();
  assert.equal(opened, 1);
  assert.equal(read, "0.2.0");
  const afterRestart = new UpdateNoticeController("0.2.0", () => read,
    () => { throw new Error("Already-read update reopened after restart"); },
    () => Promise.resolve(), () => true);
  await afterRestart.show();
});

test("plugin shutdown or non-user dismissal does not mark an update as read", async () => {
  let active = true;
  let saves = 0;
  let close: (dismissed: boolean) => void = () => undefined;
  const controller = new UpdateNoticeController("0.1.0", () => "",
    () => new Promise(resolve => { close = resolve; }),
    () => { saves += 1; return Promise.resolve(); }, () => active);
  const pending = controller.show();
  active = false;
  close(true);
  await pending;
  assert.equal(saves, 0);
  active = true;
  const next = controller.show();
  close(false);
  await next;
  assert.equal(saves, 0);
});

test("failed persistence is reported and does not leave the controller stuck", async () => {
  let attempts = 0;
  const controller = new UpdateNoticeController("0.1.0", () => "",
    () => Promise.resolve(true),
    () => { attempts += 1; return Promise.reject(new Error("Write failed")); }, () => true);
  await assert.rejects(controller.show(), /Write failed/u);
  await assert.rejects(controller.show(), /Write failed/u);
  assert.equal(attempts, 2);
});
