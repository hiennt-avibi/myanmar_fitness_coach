# Mingalar Fit visual system

Current direction (2026-11-13): **MingalarFit** — warm cream ground, white cards with thin warm outlines, one brick-red accent, Plus Jakarta Sans. Source: the MingalarFit · Light/Dark pages of the design canvas (30 mobile screens each). This supersedes the white/orange FitnessUIUX direction. Migration is phased: phase 1 (tokens, fonts, shape) is done; shell, onboarding and per-screen layouts follow.

`src/app/solaris.css` loads last and owns the final tokens and refinements. New code uses the `--brand*`, `--bubble`, `--line-strong`, `--track` names. Legacy names stay mapped for existing components: `--lime` = primary CTA fill (brand), `--accent` = readable brand text, `--forest` = strong ink emphasis. Tailwind/shadcn tokens map to these variables.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| paper / surface | #FFFAF6 / #FFFFFF | #1E1A18 / #2A2421 | page / cards |
| surface-2 / bubble | #FBF1EB | #332B28 | soft fills, coach bubble |
| ink / ink-2 | #26211E / #4A403B | #FFFFFF / #E3D9D4 | primary / strong secondary text |
| muted | #6E625C | #A39690 | secondary text (≥5:1 on paper and surface) |
| line / line-strong | #F1DFD6 / #E8D6CC | #3D3430 / #4A403B | outlines / input and secondary-button borders |
| track | #F6E7DF | #3D3430 | progress tracks |
| brand (lime) | #C93A20, hover #B8341C | same | primary CTA fill, white text 5.1:1 |
| brand-text (accent) | #B8341C | #FF8A70 | links and selected text |
| brand-soft | #FFE9DF | #3A2620 | selected option fill, avatar |
| danger | #B3261E | #FF8A80 | destructive text |
| c-train / c-water | #08a54c / #08b6d5 | #20c976 / #16c3e1 | training / water data |
| c-meal / c-photo | #E0662A / #6531c7 | #FF8A70 / #a174f0 | food / photo data |

Shell (phase 2): five bottom tabs (My plan · Exercises · Water & food · Goals · Me), muted labels, the current tab in brand-text with a 3px brand bar above the icon. On mobile there is no app bar: My plan opens with date + greeting and the round 44px controls (appearance, inbox, profile avatar); other tabs start with their own heading. Language and appearance are also rows in Me; during sign-in and onboarding the top bar keeps only language and appearance. No floating coach button: the coach is reached from My plan and Me. Desktop keeps the sidebar (active item brand-soft) and a slim top bar; content max 1120px.

Sign-in and onboarding (phase 3): one column (max 440px) on every screen size. Welcome = brand, coach bubble, headline, illustrated example week, then Start with email / Continue with Google / Sign in. Each onboarding question is asked by the coach (bee avatar + speech bubble) under a back button, 'Question n of N' and a 4px progress bar; answers are text cards with a radio (one) or checkbox (several) mark; numbers use a large typed value with press-and-hold minus/plus; Continue is always a sticky full-width pill (no auto-advance). The plan-building screen lists the real save steps as they finish, then 'See my plan'.

Flat surfaces only: no shadows, glows or gradients. Cards 20px corners, lists and option cards 14px, buttons are pills (primary 54px tall, secondary 44–48px). Selected options: brand-soft fill with a 2px brand border. Lists are one bordered block with hairline separators and a › chevron. Light is the default; saved dark/system preferences remain available.

Plus Jakarta Sans 400/600/700/800 (Latin + Vietnamese) for everything; Noto Sans Myanmar 400/700 for Burmese. All fonts self-hosted via @fontsource, OFL-1.1. Body 16px, secondary 14px, main heading 28px, section heading 19px, actions 15–17px. Burmese headings 26px with 1.6 line height; body 1.75–1.85 where needed. Keep syllables intact. Data numbers use tabular figures. Touch targets ≥44px. Bottom tabs: 22–25px icons, 12px labels, active tab in brand-text.

Home: greeting → daily/7-day-average ring cards → current plan/week → coach → other ways to train → activity breakdown/history → meal photo. Put the workout action above optional statistics. All charts use real data. Missing history stays missing; weekly averages include recorded days only. Rest remains valid training credit under the existing product rules.

Onboarding: one subject per screen; illustrated current and desired body preferences; equipment/experience/body/schedule/health inputs; review with edit links before saving. Hide unrelated mobile tabs and header actions during intake, retaining language and appearance controls. Body diagrams are original vectors: never use them to estimate fat percentage or promise a physical result. Same choices are editable in Profile.

Mobile first: review 390px, 320px and 1440px in English/Myanmar and light/dark. Zero horizontal overflow; never solve wrapping by hiding page overflow. Respect reduced motion. Use existing Playwright CLI and record runtime evidence in root `evidence/`; see root `docs/TESTING_GUIDE.md`. References and input behaviour: `docs/SOLARIS_UI_REFERENCE.md` and `docs/ONBOARDING_RESEARCH.md` at workspace root.
