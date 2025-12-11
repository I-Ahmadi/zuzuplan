# Application-Layer Encryption Design

## Overview

ZuzuPlan implements per-request application-layer encryption to provide defense-in-depth security. This complements TLS/HTTPS by encrypting request payloads at the application level.

## Architecture

### Encryption Flow

```
Client                          Server
  |                               |
  |--1. GET /api/crypto/pubkey -->|
  |<-- RSA Public Key ------------|
  |                               |
  |--2. Generate AES-256 key      |
  |--3. Encrypt payload (AES)     |
  |--4. Encrypt AES key (RSA)     |
  |--5. POST /api/endpoint ------->|
  |   { encryptedKey, iv, tag,    |
  |     ciphertext }              |
  |                               |
  |<-- Decrypt & Process ---------|
  |<-- Response ------------------|
```

### Components

1. **Encryption Utilities** (`src/utils/encryption.ts`)
   - AES-256-GCM encryption/decryption
   - Prototype mode support

2. **RSA-AES Hybrid** (`src/utils/rsa-aes.ts`)
   - RSA key pair generation
   - Hybrid encryption/decryption
   - Public key export

3. **Decrypt Middleware** (`src/middleware/decrypt-request.ts`)
   - Request decryption
   - Replay protection
   - Rate limiting
   - Error handling

4. **Crypto Route** (`src/routes/crypto.ts`)
   - Public key endpoint
   - Key metadata

## Security Model

### Threat Model

**Protected Against:**
- Eavesdropping on request payloads
- Replay attacks
- Man-in-the-middle (with TLS)
- Request tampering (via GCM authentication tag)

**Not Protected Against:**
- TLS/HTTPS failures (assumes TLS is enabled)
- Server compromise
- Client-side attacks
- Timing attacks (not addressed)

### Encryption Scheme

**Hybrid Mode (Production):**
```
1. Client generates random AES-256-GCM key (K)
2. Client encrypts payload with K → C
3. Client encrypts K with server RSA public key → E(K)
4. Client sends { E(K), IV, Tag, C }
5. Server decrypts E(K) with RSA private key → K
6. Server decrypts C with K → Payload
```

**Prototype Mode (Development):**
```
1. Client uses pre-shared AES-256-GCM key (K)
2. Client encrypts payload with K → C
3. Client sends { IV, Tag, C }
4. Server decrypts C with K → Payload
```

### Replay Protection

**Mechanism:**
1. Each request includes:
   - `ts`: Timestamp (milliseconds since epoch)
   - `nonce`: Random 16-byte hex string

2. Server validates:
   - Timestamp is within 2 minutes (configurable)
   - Nonce hasn't been seen recently (5-minute window)

3. Server stores recent nonces in memory (consider Redis for production)

**Limitations:**
- In-memory storage doesn't scale across multiple servers
- Clock skew tolerance: ±1 minute
- Nonce storage grows (cleaned every minute)

## Key Management

### Key Generation

**AES Key (Prototype Mode):**
```bash
npm run gen:enc-key
# Output: base64-encoded 32-byte key
```

**RSA Key Pair (Hybrid Mode):**
```bash
npm run gen:rsa-keys 2048  # or 4096
# Output: keys/rsa-2048-public.pem
#         keys/rsa-2048-private.pem
```

### Key Storage

**Development:**
- Environment variables (`.env` file)
- Never commit to version control

**Production:**
- Use Key Management Service (KMS):
  - AWS KMS
  - HashiCorp Vault
  - Azure Key Vault
  - Google Cloud KMS

**Best Practices:**
- Store private keys in secure vault
- Use IAM roles for key access
- Enable key rotation
- Audit key access
- Use hardware security modules (HSM) for high-security deployments

### Key Rotation

**Process:**
1. Generate new key pair
2. Update environment variables
3. Deploy to all server instances
4. Clients automatically fetch new public key
5. Old keys can be kept temporarily for backward compatibility

**Frequency:**
- 2048-bit RSA: Annually
- 4096-bit RSA: Every 2-3 years
- Immediately if compromise suspected

## Performance Considerations

### Overhead

**Encryption:**
- AES-256-GCM: ~100-200 MB/s (CPU-bound)
- RSA-2048 encryption: ~1000 ops/s
- RSA-4096 encryption: ~200 ops/s

**Decryption:**
- AES-256-GCM: ~100-200 MB/s
- RSA-2048 decryption: ~500 ops/s
- RSA-4096 decryption: ~100 ops/s

**Impact:**
- Small payloads (<10KB): Negligible (<10ms)
- Medium payloads (10-100KB): Minimal (<50ms)
- Large payloads (>100KB): Consider chunking or streaming

### Optimization

1. **Use 2048-bit RSA** for better performance (still secure)
2. **Cache public key** on client side
3. **Consider connection pooling** for high-throughput scenarios
4. **Monitor decryption errors** and adjust rate limits

## Testing

### Unit Tests

```bash
npm test -- encryption
npm test -- rsa-aes
```

### Integration Tests

```bash
npm test -- decrypt-request
```

### Manual Testing

1. Start server with encryption enabled
2. Use client examples:
   - `server/examples/node-client.ts`
   - `server/examples/browser-client.html`
3. Verify encrypted requests are decrypted correctly
4. Test replay protection (duplicate nonce)
5. Test timestamp validation (old request)

## Troubleshooting

### Common Issues

**"Request must be encrypted"**
- Missing `x-encrypted: 1` header
- Endpoint not whitelisted

**"Decryption failed"**
- Wrong encryption key (prototype mode)
- Wrong RSA private key (hybrid mode)
- Tampered ciphertext
- Missing environment variables

**"Request timestamp is too old"**
- Clock skew between client and server
- Request delayed in transit
- Adjust `ENCRYPTION_MAX_AGE_MS`

**"Duplicate request detected"**
- Nonce collision (very rare)
- Replay attack attempt
- Check nonce generation

### Debug Mode

Enable detailed logging:
```typescript
// In decrypt-request.ts middleware
console.log('Decryption attempt:', {
  path: req.path,
  mode: encryptionMode,
  hasEnvelope: !!req.body.encryptedKey,
});
```

## Future Enhancements

1. **Redis-based nonce storage** for multi-server deployments
2. **Key versioning** for seamless rotation
3. **Compression** before encryption (for large payloads)
4. **Streaming encryption** for file uploads
5. **Client certificate pinning** for additional security
6. **Performance metrics** and monitoring

## References

- [NIST SP 800-57](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) - Key Management Guidelines
- [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

