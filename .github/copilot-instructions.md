- [ ] Verify that the copilot-instructions.md file in the .github directory is created.

- [ ] Clarify Project Requirements
	- Ask for project type, language, and frameworks if not specified. Skip if already provided.

- [ ] Scaffold the Project
	- Ensure that the previous step has been marked as completed.
	- Call project setup tool with projectType parameter.
	- Run scaffolding command to create project files and folders.
	- Use '.' as the working directory.
	- If no appropriate projectType is available, search documentation using available tools.
	- Otherwise, create the project structure manually using available file creation tools.

- [ ] Customize the Project
	- Verify that all previous steps have been completed successfully and you have marked the step as completed.
	- Develop a plan to modify codebase according to user requirements.
	- Apply modifications using appropriate tools and user-provided references.
	- Skip this step for "Hello World" projects.

- [ ] Install Required Extensions
	- ONLY install extensions mentioned in get_project_setup_info. Skip this step otherwise and mark as completed.

- [ ] Compile the Project
	- Verify that all previous steps have been completed.
	- Install any missing dependencies.
	- Run diagnostics and resolve any issues.
	- Check for markdown files in project folder for relevant instructions on how to do this.

- [ ] Create and Run Task
	- Verify that all previous steps have been completed.
	- Determine if the project needs a task; if so, use create_and_run_task based on package.json, README.md, and project structure.
	- Skip this step otherwise.

- [ ] Launch the Project
	- Verify that all previous steps have been completed.
	- Prompt user for debug mode; launch only if confirmed.

- [ ] Ensure Documentation is Complete
	- Verify that all previous steps have been completed.
	- Verify that README.md and .github/copilot-instructions.md exist and contain current project information.
	- Clean up .github/copilot-instructions.md by removing all HTML comments.

## Execution Guidelines

PROGRESS TRACKING:
- Use an explicit todo list to track the checklist.
- Mark each step complete with a short summary.

COMMUNICATION RULES:
- Avoid verbose explanations or printing full command outputs.
- If a step is skipped, state that briefly.

DEVELOPMENT RULES:
- Use '.' as the working directory unless user specifies otherwise.
- Avoid adding media or external links unless explicitly requested.
- Use VS Code API tool only for VS Code extension projects.

FOLDER CREATION RULES:
- Use the current directory as the project root.
- Do not create a new folder unless explicitly requested (except .vscode for tasks).

EXTENSION INSTALLATION RULES:
- Only install extensions specified by get_project_setup_info.

TASK COMPLETION RULES:
- Project scaffolds and compiles without errors.
- .github/copilot-instructions.md exists and is up to date.
- README.md exists and is up to date.
- Provide clear instructions to debug/launch the project.
