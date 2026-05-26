package postgres

import (
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

func Open() (*sqlx.DB, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = os.Getenv("POSTGRES_DSN")
	}
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/kastonom?sslmode=disable"
	}
	db, err := sqlx.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(20)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)
	return db, db.Ping()
}
