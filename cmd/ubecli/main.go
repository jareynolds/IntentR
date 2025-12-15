// UbeCode - Copyright 2025 James Reynolds
//
// UbeCLI - LLM Request Interception Proxy
// An interactive CLI that intercepts and enhances LLM requests
// with project context and SAWai methodology enforcement.

package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/jareynolds/ubecode/cmd/ubecli/adapters"
	"github.com/jareynolds/ubecode/cmd/ubecli/cli"
	"github.com/jareynolds/ubecode/cmd/ubecli/config"
	"github.com/jareynolds/ubecode/cmd/ubecli/pipeline"

	// Import adapters to trigger init() registration
	_ "github.com/jareynolds/ubecode/cmd/ubecli/adapters"
)

var (
	// Version information - set via ldflags during build
	version   = "dev"
	buildDate = "unknown"
	gitCommit = "unknown"
)

func main() {
	// Parse command line flags
	showVersion := flag.Bool("version", false, "Show version information")
	showHelp := flag.Bool("help", false, "Show help information")
	configInit := flag.Bool("init", false, "Initialize default configuration file")
	adapterName := flag.String("adapter", "", "LLM adapter to use (claude-cli, claude-api, openai, ollama)")
	debugMode := flag.Bool("debug", false, "Enable debug mode")
	dryRun := flag.Bool("dry-run", false, "Process prompt but don't send to LLM")
	showPrework := flag.Bool("show-prework", false, "Show enhanced prompt before sending")
	noPrework := flag.Bool("no-prework", false, "Disable prework pipeline")
	promptArg := flag.String("p", "", "Execute single prompt and exit")

	flag.Parse()

	// Handle version
	if *showVersion {
		fmt.Printf("UbeCLI version %s\n", version)
		fmt.Printf("Build date: %s\n", buildDate)
		fmt.Printf("Git commit: %s\n", gitCommit)
		os.Exit(0)
	}

	// Handle help
	if *showHelp {
		printUsage()
		os.Exit(0)
	}

	// Handle config init
	if *configInit {
		if err := config.InitDefaultConfig(".ubecli.yaml"); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("Created .ubecli.yaml with default configuration")
		os.Exit(0)
	}

	// Load configuration
	cfgMgr := config.NewManager()
	if err := cfgMgr.Load(); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Failed to load config: %v\n", err)
		fmt.Fprintln(os.Stderr, "Using default configuration")
	}

	cfg := cfgMgr.Get()

	// Apply command line overrides
	if *adapterName != "" {
		cfg.LLM.Default = *adapterName
	}
	if *debugMode {
		cfg.Debug.Enabled = true
	}
	if *dryRun {
		cfg.Debug.DryRun = true
	}
	if *showPrework {
		cfg.Debug.ShowPrework = true
	}
	if *noPrework {
		cfg.Prework.Enabled = false
	}

	// Verify adapter exists
	if !adapters.DefaultRegistry.HasAdapter(cfg.LLM.Default) {
		fmt.Fprintf(os.Stderr, "Error: Adapter '%s' not available\n", cfg.LLM.Default)
		fmt.Fprintf(os.Stderr, "Available adapters: %v\n", adapters.ListAdapters())
		os.Exit(1)
	}

	// Set default adapter
	if err := adapters.SetDefault(cfg.LLM.Default); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: %v\n", err)
	}

	// Handle single prompt mode
	if *promptArg != "" {
		if err := executeSinglePrompt(cfg, *promptArg); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}
		os.Exit(0)
	}

	// Check for piped input
	stat, _ := os.Stdin.Stat()
	if (stat.Mode() & os.ModeCharDevice) == 0 {
		// Piped input - read and execute
		if err := executePipedInput(cfg); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}
		os.Exit(0)
	}

	// Start interactive shell
	shell := cli.NewShell(cfg, cfgMgr)
	if err := shell.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

// executeSinglePrompt executes a single prompt and exits
func executeSinglePrompt(cfg *config.Config, prompt string) error {
	pipe := pipeline.NewPipeline(&cfg.Prework, cfg.Debug.Enabled)

	// Show enhanced prompt if requested
	if cfg.Debug.ShowPrework {
		enhanced, err := pipe.GetEnhancedPrompt(nil, prompt)
		if err != nil {
			return fmt.Errorf("prework failed: %w", err)
		}
		fmt.Fprintln(os.Stderr, "--- Enhanced Prompt ---")
		fmt.Fprintln(os.Stderr, enhanced)
		fmt.Fprintln(os.Stderr, "--- End Enhanced Prompt ---")
		fmt.Fprintln(os.Stderr)
	}

	// Check for dry run
	if cfg.Debug.DryRun {
		fmt.Println("[Dry run - not sending to LLM]")
		return nil
	}

	// Execute
	response, err := pipe.Execute(nil, prompt, cfg.LLM.Default)
	if err != nil {
		return err
	}

	fmt.Println(response.Content)
	return nil
}

// executePipedInput reads from stdin and executes
func executePipedInput(cfg *config.Config) error {
	var input string
	buf := make([]byte, 1024)
	for {
		n, err := os.Stdin.Read(buf)
		if n > 0 {
			input += string(buf[:n])
		}
		if err != nil {
			break
		}
	}

	if input == "" {
		return fmt.Errorf("no input provided")
	}

	return executeSinglePrompt(cfg, input)
}

// printUsage prints usage information
func printUsage() {
	fmt.Printf(`UbeCLI - LLM Request Interception Proxy
Version %s

USAGE:
  ubecli [OPTIONS]
  ubecli -p "prompt"
  echo "prompt" | ubecli

OPTIONS:
  -version        Show version information
  -help           Show this help message
  -init           Create default .ubecli.yaml configuration
  -adapter NAME   Use specific adapter (claude-cli, claude-api, openai, ollama, codex-cli)
  -p "PROMPT"     Execute single prompt and exit
  -debug          Enable debug mode
  -dry-run        Process without sending to LLM
  -show-prework   Display enhanced prompt before sending
  -no-prework     Disable prework pipeline

INTERACTIVE COMMANDS:
  /help           Show available commands
  /exit           Exit the shell
  /config         Manage configuration
  /model NAME     Switch LLM adapter
  /prework        Manage prework pipeline
  /debug          Toggle debug mode

CONFIGURATION:
  Global:  ~/.ubecli.yaml
  Project: ./.ubecli.yaml

ENVIRONMENT VARIABLES:
  UBECLI_LLM_DEFAULT    Default adapter
  ANTHROPIC_API_KEY     Claude API key
  OPENAI_API_KEY        OpenAI API key
  UBECLI_DEBUG          Enable debug (true/1)

EXAMPLES:
  # Start interactive shell
  ubecli

  # Use specific adapter
  ubecli -adapter openai

  # Execute single prompt
  ubecli -p "Explain this code"

  # Pipe input
  cat prompt.txt | ubecli

  # Initialize configuration
  ubecli -init

For more information: https://github.com/ubecode/ubecli
`, version)
}
