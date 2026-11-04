# Pager — Production Readiness Audit

Audit baseline: `main` at `a877c9657411efa7cd1e271b2bf7e786dcefe544`.
Working branch: `SIDE`.

## Confirmed findings from source inspection

### Critical security and correctness
- Wallet identity is accepted from request bodies by user, bounty, and submission APIs without server-side signature verification. Client-supplied wallet addresses are not authentication.
- Submission approval API accepts IDs and changes submission/bounty state without verifying that the caller owns the bounty, that the submission belongs to it, or that the submission is pending.
- Bounty creation and submission creation accept client-supplied wallet identity and do not independently validate transaction receipts or on-chain event/bounty details.
- Mapbox popup content interpolates bounty username and description into HTML through `setHTML`, creating an injection risk.
- Upload endpoint accepts any uploaded file and reads the entire file into memory without explicit content-type, size, or format validation.
- Solidity ERC-20 `transferFrom` and `transfer` return values are ignored; constructor addresses are not validated; no reentrancy guard or safe-transfer wrapper is present.

### Application functionality
- UI links to `/bounty/[id]` and `/profile/[username]`, but those routes are absent from the tracked source tree.
- Navigation hides the desktop navigation below the medium breakpoint without a visible replacement navigation.
- Like, comment, edit-profile, and notifications controls are placeholders or non-persistent UI.
- Profile participation loads submissions for every bounty using one request per bounty, and profile filtering depends on mutable usernames rather than stable user IDs.
- Bounty feed loads all submissions with one request per bounty, producing an N+1 request pattern.
- Search query is interpolated into a regex without escaping and the request URL is not encoded.
- Map markers skip coordinates equal to zero due to truthiness checks; map and marker instances are not removed on unmount.
- Map preview instances are not removed on unmount, and their coordinates are trusted without validation.
- UserContext parses localStorage JSON without handling malformed data and does not clear persisted state when setUser(null) is called.
- Image uploader has no file validation, does not reset the input, and does not expose keyboard-accessible upload interaction.

### Configuration and validation
- Both `next.config.js` and `next.config.ts` are tracked.
- Both `postcss.config.js` and `postcss.config.mjs` are tracked and configure different Tailwind PostCSS pipelines.
- `package.json` has only `dev`, `build`, `start`, and `lint` scripts. No explicit typecheck or test script is configured.
- Existing Solidity test is the default Hardhat Lock example and does not test PagerEscrow.
- README has setup content but does not document complete environment variables or feature lifecycle.

## Important verification limitations

This audit is based on source and repository metadata inspection. A local dependency install, `npm run build`, browser/runtime test, live MongoDB/Cloudinary/Mapbox integration test, wallet test, and Solidity test execution have not been run in this environment. Findings that require those environments remain unverified.

## Security remediation approach

Do not add a wallet authentication shortcut based on a body-supplied address. A robust implementation needs a nonce/challenge and server-side signature verification with expiration and replay protection, plus authenticated session handling. On-chain escrow semantics must be reconciled against the deployed contract and real deployment addresses before modifying contract ABI or payout flow.