# Requirements Document

## Introduction

The runtime debugging workflow enables the AI agent to launch a coordinated troubleshooting environment with a single Bun command, streaming build and Obsidian console output in parallel so compilation and runtime issues can be diagnosed and resolved without manual setup.

## Requirements

### Requirement 1

**User Story:** As an AI agent operator, I want a single command to initialize the runtime debugging environment, so that the agent can start troubleshooting without manual orchestration.

#### Acceptance Criteria

1. WHEN the operator runs `bun run debug:runtime` THEN the system SHALL launch all required watchers and orchestration services.
2. IF the command is executed in a workspace configured per `.codex/steering/tech.md` Stack guidance THEN the system SHALL resolve project paths without manual overrides.
3. WHEN the command starts THEN the system SHALL provide the AI agent with steering directives describing the debugging workflow entry points.

### Requirement 2

**User Story:** As an AI agent, I want continuous access to build output, so that I can detect compilation errors while editing code.

#### Acceptance Criteria

1. WHEN `bun run debug:runtime` runs THEN one managed terminal session SHALL execute `bun run dev` and stream incremental build results.
2. IF the build watcher emits a compilation error THEN the system SHALL flag the event for the AI agent within five seconds.
3. WHEN the AI agent resolves a reported compilation error THEN the system SHALL confirm a clean build cycle before clearing the alert.

### Requirement 3

**User Story:** As an AI agent, I want real-time visibility into Obsidian runtime logs, so that I can trace and debug errors triggered inside the preview vault.

#### Acceptance Criteria

1. WHEN the workflow initializes THEN a separate managed terminal session SHALL open Obsidian, load the `bases-preview.base` file at the vault root, and attach to the developer console.
2. IF the Obsidian developer console emits an error or warning message THEN the system SHALL stream the message to the AI agent within two seconds of occurrence.
3. WHEN Obsidian is already running THEN the system SHALL reuse the existing instance while still attaching to the console feed.

### Requirement 4

**User Story:** As an AI agent, I want coordinated monitoring of build and runtime streams, so that I can triage issues without terminal blocking.

#### Acceptance Criteria

1. WHEN both terminal streams are active THEN the system SHALL prevent blocking waits on streaming output so the agent can interleave commands.
2. IF the AI agent issues a debugging action (e.g., code change or vault interaction) THEN the workflow orchestration SHALL track the action and correlate it with subsequent stream events.
3. WHEN no actionable errors remain in either stream THEN the system SHALL notify the AI agent that the runtime debugging session is stable.

### Requirement 5

**User Story:** As an AI agent, I want to dynamically plan debugging steps, so that I can adapt to new runtime failures efficiently.

#### Acceptance Criteria

1. WHEN a new error appears in any stream THEN the workflow orchestration SHALL log the error context and expose it to the agent for planning.
2. IF multiple errors arise concurrently THEN the system SHALL maintain distinct contexts so the agent can prioritize resolution order.
3. WHEN the agent marks an error as resolved THEN the workflow orchestration SHALL update the state and persist a resolution note for that error.
