import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

FILE = Path(__file__).resolve().parents[1] / 'script' / 'dai_desktop.py'
spec = importlib.util.spec_from_file_location('dai_desktop', FILE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class InstallerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.source = self.base / 'source'
        adapter = self.source / 'adapters' / 'opencode'
        for group in ('agent', 'command', 'skill/dai-core/references'):
            (adapter / group).mkdir(parents=True)
        (adapter / 'agent/dai-engineer.md').write_text('manager')
        (adapter / 'command/research.md').write_text('do research')
        (adapter / 'skill/dai-core/SKILL.md').write_text('# core')
        (adapter / 'skill/dai-core/references/core.md').write_text('reference')
        self.target = self.base / 'profile'
        self.py = Path(__import__('sys').executable)

    def test_install_idempotence_and_status(self):
        first = module.install(self.source, self.target, self.py)
        self.assertEqual(first['status'], 'installed')
        self.assertEqual(first['definitions'], 6)
        self.assertEqual(module.install(self.source, self.target, self.py)['updated'], 0)
        self.assertEqual(module.status(self.target)['status'], 'ok')
        plugin = (self.target / 'plugins/dai-desktop-mcp.js').read_text()
        self.assertIn('ctx.mcp.transform', plugin)
        self.assertIn('DAI_PROJECT_ROOT', plugin)
        self.assertTrue((self.target / 'agents/dai-os.md').is_file())
        self.assertTrue((self.target / 'commands/dai-research.md').is_file())

    def test_conflict_is_rejected_without_partial_changes(self):
        path = self.target / 'commands/dai-research.md'
        path.parent.mkdir(parents=True)
        path.write_text('custom')
        with self.assertRaises(FileExistsError):
            module.install(self.source, self.target, self.py)
        self.assertEqual(path.read_text(), 'custom')
        self.assertFalse((self.target / module.MANIFEST).exists())

    def test_modified_file_is_not_removed_or_replaced(self):
        module.install(self.source, self.target, self.py)
        path = self.target / 'agents/dai-engineer.md'
        path.write_text('custom')
        with self.assertRaises(FileExistsError):
            module.install(self.source, self.target, self.py)
        report = module.remove(self.target)
        self.assertEqual(report['kept_user_edits'], ['agents/dai-engineer.md'])
        self.assertEqual(path.read_text(), 'custom')

    def test_update_source_and_delete_obsolete(self):
        module.install(self.source, self.target, self.py)
        (self.source / 'adapters/opencode/agent/dai-engineer.md').write_text('new manager')
        (self.source / 'adapters/opencode/command/research.md').unlink()
        second = module.install(self.source, self.target, self.py)
        self.assertGreater(second['updated'], 0)
        self.assertEqual(second['removed'], 1)
        self.assertFalse((self.target / 'commands/dai-research.md').exists())
        self.assertEqual(module.status(self.target)['status'], 'ok')

    def test_does_not_touch_existing_opencode_jsonc(self):
        self.target.mkdir()
        config = self.target / 'opencode.jsonc'
        original = '{ // owner comment\n "mcp": {}\n}\n'
        config.write_text(original)
        module.install(self.source, self.target, self.py)
        self.assertEqual(config.read_text(), original)

    def test_manifest_path_guard(self):
        self.target.mkdir()
        (self.target / module.MANIFEST).write_text(json.dumps({'version': 1, 'files': {'../bad': 'x'}}))
        with self.assertRaises(ValueError):
            module.status(self.target)

    def test_symlink_escape_guard(self):
        other = self.base / 'other'
        other.mkdir()
        self.target.mkdir()
        (self.target / 'skills').symlink_to(other, target_is_directory=True)
        with self.assertRaises(ValueError):
            module.install(self.source, self.target, self.py)
        self.assertEqual(list(other.iterdir()), [])


if __name__ == '__main__':
    unittest.main()
