# D_AI OS integration for D_AI Desktop — Phase 1

This fork is based on OpenCode V2. D_AI remains a **separate source of truth** at [amroquqa99-art/D_AI](https://github.com/amroquqa99-art/D_AI). The integration installs its existing OpenCode agents (including specialists), all adapter skills and reference files (including `dai-core` / Adaptive Workflow OS), and namespaced commands. It creates an explicit selectable `dai-os` primary agent and registers the `dai` MCP server through an OpenCode **V2 plugin transform**, without replacing `opencode.jsonc`.

## Installation (Linux/macOS; native Windows runtime not yet verified)

Prerequisites: Python >= 3.11, Git and a local D_AI source clone, plus a working OpenCode V2 installation. Use a native Linux filesystem for D_AI's private runtime and its data; do not put the Python venv/private state on exFAT.

```sh
git clone https://github.com/amroquqa99-art/D_AI.git "$HOME/Projects/D_AI"
python3 script/dai_desktop.py install --source "$HOME/Projects/D_AI" --bootstrap
python3 script/dai_desktop.py status
```

The isolated venv is normally at `~/.local/share/d-ai/runtime/`. `--bootstrap` installs D_AI with its optional MCP dependencies; this may require network connectivity. The profile defaults to `~/.config/opencode`. Use `--target PATH` for an isolated OpenCode profile, and `--python PATH` to reuse an existing, verified interpreter. Restart OpenCode after installation. Select the `dai-os` primary agent explicitly (other `dai-*` agents are also selectable). Use namespaced commands such as `/dai-research` and `/dai-status`.

### Verification and limits

1. `python3 script/dai_desktop.py status` checks only installed **file hashes**; it does not prove a live runtime.
2. Verify MCP connection in the actual OpenCode UI/server and invoke a read-only D_AI status tool; record the observed result. The plugin preserves an existing MCP entry called `dai`, even if that entry is broken, rather than overriding owner settings.
3. Test agent catalog, skills, nested specialists, checkpoints, tasks and claims **in a running Desktop session** before claiming full integration.
4. Re-running `install` synchronizes D_AI definitions from your source clone. **It does not silently pull a new version** or install a paid model. Modified or colliding files abort the update.
5. `python3 script/dai_desktop.py remove` only deletes files still matching the recorded hashes; modified files remain in place.
6. The D_AI **native model router** is NOT enabled by this phase. It requires an actual V2 host test, reliable permission checks and durable writable state outside the source repo. There is no silent paid-model fallback.
7. This is integration code, **not** evidence that the Desktop app has been compiled, packaged, installed or verified on Linux/Windows/macOS. Native Windows data-root permissions are an outstanding D_AI core compatibility gap.

### Automated checks

```sh
python3 -m unittest discover -s tests -p 'test_dai_desktop_integration.py' -v
docker compose -f compose.dai.yml run --build --rm verify
```

These are deterministic installer tests, not an OpenCode Desktop end-to-end test.

### Source and licensing

D_AI OS / Adaptive Workflow OS comes from the `dai-core` skill under `D_AI/adapters/opencode/skill/dai-core/` and must not be recreated as a competing, independently evolving OS. The Desktop fork and integrated D_AI content use GPL-3.0-or-later as their intended distribution license. Preserve the upstream OpenCode MIT copyright notice, additional third-party notices and trademark distinction. Audit all bundled dependencies and assets before release.

## العربية — وضع الدمج

هذا دمج فعلي **لملفات الوكلاء والمهارات والأوامر ووصلات MCP على مستوى ملف إعدادات المستخدم** من مستودع D_AI الأصلي، وليس إعادة كتابة مستقلة لمهارة D_AI OS. الاختبارات الحالية تفحص المُثبّت وعزل الملفات فقط. لم يثبت بعد تشغيل كل الأنظمة داخل نسخة Desktop الحية أو تفعيل Router وإدارة نماذجه. اختر وكيل `dai-os` يدويًا بعد التثبيت، ولا تعتبر نجاح اختبار الملفات إثباتًا لاشتغال MCP.
