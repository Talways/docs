# AI Caller Architecture

The AI caller is ColdPilot's outbound voice agent. It dials a business `Lead`,
holds a natural conversation, pitches the subscription, and records the result
as a `Call`. This document specifies the design so the integration can be built
deliberately. The data model (`Call`) already exists; the live telephony,
GPT-4o, and ElevenLabs wiring is the **next implementation step** and is not yet
connected, because it requires external provider accounts, public webhook URLs,
and real phone numbers.

## Stack

- **Conversation brain:** GPT-4o. Drives the dialogue from a system prompt that
  describes the offer, qualification questions, objection handling, and exit
  conditions. Function/tool calls let it set the call outcome and request a
  callback or human handoff.
- **Voice:** ElevenLabs. Low-latency streaming text-to-speech for the agent's
  turns, and (optionally) ElevenLabs/other STT for transcribing the prospect.
  ElevenLabs Conversational AI can also own the turn-taking loop if we want a
  managed orchestrator instead of stitching STT + GPT-4o + TTS ourselves.
- **Telephony:** a programmable voice provider that bridges PSTN audio to our
  service over a real-time media stream (bidirectional audio via WebSocket).
  Twilio Media Streams or Telnyx are the default candidates. The provider owns
  the phone number, dialing, call signaling, and recording.

## Why a media-stream architecture

Cold calling needs sub-second response latency, barge-in (the agent stops
talking when the prospect interrupts), and a live transcript. That requires
streaming audio in both directions, not request/response TTS. The shape is:

```
PSTN ── telephony provider ── media stream (WS) ── ColdPilot worker
                                                     │
                              prospect audio ──► STT ─┤
                                                     ├─► GPT-4o (streaming) ─► ElevenLabs TTS ─► agent audio
                              outcome/tools ◄────────┘
```

This is a long-lived, stateful workload per call, so it belongs in the backend
**worker** process (`backend/src/worker.ts`), not in a request handler. The HTTP
API only enqueues calls and receives provider webhooks; the worker holds the
media-stream sockets and the GPT-4o sessions.

## Call lifecycle

The `Call.status` enum encodes the state machine:

```
QUEUED ─► DIALING ─► IN_PROGRESS ─► COMPLETED
                  └► NO_ANSWER
                  └► VOICEMAIL
   any ───────────► FAILED
```

- **QUEUED** — created by `POST /api/leads/leads/{leadId}/queue-call` (to be
  added). Snapshots the dialed `phoneNumber` from the lead so later edits to the
  lead don't change the call record.
- **DIALING** — the worker asked the telephony provider to place the call.
- **IN_PROGRESS** — media stream connected; GPT-4o + ElevenLabs are live.
- **COMPLETED / NO_ANSWER / VOICEMAIL / FAILED** — terminal. On completion the
  worker writes `outcome`, `durationSeconds`, `recordingUrl`, `transcript`, and a
  GPT-4o-generated `summary`, and updates the parent `Lead.status` (e.g.
  `INTERESTED`, `CALLBACK`, `NOT_INTERESTED`, `DO_NOT_CALL`).

`Call.outcome` (`INTERESTED`, `NOT_INTERESTED`, `CALLBACK`, `NOT_A_FIT`,
`WRONG_NUMBER`, `NO_OUTCOME`) is set by a GPT-4o tool call so the model commits to
a structured result, not just free text.

## Webhooks & idempotency

The telephony provider posts call events (ringing, answered, completed,
recording-ready) to a public backend route, and opens the media-stream socket to
the worker. Every webhook handler must be **idempotent** keyed on
`Call.providerCallId`: providers retry, and duplicate events must not double-dial
or double-count. Validate provider signatures before trusting any event.

## Compliance (do not skip)

Cold outbound calling is regulated. Before the caller dials real numbers:

- Honor `DO_NOT_CALL` — never queue a lead in that status, and set it on request.
- Respect calling-hours windows per the lead's region/timezone.
- Disclose that the call uses an AI voice where the jurisdiction requires it.
- Keep consent/opt-out and recording-consent handling auditable.

These belong in the owning backend layer (the queueing service and the worker),
not as client-side checks.

## Environment variables to add (when wiring it up)

Add to `backend/.env.example` and `backend/src/env.ts` (all optional until the
caller is active, validated together like the existing `SPACES_*` group):

- `OPENAI_API_KEY` — GPT-4o access.
- `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` — TTS voice.
- `TELEPHONY_PROVIDER`, `TELEPHONY_ACCOUNT_SID`/`TELEPHONY_API_KEY`,
  `TELEPHONY_AUTH_TOKEN`, `TELEPHONY_FROM_NUMBER` — outbound dialing.
- `AI_CALLER_PUBLIC_BASE_URL` — public HTTPS base the provider uses for webhooks
  and the media-stream WebSocket.

Store call recordings in DigitalOcean Spaces (see [STORAGE.md](STORAGE.md)) and
keep only the `recordingUrl` on the `Call` row.

## Implementation order (deferred)

1. Provider spike: place one outbound call and echo audio over a media stream in
   the worker.
2. Add the queue route + a `calls` service that creates `Call` rows and asks the
   provider to dial.
3. Stream loop: STT → GPT-4o (streaming, with outcome/callback/handoff tools) →
   ElevenLabs → caller audio, with barge-in.
4. Persist transcript, summary, recording, outcome; reconcile `Lead.status`.
5. Signed, idempotent webhooks + compliance guards (DNC, hours, disclosure).
6. Integration tests against provider sandboxes; never dial real numbers in CI.
