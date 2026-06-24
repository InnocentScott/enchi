package auth

import "testing"

func TestHashAndCheckPassword(t *testing.T) {
	const pw = "s3cret-password"
	hash, err := HashPassword(pw)
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if hash == pw {
		t.Fatal("password must not be stored in plaintext")
	}
	if !CheckPassword(hash, pw) {
		t.Error("correct password rejected")
	}
	if CheckPassword(hash, "wrong-password") {
		t.Error("wrong password accepted")
	}
}
