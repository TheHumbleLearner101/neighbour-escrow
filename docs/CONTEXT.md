# Context

Read this first. It explains why the project exists, who it's for, and what it's being judged on. Every build decision should serve this.

## Why this exists

*Joel owns this text. Do not rewrite it. It becomes the top of the README once Joel finalises it.*

We used to know our neighbours. You could knock next door and borrow a ladder, kids played out front, and if you needed a hand, someone on the road could help. Most of that is gone. Big companies decide what we eat and what it costs, while the tomatoes growing two doors down go to waste. And as AI and rising costs squeeze ordinary people, now's the time to lean on each other again.

[Name] is a way back to that. Someone on the street starts a campaign: a street party, a bouncy castle for the kids, a pothole that needs fixing. Neighbours chip in, the money waits in a smart contract, and a local business or neighbour gets paid once the street agrees the job is done. If it doesn't happen, everyone gets their money back.

It matters most where trust is lowest. Say you've just arrived in a new country. You don't know anyone, and you might not have a local bank account yet. With [Name], you can chip in to your street's party the week you arrive, and nobody has to trust anybody. The money waits in the contract until the job is done. No bank account needed, no middleman holding it. Just neighbours.

## Who it's for

- **Residents of one street or neighbourhood.** The pilot is a soi in Rawai, Phuket: a mix of Thai and foreign residents.
- **Local businesses** that provide events and services: bouncy castle and party hire, caterers, cleaners, trades. They get paid through the app and can sponsor events.
- **Newcomers** who don't yet have a local bank account or local contacts.

Most users are not crypto people. The app must feel like a normal community app.

## Why onchain

- The money sits in the contract, not with an organiser. It only releases to the person who did the work, once backers approve.
- Goal missed or work rejected: every backer is refunded automatically, for cents on Base.
- Every campaign and completed job leaves a public record, so reputation is real.
- Anyone can join with an email login. No local bank account needed.

## Business model and distribution

- Free for residents.
- Local businesses pay a small cut on jobs that come through the app, or a fee to be a verified provider (roadmap, not MVP).
- Organisers bring their own backers; partner businesses bring their customers and can back events as named sponsors.

## What we're building it for

The Colosseum Crypto World's Fair hackathon, entered in the Base track. Submission deadline: 11:59pm PT, Mon 12 Oct 2026.

Judges score six things. Here is what each one means for the build:

| Criterion | What it means for us |
| --- | --- |
| Functionality and code quality | The full loop must work end to end on Base Sepolia. Clean, tested contract. |
| Potential impact | Covered by Joel in the README and pitch. |
| Novelty | Street events funded by neighbours, paid out only on approval, refunded automatically. Keep that loop sharp; don't dilute it with extra features. |
| UX | Mobile first, email login, no crypto jargon (see below). |
| Open source and composability | Public repo, MIT licence, a clear contract interface and events that anyone could build on. |
| Business plan | Covered by Joel. |

## UX language rules

Users are neighbours, not crypto people.

- Say "chip in", "money back", "paid", "your street". Avoid "token", "gas", "approve", "wallet address" in the main UI.
- Never show raw hex addresses in the main UI. Show names, and put explorer links in a details view.
- Every money state should be obvious at a glance: raising, booked, waiting for votes, paid, refunded.
