package tts

import (
	"bytes"
	"crypto/sha256"
	"encoding/binary"
	"math"
)

// Stub sinh một đoạn WAV (sine tone) — đủ để mobile phát thử pipeline audio.
// Tần số suy ra từ text nên mỗi từ "nghe" khác nhau. Thay bằng Google/Azure khi chốt provider.
type Stub struct{}

func NewStub() *Stub { return &Stub{} }

const (
	sampleRate = 16000
	durationMs = 400
)

func (s *Stub) Synthesize(text, _ string) ([]byte, string, error) {
	return sineWav(freqFromText(text), durationMs, sampleRate), "audio/wav", nil
}

func freqFromText(text string) float64 {
	h := sha256.Sum256([]byte(text))
	n := int(h[0])<<8 | int(h[1])
	return 220.0 + float64(n%440) // 220–660 Hz
}

func sineWav(freq float64, durMs, rate int) []byte {
	numSamples := rate * durMs / 1000
	dataSize := numSamples * 2 // 16-bit mono
	buf := new(bytes.Buffer)

	buf.WriteString("RIFF")
	_ = binary.Write(buf, binary.LittleEndian, uint32(36+dataSize))
	buf.WriteString("WAVE")
	buf.WriteString("fmt ")
	_ = binary.Write(buf, binary.LittleEndian, uint32(16)) // fmt chunk size
	_ = binary.Write(buf, binary.LittleEndian, uint16(1))  // PCM
	_ = binary.Write(buf, binary.LittleEndian, uint16(1))  // mono
	_ = binary.Write(buf, binary.LittleEndian, uint32(rate))
	_ = binary.Write(buf, binary.LittleEndian, uint32(rate*2)) // byte rate
	_ = binary.Write(buf, binary.LittleEndian, uint16(2))      // block align
	_ = binary.Write(buf, binary.LittleEndian, uint16(16))     // bits/sample
	buf.WriteString("data")
	_ = binary.Write(buf, binary.LittleEndian, uint32(dataSize))

	amp := 0.3 * 32767.0
	fade := rate / 50 // ~20ms fade tránh "click"
	for i := 0; i < numSamples; i++ {
		env := 1.0
		if i < fade {
			env = float64(i) / float64(fade)
		} else if i > numSamples-fade {
			env = float64(numSamples-i) / float64(fade)
		}
		t := float64(i) / float64(rate)
		sample := int16(amp * env * math.Sin(2*math.Pi*freq*t))
		_ = binary.Write(buf, binary.LittleEndian, sample)
	}
	return buf.Bytes()
}
