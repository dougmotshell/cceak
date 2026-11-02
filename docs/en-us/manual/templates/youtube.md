Information classification (ISO/IEC 27001): Internal Use.
Brand: Intelie · cceak

# YouTube: script, subtitles, description and video sheet (short form)

One sheet and one script per video. Use `TODO:` for missing data. Never record personal data, tokens, real channel IDs or private video IDs. A person uploads and publishes, after approval.

- **Video sheet:** working title, goal, aggregate audience, estimated duration, audio and subtitle languages, official link, status, publisher, approval.
- **Script:** one row per scene with start and end times, narration, on-screen content and relevant visual description. Times must increase without overlap.
- **Subtitles:** SRT or VTT, reviewed by a person if the transcript is automatic. `node scripts/subtitle-check.mjs` must return 0.
- **Description and chapters:** first two paragraphs, official link, chapters starting at 00:00 in ascending order. Check the minimum chapter rules and title, description and tag limits against YouTube's official documentation.
- **Accessibility:** complete speech subtitles, relevant sounds in brackets, description of informative visuals, legible on-screen text, no rapid flashing.
- **Rights:** third-party music, images, clips, fonts and marks need a recorded licence; every person on screen needs recorded authorisation. No personal or customer data.
- **Approval:** human approval recorded before upload.

The Portuguese template is the source of truth: `docs/pt-br/manual/templates/youtube.md`.
