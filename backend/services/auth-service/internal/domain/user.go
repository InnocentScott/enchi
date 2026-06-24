package domain

import "time"

// User là entity thuần — không biết tới HTTP hay DB.
type User struct {
	ID           string
	Email        string
	PasswordHash string
	DisplayName  string
	CreatedAt    time.Time
}
