import { body, src, type RawSubject } from "./types";

export const htmlCssSubject: RawSubject = {
  slug: "html-css",
  title: "HTML & CSS",
  description:
    "Semantic structure first, then styling that stays readable: box model, flexbox, grid and theming.",
  icon: "</>",
  colorHex: "#0ea5e9",
  level: "beginner",
  order: 2,
  modules: [
    {
      slug: "structure",
      title: "Structure",
      description: "Mark content up so browsers, tools and screen readers agree.",
      order: 1,
    },
    {
      slug: "styling",
      title: "Styling",
      description: "Box model, flexbox and custom properties.",
      order: 2,
    },
  ],
  lessons: [
    {
      slug: "semantic-html",
      title: "Semantic HTML",
      description:
        "Pick elements for their meaning, and most of the accessibility comes for free.",
      moduleSlug: "structure",
      objectives: [
        "Choose headings that form a correct outline",
        "Use landmark elements: header, nav, main, footer",
        "Label form controls so assistive tech can announce them",
      ],
      estimatedMinutes: 9,
      difficulty: "beginner",
      order: 1,
      body: body(
        "HTML describes what content *is*. A browser can style a **div** to look like a button, but only **button** is focusable, fires on Enter and Space, and tells a screen reader it is a button.",
        "## Headings form an outline",
        "Use one **h1** per page and never skip levels: **h1 then h2 then h3**. Many screen-reader users move between headings, so a skipped level reads like a missing section.",
        "## Landmarks",
        "**header**, **nav**, **main**, **aside** and **footer** create regions people can jump between. There should be exactly one **main** per page, and a skip link before it lets keyboard users bypass the navigation.",
        "## Forms",
        "Every control needs a **label** whose **for** matches the control's **id**. Group related fields with **fieldset** and **legend**, mark required fields with **required**, and let the **type** attribute do validation work: type=email and type=number also bring up the right keyboard on phones.",
        "> If you are adding a click handler to a div, ask whether a real button or link was the right element.",
      ),
      codeExamples: [
        {
          label: "A labelled form inside landmarks",
          language: "html",
          runnable: false,
          code: src(
            "<main>",
            "  <h1>Create your account</h1>",
            "  <form>",
            "    <fieldset>",
            "      <legend>Contact</legend>",
            "      <label for=\"email\">Email</label>",
            "      <input id=\"email\" name=\"email\" type=\"email\" required autocomplete=\"email\" />",
            "    </fieldset>",
            "    <button type=\"submit\">Sign up</button>",
            "  </form>",
            "</main>",
          ),
        },
      ],
      related: [{ label: "CSS layout", href: "/subjects/html-css/lessons/css-layout" }],
    },
    {
      slug: "css-layout",
      title: "CSS layout",
      description:
        "The box model, flexbox for one dimension, grid for two, and custom properties for theming.",
      moduleSlug: "styling",
      objectives: [
        "Predict how width, padding and border combine",
        "Lay out a responsive card row with flexbox and gap",
        "Theme a page with CSS custom properties",
      ],
      estimatedMinutes: 11,
      difficulty: "beginner",
      order: 1,
      body: body(
        "Every element is a rectangular box: content, then padding, then border, then margin. By default **width** applies to the content box only, which makes layouts look wider than expected. **box-sizing: border-box** makes width include padding and border, which is what most people expect.",
        "## One dimension: flexbox",
        "Set **display: flex** on the parent to arrange children in a row or column. **gap** replaces margin hacks, **justify-content** distributes along the main axis and **align-items** across it. **flex-wrap: wrap** plus **flex: 1 1 16rem** gives a row of cards that reflows on small screens with no media query.",
        "## Two dimensions: grid",
        "**display: grid** with **grid-template-columns** is the shorter description for page shells — for example **grid-template-columns: 16rem 1fr** for sidebar plus content. **repeat(auto-fit, minmax(15rem, 1fr))** gives a responsive card grid.",
        "## Theming",
        "Declare values once with custom properties (**--brand-600: #5b3fd1**) and read them with **var(--brand-600)**. Redefine them inside a **prefers-color-scheme: dark** block and the whole page follows.",
      ),
      diagram: {
        title: "The box model, outside in",
        steps: [
          { label: "margin", detail: "Space outside the element; collapses vertically between siblings." },
          { label: "border", detail: "Drawn edge; always counted in the rendered box." },
          { label: "padding", detail: "Space inside the border; the background paints here too." },
          { label: "content", detail: "Text or children. width applies here unless box-sizing is border-box." },
        ],
      },
      codeExamples: [
        {
          label: "Responsive card row",
          language: "css",
          runnable: false,
          code: src(
            ".cards {",
            "  display: flex;",
            "  flex-wrap: wrap;",
            "  gap: 1rem;",
            "}",
            "",
            ".card {",
            "  flex: 1 1 16rem;",
            "  box-sizing: border-box;",
            "  padding: 1rem;",
            "  border: 1px solid var(--line);",
            "  border-radius: 0.75rem;",
            "}",
          ),
        },
      ],
      related: [{ label: "Semantic HTML", href: "/subjects/html-css/lessons/semantic-html" }],
    },
  ],
  questions: [
    {
      kind: "single",
      prompt: "Which element should trigger an action on a page?",
      options: ["div with onclick", "a with href=\"#\"", "button", "span with role=\"text\""],
      answer: 2,
      explanation:
        "button is focusable, activates with Enter and Space and is announced as a button. Reproducing that on a div needs tabindex plus key handlers.",
      difficulty: "beginner",
      lessonSlug: "semantic-html",
    },
    {
      kind: "multiple",
      prompt: "Which practices produce a correct heading outline?",
      options: [
        "One h1 per page",
        "Skipping from h1 to h4 for smaller text",
        "Choosing heading level by visual size",
        "Nesting h3 under h2",
      ],
      answer: [0, 3],
      explanation: "Headings describe structure, not size — style them with CSS instead of skipping levels.",
      difficulty: "beginner",
      lessonSlug: "semantic-html",
    },
    {
      kind: "true_false",
      prompt:
        "With box-sizing: border-box, an element with width 200px and padding 20px renders 200px wide.",
      answer: true,
      explanation: "border-box counts padding and border inside the declared width, so the content shrinks instead.",
      difficulty: "beginner",
      lessonSlug: "css-layout",
    },
    {
      kind: "single",
      prompt:
        "Which declaration creates a card grid that adapts to its container without a media query?",
      options: [
        "display: grid with grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr))",
        "display: block with width: 33%",
        "float: left with width: 300px",
        "display: table with table-layout: fixed",
      ],
      answer: 0,
      explanation:
        "auto-fit with minmax packs in as many tracks of at least 15rem as fit, then stretches them to fill the row.",
      difficulty: "intermediate",
      lessonSlug: "css-layout",
    },
  ],
};

export const webSecuritySubject: RawSubject = {
  slug: "web-security",
  title: "Web Security",
  description:
    "How the common browser attacks work — and the exact defences that stop them, including CSP.",
  icon: "SH",
  colorHex: "#f97316",
  level: "intermediate",
  order: 3,
  modules: [
    {
      slug: "browser-attacks",
      title: "Browser attacks",
      description: "XSS and clickjacking, with the headers that stop them.",
      order: 1,
    },
    {
      slug: "data-and-auth",
      title: "Data & auth",
      description: "Injection, password storage and session handling.",
      order: 2,
    },
  ],
  lessons: [
    {
      slug: "cross-site-scripting",
      title: "Cross-site scripting (XSS)",
      description:
        "How injected script runs inside someone else's session, and how Content-Security-Policy limits the damage.",
      moduleSlug: "browser-attacks",
      objectives: [
        "Distinguish stored, reflected and DOM-based XSS",
        "Explain why context-aware escaping beats blocklists",
        "Write a CSP that blocks injected script while keeping the app working",
      ],
      estimatedMinutes: 12,
      difficulty: "intermediate",
      order: 1,
      body: body(
        "XSS means attacker-controlled JavaScript runs inside a victim's page, so it inherits the page's origin: it can read anything not marked HttpOnly, call your APIs as the victim, and rewrite the DOM. The three routes differ only in where the payload waits — **reflected** comes back in the response, **stored** lives in your database, **DOM-based** never reaches the server at all.",
        "## Escaping depends on context",
        "The same string needs different encoding in different places. Text inside an element needs HTML entity encoding, an attribute needs quoting plus encoding, a **script** block needs JavaScript escaping, and a URL needs **encodeURIComponent** behind a scheme allowlist. Blocklists are not defences — attackers reorder the alphabet of tricks faster than you can blacklist it.",
        "## Content-Security-Policy",
        "CSP is a header the browser enforces even when you missed an injection point. **script-src 'self'** stops inline script, **object-src 'none'** kills plugins, **frame-ancestors 'none'** prevents framing, and **base-uri 'self'** blocks base-tag hijacking. Roll it out with **Content-Security-Policy-Report-Only** before enforcing.",
        "> Defence in depth: escape on output, send a CSP, mark cookies HttpOnly and SameSite, and add X-Content-Type-Options: nosniff.",
      ),
      diagram: {
        title: "Stored XSS in a learning platform",
        steps: [
          { label: "1 · inject", detail: "Attacker posts a lesson comment containing a script payload." },
          { label: "2 · store", detail: "The server saves the raw text and returns it from the comments API." },
          { label: "3 · render", detail: "The victim's browser assigns it with innerHTML, so the script executes." },
          { label: "4 · abuse", detail: "The payload reads what it can and posts it to an attacker server." },
          { label: "5 · stop", detail: "Render as text content instead, and keep the CSP switched on." },
        ],
        note: "The fix belongs at step 3. CSP turns an account takeover into a broken feature.",
      },
      codeExamples: [
        {
          label: "Headers worth copying",
          language: "http",
          runnable: false,
          code: src(
            "Content-Security-Policy: default-src 'self'; script-src 'self';",
            "  style-src 'self' 'unsafe-inline'; img-src 'self' data:;",
            "  object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
            "X-Content-Type-Options: nosniff",
            "Referrer-Policy: strict-origin-when-cross-origin",
            "Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax; Path=/",
          ),
          explanation: "The CSP is wrapped here only to keep the snippet narrow — send it as a single header.",
        },
      ],
      related: [
        {
          label: "Injection and passwords",
          href: "/subjects/web-security/lessons/injection-and-passwords",
        },
      ],
    },
    {
      slug: "injection-and-passwords",
      title: "Injection and passwords",
      description:
        "Parameterised queries, modern password hashing, and session rules that survive a breach.",
      moduleSlug: "data-and-auth",
      objectives: [
        "Rewrite an injectable query as a parameterised one",
        "Choose argon2id or bcrypt over a fast hash",
        "Apply session rules: rotation, expiry, revocation",
      ],
      estimatedMinutes: 10,
      difficulty: "intermediate",
      order: 1,
      body: body(
        "SQL injection is not solved by escaping quotes in application code — it is solved by keeping code and data on separate channels. A **parameterised statement** sends the query structure and the values separately, so a value that looks like SQL stays a value.",
        "## Password storage",
        "Never store passwords in plain text, and skip bare MD5 or SHA-256: they are fast, which is exactly what an attacker with a GPU wants. Use **argon2id** with sensible parameters, or **bcrypt** when the platform lacks argon. Hashing is one-way verification, not encryption — there is no key to lose and nothing to decrypt.",
        "## Sessions",
        "Issue session cookies that are **HttpOnly**, **Secure** and **SameSite=Lax**. Rotate the session identifier on login and on password change, so a value captured beforehand stops working. Revoke sessions when the password changes, and keep short-lived access tokens separate from refresh tokens.",
        "> Rate-limit anything that answers yes or no: login, password reset and one-time codes.",
      ),
      codeExamples: [
        {
          label: "Injectable versus parameterised",
          language: "sql",
          runnable: false,
          code: src(
            "// Never assemble SQL from request data:",
            "// \"SELECT * FROM users WHERE email = '\" + email + \"'\"",
            "",
            "// Parameterised — the value cannot change the query shape:",
            "SELECT id, email FROM users WHERE email = $1;",
          ),
          explanation:
            "With a placeholder the driver transmits the value separately, so quotes inside it are data rather than syntax.",
        },
      ],
      related: [
        {
          label: "Cross-site scripting",
          href: "/subjects/web-security/lessons/cross-site-scripting",
        },
      ],
    },
  ],
  questions: [
    {
      kind: "single",
      prompt: "Which XSS variant never sends the payload to the server?",
      options: ["Stored", "Reflected", "DOM-based", "None — all XSS passes through the server"],
      answer: 2,
      explanation:
        "DOM-based XSS lives entirely in client code that reads location.hash, postMessage or similar and writes it into the DOM unsafely.",
      difficulty: "intermediate",
      lessonSlug: "cross-site-scripting",
    },
    {
      kind: "multiple",
      prompt: "Which headers help stop XSS? Select all that apply.",
      options: [
        "Content-Security-Policy: script-src 'self'",
        "X-Content-Type-Options: nosniff",
        "Cache-Control: no-store",
        "frame-ancestors 'none'",
      ],
      answer: [0, 1, 3],
      explanation:
        "CSP restricts script sources, nosniff blocks MIME sniffing, frame-ancestors stops framing. Cache-Control only affects caching.",
      difficulty: "intermediate",
      lessonSlug: "cross-site-scripting",
    },
    {
      kind: "true_false",
      prompt: "Escaping single quotes in user input is a reliable defence against SQL injection.",
      answer: false,
      explanation:
        "It is fragile across charsets, numeric contexts and identifiers. Parameterised statements keep code and data separate.",
      difficulty: "beginner",
      lessonSlug: "injection-and-passwords",
    },
    {
      kind: "single",
      prompt: "Which is the best choice for storing passwords?",
      options: ["SHA-256", "AES-256 encryption", "argon2id", "Base64"],
      answer: 2,
      explanation:
        "argon2id is memory-hard and slow by design. Encryption is reversible with the key, and Base64 is an encoding, not protection.",
      difficulty: "intermediate",
      lessonSlug: "injection-and-passwords",
    },
    {
      kind: "short_answer",
      prompt:
        "Which cookie attribute keeps a session value away from document.cookie? Answer with the attribute name.",
      answer: "httponly",
      explanation:
        "HttpOnly marks the cookie invisible to JavaScript, so injected script cannot read it directly.",
      difficulty: "beginner",
      lessonSlug: "injection-and-passwords",
    },
  ],
};
