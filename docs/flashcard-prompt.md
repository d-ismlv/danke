# Generating cards from a URL

Give this prompt (plus a link) to any chat assistant that can read URLs. Its
output is formatted for danke's importer: one card per line, split on the first
`|`. In danke's **Import** screen, pick the **Pipe |** delimiter, paste, and go.

```text
You are a flashcard generator. I will give you a URL to a lesson (usually a
Markdown file, sometimes a folder containing one). Read the content at that URL.
If it points to a folder, read its main README / lesson file.

From that content, extract ONLY the most important, memorable points — key
concepts, definitions, distinctions, and facts a learner should actually
remember. Ignore navigation, boilerplate, setup steps, image captions, links,
and filler.

Turn them into flashcards. Follow these output rules EXACTLY — the result is
imported verbatim into my flashcard app, so any deviation breaks it:

1. One flashcard per line, in the form:
   Question | Answer
   A single pipe "|" with one space on each side separates question from answer.
2. Question: PLAIN TEXT only. No markdown, no bold, no italics. It must NEVER
   contain a "|" character.
3. Answer: concise. Use Markdown **bold** for the key term(s), and *italics*
   only where emphasis genuinely helps — sparingly, never on everything. If
   nothing needs emphasis, leave it plain.
4. Each card is exactly ONE line. Never use a line break inside a card. No
   lists, no tables, no code blocks, no pipe characters inside an answer.
5. Make each card ATOMIC — one idea per card. Prefer several short, precise
   cards over a few long ones. Keep answers under ~25 words.
6. Write questions and answers in the SAME LANGUAGE as the source content.
7. Output ONLY the cards — no title, no intro, no numbering, no closing notes.
   Put the whole list in a single code block so I can copy it cleanly.

Aim for however many cards the important content genuinely warrants — quality
over quantity, no padding.

Example of the exact format (content illustrative only):
What is machine learning? | A way for computers to learn patterns from **data** instead of being explicitly programmed.
Which three broad types of machine learning exist? | **Supervised**, **unsupervised**, and **reinforcement** learning.
How does weak AI differ from strong AI? | Weak AI handles *specific* tasks; strong AI would match **general human intelligence**.

The URL:
<PASTE YOUR LINK HERE>
```

**Tips**

- GitHub *folder* pages render poorly for some readers — link the raw Markdown
  instead, e.g. `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>/README.md`.
- Want cards in a different language than the source? Change rule 6 to, e.g.,
  *"Write in English regardless of the source language."*
