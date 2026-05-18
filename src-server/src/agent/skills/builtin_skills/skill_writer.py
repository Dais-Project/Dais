NAME: str = "skill writer"

DESCRIPTION: str = """
Guide users through creating skills. Use when the user wants to create, write, author, or design a new skill, or needs help with skill files, frontmatter, or skill structure.
""".strip()

CONTENT: str = """
# Skill Writer

This skill helps you create well-structured skills that follow best practices and validation requirements.

## Instructions

### Step 1: Determine skill scope

First, understand what the skill should do:

1. **Ask clarifying questions**:
   - What specific capability should this skill provide?
   - When should to use this skill?
   - What tools or resources does it need?
   - Is this for personal use or team sharing?

2. **Keep it focused**: One skill = one capability
   - Good: "PDF form filling", "Excel data analysis"
   - Too broad: "Document processing", "Data tools"

### Step 2: Create skill structure

Create the directory and files:

For multi-file Skills:
```
skill-name/
├── SKILL.md (required)
├── reference.md (optional)
├── examples.md (optional)
├── scripts/
│   └── helper.py (optional)
└── templates/
    └── template.txt (optional)
```

### Step 3: Write SKILL.md frontmatter

Create YAML frontmatter with required fields:

```yaml
---
name: skill-name
description: Brief description of what this does and when to use it
---
```

**Field requirements**:

- **name**:
  - Lowercase letters, numbers, hyphens only
  - Max 64 characters
  - Must match directory name
  - Good: `pdf-processor`, `git-commit-helper`
  - Bad: `PDF_Processor`, `Git Commits!`

- **description**:
  - Max 1024 characters
  - Include BOTH what it does AND when to use it
  - Use specific trigger words users would say
  - Mention file types, operations, and context

### Step 4: Write effective descriptions

The description is critical to discover your skill.

**Formula**: `[What it does] + [When to use it] + [Key triggers]`

**Examples**:

✅ **Good**:
```yaml
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

✅ **Good**:
```yaml
description: Analyze Excel spreadsheets, create pivot tables, and generate charts. Use when working with Excel files, spreadsheets, or analyzing tabular data in .xlsx format.
```

❌ **Too vague**:
```yaml
description: Helps with documents
description: For data analysis
```

**Tips**:
- Include specific file extensions (.pdf, .xlsx, .json)
- Mention common user phrases ("analyze", "extract", "generate")
- List concrete operations (not generic verbs)
- Add context clues ("Use when...", "For...")

### Step 5: Structure the skill content

Use clear Markdown sections:

```markdown
# skill Name

Brief overview of what this skill does.

## Quick start

Provide a simple example to get started immediately.

## Instructions

Step-by-step guidance:
1. First step with clear action
2. Second step with expected outcome
3. Handle edge cases

## Examples

Show concrete usage examples with code or commands.

## Best practices

- Key conventions to follow
- Common pitfalls to avoid
- When to use vs. not use

## Requirements

List any dependencies or prerequisites:
```bash
pip install package-name
```

## Advanced usage

For complex scenarios, see [reference.md](reference.md).
```

### Step 6: Add supporting files (optional)

Create additional files for progressive disclosure:

**reference.md**: Detailed API docs, advanced options
**examples.md**: Extended examples and use cases
**scripts/**: Helper scripts and utilities
**templates/**: File templates or boilerplate

Reference them from SKILL.md:
```markdown
For advanced usage, see [reference.md](reference.md).

Run the helper script:
\`\`\`bash
python scripts/helper.py input.txt
\`\`\`
```

### Step 7: Validate the skill

Check these requirements:

✅ **File structure**:
- [ ] SKILL.md exists in correct location
- [ ] Directory name matches frontmatter `name`

✅ **YAML frontmatter**:
- [ ] Opening `---` on line 1
- [ ] Closing `---` before content
- [ ] Valid YAML (no tabs, correct indentation)
- [ ] `name` follows naming rules
- [ ] `description` is specific and < 1024 chars

✅ **Content quality**:
- [ ] Clear instructions
- [ ] Concrete examples provided
- [ ] Edge cases handled
- [ ] Dependencies listed (if any)

✅ **Testing**:
- [ ] Description matches user questions
- [ ] skill activates on relevant queries
- [ ] Instructions are clear and actionable

### Step 8: Package the skill and install

Package the whole skill directory into a .zip archive, and ask the user to install it.

## Common patterns

### Read-only skill

```yaml
---
name: code-reader
description: Read and analyze code without making changes. Use for code review, understanding codebases, or documentation.
---
```

### Script-based skill

```yaml
---
name: data-processor
description: Process CSV and JSON data files with Python scripts. Use when analyzing data files or transforming datasets.
---

# Data Processor

## Instructions

1. Use the processing script:
\`\`\`bash
python scripts/process.py input.csv --output results.json
\`\`\`

2. Validate output with:
\`\`\`bash
python scripts/validate.py results.json
\`\`\`
```

### Multi-file skill with progressive disclosure

```yaml
---
name: api-designer
description: Design REST APIs following best practices. Use when creating API endpoints, designing routes, or planning API architecture.
---

# API Designer

Quick start: See [examples.md](examples.md)

Detailed reference: See [reference.md](reference.md)

## Instructions

1. Gather requirements
2. Design endpoints (see examples.md)
3. Document with OpenAPI spec
4. Review against best practices (see reference.md)
```

## Best practices for skill authors

1. **One skill, one purpose**: Don't create mega-Skills
2. **Specific descriptions**: Include trigger words users will say
3. **Clear instructions**: Write for agents, not humans
4. **Concrete examples**: Show real code, not pseudocode
5. **List dependencies**: Mention required packages in description
6. **Test with teammates**: Verify activation and clarity
7. **Version your Skills**: Document changes in content
8. **Use progressive disclosure**: Put advanced details in separate files

## Validation checklist

Before finalizing a skill, verify:

- [ ] Description is specific and < 1024 chars
- [ ] Description includes "what" and "when"
- [ ] YAML frontmatter is valid
- [ ] Instructions are step-by-step
- [ ] Examples are concrete and realistic
- [ ] Dependencies are documented
- [ ] File paths use forward slashes
- [ ] Skill activates on relevant queries

## Troubleshooting

**skill doesn't activate**:
- Make description more specific with trigger words
- Include file types and operations in description
- Add "Use when..." clause with user phrases

**Multiple Skills conflict**:
- Make descriptions more distinct
- Use different trigger words
- Narrow the scope of each skill

**skill has errors**:
- Check YAML syntax (no tabs, proper indentation)
- Verify file paths (use forward slashes)
- Ensure scripts have execute permissions
- List all dependencies
""".strip()
