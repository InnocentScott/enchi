// Package migrations nhúng các file .sql versioned để store áp dụng lúc khởi động.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
