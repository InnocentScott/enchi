// Package cache: lưu audio đã sinh theo key (hash của text+lang), tránh synth lại.
package cache

import "sync"

type Cache struct {
	mu sync.RWMutex
	m  map[string][]byte
}

func New() *Cache {
	return &Cache{m: make(map[string][]byte)}
}

func (c *Cache) Get(key string) ([]byte, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	v, ok := c.m[key]
	return v, ok
}

func (c *Cache) Set(key string, val []byte) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m[key] = val
}
