# Tap2Order Monti

## Local verification

Copy `server/.env.example` and `client/.env.example` to local `.env` files and
set real values outside Git. `AUTH_SECRET` must be a unique random value of at
least 32 bytes; `STAFF_PIN` is the single shared staff credential.

Run the checks with Node `22.12.0` or newer:

```bash
cd server && npm ci && npm test
cd ../client && npm ci && npm run lint && npm run build
```

## Database changes

The repository contains a pending Prisma migration that aligns the schema with
the application and adds safe indexes/idempotency support. Do not apply it
directly to production: first back up the database, run it on staging, then use
`prisma migrate deploy` in a planned maintenance window.

This repository intentionally has CI verification only. Production deployment,
server restart and migration execution require a separate reviewed runbook.
# Room Service QR verifikacija

Gostujući Room Service koristi dvostepenu verifikaciju. Prvo otvaranje štampanog
QR URL-a kreira petominutnu pending sesiju. Gost zatim kamerom ponovo skenira QR,
nakon čega verificirana sesija podrazumijevano traje 60 minuta. U bazi se čuva
samo SHA-256 hash nasumičnog session tokena; raw token je dostupan samo kao
HttpOnly cookie.

Produkcijska konfiguracija koristi `PUBLIC_CLIENT_URL` kao jedini dozvoljeni
origin skeniranog QR-a. TTL vrijednosti se mogu podesiti sa
`ROOM_PENDING_TTL_SECONDS` i `ROOM_VERIFIED_TTL_SECONDS`.

## Sigurnosno ograničenje statičnog QR-a

Dva skeniranja istog statičnog QR-a nisu kriptografski dokaz fizičke prisutnosti.
Osoba koja već posjeduje puni QR URL može ga ponovo prikazati kameri ili ručno
replayati. Ovaj tok otežava slučajno dijeljenje aktivne browser sesije, ali ne
sprječava replay same QR tajne.

Ako hotel zahtijeva jači dokaz prisutnosti, potrebno je dodati nezavisan PIN koji
se nalazi u sobi ili dinamički kratkotrajni QR sa nonce vrijednošću, expiryjem i
serverskim potpisom. Nonce mora biti jednokratan i server ga mora atomarno
označiti iskorištenim.
