package domain

import "errors"

// Sentinel errors — tầng http map sang HTTP status, không panic cho lỗi nghiệp vụ.
var (
	ErrEmailTaken         = errors.New("email already registered")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidToken       = errors.New("invalid or expired token")
)
