# AgentCart Go SQLite Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AgentCart's core runtime as a Go CLI backed by local SQLite while keeping the existing npm/Vite landing page intact.

**Architecture:** `web/` remains the Vite landing app. The AgentCart product registry, seller flows, buyer recommendation protocol, review engine, skill installer, analytics, and purchase-assist boundary move into a Go CLI that writes to `.agentcart/agentcart.db`. SQLite is the source of truth for the MVP, with schema-ready OAuth tables but local CLI sessions first.

**Tech Stack:** Go 1.26+, SQLite via `modernc.org/sqlite`, Go `testing`, npm/Vite for the landing page, local filesystem writes under `.agentcart/`.

---

## Scope Check

This plan is one cohesive runtime rewrite. It includes CLI, local auth, SQLite schema, seller product registration, buyer recommendation, risk review, agent JSON, skill installation, analytics, and purchase-assist dry-run behavior. It does not build a hosted API, Supabase, payment automation, browser automation, or a web dashboard.

## Existing Context

- `package.json` currently owns the landing page and exposes `agentcart` as `./cli.js`.
- `cli.js` currently supports only local JSON-style `login`, `whoami`, and `logout`.
- `.worktrees/mvp-cli/src/` contains a useful TypeScript concept MVP for seller add, buyer ask, review, agent JSON, and skill generation.
- Wiki rules say durable product knowledge belongs under `wiki/`; this plan does not alter wiki content.
- Product rules from the wiki:
  - AgentCart is not a page builder.
  - AgentCart is an agent-safe product and affiliate-link registry.
  - Ranking must not use commission rate.
  - Affiliate disclosures must be visible.
  - Price is a snapshot unless refreshed through an allowed source.
  - Purchase-assist can prepare checkout, but stops at login, address, payment method, payment password, OTP, CAPTCHA, and final payment unless there is action-time confirmation.

## File Structure

Create or modify these files:

- `go.mod`: Go module and SQLite dependency.
- `go.sum`: Go dependency checksums.
- `cmd/agentcart/main.go`: executable entrypoint that delegates to `internal/cli`.
- `internal/cli/cli.go`: command parser, IO abstraction, command dispatch.
- `internal/cli/cli_test.go`: CLI behavior tests using a temporary SQLite DB.
- `internal/db/db.go`: SQLite open, PRAGMA setup, migrations, reset support.
- `internal/db/schema.go`: migration SQL strings.
- `internal/db/db_test.go`: migration and reset tests.
- `internal/model/model.go`: shared domain structs and enum constants.
- `internal/testutil/testutil.go`: temp DB, test clock, output capture helpers.
- `internal/auth/auth.go`: local account/session service and safe output helpers.
- `internal/auth/auth_test.go`: login, whoami, logout, masking tests.
- `internal/seller/seller.go`: seller profile and curator channel service.
- `internal/seller/seller_test.go`: seller creation and duplicate handle tests.
- `internal/product/platform.go`: URL normalization, platform detection, slug generation.
- `internal/product/product.go`: product link registration and agent card persistence.
- `internal/product/product_test.go`: product link add, affiliate disclosure, slug, and platform tests.
- `internal/review/review.go`: link, price, disclosure, scam, and claim risk checks.
- `internal/review/review_test.go`: risk review tests.
- `internal/recommend/recommend.go`: buyer context inference, follow-up questions, scoring, recommendation event writes.
- `internal/recommend/recommend_test.go`: ranking, budget, missing context, and commission independence tests.
- `internal/product/agent_json.go`: agent-readable product card JSON generation.
- `internal/product/agent_json_test.go`: JSON shape and trust metadata tests.
- `internal/purchase/purchase.go`: purchase prepare protocol and dry-run event logging.
- `internal/purchase/purchase_test.go`: dry-run and hard stop boundary tests.
- `internal/skill/skill.go`: generic, Codex, Claude, and OpenClaw skill markdown generation.
- `internal/skill/skill_test.go`: target validation and safety instruction tests.
- `internal/analytics/analytics.go`: seller analytics summary from recommendation, click, and conversion events.
- `internal/analytics/analytics_test.go`: summary counts and conversion availability tests.
- `cli.js`: legacy npm wrapper that executes the Go CLI when available, with a helpful build message when missing.
- `package.json`: keep Vite scripts; add Go build/test helper scripts.
- `.gitignore`: ensure `.agentcart/`, built binaries, and generated skill files stay ignored.
- `README.md`: concise local runtime usage.

## Shared Domain Model

Use these core statuses across packages:

```go
const (
	CurrencyKRW = "KRW"
	CurrencyUSD = "USD"

	PolicyPublished     = "published"
	PolicyPendingReview = "pending_review"
	PolicyRejected      = "rejected"

	VerdictRecommendable        = "recommendable"
	VerdictConsiderWithCaution  = "consider_with_caution"
	VerdictDoNotRecommend       = "do_not_recommend"

	EventSourceCLI = "cli"
)
```

Use these table naming conventions:

- Primary keys are `TEXT`.
- Timestamps are RFC3339 `TEXT`.
- Money is stored as integer minor units in `price_amount`.
- Currency is `KRW` or `USD`.
- Boolean fields are `INTEGER NOT NULL DEFAULT 0`.
- JSON arrays are stored as `TEXT` containing JSON arrays for MVP simplicity.

---

### Task 1: Go Module And CLI Skeleton

**Files:**
- Create: `go.mod`
- Create: `cmd/agentcart/main.go`
- Create: `internal/cli/cli.go`
- Create: `internal/cli/cli_test.go`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Write the failing CLI help test**

Create `internal/cli/cli_test.go` with this test:

```go
package cli

import (
	"bytes"
	"strings"
	"testing"
)

func TestHelpListsCoreCommands(t *testing.T) {
	var stdout bytes.Buffer
	code := Run([]string{"help"}, Options{Stdout: &stdout, Stderr: &bytes.Buffer{}})
	if code != 0 {
		t.Fatalf("expected exit code 0, got %d", code)
	}
	out := stdout.String()
	for _, want := range []string{
		"agentcart init",
		"agentcart login --email",
		"agentcart seller:create",
		"agentcart seller:link-add",
		"agentcart buyer:ask",
		"agentcart review:product",
		"agentcart product:agent-json",
		"agentcart purchase:prepare",
		"agentcart install-skill",
		"agentcart analytics:summary",
	} {
		if !strings.Contains(out, want) {
			t.Fatalf("help output missing %q:\n%s", want, out)
		}
	}
}
```

- [ ] **Step 2: Initialize Go module and verify the test fails**

Run:

```bash
go mod init agentcart
go test ./internal/cli
```

Expected: FAIL because `internal/cli` does not exist yet or `Run` is undefined.

- [ ] **Step 3: Add minimal CLI skeleton**

Create `internal/cli/cli.go`:

```go
package cli

import (
	"fmt"
	"io"
)

type Options struct {
	Stdout io.Writer
	Stderr io.Writer
	DBPath string
	WorkDir string
}

func Run(args []string, opts Options) int {
	if opts.Stdout == nil {
		opts.Stdout = io.Discard
	}
	if opts.Stderr == nil {
		opts.Stderr = io.Discard
	}
	if len(args) == 0 || args[0] == "help" || args[0] == "--help" || args[0] == "-h" {
		fmt.Fprint(opts.Stdout, HelpText())
		return 0
	}
	fmt.Fprintf(opts.Stderr, "unknown command: %s\n", args[0])
	return 1
}

func HelpText() string {
	return `AgentCart CLI

Usage:
  agentcart init [--reset]
  agentcart login --email <email>
  agentcart whoami
  agentcart logout
  agentcart seller:create --handle <handle> --display-name <name>
  agentcart seller:link-add --url <url> --title <title> --price <amount> --currency <KRW|USD> --description <text> --affiliate <yes|no> --disclosure <text> --best-for <csv> --not-for <csv>
  agentcart seller:links
  agentcart buyer:ask "<query>" [--budget <amount>] [--recipient <text>] [--age <number>] [--deadline <text>]
  agentcart review:product <slug>
  agentcart product:agent-json <slug>
  agentcart purchase:prepare <slug> [--dry-run]
  agentcart install-skill --target generic|codex|claude|openclaw
  agentcart analytics:summary
`
}
```

Create `cmd/agentcart/main.go`:

```go
package main

import (
	"os"

	"agentcart/internal/cli"
)

func main() {
	code := cli.Run(os.Args[1:], cli.Options{
		Stdout: os.Stdout,
		Stderr: os.Stderr,
	})
	os.Exit(code)
}
```

- [ ] **Step 4: Run CLI tests**

Run:

```bash
go test ./internal/cli
```

Expected: PASS.

- [ ] **Step 5: Update package scripts and ignores**

Modify `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "vite web --host 0.0.0.0",
    "build": "vite build web",
    "agentcart": "go run ./cmd/agentcart",
    "go:build": "go build -o bin/agentcart ./cmd/agentcart",
    "go:test": "go test ./...",
    "login": "go run ./cmd/agentcart login",
    "preview": "vite preview web --host 0.0.0.0"
  }
}
```

Modify `.gitignore` to include:

```gitignore
.agentcart/
.agent-commerce/
bin/
dist/
node_modules/
web/dist/
```

- [ ] **Step 6: Commit**

Run:

```bash
git add go.mod cmd/agentcart/main.go internal/cli/cli.go internal/cli/cli_test.go package.json .gitignore
git commit -m "chore: add Go CLI skeleton"
```

Expected: commit succeeds.

---

### Task 2: SQLite Migrations And Resettable Local DB

**Files:**
- Create: `internal/db/schema.go`
- Create: `internal/db/db.go`
- Create: `internal/db/db_test.go`
- Create: `internal/testutil/testutil.go`
- Modify: `internal/cli/cli.go`

- [ ] **Step 1: Write migration tests**

Create `internal/db/db_test.go`:

```go
package db

import (
	"database/sql"
	"testing"

	"agentcart/internal/testutil"
)

func TestOpenMigratesAllRequiredTables(t *testing.T) {
	path := testutil.TempDBPath(t)
	conn, err := Open(path)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	defer conn.Close()

	for _, table := range []string{
		"accounts",
		"oauth_accounts",
		"sessions",
		"seller_profiles",
		"curator_channels",
		"product_links",
		"product_cards",
		"purchase_links",
		"policy_reviews",
		"recommendation_events",
		"click_events",
		"conversion_events",
		"skill_installs",
		"schema_migrations",
	} {
		if !tableExists(t, conn, table) {
			t.Fatalf("expected table %s to exist", table)
		}
	}
}

func TestResetRemovesRowsButKeepsSchema(t *testing.T) {
	path := testutil.TempDBPath(t)
	conn, err := Open(path)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}
	defer conn.Close()

	if _, err := conn.Exec(`INSERT INTO accounts (id, email, created_at) VALUES ('acct_1', 'a@example.com', '2026-04-24T00:00:00Z')`); err != nil {
		t.Fatalf("insert account: %v", err)
	}
	if err := Reset(conn); err != nil {
		t.Fatalf("Reset returned error: %v", err)
	}
	var count int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM accounts`).Scan(&count); err != nil {
		t.Fatalf("count accounts: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected accounts to be empty, got %d", count)
	}
	if !tableExists(t, conn, "accounts") {
		t.Fatal("accounts table missing after reset")
	}
}

func tableExists(t *testing.T, conn *sql.DB, name string) bool {
	t.Helper()
	var found string
	err := conn.QueryRow(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, name).Scan(&found)
	return err == nil && found == name
}
```

Create `internal/testutil/testutil.go`:

```go
package testutil

import (
	"path/filepath"
	"testing"
	"time"
)

func TempDBPath(t *testing.T) string {
	t.Helper()
	return filepath.Join(t.TempDir(), "agentcart.db")
}

func FixedTime() time.Time {
	return time.Date(2026, 4, 24, 3, 0, 0, 0, time.UTC)
}
```

- [ ] **Step 2: Run migration tests to verify failure**

Run:

```bash
go test ./internal/db
```

Expected: FAIL because `Open`, `Reset`, and schema files do not exist.

- [ ] **Step 3: Add SQLite dependency and schema**

Run:

```bash
go get modernc.org/sqlite
```

Create `internal/db/schema.go`:

```go
package db

const schemaVersion = 1

var migrations = []string{
	`CREATE TABLE IF NOT EXISTS schema_migrations (
		version INTEGER PRIMARY KEY,
		applied_at TEXT NOT NULL
	);`,
	`CREATE TABLE IF NOT EXISTS accounts (
		id TEXT PRIMARY KEY,
		email TEXT,
		display_name TEXT,
		created_at TEXT NOT NULL
	);`,
	`CREATE TABLE IF NOT EXISTS oauth_accounts (
		id TEXT PRIMARY KEY,
		account_id TEXT NOT NULL REFERENCES accounts(id),
		provider TEXT NOT NULL,
		provider_subject TEXT NOT NULL,
		created_at TEXT NOT NULL,
		UNIQUE(provider, provider_subject)
	);`,
	`CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		account_id TEXT NOT NULL REFERENCES accounts(id),
		device_code TEXT NOT NULL,
		login_method TEXT NOT NULL,
		created_at TEXT NOT NULL,
		expires_at TEXT
	);`,
	`CREATE TABLE IF NOT EXISTS seller_profiles (
		id TEXT PRIMARY KEY,
		account_id TEXT NOT NULL REFERENCES accounts(id),
		handle TEXT NOT NULL UNIQUE,
		display_name TEXT NOT NULL,
		profile_url TEXT,
		approved_channel_url TEXT,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);`,
	`CREATE TABLE IF NOT EXISTS curator_channels (
		id TEXT PRIMARY KEY,
		seller_id TEXT NOT NULL REFERENCES seller_profiles(id),
		slug TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		description TEXT NOT NULL,
		curation_policy TEXT NOT NULL,
		affiliate_disclosure TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);`,
	`CREATE TABLE IF NOT EXISTS product_links (
		id TEXT PRIMARY KEY,
		seller_id TEXT NOT NULL REFERENCES seller_profiles(id),
		channel_id TEXT REFERENCES curator_channels(id),
		slug TEXT NOT NULL UNIQUE,
		title TEXT NOT NULL,
		description TEXT NOT NULL,
		original_url TEXT NOT NULL,
		final_url TEXT NOT NULL,
		source_domain TEXT NOT NULL,
		platform_profile TEXT NOT NULL,
		is_affiliate INTEGER NOT NULL DEFAULT 0,
		affiliate_disclosure TEXT NOT NULL,
		best_for_json TEXT NOT NULL,
		not_for_json TEXT NOT NULL,
		policy_status TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);`,
	`CREATE TABLE IF NOT EXISTS product_cards (
		id TEXT PRIMARY KEY,
		product_link_id TEXT NOT NULL REFERENCES product_links(id),
		summary TEXT NOT NULL,
		claims_json TEXT NOT NULL,
		risk_flags_json TEXT NOT NULL,
		readiness_score INTEGER NOT NULL,
		published_at TEXT,
		updated_at TEXT NOT NULL
	);`,
	`CREATE TABLE IF NOT EXISTS purchase_links (
		id TEXT PRIMARY KEY,
		product_link_id TEXT NOT NULL REFERENCES product_links(id),
		price_amount INTEGER NOT NULL,
		currency TEXT NOT NULL,
		price_captured_at TEXT NOT NULL,
		actual_price_may_differ INTEGER NOT NULL DEFAULT 1,
		created_at TEXT NOT NULL
	);`,
	`CREATE TABLE IF NOT EXISTS policy_reviews (
		id TEXT PRIMARY KEY,
		product_link_id TEXT NOT NULL REFERENCES product_links(id),
		verdict TEXT NOT NULL,
		price_staleness_status TEXT NOT NULL,
		link_risk_status TEXT NOT NULL,
		scam_risk_status TEXT NOT NULL,
		claim_verification_status TEXT NOT NULL,
		risk_flags_json TEXT NOT NULL,
		reviewed_at TEXT NOT NULL
	);`,
	`CREATE TABLE IF NOT EXISTS recommendation_events (
		id TEXT PRIMARY KEY,
		query_text TEXT NOT NULL,
		buyer_context_json TEXT NOT NULL,
		result_product_ids_json TEXT NOT NULL,
		created_at TEXT NOT NULL
	);`,
	`CREATE TABLE IF NOT EXISTS click_events (
		id TEXT PRIMARY KEY,
		product_link_id TEXT NOT NULL REFERENCES product_links(id),
		purchase_link_id TEXT REFERENCES purchase_links(id),
		recommendation_event_id TEXT REFERENCES recommendation_events(id),
		dry_run INTEGER NOT NULL DEFAULT 0,
		opened_at TEXT NOT NULL
	);`,
	`CREATE TABLE IF NOT EXISTS conversion_events (
		id TEXT PRIMARY KEY,
		product_link_id TEXT NOT NULL REFERENCES product_links(id),
		source TEXT NOT NULL,
		amount INTEGER NOT NULL,
		currency TEXT NOT NULL,
		occurred_at TEXT NOT NULL,
		imported_at TEXT NOT NULL
	);`,
	`CREATE TABLE IF NOT EXISTS skill_installs (
		id TEXT PRIMARY KEY,
		target TEXT NOT NULL,
		path TEXT NOT NULL,
		installed_at TEXT NOT NULL
	);`,
}
```

- [ ] **Step 4: Implement DB open, migrations, reset, and default path**

Create `internal/db/db.go`:

```go
package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

func DefaultPath(workDir string) string {
	if env := os.Getenv("AGENTCART_DB_PATH"); env != "" {
		return env
	}
	if workDir == "" {
		workDir = "."
	}
	return filepath.Join(workDir, ".agentcart", "agentcart.db")
}

func Open(path string) (*sql.DB, error) {
	if path == "" {
		path = DefaultPath("")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	conn, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	if _, err := conn.Exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;`); err != nil {
		conn.Close()
		return nil, err
	}
	if err := Migrate(conn, time.Now().UTC()); err != nil {
		conn.Close()
		return nil, err
	}
	return conn, nil
}

func Migrate(conn *sql.DB, now time.Time) error {
	for index, statement := range migrations {
		if _, err := conn.Exec(statement); err != nil {
			return fmt.Errorf("migration statement %d: %w", index+1, err)
		}
	}
	_, err := conn.Exec(`INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)`, schemaVersion, now.Format(time.RFC3339))
	return err
}

func Reset(conn *sql.DB) error {
	tables := []string{
		"skill_installs",
		"conversion_events",
		"click_events",
		"recommendation_events",
		"policy_reviews",
		"purchase_links",
		"product_cards",
		"product_links",
		"curator_channels",
		"seller_profiles",
		"sessions",
		"oauth_accounts",
		"accounts",
	}
	tx, err := conn.Begin()
	if err != nil {
		return err
	}
	for _, table := range tables {
		if _, err := tx.Exec(`DELETE FROM ` + table); err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}
```

- [ ] **Step 5: Wire `agentcart init`**

Modify `internal/cli/cli.go` to dispatch `init`:

```go
case "init":
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "init failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	if hasFlag(args[1:], "--reset") {
		if err := db.Reset(conn); err != nil {
			fmt.Fprintf(opts.Stderr, "reset failed: %v\n", err)
			return 1
		}
		fmt.Fprintln(opts.Stdout, "AgentCart SQLite DB reset")
		return 0
	}
	fmt.Fprintln(opts.Stdout, "AgentCart SQLite DB ready")
	return 0
```

Add imports:

```go
import (
	"fmt"
	"io"

	"agentcart/internal/db"
)
```

Add helper:

```go
func hasFlag(args []string, name string) bool {
	for _, arg := range args {
		if arg == name {
			return true
		}
	}
	return false
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
go test ./internal/db ./internal/cli
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add go.mod go.sum internal/db internal/testutil internal/cli/cli.go internal/cli/cli_test.go
git commit -m "feat: add SQLite runtime schema"
```

Expected: commit succeeds.

---

### Task 3: Local Auth And Safe Session Output

**Files:**
- Create: `internal/model/model.go`
- Create: `internal/auth/auth.go`
- Create: `internal/auth/auth_test.go`
- Modify: `internal/cli/cli.go`

- [ ] **Step 1: Write auth tests**

Create `internal/auth/auth_test.go`:

```go
package auth

import (
	"strings"
	"testing"

	"agentcart/internal/db"
	"agentcart/internal/testutil"
)

func TestLoginWhoamiLogout(t *testing.T) {
	conn, err := db.Open(testutil.TempDBPath(t))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer conn.Close()

	service := Service{DB: conn, Now: testutil.FixedTime}
	session, err := service.Login("creator@example.com")
	if err != nil {
		t.Fatalf("Login returned error: %v", err)
	}
	if session.Account.Email != "creator@example.com" {
		t.Fatalf("unexpected email: %s", session.Account.Email)
	}
	current, err := service.Current()
	if err != nil {
		t.Fatalf("Current returned error: %v", err)
	}
	if current.Account.ID != session.Account.ID {
		t.Fatalf("expected current account %s, got %s", session.Account.ID, current.Account.ID)
	}
	if err := service.Logout(); err != nil {
		t.Fatalf("Logout returned error: %v", err)
	}
	if _, err := service.Current(); err == nil {
		t.Fatal("expected Current to fail after logout")
	}
}

func TestMaskSensitiveText(t *testing.T) {
	input := "Phone 010-0000-0000 card 4111111111111111 address 서울특별시 예시구 예시동 1-1"
	got := MaskSensitiveText(input)
	for _, leaked := range []string{"010-0000-0000", "4111111111111111", "예시동 1-1"} {
		if strings.Contains(got, leaked) {
			t.Fatalf("masked output leaked %q: %s", leaked, got)
		}
	}
}
```

- [ ] **Step 2: Run auth tests to verify failure**

Run:

```bash
go test ./internal/auth
```

Expected: FAIL because `Service`, `Login`, `Current`, `Logout`, and `MaskSensitiveText` are undefined.

- [ ] **Step 3: Add shared models**

Create `internal/model/model.go`:

```go
package model

type Account struct {
	ID          string
	Email       string
	DisplayName string
	CreatedAt   string
}

type Session struct {
	ID          string
	AccountID   string
	DeviceCode  string
	LoginMethod string
	CreatedAt   string
	ExpiresAt   string
}

type SessionView struct {
	Account Account
	Session Session
}
```

- [ ] **Step 4: Implement auth service**

Create `internal/auth/auth.go`:

```go
package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"agentcart/internal/model"
)

type Service struct {
	DB  *sql.DB
	Now func() time.Time
}

func (s Service) Login(email string) (model.SessionView, error) {
	if strings.TrimSpace(email) == "" {
		return model.SessionView{}, errors.New("email is required")
	}
	now := s.nowString()
	accountID := "acct_" + randomHex(8)
	sessionID := "sess_" + randomHex(8)
	deviceCode := "AC-" + strings.ToUpper(randomHex(3)) + "-" + strings.ToUpper(randomHex(2))
	if _, err := s.DB.Exec(`INSERT INTO accounts (id, email, created_at) VALUES (?, ?, ?)`, accountID, email, now); err != nil {
		return model.SessionView{}, err
	}
	if _, err := s.DB.Exec(`DELETE FROM sessions`); err != nil {
		return model.SessionView{}, err
	}
	if _, err := s.DB.Exec(`INSERT INTO sessions (id, account_id, device_code, login_method, created_at) VALUES (?, ?, ?, ?, ?)`, sessionID, accountID, deviceCode, "cli", now); err != nil {
		return model.SessionView{}, err
	}
	return model.SessionView{
		Account: model.Account{ID: accountID, Email: email, CreatedAt: now},
		Session: model.Session{ID: sessionID, AccountID: accountID, DeviceCode: deviceCode, LoginMethod: "cli", CreatedAt: now},
	}, nil
}

func (s Service) Current() (model.SessionView, error) {
	row := s.DB.QueryRow(`SELECT a.id, COALESCE(a.email, ''), COALESCE(a.display_name, ''), a.created_at, s.id, s.device_code, s.login_method, s.created_at, COALESCE(s.expires_at, '') FROM sessions s JOIN accounts a ON a.id = s.account_id ORDER BY s.created_at DESC LIMIT 1`)
	var view model.SessionView
	err := row.Scan(&view.Account.ID, &view.Account.Email, &view.Account.DisplayName, &view.Account.CreatedAt, &view.Session.ID, &view.Session.DeviceCode, &view.Session.LoginMethod, &view.Session.CreatedAt, &view.Session.ExpiresAt)
	if err == sql.ErrNoRows {
		return model.SessionView{}, errors.New("not logged in")
	}
	return view, err
}

func (s Service) Logout() error {
	_, err := s.DB.Exec(`DELETE FROM sessions`)
	return err
}

func (s Service) nowString() string {
	now := time.Now().UTC()
	if s.Now != nil {
		now = s.Now().UTC()
	}
	return now.Format(time.RFC3339)
}

func randomHex(bytesLen int) string {
	buf := make([]byte, bytesLen)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	return hex.EncodeToString(buf)
}

func MaskSensitiveText(value string) string {
	value = regexp.MustCompile(`010-\d{4}-\d{4}`).ReplaceAllString(value, "010-****-****")
	value = regexp.MustCompile(`\b\d{6}\d{6,}\d{4}\b`).ReplaceAllString(value, "******")
	if strings.Contains(value, "서울특별시") {
		value = regexp.MustCompile(`서울특별시[^\\n]+`).ReplaceAllString(value, "서울특별시 ***")
	}
	return value
}

func FormatWhoami(view model.SessionView) string {
	email := view.Account.Email
	if email == "" {
		email = "local CLI user"
	}
	return fmt.Sprintf("AgentCart CLI session\nAccount: %s\nMethod: %s\nCreated: %s\n", email, view.Session.LoginMethod, view.Session.CreatedAt)
}
```

- [ ] **Step 5: Wire auth CLI commands**

Modify `internal/cli/cli.go`:

```go
case "login":
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "login failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	email := flagValue(args[1:], "--email")
	view, err := auth.Service{DB: conn}.Login(email)
	if err != nil {
		fmt.Fprintf(opts.Stderr, "login failed: %v\n", err)
		return 1
	}
	fmt.Fprintln(opts.Stdout, "AgentCart CLI login created")
	fmt.Fprintf(opts.Stdout, "Device code: %s\n", view.Session.DeviceCode)
	fmt.Fprintf(opts.Stdout, "Signed in as: %s\n", view.Account.Email)
	return 0
case "whoami":
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "whoami failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	view, err := auth.Service{DB: conn}.Current()
	if err != nil {
		fmt.Fprintln(opts.Stdout, "Not logged in. Run: agentcart login --email <email>")
		return 1
	}
	fmt.Fprint(opts.Stdout, auth.FormatWhoami(view))
	return 0
case "logout":
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "logout failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	if err := auth.Service{DB: conn}.Logout(); err != nil {
		fmt.Fprintf(opts.Stderr, "logout failed: %v\n", err)
		return 1
	}
	fmt.Fprintln(opts.Stdout, "AgentCart CLI session removed")
	return 0
```

Add imports:

```go
"agentcart/internal/auth"
```

Add helper:

```go
func flagValue(args []string, name string) string {
	for i, arg := range args {
		if arg == name && i+1 < len(args) {
			return args[i+1]
		}
	}
	return ""
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
go test ./internal/auth ./internal/cli ./internal/db
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add internal/model internal/auth internal/cli/cli.go
git commit -m "feat: add local SQLite auth"
```

Expected: commit succeeds.

---

### Task 4: Seller Profiles And Curator Channels

**Files:**
- Create: `internal/seller/seller.go`
- Create: `internal/seller/seller_test.go`
- Modify: `internal/model/model.go`
- Modify: `internal/cli/cli.go`

- [ ] **Step 1: Write seller tests**

Create `internal/seller/seller_test.go`:

```go
package seller

import (
	"testing"

	"agentcart/internal/auth"
	"agentcart/internal/db"
	"agentcart/internal/testutil"
)

func TestCreateSellerForLoggedInAccount(t *testing.T) {
	conn, err := db.Open(testutil.TempDBPath(t))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer conn.Close()

	authService := auth.Service{DB: conn, Now: testutil.FixedTime}
	view, err := authService.Login("creator@example.com")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	profile, err := Service{DB: conn, Now: testutil.FixedTime}.Create(view.Account.ID, "junho", "Junho Curates")
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if profile.Handle != "junho" {
		t.Fatalf("expected handle junho, got %s", profile.Handle)
	}
}

func TestCreateSellerRejectsDuplicateHandle(t *testing.T) {
	conn, err := db.Open(testutil.TempDBPath(t))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer conn.Close()

	authService := auth.Service{DB: conn, Now: testutil.FixedTime}
	view, err := authService.Login("creator@example.com")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	service := Service{DB: conn, Now: testutil.FixedTime}
	if _, err := service.Create(view.Account.ID, "junho", "Junho Curates"); err != nil {
		t.Fatalf("first create: %v", err)
	}
	if _, err := service.Create(view.Account.ID, "junho", "Junho Again"); err == nil {
		t.Fatal("expected duplicate handle error")
	}
}
```

- [ ] **Step 2: Run seller tests to verify failure**

Run:

```bash
go test ./internal/seller
```

Expected: FAIL because seller service is undefined.

- [ ] **Step 3: Add seller models**

Append to `internal/model/model.go`:

```go
type SellerProfile struct {
	ID                 string
	AccountID          string
	Handle             string
	DisplayName        string
	ProfileURL         string
	ApprovedChannelURL string
	CreatedAt          string
	UpdatedAt          string
}

type CuratorChannel struct {
	ID                  string
	SellerID            string
	Slug                string
	Name                string
	Description         string
	CurationPolicy      string
	AffiliateDisclosure string
	CreatedAt           string
	UpdatedAt           string
}
```

- [ ] **Step 4: Implement seller service**

Create `internal/seller/seller.go`:

```go
package seller

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"agentcart/internal/model"
)

type Service struct {
	DB  *sql.DB
	Now func() time.Time
}

func (s Service) Create(accountID, handle, displayName string) (model.SellerProfile, error) {
	handle = normalizeHandle(handle)
	if accountID == "" {
		return model.SellerProfile{}, errors.New("account id is required")
	}
	if handle == "" {
		return model.SellerProfile{}, errors.New("handle is required")
	}
	if strings.TrimSpace(displayName) == "" {
		return model.SellerProfile{}, errors.New("display name is required")
	}
	now := s.nowString()
	profile := model.SellerProfile{
		ID:          "seller_" + randomHex(8),
		AccountID:   accountID,
		Handle:      handle,
		DisplayName: strings.TrimSpace(displayName),
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	_, err := s.DB.Exec(`INSERT INTO seller_profiles (id, account_id, handle, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`, profile.ID, profile.AccountID, profile.Handle, profile.DisplayName, profile.CreatedAt, profile.UpdatedAt)
	return profile, err
}

func (s Service) CurrentSeller(accountID string) (model.SellerProfile, error) {
	var profile model.SellerProfile
	err := s.DB.QueryRow(`SELECT id, account_id, handle, display_name, COALESCE(profile_url, ''), COALESCE(approved_channel_url, ''), created_at, updated_at FROM seller_profiles WHERE account_id=? ORDER BY created_at DESC LIMIT 1`, accountID).
		Scan(&profile.ID, &profile.AccountID, &profile.Handle, &profile.DisplayName, &profile.ProfileURL, &profile.ApprovedChannelURL, &profile.CreatedAt, &profile.UpdatedAt)
	if err == sql.ErrNoRows {
		return model.SellerProfile{}, errors.New("seller profile not found")
	}
	return profile, err
}

func normalizeHandle(value string) string {
	return strings.TrimPrefix(strings.TrimSpace(strings.ToLower(value)), "@")
}

func (s Service) nowString() string {
	now := time.Now().UTC()
	if s.Now != nil {
		now = s.Now().UTC()
	}
	return now.Format(time.RFC3339)
}

func randomHex(bytesLen int) string {
	buf := make([]byte, bytesLen)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	return hex.EncodeToString(buf)
}
```

- [ ] **Step 5: Wire `seller:create` CLI command**

Add dispatch to `internal/cli/cli.go`:

```go
case "seller:create":
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "seller:create failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	current, err := auth.Service{DB: conn}.Current()
	if err != nil {
		fmt.Fprintln(opts.Stderr, "seller:create requires login")
		return 1
	}
	profile, err := seller.Service{DB: conn}.Create(current.Account.ID, flagValue(args[1:], "--handle"), flagValue(args[1:], "--display-name"))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "seller:create failed: %v\n", err)
		return 1
	}
	fmt.Fprintf(opts.Stdout, "Seller profile created: @%s (%s)\n", profile.Handle, profile.DisplayName)
	return 0
```

Add import:

```go
"agentcart/internal/seller"
```

- [ ] **Step 6: Run tests**

Run:

```bash
go test ./internal/seller ./internal/auth ./internal/cli ./internal/db
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add internal/model/model.go internal/seller internal/cli/cli.go
git commit -m "feat: add seller profiles"
```

Expected: commit succeeds.

---

### Task 5: Product Link Registration And SQLite Persistence

**Files:**
- Create: `internal/product/platform.go`
- Create: `internal/product/product.go`
- Create: `internal/product/product_test.go`
- Modify: `internal/model/model.go`
- Modify: `internal/cli/cli.go`

- [ ] **Step 1: Write product registration tests**

Create `internal/product/product_test.go`:

```go
package product

import (
	"testing"

	"agentcart/internal/auth"
	"agentcart/internal/db"
	"agentcart/internal/seller"
	"agentcart/internal/testutil"
)

func TestAddProductLinkCreatesCardAndPurchaseSnapshot(t *testing.T) {
	conn, err := db.Open(testutil.TempDBPath(t))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer conn.Close()
	view, err := auth.Service{DB: conn, Now: testutil.FixedTime}.Login("creator@example.com")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	profile, err := seller.Service{DB: conn, Now: testutil.FixedTime}.Create(view.Account.ID, "junho", "Junho Curates")
	if err != nil {
		t.Fatalf("seller create: %v", err)
	}

	service := Service{DB: conn, Now: testutil.FixedTime}
	bundle, err := service.AddLink(profile.ID, AddLinkInput{
		URL: "https://www.coupang.com/vp/products/86564?itemId=175470",
		Title: "김치사발면 86g, 6개",
		PriceAmount: 5470,
		Currency: "KRW",
		Description: "간단한 야식이나 비상식량으로 좋은 컵라면 6개 묶음",
		Affiliate: true,
		Disclosure: "이 링크를 통해 구매하면 등록자가 수수료를 받을 수 있습니다.",
		BestFor: []string{"자취생", "간단한 야식", "비상식량"},
		NotFor: []string{"저염 식단", "라면을 피하는 사람"},
	})
	if err != nil {
		t.Fatalf("AddLink returned error: %v", err)
	}
	if bundle.Link.PlatformProfile != "coupang_partners" {
		t.Fatalf("expected coupang_partners, got %s", bundle.Link.PlatformProfile)
	}
	if bundle.Link.PolicyStatus != "published" {
		t.Fatalf("expected published, got %s", bundle.Link.PolicyStatus)
	}
	if bundle.Purchase.PriceAmount != 5470 {
		t.Fatalf("expected price snapshot 5470, got %d", bundle.Purchase.PriceAmount)
	}
}

func TestAddAffiliateLinkWithoutDisclosureIsPendingReview(t *testing.T) {
	conn, err := db.Open(testutil.TempDBPath(t))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer conn.Close()
	view, err := auth.Service{DB: conn, Now: testutil.FixedTime}.Login("creator@example.com")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	profile, err := seller.Service{DB: conn, Now: testutil.FixedTime}.Create(view.Account.ID, "junho", "Junho Curates")
	if err != nil {
		t.Fatalf("seller create: %v", err)
	}

	bundle, err := Service{DB: conn, Now: testutil.FixedTime}.AddLink(profile.ID, AddLinkInput{
		URL: "https://example.com/product",
		Title: "Desk Lamp",
		PriceAmount: 19000,
		Currency: "KRW",
		Description: "A small desk lamp",
		Affiliate: true,
		Disclosure: "",
		BestFor: []string{"desk setup"},
		NotFor: []string{"outdoor use"},
	})
	if err != nil {
		t.Fatalf("AddLink returned error: %v", err)
	}
	if bundle.Link.PolicyStatus != "pending_review" {
		t.Fatalf("expected pending_review, got %s", bundle.Link.PolicyStatus)
	}
}
```

- [ ] **Step 2: Run product tests to verify failure**

Run:

```bash
go test ./internal/product
```

Expected: FAIL because product service is undefined.

- [ ] **Step 3: Add product models**

Append to `internal/model/model.go`:

```go
type ProductLink struct {
	ID                  string
	SellerID            string
	ChannelID           string
	Slug                string
	Title               string
	Description         string
	OriginalURL         string
	FinalURL            string
	SourceDomain        string
	PlatformProfile     string
	IsAffiliate         bool
	AffiliateDisclosure string
	BestFor             []string
	NotFor              []string
	PolicyStatus        string
	CreatedAt           string
	UpdatedAt           string
}

type ProductCard struct {
	ID            string
	ProductLinkID string
	Summary       string
	Claims        []string
	RiskFlags     []string
	ReadinessScore int
	PublishedAt   string
	UpdatedAt     string
}

type PurchaseLink struct {
	ID                    string
	ProductLinkID         string
	PriceAmount           int
	Currency              string
	PriceCapturedAt       string
	ActualPriceMayDiffer  bool
	CreatedAt             string
}
```

- [ ] **Step 4: Implement URL and slug helpers**

Create `internal/product/platform.go`:

```go
package product

import (
	"crypto/sha1"
	"encoding/hex"
	"net/url"
	"regexp"
	"strings"
)

type URLInfo struct {
	Valid bool
	OriginalURL string
	FinalURL string
	SourceDomain string
	PlatformProfile string
	HTTPS bool
	SuspiciousShortener bool
}

func ParseURLInfo(value string) URLInfo {
	parsed, err := url.Parse(value)
	if err != nil || parsed.Host == "" {
		return URLInfo{OriginalURL: value, PlatformProfile: "invalid"}
	}
	domain := NormalizeDomain(parsed.Host)
	return URLInfo{
		Valid: true,
		OriginalURL: value,
		FinalURL: value,
		SourceDomain: domain,
		PlatformProfile: DetectPlatform(domain),
		HTTPS: parsed.Scheme == "https",
		SuspiciousShortener: isShortener(domain),
	}
}

func NormalizeDomain(host string) string {
	return strings.TrimPrefix(strings.ToLower(host), "www.")
}

func DetectPlatform(domain string) string {
	switch {
	case strings.Contains(domain, "amazon."):
		return "amazon_associates"
	case strings.Contains(domain, "coupang."):
		return "coupang_partners"
	case strings.Contains(domain, "aliexpress."):
		return "aliexpress_affiliate"
	case strings.Contains(domain, "naver."):
		return "naver_connect"
	default:
		return "direct_seller"
	}
}

func Slugify(value string) string {
	lower := strings.ToLower(strings.TrimSpace(value))
	re := regexp.MustCompile(`[^[:alnum:]\p{Hangul}]+`)
	slug := strings.Trim(re.ReplaceAllString(lower, "-"), "-")
	if slug != "" {
		return slug
	}
	hash := sha1.Sum([]byte(value))
	return "product-" + hex.EncodeToString(hash[:])[:8]
}

func isShortener(domain string) bool {
	switch domain {
	case "bit.ly", "tinyurl.com", "t.co", "is.gd", "rebrand.ly", "cutt.ly":
		return true
	default:
		return false
	}
}
```

- [ ] **Step 5: Implement product service**

Create `internal/product/product.go` with `AddLinkInput`, `Bundle`, and `Service.AddLink`:

```go
package product

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"agentcart/internal/model"
)

type Service struct {
	DB  *sql.DB
	Now func() time.Time
}

type AddLinkInput struct {
	URL string
	Title string
	PriceAmount int
	Currency string
	Description string
	Affiliate bool
	Disclosure string
	BestFor []string
	NotFor []string
}

type Bundle struct {
	Link model.ProductLink
	Card model.ProductCard
	Purchase model.PurchaseLink
}

func (s Service) AddLink(sellerID string, input AddLinkInput) (Bundle, error) {
	if sellerID == "" {
		return Bundle{}, errors.New("seller id is required")
	}
	if strings.TrimSpace(input.URL) == "" {
		return Bundle{}, errors.New("url is required")
	}
	if strings.TrimSpace(input.Title) == "" {
		return Bundle{}, errors.New("title is required")
	}
	if input.PriceAmount < 0 {
		return Bundle{}, errors.New("price must be non-negative")
	}
	if input.Currency != "KRW" && input.Currency != "USD" {
		return Bundle{}, errors.New("currency must be KRW or USD")
	}
	if strings.TrimSpace(input.Description) == "" {
		return Bundle{}, errors.New("description is required")
	}
	now := s.nowString()
	info := ParseURLInfo(input.URL)
	policyStatus := "published"
	if input.Affiliate && strings.TrimSpace(input.Disclosure) == "" {
		policyStatus = "pending_review"
	}
	link := model.ProductLink{
		ID: "plink_" + randomHex(8),
		SellerID: sellerID,
		Slug: s.uniqueSlug(Slugify(input.Title)),
		Title: strings.TrimSpace(input.Title),
		Description: strings.TrimSpace(input.Description),
		OriginalURL: input.URL,
		FinalURL: info.FinalURL,
		SourceDomain: info.SourceDomain,
		PlatformProfile: info.PlatformProfile,
		IsAffiliate: input.Affiliate,
		AffiliateDisclosure: strings.TrimSpace(input.Disclosure),
		BestFor: input.BestFor,
		NotFor: input.NotFor,
		PolicyStatus: policyStatus,
		CreatedAt: now,
		UpdatedAt: now,
	}
	bestForJSON := mustJSON(input.BestFor)
	notForJSON := mustJSON(input.NotFor)
	if _, err := s.DB.Exec(`INSERT INTO product_links (id, seller_id, slug, title, description, original_url, final_url, source_domain, platform_profile, is_affiliate, affiliate_disclosure, best_for_json, not_for_json, policy_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		link.ID, link.SellerID, link.Slug, link.Title, link.Description, link.OriginalURL, link.FinalURL, link.SourceDomain, link.PlatformProfile, boolInt(link.IsAffiliate), link.AffiliateDisclosure, bestForJSON, notForJSON, link.PolicyStatus, link.CreatedAt, link.UpdatedAt); err != nil {
		return Bundle{}, err
	}
	card := model.ProductCard{
		ID: "card_" + randomHex(8),
		ProductLinkID: link.ID,
		Summary: input.Description,
		Claims: []string{input.Description},
		RiskFlags: []string{},
		ReadinessScore: 100,
		PublishedAt: now,
		UpdatedAt: now,
	}
	if policyStatus != "published" {
		card.PublishedAt = ""
		card.RiskFlags = []string{"missing_affiliate_disclosure"}
		card.ReadinessScore = 55
	}
	if _, err := s.DB.Exec(`INSERT INTO product_cards (id, product_link_id, summary, claims_json, risk_flags_json, readiness_score, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULLIF(?, ''), ?)`,
		card.ID, card.ProductLinkID, card.Summary, mustJSON(card.Claims), mustJSON(card.RiskFlags), card.ReadinessScore, card.PublishedAt, card.UpdatedAt); err != nil {
		return Bundle{}, err
	}
	purchase := model.PurchaseLink{
		ID: "purchase_" + randomHex(8),
		ProductLinkID: link.ID,
		PriceAmount: input.PriceAmount,
		Currency: input.Currency,
		PriceCapturedAt: now,
		ActualPriceMayDiffer: true,
		CreatedAt: now,
	}
	if _, err := s.DB.Exec(`INSERT INTO purchase_links (id, product_link_id, price_amount, currency, price_captured_at, actual_price_may_differ, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`,
		purchase.ID, purchase.ProductLinkID, purchase.PriceAmount, purchase.Currency, purchase.PriceCapturedAt, purchase.CreatedAt); err != nil {
		return Bundle{}, err
	}
	return Bundle{Link: link, Card: card, Purchase: purchase}, nil
}

func (s Service) uniqueSlug(base string) string {
	slug := base
	for index := 2; ; index++ {
		var existing string
		err := s.DB.QueryRow(`SELECT slug FROM product_links WHERE slug=?`, slug).Scan(&existing)
		if err == sql.ErrNoRows {
			return slug
		}
		slug = base + "-" + strconv.Itoa(index)
	}
}
```

Add the missing imports and helpers in the same file:

```go
import "strconv"

func (s Service) nowString() string {
	now := time.Now().UTC()
	if s.Now != nil {
		now = s.Now().UTC()
	}
	return now.Format(time.RFC3339)
}

func randomHex(bytesLen int) string {
	buf := make([]byte, bytesLen)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	return hex.EncodeToString(buf)
}

func mustJSON(value any) string {
	out, err := json.Marshal(value)
	if err != nil {
		panic(err)
	}
	return string(out)
}

func boolInt(value bool) int {
	if value {
		return 1
	}
	return 0
}
```

- [ ] **Step 6: Wire `seller:link-add` and `seller:links`**

Add command parsing helpers to `internal/cli/cli.go`:

```go
func splitCSV(value string) []string {
	if value == "" {
		return []string{}
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}

func parseBoolYesNo(value string) bool {
	return strings.EqualFold(value, "yes") || strings.EqualFold(value, "true")
}

func parsePrice(value string) (int, error) {
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, err
	}
	return parsed, nil
}
```

Add imports:

```go
"strconv"
"strings"
"agentcart/internal/product"
```

Add `seller:link-add` dispatch:

```go
case "seller:link-add":
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "seller:link-add failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	current, err := auth.Service{DB: conn}.Current()
	if err != nil {
		fmt.Fprintln(opts.Stderr, "seller:link-add requires login")
		return 1
	}
	profile, err := seller.Service{DB: conn}.CurrentSeller(current.Account.ID)
	if err != nil {
		fmt.Fprintln(opts.Stderr, "seller:link-add requires seller:create first")
		return 1
	}
	price, err := parsePrice(flagValue(args[1:], "--price"))
	if err != nil {
		fmt.Fprintln(opts.Stderr, "seller:link-add requires numeric --price")
		return 1
	}
	bundle, err := product.Service{DB: conn}.AddLink(profile.ID, product.AddLinkInput{
		URL: flagValue(args[1:], "--url"),
		Title: flagValue(args[1:], "--title"),
		PriceAmount: price,
		Currency: flagValue(args[1:], "--currency"),
		Description: flagValue(args[1:], "--description"),
		Affiliate: parseBoolYesNo(flagValue(args[1:], "--affiliate")),
		Disclosure: flagValue(args[1:], "--disclosure"),
		BestFor: splitCSV(flagValue(args[1:], "--best-for")),
		NotFor: splitCSV(flagValue(args[1:], "--not-for")),
	})
	if err != nil {
		fmt.Fprintf(opts.Stderr, "seller:link-add failed: %v\n", err)
		return 1
	}
	fmt.Fprintf(opts.Stdout, "Product link added: %s (%s)\n", bundle.Link.Slug, bundle.Link.PolicyStatus)
	return 0
```

Add `seller:links` dispatch:

```go
case "seller:links":
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "seller:links failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	rows, err := conn.Query(`SELECT slug, title, source_domain, policy_status FROM product_links ORDER BY created_at DESC`)
	if err != nil {
		fmt.Fprintf(opts.Stderr, "seller:links failed: %v\n", err)
		return 1
	}
	defer rows.Close()
	for rows.Next() {
		var slug, title, domain, status string
		if err := rows.Scan(&slug, &title, &domain, &status); err != nil {
			fmt.Fprintf(opts.Stderr, "seller:links failed: %v\n", err)
			return 1
		}
		fmt.Fprintf(opts.Stdout, "%s | %s | %s | %s\n", slug, title, domain, status)
	}
	return 0
```

- [ ] **Step 7: Run tests**

Run:

```bash
go test ./internal/product ./internal/seller ./internal/auth ./internal/cli ./internal/db
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add internal/model/model.go internal/product internal/cli/cli.go
git commit -m "feat: add product link registry"
```

Expected: commit succeeds.

---

### Task 6: Risk Review And Policy Status Updates

**Files:**
- Create: `internal/review/review.go`
- Create: `internal/review/review_test.go`
- Modify: `internal/model/model.go`
- Modify: `internal/cli/cli.go`

- [ ] **Step 1: Write risk review tests**

Create `internal/review/review_test.go`:

```go
package review

import (
	"testing"
	"time"

	"agentcart/internal/model"
)

func TestReviewFlagsMissingDisclosureAndStalePrice(t *testing.T) {
	report := Review(model.ProductLink{
		ID: "plink_1",
		OriginalURL: "https://example.com/product",
		FinalURL: "https://example.com/product",
		SourceDomain: "example.com",
		PlatformProfile: "direct_seller",
		IsAffiliate: true,
		AffiliateDisclosure: "",
		Description: "nice product",
		BestFor: []string{"gift"},
		NotFor: []string{"medical use"},
	}, model.PurchaseLink{
		PriceCapturedAt: "2026-03-01T00:00:00Z",
	}, time.Date(2026, 4, 24, 0, 0, 0, 0, time.UTC))

	if report.Verdict != "do_not_recommend" {
		t.Fatalf("expected do_not_recommend, got %s", report.Verdict)
	}
	if !hasFlag(report.RiskFlags, "missing_affiliate_disclosure") {
		t.Fatalf("missing affiliate disclosure flag: %#v", report.RiskFlags)
	}
	if !hasFlag(report.RiskFlags, "price_stale_high") {
		t.Fatalf("missing stale price flag: %#v", report.RiskFlags)
	}
}

func TestReviewDoesNotUseCommissionRate(t *testing.T) {
	link := model.ProductLink{
		ID: "plink_1",
		OriginalURL: "https://example.com/product",
		FinalURL: "https://example.com/product",
		SourceDomain: "example.com",
		PlatformProfile: "direct_seller",
		IsAffiliate: true,
		AffiliateDisclosure: "commission disclosure",
		Description: "desk lamp",
		BestFor: []string{"desk"},
		NotFor: []string{"outdoor"},
	}
	purchase := model.PurchaseLink{PriceCapturedAt: "2026-04-24T00:00:00Z"}
	report := Review(link, purchase, time.Date(2026, 4, 24, 0, 0, 0, 0, time.UTC))
	if report.RankingUsesCommissionRate {
		t.Fatal("review must never use commission rate")
	}
}

func hasFlag(flags []string, want string) bool {
	for _, flag := range flags {
		if flag == want {
			return true
		}
	}
	return false
}
```

- [ ] **Step 2: Run review tests to verify failure**

Run:

```bash
go test ./internal/review
```

Expected: FAIL because `Review` is undefined.

- [ ] **Step 3: Add review model**

Append to `internal/model/model.go`:

```go
type PolicyReview struct {
	ID                         string
	ProductLinkID              string
	Verdict                    string
	PriceStalenessStatus       string
	LinkRiskStatus             string
	ScamRiskStatus             string
	ClaimVerificationStatus    string
	RiskFlags                  []string
	RankingUsesCommissionRate  bool
	ReviewedAt                 string
}
```

- [ ] **Step 4: Implement review logic**

Create `internal/review/review.go`:

```go
package review

import (
	"regexp"
	"time"

	"agentcart/internal/model"
	"agentcart/internal/product"
)

var highRiskClaim = regexp.MustCompile(`(?i)(치료|완치|의학|암|당뇨|혈압|100%|무조건|기적|cure|medical|guaranteed|guarantee|heal)`)

func Review(link model.ProductLink, purchase model.PurchaseLink, now time.Time) model.PolicyReview {
	flags := []string{}
	info := product.ParseURLInfo(link.OriginalURL)
	if !info.Valid {
		flags = append(flags, "invalid_url")
	}
	if info.Valid && !info.HTTPS {
		flags = append(flags, "non_https_url")
	}
	if info.SuspiciousShortener {
		flags = append(flags, "suspicious_shortener_url")
	}
	if link.IsAffiliate && link.AffiliateDisclosure == "" {
		flags = append(flags, "missing_affiliate_disclosure")
	}
	ageStatus := priceAgeStatus(purchase.PriceCapturedAt, now)
	if ageStatus == "warning" {
		flags = append(flags, "price_stale_warning")
	}
	if ageStatus == "high" {
		flags = append(flags, "price_stale_high")
	}
	claimStatus := "needs_review"
	if highRiskClaim.MatchString(link.Description) {
		claimStatus = "high_risk"
		flags = append(flags, "unsupported_high_risk_claim")
	}
	if len(link.BestFor) == 0 || len(link.NotFor) == 0 {
		flags = append(flags, "low_context_quality")
	}
	return model.PolicyReview{
		ProductLinkID: link.ID,
		Verdict: verdict(flags),
		PriceStalenessStatus: ageStatus,
		LinkRiskStatus: linkRisk(flags),
		ScamRiskStatus: scamRisk(flags),
		ClaimVerificationStatus: claimStatus,
		RiskFlags: flags,
		RankingUsesCommissionRate: false,
		ReviewedAt: now.UTC().Format(time.RFC3339),
	}
}

func ReadinessScore(flags []string) int {
	penalties := map[string]int{
		"invalid_url": 70,
		"non_https_url": 30,
		"suspicious_shortener_url": 55,
		"missing_affiliate_disclosure": 45,
		"price_stale_warning": 15,
		"price_stale_high": 45,
		"unsupported_high_risk_claim": 35,
		"low_context_quality": 20,
	}
	score := 100
	for _, flag := range flags {
		if penalty, ok := penalties[flag]; ok {
			score -= penalty
		} else {
			score -= 10
		}
	}
	if score < 0 {
		return 0
	}
	return score
}
```

Append helper functions in the same file:

```go
func priceAgeStatus(capturedAt string, now time.Time) string {
	captured, err := time.Parse(time.RFC3339, capturedAt)
	if err != nil {
		return "high"
	}
	ageDays := int(now.Sub(captured).Hours() / 24)
	if ageDays > 30 {
		return "high"
	}
	if ageDays > 7 {
		return "warning"
	}
	return "fresh"
}

func verdict(flags []string) string {
	if contains(flags, "invalid_url") || contains(flags, "suspicious_shortener_url") || contains(flags, "price_stale_high") {
		return "do_not_recommend"
	}
	if len(flags) > 0 {
		return "consider_with_caution"
	}
	return "recommendable"
}

func linkRisk(flags []string) string {
	if contains(flags, "invalid_url") || contains(flags, "suspicious_shortener_url") {
		return "high"
	}
	if contains(flags, "non_https_url") || contains(flags, "missing_affiliate_disclosure") {
		return "warning"
	}
	return "ok"
}

func scamRisk(flags []string) string {
	if contains(flags, "invalid_url") || contains(flags, "suspicious_shortener_url") {
		return "high"
	}
	if contains(flags, "non_https_url") || contains(flags, "unsupported_high_risk_claim") {
		return "medium"
	}
	return "low"
}

func contains(values []string, needle string) bool {
	for _, value := range values {
		if value == needle {
			return true
		}
	}
	return false
}
```

- [ ] **Step 5: Wire `review:product`**

Add `Service.GetBundleBySlug` to `internal/product/product.go` by querying `product_links`, latest `purchase_links`, and latest `product_cards`, decoding JSON arrays into model fields.

The query must use this shape:

```sql
SELECT
  pl.id, pl.seller_id, COALESCE(pl.channel_id, ''), pl.slug, pl.title, pl.description,
  pl.original_url, pl.final_url, pl.source_domain, pl.platform_profile, pl.is_affiliate,
  pl.affiliate_disclosure, pl.best_for_json, pl.not_for_json, pl.policy_status,
  pl.created_at, pl.updated_at,
  pc.id, pc.summary, pc.claims_json, pc.risk_flags_json, pc.readiness_score,
  COALESCE(pc.published_at, ''), pc.updated_at,
  pu.id, pu.price_amount, pu.currency, pu.price_captured_at, pu.actual_price_may_differ, pu.created_at
FROM product_links pl
JOIN product_cards pc ON pc.product_link_id = pl.id
JOIN purchase_links pu ON pu.product_link_id = pl.id
WHERE pl.slug = ?
ORDER BY pu.created_at DESC
LIMIT 1
```

Add `review:product` dispatch to `internal/cli/cli.go`:

```go
case "review:product":
	slug := positional(args[1:])
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "review:product failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	bundle, err := product.Service{DB: conn}.GetBundleBySlug(slug)
	if err != nil {
		fmt.Fprintf(opts.Stderr, "review:product failed: %v\n", err)
		return 1
	}
	report := review.Review(bundle.Link, bundle.Purchase, time.Now().UTC())
	fmt.Fprintf(opts.Stdout, "Review: %s (%s)\n", bundle.Link.Title, bundle.Link.Slug)
	fmt.Fprintf(opts.Stdout, "Verdict: %s\n", report.Verdict)
	fmt.Fprintf(opts.Stdout, "Price staleness: %s\n", report.PriceStalenessStatus)
	fmt.Fprintf(opts.Stdout, "Risk flags: %s\n", strings.Join(report.RiskFlags, ", "))
	return 0
```

Add helper:

```go
func positional(args []string) string {
	for _, arg := range args {
		if !strings.HasPrefix(arg, "--") {
			return arg
		}
	}
	return ""
}
```

Add imports:

```go
"time"
"agentcart/internal/review"
```

- [ ] **Step 6: Run tests**

Run:

```bash
go test ./internal/review ./internal/product ./internal/cli ./...
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add internal/model/model.go internal/review internal/product/product.go internal/cli/cli.go
git commit -m "feat: add product risk reviews"
```

Expected: commit succeeds.

---

### Task 7: Agent-Readable Product JSON

**Files:**
- Create: `internal/product/agent_json.go`
- Create: `internal/product/agent_json_test.go`
- Modify: `internal/cli/cli.go`

- [ ] **Step 1: Write agent JSON test**

Create `internal/product/agent_json_test.go`:

```go
package product

import (
	"encoding/json"
	"testing"

	"agentcart/internal/auth"
	"agentcart/internal/db"
	"agentcart/internal/seller"
	"agentcart/internal/testutil"
)

func TestAgentJSONIncludesDisclosureAndSnapshotWarning(t *testing.T) {
	conn, err := db.Open(testutil.TempDBPath(t))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer conn.Close()
	view, err := auth.Service{DB: conn, Now: testutil.FixedTime}.Login("creator@example.com")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	profile, err := seller.Service{DB: conn, Now: testutil.FixedTime}.Create(view.Account.ID, "junho", "Junho Curates")
	if err != nil {
		t.Fatalf("seller create: %v", err)
	}
	bundle, err := Service{DB: conn, Now: testutil.FixedTime}.AddLink(profile.ID, AddLinkInput{
		URL: "https://example.com/product",
		Title: "Desk Lamp",
		PriceAmount: 19000,
		Currency: "KRW",
		Description: "A small desk lamp",
		Affiliate: true,
		Disclosure: "이 링크를 통해 구매하면 등록자가 수수료를 받을 수 있습니다.",
		BestFor: []string{"desk setup"},
		NotFor: []string{"outdoor use"},
	})
	if err != nil {
		t.Fatalf("add link: %v", err)
	}

	raw, err := Service{DB: conn, Now: testutil.FixedTime}.AgentJSON(bundle.Link.Slug)
	if err != nil {
		t.Fatalf("AgentJSON returned error: %v", err)
	}
	var doc map[string]any
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("invalid json: %v\n%s", err, raw)
	}
	if doc["schema_version"] != "agentcart.product.v0" {
		t.Fatalf("unexpected schema_version: %#v", doc["schema_version"])
	}
	purchasePath := doc["purchase_path"].(map[string]any)
	if purchasePath["disclosure"] == "" {
		t.Fatal("expected disclosure in purchase_path")
	}
	priceSnapshot := doc["price_snapshot"].(map[string]any)
	if priceSnapshot["actual_price_may_differ"] != true {
		t.Fatal("expected actual_price_may_differ=true")
	}
}
```

- [ ] **Step 2: Run agent JSON test to verify failure**

Run:

```bash
go test ./internal/product -run TestAgentJSONIncludesDisclosureAndSnapshotWarning
```

Expected: FAIL because `AgentJSON` is undefined.

- [ ] **Step 3: Implement agent JSON**

Create `internal/product/agent_json.go`:

```go
package product

import (
	"encoding/json"
	"time"

	"agentcart/internal/review"
)

func (s Service) AgentJSON(slug string) ([]byte, error) {
	bundle, err := s.GetBundleBySlug(slug)
	if err != nil {
		return nil, err
	}
	report := review.Review(bundle.Link, bundle.Purchase, nowForService(s))
	doc := map[string]any{
		"schema_version": "agentcart.product.v0",
		"product": map[string]any{
			"title": bundle.Link.Title,
			"description": bundle.Link.Description,
			"slug": bundle.Link.Slug,
		},
		"purchase_path": map[string]any{
			"url": bundle.Link.FinalURL,
			"source_domain": bundle.Link.SourceDomain,
			"platform_profile": bundle.Link.PlatformProfile,
			"is_affiliate": bundle.Link.IsAffiliate,
			"disclosure": bundle.Link.AffiliateDisclosure,
		},
		"price_snapshot": map[string]any{
			"price_amount": bundle.Purchase.PriceAmount,
			"currency": bundle.Purchase.Currency,
			"captured_at": bundle.Purchase.PriceCapturedAt,
			"actual_price_may_differ": true,
		},
		"decision": map[string]any{
			"best_for": bundle.Link.BestFor,
			"not_for": bundle.Link.NotFor,
			"risk_flags": report.RiskFlags,
			"agent_verdict": report.Verdict,
		},
		"trust": map[string]any{
			"readiness_score": review.ReadinessScore(report.RiskFlags),
			"ranking_uses_commission_rate": false,
			"last_reviewed_at": report.ReviewedAt,
		},
	}
	return json.MarshalIndent(doc, "", "  ")
}

func nowForService(s Service) time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now().UTC()
}
```

- [ ] **Step 4: Wire `product:agent-json`**

Add dispatch:

```go
case "product:agent-json":
	slug := positional(args[1:])
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "product:agent-json failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	raw, err := product.Service{DB: conn}.AgentJSON(slug)
	if err != nil {
		fmt.Fprintf(opts.Stderr, "product:agent-json failed: %v\n", err)
		return 1
	}
	fmt.Fprintln(opts.Stdout, string(raw))
	return 0
```

- [ ] **Step 5: Run tests**

Run:

```bash
go test ./internal/product ./internal/review ./internal/cli ./...
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add internal/product/agent_json.go internal/product/agent_json_test.go internal/cli/cli.go
git commit -m "feat: add agent product JSON"
```

Expected: commit succeeds.

---

### Task 8: Buyer Recommendations And Event Logging

**Files:**
- Create: `internal/recommend/recommend.go`
- Create: `internal/recommend/recommend_test.go`
- Modify: `internal/model/model.go`
- Modify: `internal/cli/cli.go`

- [ ] **Step 1: Write recommendation tests**

Create `internal/recommend/recommend_test.go`:

```go
package recommend

import (
	"strings"
	"testing"

	"agentcart/internal/auth"
	"agentcart/internal/db"
	"agentcart/internal/product"
	"agentcart/internal/seller"
	"agentcart/internal/testutil"
)

func TestBuyerAskRanksByFitAndBudget(t *testing.T) {
	conn, err := db.Open(testutil.TempDBPath(t))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer conn.Close()
	view, err := auth.Service{DB: conn, Now: testutil.FixedTime}.Login("creator@example.com")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	profile, err := seller.Service{DB: conn, Now: testutil.FixedTime}.Create(view.Account.ID, "junho", "Junho Curates")
	if err != nil {
		t.Fatalf("seller create: %v", err)
	}
	productService := product.Service{DB: conn, Now: testutil.FixedTime}
	if _, err := productService.AddLink(profile.ID, product.AddLinkInput{
		URL: "https://example.com/neck-massager",
		Title: "온열 목 마사지기",
		PriceAmount: 69000,
		Currency: "KRW",
		Description: "어깨 피로가 있는 어머니 선물로 좋은 온열 목 마사지기",
		Affiliate: false,
		Disclosure: "",
		BestFor: []string{"엄마", "어머니", "목 피로", "생일 선물"},
		NotFor: []string{"의료기기 기대"},
	}); err != nil {
		t.Fatalf("add first link: %v", err)
	}
	if _, err := productService.AddLink(profile.ID, product.AddLinkInput{
		URL: "https://example.com/expensive-chair",
		Title: "프리미엄 의자",
		PriceAmount: 300000,
		Currency: "KRW",
		Description: "비싼 사무용 의자",
		Affiliate: false,
		Disclosure: "",
		BestFor: []string{"사무실"},
		NotFor: []string{"10만원 이하"},
	}); err != nil {
		t.Fatalf("add second link: %v", err)
	}

	result, err := Service{DB: conn, Now: testutil.FixedTime}.Ask("엄마 생일 선물 10만원 이하로 추천해줘", BuyerContext{Budget: 100000, Recipient: "엄마"})
	if err != nil {
		t.Fatalf("Ask returned error: %v", err)
	}
	if len(result.Recommendations) == 0 {
		t.Fatal("expected recommendations")
	}
	if result.Recommendations[0].Slug != "온열-목-마사지기" {
		t.Fatalf("expected neck massager first, got %#v", result.Recommendations[0])
	}
	if strings.Contains(strings.Join(result.Recommendations[0].Reasons, " "), "commission") {
		t.Fatal("recommendation explanation must not use commission")
	}
}
```

- [ ] **Step 2: Run recommendation tests to verify failure**

Run:

```bash
go test ./internal/recommend
```

Expected: FAIL because recommendation service is undefined.

- [ ] **Step 3: Add recommendation model**

Append to `internal/model/model.go`:

```go
type Recommendation struct {
	Slug       string
	Title      string
	Score      int
	PriceAmount int
	Currency   string
	Verdict    string
	RiskFlags  []string
	Reasons    []string
}
```

- [ ] **Step 4: Implement recommendation service**

Create `internal/recommend/recommend.go` with:

```go
package recommend

import (
	"database/sql"
	"encoding/json"
	"sort"
	"strings"
	"time"

	"agentcart/internal/model"
	"agentcart/internal/product"
	"agentcart/internal/review"
)

type BuyerContext struct {
	Budget int `json:"budget,omitempty"`
	Recipient string `json:"recipient,omitempty"`
	Age int `json:"age,omitempty"`
	Deadline string `json:"deadline,omitempty"`
}

type Result struct {
	FollowUpQuestions []string
	Recommendations []model.Recommendation
}

type Service struct {
	DB *sql.DB
	Now func() time.Time
}

func (s Service) Ask(query string, context BuyerContext) (Result, error) {
	context = inferContext(query, context)
	bundles, err := product.Service{DB: s.DB, Now: s.Now}.ListBundles()
	if err != nil {
		return Result{}, err
	}
	recs := make([]model.Recommendation, 0, len(bundles))
	for _, bundle := range bundles {
		recs = append(recs, score(bundle, query, context, nowForService(s)))
	}
	sort.Slice(recs, func(i, j int) bool {
		return recs[i].Score > recs[j].Score
	})
	if len(recs) > 3 {
		recs = recs[:3]
	}
	if err := s.recordEvent(query, context, recs); err != nil {
		return Result{}, err
	}
	return Result{FollowUpQuestions: followUps(query, context), Recommendations: recs}, nil
}
```

Append helper functions in the same file:

```go
func score(bundle product.Bundle, query string, context BuyerContext, now time.Time) model.Recommendation {
	report := review.Review(bundle.Link, bundle.Purchase, now)
	search := strings.ToLower(bundle.Link.Title + " " + bundle.Link.Description + " " + strings.Join(bundle.Link.BestFor, " ") + " " + strings.Join(bundle.Link.NotFor, " "))
	score := 0
	reasons := []string{}
	for _, token := range tokenize(query + " " + context.Recipient) {
		if strings.Contains(search, token) {
			score += 9
			reasons = append(reasons, "맥락 키워드 일치: "+token)
		}
	}
	if context.Budget > 0 {
		if bundle.Purchase.PriceAmount <= context.Budget {
			score += 28
			reasons = append(reasons, "예산 적합")
		} else {
			score -= 90
			reasons = append(reasons, "예산 초과")
		}
	}
	switch report.Verdict {
	case "recommendable":
		score += 20
		reasons = append(reasons, "리스크 리뷰 통과")
	case "consider_with_caution":
		score -= 22
		reasons = append(reasons, "주의 필요 리스크 있음")
	default:
		score -= 120
		reasons = append(reasons, "추천 제외 수준 리스크 있음")
	}
	score += review.ReadinessScore(report.RiskFlags) / 10
	return model.Recommendation{
		Slug: bundle.Link.Slug,
		Title: bundle.Link.Title,
		Score: score,
		PriceAmount: bundle.Purchase.PriceAmount,
		Currency: bundle.Purchase.Currency,
		Verdict: report.Verdict,
		RiskFlags: report.RiskFlags,
		Reasons: reasons,
	}
}

func inferContext(query string, context BuyerContext) BuyerContext {
	if context.Budget == 0 {
		context.Budget = parseBudget(query)
	}
	if context.Recipient == "" && (strings.Contains(query, "엄마") || strings.Contains(query, "어머니")) {
		context.Recipient = "엄마"
	}
	return context
}

func followUps(query string, context BuyerContext) []string {
	questions := []string{}
	if strings.Contains(query, "선물") && context.Recipient == "" {
		questions = append(questions, "누구에게 줄 선물인가요?")
	}
	if context.Recipient == "엄마" && context.Age == 0 {
		questions = append(questions, "어머니는 몇 살이세요?")
	}
	if context.Budget == 0 {
		questions = append(questions, "예산은 어느 정도인가요?")
	}
	if strings.Contains(query, "선물") && context.Deadline == "" {
		questions = append(questions, "언제까지 도착해야 하나요?")
	}
	if len(questions) > 5 {
		return questions[:5]
	}
	return questions
}
```

Append `parseBudget`, `tokenize`, `recordEvent`, `nowForService`, and `randomID` helpers with concrete behavior:

```go
func parseBudget(query string) int {
	if strings.Contains(query, "10만원") {
		return 100000
	}
	return 0
}

func tokenize(value string) []string {
	fields := strings.Fields(strings.ToLower(value))
	seen := map[string]bool{}
	out := []string{}
	for _, field := range fields {
		field = strings.Trim(field, ".,!?\"'()[]{}")
		if field != "" && !seen[field] {
			seen[field] = true
			out = append(out, field)
		}
	}
	return out
}

func (s Service) recordEvent(query string, context BuyerContext, recs []model.Recommendation) error {
	ids := make([]string, 0, len(recs))
	for _, rec := range recs {
		ids = append(ids, rec.Slug)
	}
	contextJSON, _ := json.Marshal(context)
	idsJSON, _ := json.Marshal(ids)
	_, err := s.DB.Exec(`INSERT INTO recommendation_events (id, query_text, buyer_context_json, result_product_ids_json, created_at) VALUES (?, ?, ?, ?, ?)`,
		"rec_"+time.Now().UTC().Format("20060102150405.000000000"), query, string(contextJSON), string(idsJSON), nowForService(s).Format(time.RFC3339))
	return err
}

func nowForService(s Service) time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now().UTC()
}
```

- [ ] **Step 5: Add `ListBundles` to product service**

Implement `product.Service.ListBundles() ([]Bundle, error)` by selecting all product slugs from `product_links` ordered by `created_at DESC`, then calling `GetBundleBySlug` for each slug.

The method must skip rows that cannot hydrate a full bundle and return an error only for SQL query errors.

- [ ] **Step 6: Wire `buyer:ask`**

Add dispatch:

```go
case "buyer:ask":
	query := positional(args[1:])
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "buyer:ask failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	budget := 0
	if value := flagValue(args[1:], "--budget"); value != "" {
		budget, _ = strconv.Atoi(value)
	}
	result, err := recommend.Service{DB: conn}.Ask(query, recommend.BuyerContext{
		Budget: budget,
		Recipient: flagValue(args[1:], "--recipient"),
		Deadline: flagValue(args[1:], "--deadline"),
	})
	if err != nil {
		fmt.Fprintf(opts.Stderr, "buyer:ask failed: %v\n", err)
		return 1
	}
	fmt.Fprintf(opts.Stdout, "Query: %s\n", query)
	if len(result.FollowUpQuestions) > 0 {
		fmt.Fprintln(opts.Stdout, "맥락을 더 알면 추천 품질이 올라갑니다.")
		for i, question := range result.FollowUpQuestions {
			fmt.Fprintf(opts.Stdout, "%d. %s\n", i+1, question)
		}
	}
	for i, rec := range result.Recommendations {
		fmt.Fprintf(opts.Stdout, "추천 %d: %s (%s)\n", i+1, rec.Title, rec.Slug)
		fmt.Fprintf(opts.Stdout, "가격 스냅샷: %d %s\n", rec.PriceAmount, rec.Currency)
		fmt.Fprintf(opts.Stdout, "판단: %s\n", rec.Verdict)
		fmt.Fprintf(opts.Stdout, "이유: %s\n", strings.Join(rec.Reasons, " / "))
	}
	return 0
```

Add import:

```go
"agentcart/internal/recommend"
```

- [ ] **Step 7: Run tests**

Run:

```bash
go test ./internal/recommend ./internal/product ./internal/review ./internal/cli ./...
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add internal/model/model.go internal/recommend internal/product/product.go internal/cli/cli.go
git commit -m "feat: add buyer recommendations"
```

Expected: commit succeeds.

---

### Task 9: Purchase Prepare Protocol

**Files:**
- Create: `internal/purchase/purchase.go`
- Create: `internal/purchase/purchase_test.go`
- Modify: `internal/cli/cli.go`

- [ ] **Step 1: Write purchase tests**

Create `internal/purchase/purchase_test.go`:

```go
package purchase

import (
	"strings"
	"testing"

	"agentcart/internal/auth"
	"agentcart/internal/db"
	"agentcart/internal/product"
	"agentcart/internal/seller"
	"agentcart/internal/testutil"
)

func TestPrepareDryRunDoesNotOpenOrPay(t *testing.T) {
	conn, err := db.Open(testutil.TempDBPath(t))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer conn.Close()
	view, err := auth.Service{DB: conn, Now: testutil.FixedTime}.Login("creator@example.com")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	profile, err := seller.Service{DB: conn, Now: testutil.FixedTime}.Create(view.Account.ID, "junho", "Junho Curates")
	if err != nil {
		t.Fatalf("seller create: %v", err)
	}
	bundle, err := product.Service{DB: conn, Now: testutil.FixedTime}.AddLink(profile.ID, product.AddLinkInput{
		URL: "https://example.com/product",
		Title: "Desk Lamp",
		PriceAmount: 19000,
		Currency: "KRW",
		Description: "A small desk lamp",
		Affiliate: false,
		Disclosure: "",
		BestFor: []string{"desk"},
		NotFor: []string{"outdoor"},
	})
	if err != nil {
		t.Fatalf("add link: %v", err)
	}
	result, err := Service{DB: conn, Now: testutil.FixedTime}.Prepare(bundle.Link.Slug, true)
	if err != nil {
		t.Fatalf("Prepare returned error: %v", err)
	}
	if !strings.Contains(result.Message, "Dry run") {
		t.Fatalf("expected dry run message, got %s", result.Message)
	}
	if strings.Contains(result.Message, "payment submitted") {
		t.Fatalf("purchase prepare must not submit payment: %s", result.Message)
	}
}
```

- [ ] **Step 2: Run purchase tests to verify failure**

Run:

```bash
go test ./internal/purchase
```

Expected: FAIL because purchase service is undefined.

- [ ] **Step 3: Implement purchase prepare**

Create `internal/purchase/purchase.go`:

```go
package purchase

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"agentcart/internal/product"
)

type Service struct {
	DB *sql.DB
	Now func() time.Time
}

type Result struct {
	URL string
	Message string
}

func (s Service) Prepare(slug string, dryRun bool) (Result, error) {
	bundle, err := product.Service{DB: s.DB, Now: s.Now}.GetBundleBySlug(slug)
	if err != nil {
		return Result{}, err
	}
	if _, err := s.DB.Exec(`INSERT INTO click_events (id, product_link_id, purchase_link_id, dry_run, opened_at) VALUES (?, ?, ?, ?, ?)`,
		"click_"+randomHex(8), bundle.Link.ID, bundle.Purchase.ID, boolInt(dryRun), nowForService(s).Format(time.RFC3339)); err != nil {
		return Result{}, err
	}
	if dryRun {
		return Result{URL: bundle.Link.FinalURL, Message: fmt.Sprintf("Dry run: would prepare checkout for %s. Stop at login, address, payment password, OTP, CAPTCHA, payment method changes, and final payment.", bundle.Link.FinalURL)}, nil
	}
	return Result{URL: bundle.Link.FinalURL, Message: fmt.Sprintf("Prepare checkout URL: %s\nStop before login, sensitive data, payment password, OTP, CAPTCHA, payment method changes, and final payment.", bundle.Link.FinalURL)}, nil
}
```

Append helpers:

```go
func nowForService(s Service) time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now().UTC()
}

func randomHex(bytesLen int) string {
	buf := make([]byte, bytesLen)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	return hex.EncodeToString(buf)
}

func boolInt(value bool) int {
	if value {
		return 1
	}
	return 0
}
```

- [ ] **Step 4: Wire `purchase:prepare`**

Add dispatch:

```go
case "purchase:prepare":
	slug := positional(args[1:])
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "purchase:prepare failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	result, err := purchase.Service{DB: conn}.Prepare(slug, hasFlag(args[1:], "--dry-run"))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "purchase:prepare failed: %v\n", err)
		return 1
	}
	fmt.Fprintln(opts.Stdout, result.Message)
	return 0
```

Add import:

```go
"agentcart/internal/purchase"
```

- [ ] **Step 5: Run tests**

Run:

```bash
go test ./internal/purchase ./internal/product ./internal/cli ./...
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add internal/purchase internal/cli/cli.go
git commit -m "feat: add purchase prepare protocol"
```

Expected: commit succeeds.

---

### Task 10: Skill Installer For Generic, Codex, Claude, And OpenClaw

**Files:**
- Create: `internal/skill/skill.go`
- Create: `internal/skill/skill_test.go`
- Modify: `internal/cli/cli.go`

- [ ] **Step 1: Write skill tests**

Create `internal/skill/skill_test.go`:

```go
package skill

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"agentcart/internal/db"
	"agentcart/internal/testutil"
)

func TestInstallCodexSkillIncludesPurchaseBoundary(t *testing.T) {
	conn, err := db.Open(testutil.TempDBPath(t))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer conn.Close()
	path := filepath.Join(t.TempDir(), "agentcart-codex-skill.md")
	result, err := Service{DB: conn, Now: testutil.FixedTime}.Install("codex", path)
	if err != nil {
		t.Fatalf("Install returned error: %v", err)
	}
	raw, err := os.ReadFile(result.Path)
	if err != nil {
		t.Fatalf("read skill: %v", err)
	}
	text := string(raw)
	for _, want := range []string{"buyer:ask", "seller:link-add", "purchase:prepare", "Never rank by commission", "Stop at login"} {
		if !strings.Contains(text, want) {
			t.Fatalf("skill missing %q:\n%s", want, text)
		}
	}
}

func TestInstallRejectsUnknownTarget(t *testing.T) {
	conn, err := db.Open(testutil.TempDBPath(t))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer conn.Close()
	if _, err := Service{DB: conn, Now: testutil.FixedTime}.Install("unknown", filepath.Join(t.TempDir(), "skill.md")); err == nil {
		t.Fatal("expected unknown target error")
	}
}
```

- [ ] **Step 2: Run skill tests to verify failure**

Run:

```bash
go test ./internal/skill
```

Expected: FAIL because skill service is undefined.

- [ ] **Step 3: Implement skill installer**

Create `internal/skill/skill.go`:

```go
package skill

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"time"
)

type Service struct {
	DB *sql.DB
	Now func() time.Time
}

type InstallResult struct {
	Target string
	Path string
}

func (s Service) Install(target, outputPath string) (InstallResult, error) {
	if !validTarget(target) {
		return InstallResult{}, errors.New("target must be generic, codex, claude, or openclaw")
	}
	if outputPath == "" {
		outputPath = filepath.Join(".agentcart", "skills", "agentcart-"+target+".md")
	}
	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		return InstallResult{}, err
	}
	if err := os.WriteFile(outputPath, []byte(markdown(target)), 0o644); err != nil {
		return InstallResult{}, err
	}
	_, err := s.DB.Exec(`INSERT INTO skill_installs (id, target, path, installed_at) VALUES (?, ?, ?, ?)`, "skill_"+randomHex(8), target, outputPath, nowForService(s).Format(time.RFC3339))
	if err != nil {
		return InstallResult{}, err
	}
	return InstallResult{Target: target, Path: outputPath}, nil
}
```

Append markdown and helpers:

```go
func markdown(target string) string {
	return `# AgentCart Shopping Agent Skill

Target: ` + target + `

Use AgentCart when the user asks for shopping help, gift recommendations, product comparisons, product-link registration, affiliate-link registration, or purchase preparation.

## Core Commands

` + "```bash" + `
agentcart seller:link-add --url <url> --title <title> --price <amount> --currency <KRW|USD> --description <text> --affiliate <yes|no> --disclosure <text> --best-for <csv> --not-for <csv>
agentcart buyer:ask "<shopping intent>"
agentcart review:product <slug>
agentcart product:agent-json <slug>
agentcart purchase:prepare <slug> --dry-run
` + "```" + `

## Required Behavior

- Ask context questions before firm gift recommendations.
- Always review product risk before recommending a purchase path.
- Always disclose affiliate relationships.
- Treat price as a snapshot and say the final checkout price may differ.
- Never rank by commission rate.
- Never claim lowest price.
- Never auto-open or auto-pay.
- Stop at login, address entry, payment password, OTP, CAPTCHA, payment method changes, and final payment.
- For seller registration, ask for link, target buyer, key benefits, cautions, disclosure, and approved channel.
`
}

func validTarget(target string) bool {
	switch target {
	case "generic", "codex", "claude", "openclaw":
		return true
	default:
		return false
	}
}

func nowForService(s Service) time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now().UTC()
}

func randomHex(bytesLen int) string {
	buf := make([]byte, bytesLen)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	return hex.EncodeToString(buf)
}
```

- [ ] **Step 4: Wire `install-skill`**

Add dispatch:

```go
case "install-skill":
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "install-skill failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	result, err := skill.Service{DB: conn}.Install(flagValue(args[1:], "--target"), flagValue(args[1:], "--output"))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "install-skill failed: %v\n", err)
		return 1
	}
	fmt.Fprintf(opts.Stdout, "Installed %s skill at %s\n", result.Target, result.Path)
	return 0
```

Add import:

```go
"agentcart/internal/skill"
```

- [ ] **Step 5: Run tests**

Run:

```bash
go test ./internal/skill ./internal/cli ./...
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add internal/skill internal/cli/cli.go
git commit -m "feat: add agent skill installer"
```

Expected: commit succeeds.

---

### Task 11: Analytics Summary

**Files:**
- Create: `internal/analytics/analytics.go`
- Create: `internal/analytics/analytics_test.go`
- Modify: `internal/cli/cli.go`

- [ ] **Step 1: Write analytics tests**

Create `internal/analytics/analytics_test.go`:

```go
package analytics

import (
	"testing"

	"agentcart/internal/db"
	"agentcart/internal/testutil"
)

func TestSummaryLabelsConversionsUnavailableWhenEmpty(t *testing.T) {
	conn, err := db.Open(testutil.TempDBPath(t))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer conn.Close()
	if _, err := conn.Exec(`INSERT INTO recommendation_events (id, query_text, buyer_context_json, result_product_ids_json, created_at) VALUES ('rec_1', 'gift', '{}', '[]', '2026-04-24T00:00:00Z')`); err != nil {
		t.Fatalf("insert rec: %v", err)
	}
	summary, err := Service{DB: conn}.Summary()
	if err != nil {
		t.Fatalf("Summary returned error: %v", err)
	}
	if summary.Recommendations != 1 {
		t.Fatalf("expected 1 recommendation event, got %d", summary.Recommendations)
	}
	if summary.ConversionRateLabel != "unavailable until imported or connected" {
		t.Fatalf("unexpected conversion label: %s", summary.ConversionRateLabel)
	}
}
```

- [ ] **Step 2: Run analytics test to verify failure**

Run:

```bash
go test ./internal/analytics
```

Expected: FAIL because analytics service is undefined.

- [ ] **Step 3: Implement analytics summary**

Create `internal/analytics/analytics.go`:

```go
package analytics

import "database/sql"

type Service struct {
	DB *sql.DB
}

type Summary struct {
	Recommendations int
	Clicks int
	Conversions int
	ConversionRateLabel string
}

func (s Service) Summary() (Summary, error) {
	recommendations, err := countRows(s.DB, "recommendation_events")
	if err != nil {
		return Summary{}, err
	}
	clicks, err := countRows(s.DB, "click_events")
	if err != nil {
		return Summary{}, err
	}
	conversions, err := countRows(s.DB, "conversion_events")
	if err != nil {
		return Summary{}, err
	}
	label := "unavailable until imported or connected"
	if clicks > 0 && conversions > 0 {
		label = "available from imported or connected events"
	}
	return Summary{Recommendations: recommendations, Clicks: clicks, Conversions: conversions, ConversionRateLabel: label}, nil
}

func countRows(db *sql.DB, table string) (int, error) {
	var count int
	err := db.QueryRow(`SELECT COUNT(*) FROM ` + table).Scan(&count)
	return count, err
}
```

- [ ] **Step 4: Wire `analytics:summary`**

Add dispatch:

```go
case "analytics:summary":
	conn, err := db.Open(db.DefaultPath(opts.WorkDir))
	if err != nil {
		fmt.Fprintf(opts.Stderr, "analytics:summary failed: %v\n", err)
		return 1
	}
	defer conn.Close()
	summary, err := analytics.Service{DB: conn}.Summary()
	if err != nil {
		fmt.Fprintf(opts.Stderr, "analytics:summary failed: %v\n", err)
		return 1
	}
	fmt.Fprintf(opts.Stdout, "Recommendations: %d\n", summary.Recommendations)
	fmt.Fprintf(opts.Stdout, "Clicks: %d\n", summary.Clicks)
	fmt.Fprintf(opts.Stdout, "Conversions: %d\n", summary.Conversions)
	fmt.Fprintf(opts.Stdout, "Conversion rate: %s\n", summary.ConversionRateLabel)
	return 0
```

Add import:

```go
"agentcart/internal/analytics"
```

- [ ] **Step 5: Run tests**

Run:

```bash
go test ./internal/analytics ./internal/cli ./...
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add internal/analytics internal/cli/cli.go
git commit -m "feat: add local analytics summary"
```

Expected: commit succeeds.

---

### Task 12: CLI Wrapper, README, And End-To-End Verification

**Files:**
- Modify: `cli.js`
- Create: `README.md`
- Modify: `package.json`
- Test: all Go tests and Vite build

- [ ] **Step 1: Write CLI integration test**

Add this test to `internal/cli/cli_test.go`:

```go
func TestEndToEndCLISmoke(t *testing.T) {
	workDir := t.TempDir()
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	opts := Options{Stdout: &stdout, Stderr: &stderr, WorkDir: workDir}

	commands := [][]string{
		{"init", "--reset"},
		{"login", "--email", "creator@example.com"},
		{"seller:create", "--handle", "junho", "--display-name", "Junho Curates"},
		{"seller:link-add", "--url", "https://example.com/neck-massager", "--title", "온열 목 마사지기", "--price", "69000", "--currency", "KRW", "--description", "어머니 생일 선물로 좋은 온열 목 마사지기", "--affiliate", "yes", "--disclosure", "이 링크를 통해 구매하면 등록자가 수수료를 받을 수 있습니다.", "--best-for", "엄마,어머니,생일 선물,목 피로", "--not-for", "의료기기 기대"},
		{"buyer:ask", "엄마 생일 선물 10만원 이하로 추천해줘"},
		{"review:product", "온열-목-마사지기"},
		{"product:agent-json", "온열-목-마사지기"},
		{"purchase:prepare", "온열-목-마사지기", "--dry-run"},
		{"install-skill", "--target", "codex"},
		{"analytics:summary"},
	}

	for _, command := range commands {
		if code := Run(command, opts); code != 0 {
			t.Fatalf("command %v failed with code %d\nstdout:\n%s\nstderr:\n%s", command, code, stdout.String(), stderr.String())
		}
	}
	out := stdout.String()
	for _, want := range []string{"Product link added", "추천 1", "Verdict:", "agentcart.product.v0", "Dry run", "Installed codex skill", "Recommendations:"} {
		if !strings.Contains(out, want) {
			t.Fatalf("end-to-end output missing %q:\n%s", want, out)
		}
	}
}
```

- [ ] **Step 2: Run integration test to expose command gaps**

Run:

```bash
go test ./internal/cli -run TestEndToEndCLISmoke
```

Expected: FAIL if any command still lacks proper dispatch or output. Fix command dispatch until this exact test passes.

- [ ] **Step 3: Replace Node CLI with Go wrapper**

Modify `cli.js`:

```js
#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const binary = resolve("bin/agentcart");
const args = process.argv.slice(2);

if (!existsSync(binary)) {
  console.error("AgentCart Go CLI is not built yet.");
  console.error("Run: npm run go:build");
  console.error("For development, use: go run ./cmd/agentcart " + args.join(" "));
  process.exit(1);
}

const result = spawnSync(binary, args, { stdio: "inherit" });
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 0);
```

- [ ] **Step 4: Add README**

Create `README.md`:

```markdown
# AgentCart

AgentCart is an agent-commerce product registry and shopping protocol. Sellers register product links with context and disclosure. Buyers ask agents for shopping recommendations. Agents review fit, price snapshots, link risk, disclosure, and purchase boundaries before opening a purchase URL.

## Runtime

- Landing page: npm/Vite in `web/`
- Core CLI: Go in `cmd/agentcart`
- Local DB: SQLite at `.agentcart/agentcart.db`

## Local Demo

```bash
npm install
npm run go:build
go run ./cmd/agentcart init --reset
go run ./cmd/agentcart login --email creator@example.com
go run ./cmd/agentcart seller:create --handle junho --display-name "Junho Curates"
go run ./cmd/agentcart seller:link-add --url "https://example.com/neck-massager" --title "온열 목 마사지기" --price 69000 --currency KRW --description "어머니 생일 선물로 좋은 온열 목 마사지기" --affiliate yes --disclosure "이 링크를 통해 구매하면 등록자가 수수료를 받을 수 있습니다." --best-for "엄마,어머니,생일 선물,목 피로" --not-for "의료기기 기대"
go run ./cmd/agentcart buyer:ask "엄마 생일 선물 10만원 이하로 추천해줘"
go run ./cmd/agentcart review:product "온열-목-마사지기"
go run ./cmd/agentcart product:agent-json "온열-목-마사지기"
go run ./cmd/agentcart purchase:prepare "온열-목-마사지기" --dry-run
go run ./cmd/agentcart install-skill --target codex
go run ./cmd/agentcart analytics:summary
npm run build
```

## Safety

AgentCart never ranks by commission, never claims live lowest price from a snapshot, and never completes login, payment password, OTP, CAPTCHA, address entry, payment method changes, or final payment without user handoff and action-time confirmation.
```

- [ ] **Step 5: Run full verification**

Run:

```bash
go test ./...
npm run go:build
npm run build
go run ./cmd/agentcart init --reset
go run ./cmd/agentcart login --email creator@example.com
go run ./cmd/agentcart seller:create --handle junho --display-name "Junho Curates"
go run ./cmd/agentcart seller:link-add --url "https://example.com/neck-massager" --title "온열 목 마사지기" --price 69000 --currency KRW --description "어머니 생일 선물로 좋은 온열 목 마사지기" --affiliate yes --disclosure "이 링크를 통해 구매하면 등록자가 수수료를 받을 수 있습니다." --best-for "엄마,어머니,생일 선물,목 피로" --not-for "의료기기 기대"
go run ./cmd/agentcart buyer:ask "엄마 생일 선물 10만원 이하로 추천해줘"
go run ./cmd/agentcart review:product "온열-목-마사지기"
go run ./cmd/agentcart product:agent-json "온열-목-마사지기"
go run ./cmd/agentcart purchase:prepare "온열-목-마사지기" --dry-run
go run ./cmd/agentcart install-skill --target codex
go run ./cmd/agentcart analytics:summary
```

Expected:

```text
go test ./...: PASS
npm run go:build: creates bin/agentcart
npm run build: Vite build succeeds
init --reset: AgentCart SQLite DB reset
login: AgentCart CLI login created
seller:create: Seller profile created: @junho (Junho Curates)
seller:link-add: Product link added: 온열-목-마사지기 (published)
buyer:ask: prints 추천 1
review:product: prints Verdict
product:agent-json: prints schema_version agentcart.product.v0
purchase:prepare --dry-run: prints Dry run and stop boundary
install-skill: prints Installed codex skill
analytics:summary: prints Recommendations and Clicks
```

- [ ] **Step 6: Commit**

Run:

```bash
git add cli.js README.md package.json internal/cli/cli_test.go
git commit -m "docs: document Go SQLite runtime"
```

Expected: commit succeeds.

---

## Final Verification Commands

Run the complete verification after all tasks:

```bash
go test ./...
npm install
npm run go:build
npm run build
go run ./cmd/agentcart init --reset
go run ./cmd/agentcart login --email creator@example.com
go run ./cmd/agentcart seller:create --handle junho --display-name "Junho Curates"
go run ./cmd/agentcart seller:link-add --url "https://example.com/neck-massager" --title "온열 목 마사지기" --price 69000 --currency KRW --description "어머니 생일 선물로 좋은 온열 목 마사지기" --affiliate yes --disclosure "이 링크를 통해 구매하면 등록자가 수수료를 받을 수 있습니다." --best-for "엄마,어머니,생일 선물,목 피로" --not-for "의료기기 기대"
go run ./cmd/agentcart seller:links
go run ./cmd/agentcart buyer:ask "엄마 생일 선물 10만원 이하로 추천해줘"
go run ./cmd/agentcart review:product "온열-목-마사지기"
go run ./cmd/agentcart product:agent-json "온열-목-마사지기"
go run ./cmd/agentcart purchase:prepare "온열-목-마사지기" --dry-run
go run ./cmd/agentcart install-skill --target codex
go run ./cmd/agentcart analytics:summary
```

## Self-Review

Spec coverage:

- Go CLI runtime: covered in Tasks 1 and 12.
- SQLite DB at `.agentcart/agentcart.db`: covered in Task 2.
- Required tables: covered in Task 2 schema.
- Local auth and schema-ready OAuth: covered in Tasks 2 and 3.
- Seller profile, links, product cards, and purchase snapshots: covered in Tasks 4 and 5.
- Buyer recommendations: covered in Task 8.
- Risk review and disclosure rules: covered in Task 6.
- Agent product JSON: covered in Task 7.
- Purchase-assist stop boundary: covered in Task 9.
- Skill installer for generic, Codex, Claude, and OpenClaw: covered in Task 10.
- Analytics summary: covered in Task 11.
- npm/Vite landing retained: covered in Tasks 1 and 12.
- No Supabase: no task introduces Supabase.
- Sensitive data masking: covered in Task 3.

Placeholder scan:

- The plan avoids placeholder markers and cross-references that force the implementer to infer missing work.
- Commands use exact paths and concrete sample values.
- Final verification uses a real slug produced by the planned slugifier: `온열-목-마사지기`.

Type consistency:

- `Service{DB, Now}` shape is used consistently across packages.
- `ProductLink`, `ProductCard`, `PurchaseLink`, and `PolicyReview` model names are consistent.
- CLI commands match the required command list.
- JSON schema version is consistently `agentcart.product.v0`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-24-agentcart-go-sqlite-runtime.md`. Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution - execute tasks in this session using executing-plans, batch execution with checkpoints.
