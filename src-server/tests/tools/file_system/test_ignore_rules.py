from src.utils.ignore_rules import load_gitignore_spec, should_exclude


class TestLoadGitignoreSpec:
    def test_returns_none_when_gitignore_missing(self, temp_workspace):
        assert load_gitignore_spec(temp_workspace) is None

    def test_returns_spec_when_gitignore_exists(self, temp_workspace):
        (temp_workspace / ".gitignore").write_text("*.log\n", encoding="utf-8")

        spec = load_gitignore_spec(temp_workspace)

        assert spec is not None
        assert spec.match_file("app.log")
        assert not spec.match_file("app.txt")


class TestShouldExclude:
    def test_hidden_item_is_excluded_by_default(self, temp_workspace):
        hidden_file = temp_workspace / ".hidden.txt"
        hidden_file.write_text("hidden", encoding="utf-8")

        assert should_exclude(hidden_file, None, temp_workspace)

    def test_hidden_item_is_not_excluded_when_include_hidden_true(self, temp_workspace):
        hidden_file = temp_workspace / ".hidden.txt"
        hidden_file.write_text("hidden", encoding="utf-8")

        assert not should_exclude(hidden_file, None, temp_workspace, include_hidden=True)

    def test_returns_false_when_spec_is_none_and_item_is_not_hidden(self, temp_workspace):
        visible_file = temp_workspace / "visible.txt"
        visible_file.write_text("visible", encoding="utf-8")

        assert not should_exclude(visible_file, None, temp_workspace)

    def test_excludes_file_when_gitignore_pattern_matches(self, temp_workspace):
        (temp_workspace / ".gitignore").write_text("*.log\n", encoding="utf-8")
        spec = load_gitignore_spec(temp_workspace)
        ignored_file = temp_workspace / "ignore.log"
        ignored_file.write_text("log", encoding="utf-8")

        assert spec is not None
        assert should_exclude(ignored_file, spec, temp_workspace)

    def test_excludes_directory_when_gitignore_directory_pattern_matches(self, temp_workspace):
        (temp_workspace / ".gitignore").write_text("secret/\n", encoding="utf-8")
        spec = load_gitignore_spec(temp_workspace)
        ignored_directory = temp_workspace / "secret"
        ignored_directory.mkdir()

        assert spec is not None
        assert should_exclude(ignored_directory, spec, temp_workspace)

    def test_returns_false_when_item_is_outside_cwd(self, temp_workspace):
        (temp_workspace / ".gitignore").write_text("*\n", encoding="utf-8")
        spec = load_gitignore_spec(temp_workspace)
        outside_file = temp_workspace.parent / "outside.txt"
        outside_file.write_text("outside", encoding="utf-8")

        assert spec is not None
        assert not should_exclude(outside_file, spec, temp_workspace)
