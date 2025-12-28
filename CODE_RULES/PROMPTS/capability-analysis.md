# Capability Analysis Prompt Template

This prompt is used by the AI to analyze conception documents and propose capabilities.

## Variables Available

The following variables will be replaced when the prompt is used:

- `{{CONCEPTION_CONTENT}}` - The content of all conception documents (ideas, stories, visions)
- `{{FILE_COUNT}}` - The number of conception documents analyzed
- `{{EXISTING_CAPABILITIES}}` - List of existing capabilities (if any)

---

## Prompt

You are a software architect using the Capability-Driven Architecture Map methodology to decompose abstract software ideas into concrete capabilities.

A Capability-Driven Architecture Map visualizes WHAT the system must be able to do (capabilities) before focusing on HOW it is built. It creates a clear lineage from:
  idea → value → capability → enabler → module → component

Your task is to analyze the conception phase documents below and propose capabilities based on the ideas, visions, stories, and themes described.

{{CONCEPTION_CONTENT}}

Based on your analysis of these conception documents, propose 3-7 NEW capabilities that:
1. Represent distinct business functions the system must perform
2. Are user-centric and meaningful to end users or business stakeholders
3. Are largely self-contained with clear boundaries
4. Are at the right level of granularity (not too broad like "entire application", not too narrow like "single function")
5. Follow common capability patterns like: User Management, Data Management, Integration, Reporting, Communication, Security, Configuration

For each capability, provide comprehensive details including:
1. A clear, business-focused name (noun-based, e.g., "User Authentication", "Report Generation")
2. A comprehensive description of what business value it delivers
3. A purpose statement explaining WHY this capability exists
4. The rationale explaining how it derives from the conception documents
5. Key success metrics that would indicate the capability is working
6. References to relevant story files from the conception documents
7. Dependencies on other proposed or existing capabilities
8. Priority based on business value and user impact
9. User scenarios in "As a [user], I want [action] so that [benefit]" format
10. Clear scope boundaries (what is in scope and out of scope)
11. Acceptance criteria in Given/When/Then format

Return your response as a JSON object with this exact format:
```json
{
  "suggestions": [
    {
      "name": "Capability Name",
      "description": "Detailed description of what this capability enables users to do and what business value it provides. This should be 2-4 sentences explaining the functionality.",
      "purpose": "A clear statement of WHY this capability exists, what problem it solves, and what value it delivers to users or the business. This should answer 'What is the intent behind this capability?'",
      "type": "capability",
      "rationale": "How this capability was derived from the conception documents - reference specific ideas, stories, or themes by their file names or content",
      "successMetrics": ["Measurable metric 1", "Measurable metric 2", "Measurable metric 3"],
      "storyboardReferences": ["STORY-file-name-1.md", "STORY-file-name-2.md"],
      "upstreamDependencies": ["Name of capability this depends on"],
      "downstreamDependencies": ["Name of capability that would depend on this"],
      "priority": "high|medium|low",
      "businessValue": "Brief statement of the business value (e.g., 'Increases user retention', 'Reduces manual effort', 'Enables new revenue stream')",
      "userPersonas": ["Primary user type 1", "Primary user type 2"],
      "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
      "acceptanceCriteria": ["Given X, When Y, Then Z - criteria 1", "Given X, When Y, Then Z - criteria 2", "Given X, When Y, Then Z - criteria 3"],
      "userScenarios": [
        {"title": "Scenario title 1", "description": "As a [user type], I want to [action] so that [benefit]"},
        {"title": "Scenario title 2", "description": "As a [user type], I want to [action] so that [benefit]"}
      ],
      "inScope": ["What IS included in this capability - item 1", "What IS included - item 2"],
      "outOfScope": ["What is NOT included - item 1", "What is NOT included - item 2"]
    }
  ],
  "analysis": {
    "totalConceptionDocuments": {{FILE_COUNT}},
    "keyThemes": ["theme1", "theme2"],
    "coverageNotes": "Brief notes on how well the proposed capabilities cover the conception documents",
    "missingAreas": "Any areas from the conception documents that are not covered by the proposed capabilities",
    "recommendedOrder": ["Capability to implement first", "Second capability", "Third capability"]
  }
}
```

IMPORTANT:
- For storyboardReferences, use actual file names from the conception documents provided (e.g., STORY-*.md, IDEA-*.md, VIS-*.md)
- For dependencies, reference other capabilities by their exact names (either from the existing capabilities list or from your proposed capabilities)
- Ensure all arrays have at least one item where applicable
- Priority should be based on: high = critical for MVP, medium = important but not blocking, low = nice to have
- For acceptanceCriteria, use Given/When/Then format where possible
- For userScenarios, use the "As a [user], I want [action] so that [benefit]" format
- For inScope and outOfScope, be specific about boundaries to avoid scope creep

Only return the JSON, no other text.
