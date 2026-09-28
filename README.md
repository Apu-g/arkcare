# ArkCare

A telehealth + CareQuest platform: patients book appointments, meet their doctor
over realtime video, and follow a clinician-approved care plan. Clinicians file a
consultation report that AI structures, that is anchored on a local blockchain for
non-repudiation, and that automatically generates daily missions, a knowledge
check, and a gamified "Capsule" reward loop — all audited in a hospital-admin
console.

> **Demo data only.** All seeded records are synthetic. This is not a medical
> device and produces no clinical advice.

---

## ⚠️ First: you need the environment files (from the admin)

This repo does **not** include credentials. To run it you must obtain these
files from the repo owner / admin:

| File | Used by | What it holds |
| --- | --- | --- |
| `frontend.env` | copy → `Frontend/.env.local` | Groq, Pusher, Razorpay, Cloudinary, Agora, Pinecone, QStash, `AUTH_SECRET`, MongoDB URI |
| `backend.env` | copy → `Backend/.env` | Groq, Pinecone, internal AI token |
| `arkcare.env` | root fallback (optional) | same keys, loaded as a fallback by the Next config |

**Ask the admin for these three files.** Do not commit them — they are already
git-ignored. Once you have them, place them like this:

```bash
cp frontend.env  Frontend/.env.local   # frontend config
cp backend.env   Backend/.env          # backend config
cp arkcare.env   arkcare.env           # optional root fallback
```

`Frontend/.env.local.example` documents every variable and its purpose if you
need to build your own.

---

## Run it (one command)

Requirements: **Node.js 18+**, **Python 3.11 or 3.12**, and internet access
(for the external AI/Agora/Pusher/Cloudinary providers). MongoDB is downloaded
automatically if you don't have a local server.

```bash
# after placing the env files as above
./scripts/start-local-all.sh
```

This starts everything and is safe to re-run (idempotent):

| Service | Address | Notes |
| --- | --- | --- |
| MongoDB | `127.0.0.1:27017` | downloaded to `.runtime/mongodb` if absent; db `arkcare` |
| FastAPI backend | `http://127.0.0.1:8000` | AI chat + report parsing + prescription OCR |
| Next.js frontend | `http://localhost:3000` | the app |
| Hardhat EVM | `http://127.0.0.1:8545` | local chain (in-memory) |
| CareQuest bridge | `http://127.0.0.1:8546` | talks to the chain for the app |

Check health any time:

```bash
./scripts/status-local-all.sh
```

Stop it:

```bash
./scripts/stop-local-all.sh
```

The first run sets everything up automatically (MongoDB download, `npm ci`,
Python virtualenv, contract deploy). Give it a few minutes.

### Seed the demo data

```bash
cd Frontend && npm run seed:demo        # users, appointments, care programs
cd Frontend && npm run seed:hospitals   # multi-hospital network (admins, doctor assignment)
```

`seed:demo` creates synthetic demo users, appointments, and a CareQuest care
program. `seed:hospitals` creates the hospital network: a **platform (master)
admin**, one **hospital admin per hospital**, and distributes the demo doctors
across the hospitals.

### Open the app

Go to `http://localhost:3000` and sign in with a demo account (password for all:
`DemoOnly!123`):

| Role | Email |
| --- | --- |
| Patient | `demo.patient@arkcare.local` |
| Doctor | `demo.doctor@arkcare.local` |
| Hospital admin (demo) | `demo.hospital_admin@arkcare.local` |
| Hospital admin (Sunrise) | `admin@sunrise-care-hospital.local` |
| **Platform / master admin** | `demo.platform_admin@arkcare.local` |

## Multi-hospital network

ArkCare runs as a network of **independent hospitals**. Each hospital has its own
Capsule program, doctors, patients, and its own **separate audit chain** — data
and provenance are isolated per hospital.

- **Patient → Hospitals** (`/patient/hospitals`): browse every hospital, its
  **reputation**, and confirm its audit chain is valid.
- **Hospital admin → My hospital** (`/admin/hospital`): your hospital's
  reputation, per-patient engagement leaderboard, and your own audit head.
- **Platform (master) admin → Network** (`/admin/platform`): a master console
  over **every** hospital — reputation, where every audit went, and each
  hospital's independent chain head / integrity.

> **Reputation, not revenue.** A hospital's reputation is simply the
> participation its own patients have generated. It is a **quality signal, not a
> claimable balance** — Capsules are hospital-specific, non-transferable
> participation units that are never cashed out. The blockchain is a
> non-clinical proof rail and holds no monetary value.

---

## Try it on your phone (video calls)

Video calls need **HTTPS** (browsers block the camera on plain `http://IP`).
The helper exposes the app over a temporary HTTPS tunnel:

```bash
./scripts/serve-phone.sh            # prints a public https://… URL
./scripts/serve-phone.sh --status   # show the current URL
./scripts/serve-phone.sh --stop     # stop the tunnel
```

Open that URL on your phone, sign in as the **patient**, and on your computer
sign in as the **doctor** to start a call. (The URL is random and changes on
each start.)

---

## How the pieces fit

- **Frontend** — `Frontend/` (Next.js App Router). Patient, doctor, staff and
  hospital-admin views; CareQuest dashboards; chat with realtime video/audio.
- **Backend** — `Backend/` (FastAPI). AI chat, medical-report parsing, and
  `POST /ocr_prescription` (tesseract) to read prescription images.
- **Blockchain** — `Blockchain/` (Hardhat + Solidity). Local chain holding
  non-transferable Capsule tokens and an audit-anchor contract. It is a
  **non-clinical proof rail**: everything keeps working if it's offline, and no
  patient identifiers ever go on-chain (only hashes/counts).
- **CareQuest runbook** — see `CAREQUEST.md`.
- **Local dev details** — see `scripts/LOCAL-DEV.md`.

### The doctor report → care plan → quiz loop

1. A doctor files a consultation **Report** (remarks, activity advice, and a
   prescription that can be a photo).
2. **AI** OCRs any attached image and structures the doctor's own text into
   reviewed JSON. It never invents a medication or dose, and flags low-confidence
   OCR.
3. On submit, the content is **hashed and anchored on-chain** (so a filed
   prescription can't be later denied), audited, and an **approved care plan** is
   auto-published with daily missions and a **4-question knowledge check**
   (retrieved from `carequest_quiz_bank.json` by relevance to the report).
4. The patient takes the quiz on their CareQuest page, earning **Capsules** as
   they complete missions — tracked on the animated gauge and in the hospital
   admin **audit log**.

---

## Security notes

- Env files with live secrets are git-ignored and must come from the admin.
- Reports are append-only; a correction is a new anchored revision, never an
  edit or delete.
- The AI assists documentation only; it cannot prescribe or approve anything.
- Capsule tokens are non-transferable participation credits — not
  cryptocurrency, no cash value.

## Stack

Next.js · React · FastAPI · MongoDB/Mongoose · Groq · Pusher · Agora ·
Cloudinary · Pinecone · Hardhat · Solidity · tesseract
