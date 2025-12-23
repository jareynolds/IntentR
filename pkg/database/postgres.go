// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

// DB wraps the SQL database connection
type DB struct {
	*sql.DB
}

// NewPostgresDB creates a new PostgreSQL database connection
func NewPostgresDB(dataSourceName string) (*DB, error) {
	db, err := sql.Open("postgres", dataSourceName)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Verify connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	log.Println("Successfully connected to PostgreSQL database")
	return &DB{db}, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.DB.Close()
}
