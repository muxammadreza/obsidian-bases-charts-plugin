---
inclusion: always
---

# Documentation and API Reference Guidelines

## Target Platform

- **Obsidian Version**: 1.10+ (currently in beta)
- **Minimum Support**: Only support Obsidian 1.10 and above
- **Key Features**: Custom views for bases and related APIs are introduced in version 1.10+

## Primary Documentation Sources

### Obsidian Plugin Development

- **Primary**: Use Context7 MCP mirror of Obsidian Developer Docs for the most up-to-date APIs and examples
    - Access via: `context7.com/obsidianmd/obsidian-developer-docs`
    - Includes latest beta APIs and features for 1.10+
- **Fallback**: Official GitHub documentation when Context7 is unavailable
    - Location: `github.com/obsidianmd/obsidian-developer-docs/tree/main/en`
- **Focus**: Prioritize beta/1.10+ API documentation for custom views and bases functionality

### Third-Party Libraries

- **ECharts 6**: Always reference official documentation or Context7 MCP for accurate API calls
- **@ticatec/uniface-echarts wrapper**: Use official docs or Context7 MCP for correct implementation patterns
- **General rule**: For any external library, prioritize official documentation or Context7 MCP over assumptions

## Development Standards

### API Usage

- Never guess API calls, method signatures, or implementation patterns
- Always verify against official documentation before implementing
- When in doubt, consult Context7 MCP or official sources first
- Focus on Obsidian 1.10+ beta APIs, especially custom views for bases functionality

### Code Quality

- Follow TypeScript best practices for Obsidian plugin development
- Ensure proper error handling for all API calls
- Use official examples as templates for implementation patterns

### Documentation Verification

- Cross-reference multiple sources when implementing new features
- Validate API compatibility with Obsidian 1.10+ (beta and above)
- Prioritize beta API features for custom views and bases functionality
- Do not implement fallbacks for versions below 1.10
