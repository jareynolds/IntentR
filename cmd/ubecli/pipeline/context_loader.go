// IntentR - Copyright 2025 James Reynolds
//
// Context Loader for UbeCLI
// Loads project context files (CLAUDE.md, MAIN_SWDEV_PLAN.md, specifications)

package pipeline

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// LoadedFile represents a loaded context file
type LoadedFile struct {
	Path      string
	Content   string
	Truncated bool
	LoadedAt  time.Time
}

// LoaderConfig configures the context loader
type LoaderConfig struct {
	MaxFileSize  int64    // Max size per file (default 50KB)
	MaxTotalSize int64    // Max total context (default 100KB)
	CacheEnabled bool
	CacheTTL     time.Duration
}

// ContextLoader handles loading project context files
type ContextLoader struct {
	workingDir string
	config     *LoaderConfig
	cache      map[string]*cacheEntry
	cacheMutex sync.RWMutex
}

type cacheEntry struct {
	file      *LoadedFile
	mtime     time.Time
	expiresAt time.Time
}

// DefaultLoaderConfig returns default loader configuration
func DefaultLoaderConfig() *LoaderConfig {
	return &LoaderConfig{
		MaxFileSize:  50 * 1024,  // 50KB
		MaxTotalSize: 100 * 1024, // 100KB
		CacheEnabled: true,
		CacheTTL:     5 * time.Minute,
	}
}

// NewContextLoader creates a new context loader
func NewContextLoader(workingDir string, config *LoaderConfig) *ContextLoader {
	if config == nil {
		config = DefaultLoaderConfig()
	}
	if workingDir == "" {
		workingDir, _ = os.Getwd()
	}
	return &ContextLoader{
		workingDir: workingDir,
		config:     config,
		cache:      make(map[string]*cacheEntry),
	}
}

// LoadFile loads a single file by path
func (l *ContextLoader) LoadFile(path string) (*LoadedFile, error) {
	// Make path absolute if needed
	if !filepath.IsAbs(path) {
		path = filepath.Join(l.workingDir, path)
	}

	// Check cache first
	if l.config.CacheEnabled {
		if cached := l.getFromCache(path); cached != nil {
			return cached, nil
		}
	}

	// Read file
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	// Check for binary content
	if isBinary(content) {
		return nil, fmt.Errorf("file appears to be binary: %s", path)
	}

	// Truncate if needed
	contentStr := string(content)
	truncated := false
	if l.config.MaxFileSize > 0 && int64(len(content)) > l.config.MaxFileSize {
		contentStr, truncated = l.truncateContent(contentStr, l.config.MaxFileSize)
	}

	file := &LoadedFile{
		Path:      path,
		Content:   contentStr,
		Truncated: truncated,
		LoadedAt:  time.Now(),
	}

	// Cache the result
	if l.config.CacheEnabled {
		l.addToCache(path, file)
	}

	return file, nil
}

// LoadClaudeMD loads CLAUDE.md from project root or parent directories
func (l *ContextLoader) LoadClaudeMD() (*LoadedFile, error) {
	path := l.findUpward("CLAUDE.md")
	if path == "" {
		return nil, fmt.Errorf("CLAUDE.md not found")
	}
	return l.LoadFile(path)
}

// LoadSWDevPlan loads MAIN_SWDEV_PLAN.md
func (l *ContextLoader) LoadSWDevPlan() (*LoadedFile, error) {
	// Try multiple locations
	paths := []string{
		"MAIN_SWDEV_PLAN.md",
		"CODE_RULES/MAIN_SWDEV_PLAN.md",
		"docs/MAIN_SWDEV_PLAN.md",
	}

	for _, path := range paths {
		file, err := l.LoadFile(path)
		if err == nil {
			return file, nil
		}
	}

	return nil, fmt.Errorf("MAIN_SWDEV_PLAN.md not found")
}

// LoadSpecification loads a specification by ID
func (l *ContextLoader) LoadSpecification(id string) (*LoadedFile, error) {
	// Extract numeric part for filename
	parts := strings.Split(id, "-")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid spec ID: %s", id)
	}

	// Try different naming patterns
	patterns := []string{
		fmt.Sprintf("specifications/%s.md", id),
		fmt.Sprintf("specifications/%s-capability.md", parts[1]),
		fmt.Sprintf("specifications/%s-enabler.md", parts[1]),
	}

	for _, pattern := range patterns {
		file, err := l.LoadFile(pattern)
		if err == nil {
			return file, nil
		}
	}

	return nil, fmt.Errorf("specification not found: %s", id)
}

// LoadReferencedSpecs finds and loads specs mentioned in text
func (l *ContextLoader) LoadReferencedSpecs(text string) ([]*LoadedFile, error) {
	// Pattern matches: CAP-XXXXXX, ENB-XXXXXX, FR-XXXXXX, NFR-XXXXXX
	pattern := regexp.MustCompile(`(CAP|ENB|FR|NFR)-\d{6}`)
	matches := pattern.FindAllString(text, -1)

	var loaded []*LoadedFile
	seen := make(map[string]bool)

	for _, match := range matches {
		if seen[match] {
			continue
		}
		seen[match] = true

		spec, err := l.LoadSpecification(match)
		if err == nil {
			loaded = append(loaded, spec)
		}
	}

	return loaded, nil
}

// LoadContextFiles loads all configured context files
func (l *ContextLoader) LoadContextFiles(files []string) (map[string]*LoadedFile, error) {
	result := make(map[string]*LoadedFile)
	var totalSize int64

	for _, path := range files {
		file, err := l.LoadFile(path)
		if err != nil {
			// Continue on error - file might not exist
			continue
		}

		totalSize += int64(len(file.Content))
		if l.config.MaxTotalSize > 0 && totalSize > l.config.MaxTotalSize {
			// Stop loading more files if we hit the limit
			break
		}

		result[path] = file
	}

	return result, nil
}

// FindSpecsDir finds the specifications directory
func (l *ContextLoader) FindSpecsDir() string {
	candidates := []string{
		"specifications",
		"specs",
		"spec",
	}

	for _, dir := range candidates {
		path := filepath.Join(l.workingDir, dir)
		if info, err := os.Stat(path); err == nil && info.IsDir() {
			return path
		}
	}

	return ""
}

// findUpward searches for a file in current and parent directories
func (l *ContextLoader) findUpward(filename string) string {
	dir := l.workingDir
	for {
		path := filepath.Join(dir, filename)
		if _, err := os.Stat(path); err == nil {
			return path
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return ""
}

// truncateContent truncates content to max size
func (l *ContextLoader) truncateContent(content string, maxSize int64) (string, bool) {
	if int64(len(content)) <= maxSize {
		return content, false
	}

	// Find a good breaking point
	truncated := content[:maxSize]

	// Try to break at paragraph or sentence
	if idx := strings.LastIndex(truncated, "\n\n"); idx > int(maxSize/2) {
		truncated = truncated[:idx]
	} else if idx := strings.LastIndex(truncated, ". "); idx > int(maxSize/2) {
		truncated = truncated[:idx+1]
	}

	truncated += "\n\n[... content truncated due to size limit ...]"
	return truncated, true
}

// getFromCache retrieves a cached file if valid
func (l *ContextLoader) getFromCache(path string) *LoadedFile {
	l.cacheMutex.RLock()
	defer l.cacheMutex.RUnlock()

	entry, ok := l.cache[path]
	if !ok {
		return nil
	}

	// Check expiration
	if time.Now().After(entry.expiresAt) {
		return nil
	}

	// Check if file modified
	info, err := os.Stat(path)
	if err != nil || info.ModTime().After(entry.mtime) {
		return nil
	}

	return entry.file
}

// addToCache adds a file to the cache
func (l *ContextLoader) addToCache(path string, file *LoadedFile) {
	l.cacheMutex.Lock()
	defer l.cacheMutex.Unlock()

	info, err := os.Stat(path)
	if err != nil {
		return
	}

	l.cache[path] = &cacheEntry{
		file:      file,
		mtime:     info.ModTime(),
		expiresAt: time.Now().Add(l.config.CacheTTL),
	}
}

// ClearCache clears the file cache
func (l *ContextLoader) ClearCache() {
	l.cacheMutex.Lock()
	defer l.cacheMutex.Unlock()
	l.cache = make(map[string]*cacheEntry)
}

// isBinary checks if content appears to be binary
func isBinary(content []byte) bool {
	// Check for null bytes or high concentration of non-printable chars
	if len(content) == 0 {
		return false
	}

	// Check first 512 bytes
	checkLen := 512
	if len(content) < checkLen {
		checkLen = len(content)
	}

	nonPrintable := 0
	for i := 0; i < checkLen; i++ {
		if content[i] == 0 {
			return true // Null byte = binary
		}
		if content[i] < 32 && content[i] != '\n' && content[i] != '\r' && content[i] != '\t' {
			nonPrintable++
		}
	}

	// If more than 30% non-printable, consider binary
	return float64(nonPrintable)/float64(checkLen) > 0.3
}

// ExtractMetadata extracts YAML frontmatter metadata from a file
func ExtractMetadata(content string) map[string]string {
	metadata := make(map[string]string)

	// Check for YAML frontmatter
	if !strings.HasPrefix(content, "---") {
		return metadata
	}

	// Find end of frontmatter
	endIdx := strings.Index(content[3:], "---")
	if endIdx == -1 {
		return metadata
	}

	frontmatter := content[3 : endIdx+3]
	lines := strings.Split(frontmatter, "\n")

	for _, line := range lines {
		parts := strings.SplitN(line, ":", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			metadata[key] = value
		}
	}

	return metadata
}
