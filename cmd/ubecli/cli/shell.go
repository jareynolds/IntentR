// IntentR - Copyright 2025 James Reynolds
//
// Interactive Shell for UbeCLI
// Provides a REPL interface for LLM interactions

package cli

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/jareynolds/intentr/cmd/ubecli/adapters"
	"github.com/jareynolds/intentr/cmd/ubecli/config"
	"github.com/jareynolds/intentr/cmd/ubecli/pipeline"
)

// Shell represents the interactive CLI shell
type Shell struct {
	config      *config.Config
	configMgr   *config.Manager
	pipeline    *pipeline.Pipeline
	reader      *bufio.Reader
	running     bool
	history     []string
	historyIdx  int
	multiLine   bool
	multiBuffer strings.Builder
}

// NewShell creates a new interactive shell
func NewShell(cfg *config.Config, cfgMgr *config.Manager) *Shell {
	return &Shell{
		config:    cfg,
		configMgr: cfgMgr,
		pipeline:  pipeline.NewPipeline(&cfg.Prework, cfg.Debug.Enabled),
		reader:    bufio.NewReader(os.Stdin),
		history:   make([]string, 0),
	}
}

// Run starts the interactive REPL loop
func (s *Shell) Run() error {
	s.running = true

	// Setup signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		fmt.Println("\nGoodbye!")
		s.running = false
		os.Exit(0)
	}()

	// Print welcome message
	s.printWelcome()

	// Set default adapter
	if err := adapters.SetDefault(s.config.LLM.Default); err != nil {
		fmt.Printf("Warning: %v\n", err)
	}

	// Main REPL loop
	for s.running {
		// Print prompt
		prompt := s.config.Shell.Prompt
		if s.multiLine {
			prompt = "... "
		}
		fmt.Print(prompt)

		// Read input
		input, err := s.reader.ReadString('\n')
		if err != nil {
			if err.Error() == "EOF" {
				fmt.Println("\nGoodbye!")
				break
			}
			continue
		}

		input = strings.TrimSpace(input)

		// Handle empty input
		if input == "" {
			continue
		}

		// Handle multi-line mode
		if s.multiLine {
			if input == `"""` || input == "'''" {
				s.multiLine = false
				input = s.multiBuffer.String()
				s.multiBuffer.Reset()
			} else {
				s.multiBuffer.WriteString(input)
				s.multiBuffer.WriteString("\n")
				continue
			}
		} else if input == `"""` || input == "'''" {
			s.multiLine = true
			s.multiBuffer.Reset()
			continue
		}

		// Handle backslash continuation
		if strings.HasSuffix(input, "\\") {
			s.multiLine = true
			s.multiBuffer.WriteString(strings.TrimSuffix(input, "\\"))
			s.multiBuffer.WriteString(" ")
			continue
		}

		// Process input
		if err := s.processInput(input); err != nil {
			fmt.Printf("Error: %v\n", err)
		}
	}

	return nil
}

// processInput handles a single input line
func (s *Shell) processInput(input string) error {
	// Add to history
	s.history = append(s.history, input)
	s.historyIdx = len(s.history)

	// Check for slash commands
	if strings.HasPrefix(input, "/") {
		return s.handleSlashCommand(input)
	}

	// Process through pipeline and execute
	return s.executePrompt(input)
}

// handleSlashCommand handles built-in commands
func (s *Shell) handleSlashCommand(input string) error {
	parts := strings.Fields(input)
	if len(parts) == 0 {
		return nil
	}

	command := strings.ToLower(parts[0])
	args := parts[1:]

	switch command {
	case "/help", "/h", "/?":
		s.printHelp()
		return nil

	case "/exit", "/quit", "/q":
		fmt.Println("Goodbye!")
		s.running = false
		return nil

	case "/clear", "/cls":
		fmt.Print("\033[H\033[2J")
		return nil

	case "/config":
		return s.handleConfigCommand(args)

	case "/model":
		return s.handleModelCommand(args)

	case "/history":
		s.printHistory()
		return nil

	case "/debug":
		s.config.Debug.Enabled = !s.config.Debug.Enabled
		fmt.Printf("Debug mode: %v\n", s.config.Debug.Enabled)
		return nil

	case "/prework":
		return s.handlePreworkCommand(args)

	case "/adapters":
		adapters := adapters.ListAdapters()
		fmt.Printf("Available adapters: %v\n", adapters)
		fmt.Printf("Current: %s\n", s.config.LLM.Default)
		return nil

	default:
		fmt.Printf("Unknown command: %s\nType /help for available commands.\n", command)
		return nil
	}
}

// executePrompt processes and executes a prompt
func (s *Shell) executePrompt(input string) error {
	ctx := context.Background()

	// Show processing indicator
	fmt.Println("Processing...")

	startTime := time.Now()

	// Get enhanced prompt if debug
	if s.config.Debug.ShowPrework {
		enhanced, err := s.pipeline.GetEnhancedPrompt(ctx, input)
		if err != nil {
			return fmt.Errorf("prework failed: %w", err)
		}
		fmt.Println("\n--- Enhanced Prompt ---")
		fmt.Println(enhanced)
		fmt.Println("--- End Enhanced Prompt ---\n")
	}

	// Check for dry run
	if s.config.Debug.DryRun {
		fmt.Println("[Dry run - not sending to LLM]")
		return nil
	}

	// Execute through pipeline
	response, err := s.pipeline.Execute(ctx, input, s.config.LLM.Default)
	if err != nil {
		return fmt.Errorf("execution failed: %w", err)
	}

	elapsed := time.Since(startTime)

	// Print response
	fmt.Println()
	fmt.Println(response.Content)
	fmt.Println()

	if s.config.Debug.Enabled {
		fmt.Printf("[Adapter: %s, Time: %v]\n", response.AdapterName, elapsed)
	}

	return nil
}

// handleConfigCommand handles /config subcommands
func (s *Shell) handleConfigCommand(args []string) error {
	if len(args) == 0 {
		// Show current config (masked)
		masked := s.configMgr.MaskSecrets()
		fmt.Printf("Current configuration:\n")
		fmt.Printf("  LLM Default: %s\n", masked.LLM.Default)
		fmt.Printf("  Prework Enabled: %v\n", masked.Prework.Enabled)
		fmt.Printf("  Context Files: %v\n", masked.Prework.ContextFiles)
		fmt.Printf("  Debug Enabled: %v\n", masked.Debug.Enabled)
		return nil
	}

	switch args[0] {
	case "init":
		if err := config.InitDefaultConfig(".ubecli.yaml"); err != nil {
			return err
		}
		fmt.Println("Created .ubecli.yaml with default configuration")
		return nil

	case "get":
		if len(args) < 2 {
			return fmt.Errorf("usage: /config get <key>")
		}
		value := s.configMgr.GetString(args[1])
		fmt.Printf("%s = %s\n", args[1], value)
		return nil

	case "set":
		if len(args) < 3 {
			return fmt.Errorf("usage: /config set <key> <value>")
		}
		if err := s.configMgr.Set(args[1], args[2]); err != nil {
			return err
		}
		fmt.Printf("Set %s = %s\n", args[1], args[2])
		return nil

	case "save":
		if err := s.configMgr.Save(); err != nil {
			return err
		}
		fmt.Println("Configuration saved")
		return nil

	default:
		return fmt.Errorf("unknown config command: %s", args[0])
	}
}

// handleModelCommand handles /model subcommands
func (s *Shell) handleModelCommand(args []string) error {
	if len(args) == 0 {
		fmt.Printf("Current model: %s\n", s.config.LLM.Default)
		fmt.Printf("Available: %v\n", adapters.ListAdapters())
		return nil
	}

	newModel := args[0]
	if err := adapters.SetDefault(newModel); err != nil {
		return err
	}
	s.config.LLM.Default = newModel
	fmt.Printf("Switched to: %s\n", newModel)
	return nil
}

// handlePreworkCommand handles /prework subcommands
func (s *Shell) handlePreworkCommand(args []string) error {
	if len(args) == 0 {
		fmt.Printf("Prework pipeline:\n")
		fmt.Printf("  Enabled: %v\n", s.config.Prework.Enabled)
		fmt.Printf("  Context Files: %v\n", s.config.Prework.ContextFiles)
		fmt.Printf("  Rules: %d configured\n", len(s.config.Prework.CustomRules))
		return nil
	}

	switch args[0] {
	case "on":
		s.config.Prework.Enabled = true
		fmt.Println("Prework enabled")
	case "off":
		s.config.Prework.Enabled = false
		fmt.Println("Prework disabled")
	case "show":
		// Show what would be injected
		ctx := context.Background()
		testPrompt := "test"
		if len(args) > 1 {
			testPrompt = strings.Join(args[1:], " ")
		}
		enhanced, err := s.pipeline.GetEnhancedPrompt(ctx, testPrompt)
		if err != nil {
			return err
		}
		fmt.Println("--- Prework Output ---")
		fmt.Println(enhanced)
		fmt.Println("--- End ---")
	default:
		return fmt.Errorf("unknown prework command: %s", args[0])
	}
	return nil
}

// printWelcome prints the welcome message
func (s *Shell) printWelcome() {
	fmt.Println("UbeCLI - LLM Request Interception Proxy")
	fmt.Println("Version 1.0.0")
	fmt.Println()
	fmt.Printf("Using adapter: %s\n", s.config.LLM.Default)
	fmt.Printf("Prework: %v\n", s.config.Prework.Enabled)
	fmt.Println()
	fmt.Println("Type /help for commands, or enter a prompt.")
	fmt.Println("Use \"\"\" for multi-line input, Ctrl+C to exit.")
	fmt.Println()
}

// printHelp prints help information
func (s *Shell) printHelp() {
	fmt.Println(`
UbeCLI Commands:

  /help, /h       Show this help message
  /exit, /quit    Exit the shell
  /clear          Clear the screen

  /config         Show current configuration
  /config init    Create default .ubecli.yaml
  /config get <key>    Get config value
  /config set <key> <value>  Set config value
  /config save    Save configuration to file

  /model          Show current LLM adapter
  /model <name>   Switch to different adapter
  /adapters       List available adapters

  /prework        Show prework pipeline status
  /prework on     Enable prework pipeline
  /prework off    Disable prework pipeline
  /prework show   Show prework output for test prompt

  /debug          Toggle debug mode
  /history        Show command history

Multi-line Input:
  Start with """ or ''' and end with the same
  Or use \ at end of line for continuation

Available Adapters: claude-cli, claude-api, openai, ollama, mock
`)
}

// printHistory prints command history
func (s *Shell) printHistory() {
	fmt.Println("Command History:")
	for i, cmd := range s.history {
		fmt.Printf("  %d: %s\n", i+1, cmd)
	}
}

// Shutdown gracefully terminates the shell
func (s *Shell) Shutdown() {
	s.running = false
}
