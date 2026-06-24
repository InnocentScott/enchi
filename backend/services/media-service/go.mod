module github.com/tomovu/enchi/services/media-service

go 1.23

// Stdlib-only ở bước scaffold. Khi build logic, thêm:
//   go get github.com/gofiber/fiber/v2
//   go get github.com/aws/aws-sdk-go-v2/service/s3   (Cloudflare R2, S3-compatible)
//   provider TTS chốt sau: cloud.google.com/go/texttospeech HOẶC Azure Speech SDK
