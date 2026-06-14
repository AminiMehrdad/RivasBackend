# Transcription Module

The transcription module accepts authenticated audio uploads, creates a request row, runs speech-to-text, stores the generated text file, debits the user's wallet, and records the wallet transaction.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/transcriptions` | Upload one audio file in multipart field `audio`. |
| `GET` | `/transcriptions` | List the authenticated user's transcription records. |
| `GET` | `/transcriptions/:id` | Read one transcription record owned by the authenticated user. |

Authentication is handled by the global auth guard. A request can use either JWT auth or the `X-API-Key` header.

## Upload Rules

- Field name: `audio`
- Max size: `50 MB`
- Accepted formats: `mp3`, `wav`, `ogg`, `webm`, `m4a`, `aac`, `flac`, `amr`
- Audio files are stored in `uploads/audio`
- Transcript text files are stored in `uploads/text`

## Workflow

1. Validate the uploaded audio file.
2. Estimate duration with `ffprobe`. If `ffprobe` is unavailable, use a size-based fallback.
3. Calculate cost using `TRANSCRIPTION_COST_PER_SECOND` in `transcription.service.ts`.
4. Check the user's main wallet balance.
5. Create a `requests` row with `moduleType = TRANSCRIPTION`.
6. Create a `transcribes` row linked to the request.
7. Run `SpeechToTextService.transcribeAudioFile`.
8. Save the transcript to disk and mark the transcribe row completed.
9. Create a wallet transaction, debit the wallet, and mark the request successful.
10. If processing fails, mark the transcribe row and request as failed.

## Speech-To-Text Provider

`SpeechToTextService` is currently a stub. Replace `transcribeAudioFile(audioFilePath)` with the real provider integration. Keep the method contract:

```ts
async transcribeAudioFile(audioFilePath: string): Promise<string>
```

Return the transcript text only. The service layer handles text-file storage.

## Database Relations

- `requests.unique_id` -> `transcribes.request_id`
- `requests.unique_id` -> `wallet_transactions.reference_id`
- `requests.transcribe_id` stores the transcribe `unique_id`
- `requests.wallet_transaction_id` stores the wallet transaction `unique_id`

## Operational Notes

- `ffprobe` should be installed in environments where accurate duration matters.
- Wallet debit and transaction creation are separate repository calls today. For high-volume production use, move the request, transcribe update, wallet update, and wallet transaction into one database transaction.
- The endpoint is synchronous: it waits for speech-to-text to finish before returning.
