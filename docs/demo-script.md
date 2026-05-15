# Kastonom Demo Script

## 3-Minute Demo Flow

**0:00-0:30 - Set the stage**

Kastonom is a no-prompt AI advertising engine for ecommerce SMEs. Instead of asking a shop owner to write prompts, it reads commerce data and turns it into a creative decision.

**0:30-1:10 - Product intelligence**

Open the dashboard. Show the product list, highlight the recommended product, and explain the hype score and trend potential. Emphasize that the recommendation comes from product, stock, sales, and audience signals.

**1:10-1:50 - Creative brief**

Open the selected product insight page. Show audience summary, creative angle, hook, main claim, CTA, forbidden claims, and fallback notes. Explain that this structured brief is the contract between commerce intelligence and video generation.

**1:50-2:30 - Video job**

Generate the campaign. Show the backend-created video job and provider status. If live provider mode is unavailable, show the mock provider fallback and explain that the demo is deterministic by design.

**2:30-3:00 - Final ad preview**

Show the final ad preview. Close with how Kastonom lets SMEs move from product data to AI ad creative without prompt engineering.

## User Story

As an ecommerce SME owner, I want Kastonom to choose a product and generate a video ad brief automatically, so I can launch creative tests without learning AI prompting or hiring a creative team for every product.

## Screen-by-Screen Explanation

### Dashboard

- Shows products from mock ERP or commerce data.
- Shows recommendation signals.
- Lets user select a product or start campaign generation.

### Product Insight Page

- Shows selected product details.
- Shows hype score, trend potential, sales velocity, stock movement, and audience fit.
- Explains why the product is recommended now.

### Creative Brief Preview

- Shows structured brief created by the MCP / AI layer.
- Includes creative angle, tone, visual style, hook, CTA, forbidden claims, and fallback notes.
- Makes clear that the frontend displays the brief but does not generate it.

### Video Generation Status

- Shows campaign id, provider, status, and fallback label when applicable.
- Polls backend for job updates.
- Does not call provider APIs from the frontend.

### Final Ad Preview

- Shows completed or mock video preview.
- Displays provider name and whether the result is live or mock.
- Keeps fallback state transparent.

## Fallback Demo If Live API Fails

Use mock provider mode when:

- Provider credentials are missing.
- Provider API is unavailable.
- Network is unreliable.
- Live generation would take too long for the demo.

Fallback demo script:

1. State that live providers are adapter-based and can be swapped.
2. Show that the same creative brief and prompt payload are produced.
3. Run the job through `MockPromptAdapter` and mock provider.
4. Show deterministic final preview.
5. Explain that fallback mode proves the core orchestration flow.

Do not pretend mock output is live provider output.

## Judge-Facing Explanation

Kastonom connects operational commerce signals to generative video systems. The defensible part is not just video generation; it is the structured decision layer that chooses what to promote, why now, to whom, and with which creative angle.

## Key Pitch Lines

- "No prompt engineering for the merchant."
- "Frontend presents, backend orchestrates, MCP decides."
- "Commerce data becomes a creative brief."
- "Provider adapters let us use Pollo, Kling, Runway, or a mock provider."
- "Fallback mode keeps the hackathon demo reliable."

## What To Avoid Saying

- Do not say the MVP has production ERP integration unless it has been implemented.
- Do not say mock video output came from a live provider.
- Do not claim the AI knows customer demographics beyond supplied data.
- Do not promise automatic media buying.
- Do not imply unsupported product claims, discounts, or guarantees.

