package tts

import (
	"bytes"
	"testing"
)

func TestStubProducesValidWav(t *testing.T) {
	s := NewStub()
	audio, ct, err := s.Synthesize("Hello", "en")
	if err != nil {
		t.Fatalf("synthesize: %v", err)
	}
	if ct != "audio/wav" {
		t.Errorf("content type = %q, want audio/wav", ct)
	}
	if !bytes.HasPrefix(audio, []byte("RIFF")) || !bytes.Contains(audio[:16], []byte("WAVE")) {
		t.Error("output is not a RIFF/WAVE file")
	}
	// 400ms @ 16kHz, 16-bit mono = 12800 bytes data + 44 byte header
	if want := 44 + sampleRate*durationMs/1000*2; len(audio) != want {
		t.Errorf("wav size = %d, want %d", len(audio), want)
	}
}

func TestDifferentTextDifferentTone(t *testing.T) {
	s := NewStub()
	a, _, _ := s.Synthesize("Hello", "en")
	b, _, _ := s.Synthesize("Goodbye", "en")
	if bytes.Equal(a, b) {
		t.Error("different text should produce different audio")
	}
}
