# IntentR Capability & Enabler Markdown Structure Analysis - Complete Index

**Analysis Date**: December 27, 2025
**Status**: Complete and Verified
**Quality**: High - Based on source code, templates, and real examples

---

## Quick Navigation

Start here depending on your needs:

- **I need a quick overview** → Read this file, then `MARKDOWN_STRUCTURE_README.md`
- **I'm building sync-code-to-spec** → Start with `MARKDOWN_STRUCTURE_README.md`, keep `quick_reference_card.txt` open
- **I need detailed technical specs** → Read `capability_enabler_structure_analysis.md`
- **I want a lookup reference** → Use `quick_reference_card.txt` (text format, easy to search)

---

## The Three Documents

### 1. MARKDOWN_STRUCTURE_README.md (10KB)
**Purpose**: Overview and quick reference for understanding the structure

**Contains**:
- Executive summary of findings
- All required section headers for both capability and enabler
- Metadata field names
- Critical formatting rules with examples
- INTENT state model (4 dimensions)
- React component parsing overview
- Code-to-spec sync guidelines
- File locations and example files

**Best for**: Understanding the big picture, getting started, making quick decisions

**Key sections**:
- Exact Section Headers (Capability & Enabler)
- Metadata Field Names
- Critical Formatting Rules (6 rules with correct/incorrect examples)
- INTENT State Model
- React Component Parsing
- Code-to-Spec Sync Guidelines

---

### 2. capability_enabler_structure_analysis.md (20KB)
**Purpose**: Comprehensive technical analysis with code examples

**Contains**:
- Complete field-by-field breakdown for each section
- All section headers with location, format, and subsections
- React component parsing logic with actual code from Capabilities.tsx and Enablers.tsx
- INTENT state model detailed explanation
- ID generation pattern and algorithm
- Mermaid diagram types and syntax
- Table format requirements and examples
- Special field handling (state model, IDs)
- Critical parsing notes
- Summary tables for all sections (30+ sections per document type)
- Recommendations for code-to-spec sync

**Best for**: Deep understanding, implementing features, troubleshooting, reference during development

**Key sections**:
- Part 1: Capability Markdown Structure (15+ subsections)
- Part 2: Enabler Markdown Structure (20+ subsections)
- Part 3: React Component Parsing Logic
- Part 4: Special Field Handling
- Part 5: Critical Parsing Notes
- Part 6: Summary Tables
- Part 7: Recommendations

---

### 3. quick_reference_card.txt (8KB)
**Purpose**: Quick lookup reference in easy-to-scan text format

**Contains**:
- Capability markdown sections in order
- Enabler markdown sections in order
- ID generation patterns
- INTENT state model (compact format)
- Critical formatting rules (visual format with checkmarks)
- Sync recommendations (DO/DON'T lists)
- React parsing hints with line numbers

**Best for**: Quick lookup while coding, quick reference during meetings, text searching

**Key sections**:
- Capability sections listing
- Enabler sections listing
- ID Generation Patterns
- INTENT State Model
- Critical Formatting Rules
- Sync Recommendations
- React Parsing Hints

---

## Key Findings Summary

### Capability Structure

**Metadata Fields** (in Metadata section):
```
Name, Type, System, Component, ID, Owner, Status, Approval, Priority, Analysis Review
```

**Required Sections**:
1. Metadata
2. Purpose
3. Business Context (with subsections: Problem Statement, Value Proposition, Success Metrics)
4. User Perspective (with subsections: Target Users, User Scenarios)
5. Boundaries (with subsections: In Scope, Out of Scope)
6. Dependencies (with subsections: Upstream Dependencies, Downstream Dependencies)
7. Enablers (table format)
8. Acceptance Criteria

**Optional Sections**:
- Related Stories
- Technical Specifications
- Design Artifacts
- Approval History

---

### Enabler Structure

**Metadata Fields** (in Metadata section):
```
Name, Type, ID, Capability ID, Owner, Status, Approval, Priority, Analysis Review, Code Review
```

**Required Sections**:
1. Metadata
2. Technical Context (with subsections: Purpose, Architecture Fit, Existing Patterns to Follow)
3. Functional Requirements (table format)
4. Non-Functional Requirements (table format)
5. Technical Specifications (with multiple diagram subsections)

**Optional Sections**:
- Edge Cases and Error Handling
- External Dependencies
- Acceptance Scenarios (Gherkin)
- Test Scenario Summary
- Test Architecture
- Testing Strategy
- Implementation Hints
- Approval History

---

### Critical Formatting Rules

1. **Header Levels**: Use `##` for main, `###` for subsections - EXACT CASE REQUIRED
2. **Metadata Fields**: Format as `- **FieldName**: value` (bold with colon)
3. **Tables**: Exact column order and spacing (no extra pipes or reordering)
4. **Mermaid Diagrams**: Preserve syntax (flowchart TD, erDiagram, classDiagram, sequenceDiagram, stateDiagram-v2)
5. **Story References**: Use wiki-style `[[STORY-NAME]]` format
6. **User Scenarios**: Format as `N. **Title**: Description`

---

### ID Patterns

All IDs follow: **PREFIX-XXXXXX** (6-digit numeric)

- Capabilities: **CAP-XXXXXX**
- Enablers: **ENB-XXXXXX**
- Functional Requirements: **FR-XXXXXX**
- Non-Functional Requirements: **NFR-XXXXXX**
- Test Scenarios: **TS-XXXXXX**
- Test Suites: **TST-XXXXXX**

---

### INTENT State Model (4 Dimensions)

1. **lifecycle_state**: draft → active → implemented → maintained → retired
2. **workflow_stage**: intent → specification → ui_design → implementation → control_loop
3. **stage_status**: in_progress → ready_for_approval → approved → blocked
4. **approval_status**: pending → approved → rejected

---

## Source Documentation

### Official Templates
- **CODE_RULES/TEMPLATES.md** - Official capability and enabler markdown templates
- **CODE_RULES/SW_OPERATIONS.md** - Operational procedures and development workflows
- **CODE_RULES/STATE_MODEL.md** - INTENT state model definition

### React Components (Parsing Logic)
- **web-ui/src/pages/Capabilities.tsx** (lines 806-950) - Capability markdown generation
- **web-ui/src/pages/Enablers.tsx** (lines 1114-1142) - Enabler markdown generation
- **web-ui/src/components/CapabilityForm.tsx** - Capability form implementation
- **web-ui/src/context/EnablerContext.tsx** - Enabler context and state

### Real Example Files
- **workspaces/SecureChat/definition/112001-capability.md** - Real capability example
- **workspaces/SecureChat/definition/112101-enabler.md** - Real enabler example
- **workspaces/openFlo-web/definition/*.md** - More diverse examples

---

## How the Analysis Was Done

1. **Read Official Templates**: Analyzed CODE_RULES/TEMPLATES.md line by line
2. **Reviewed Operational Procedures**: Studied CODE_RULES/SW_OPERATIONS.md for context
3. **Analyzed React Code**: Examined Capabilities.tsx and Enablers.tsx actual parsing logic
4. **Studied Real Examples**: Analyzed actual capability and enabler files from workspaces
5. **Verified State Model**: Reviewed CODE_RULES/STATE_MODEL.md for state definitions
6. **Cross-Referenced**: Ensured consistency across all sources
7. **Created Documents**: Generated three documents for different use cases

---

## For Code-to-Spec Sync Implementation

### DO:
- Preserve exact section headers and order
- Add content to Technical Specifications subsections
- Update state fields in Metadata section
- Replace "(Template)" headers when design phase completes
- Maintain markdown formatting and table alignment
- Keep ID fields unchanged
- Use correct Mermaid diagram types

### DON'T:
- Modify section header capitalization or punctuation
- Reorder table columns
- Change ID values
- Add extra columns to tables
- Modify template placeholder text prematurely
- Remove subsection headers when building content
- Change approval status in markdown (use database only)

---

## Document Statistics

| Document | Size | Sections | Purpose |
|----------|------|----------|---------|
| MARKDOWN_STRUCTURE_README.md | 10KB | 9 main | Overview & quick start |
| capability_enabler_structure_analysis.md | 20KB | 32 detailed | Technical reference |
| quick_reference_card.txt | 8KB | 11 sections | Quick lookup |
| **Total** | **38KB** | **52** | **Complete analysis** |

---

## Verification Checklist

- [x] Analyzed CODE_RULES/TEMPLATES.md (official source)
- [x] Reviewed CODE_RULES/SW_OPERATIONS.md (operational procedures)
- [x] Examined web-ui/src/pages/Capabilities.tsx (actual code)
- [x] Examined web-ui/src/pages/Enablers.tsx (actual code)
- [x] Verified against real example files
- [x] Created 3 comprehensive documents
- [x] Cross-checked all findings
- [x] Verified file locations
- [x] Tested formatting rules against examples

---

## Next Steps

1. **For new development**: Use `MARKDOWN_STRUCTURE_README.md` as your guide
2. **For implementation**: Keep `quick_reference_card.txt` open while coding
3. **For deep dives**: Reference `capability_enabler_structure_analysis.md`
4. **For templates**: Check `CODE_RULES/TEMPLATES.md`
5. **For real examples**: Review `workspaces/*/definition/*.md` files
6. **For state model**: Reference `CODE_RULES/STATE_MODEL.md`

---

## Questions? Need to Update?

If the markdown structure changes:

1. Update `CODE_RULES/TEMPLATES.md` first (official source)
2. Verify changes in actual React components
3. Test against real example files
4. Update all three analysis documents
5. Update this index file

For corrections or improvements to the analysis:

1. Verify against current source code
2. Check actual React component parsing logic
3. Test against real example files in workspaces
4. Update the analysis documents accordingly
5. Maintain consistency across all three documents

---

**Analysis Status**: Complete and Verified
**Last Updated**: December 27, 2025
**Quality Level**: High (verified against source code and real examples)
**Ready for Use**: Yes

---

*This analysis package provides everything needed to understand, maintain, and extend the IntentR capability and enabler markdown structures.*
