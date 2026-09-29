import { body, src, type RawSubject } from "./types";

export const pythonSubject: RawSubject = {
  slug: "python",
  title: "Python",
  description:
    "Readable scripting for data and automation: types, control flow, comprehensions and functions.",
  icon: "PY",
  colorHex: "#facc15",
  level: "beginner",
  order: 4,
  modules: [
    {
      slug: "basics",
      title: "Basics",
      description: "Values, printing and conditionals.",
      order: 1,
    },
    {
      slug: "collections",
      title: "Collections",
      description: "Lists, loops and comprehensions.",
      order: 2,
    },
  ],
  lessons: [
    {
      slug: "variables-and-types",
      title: "Variables and types",
      description:
        "Dynamic typing, f-strings, and the difference between rebinding a name and mutating a value.",
      moduleSlug: "basics",
      objectives: [
        "Convert between str, int and float deliberately",
        "Format output with f-strings",
        "Recognise which values are falsy",
      ],
      estimatedMinutes: 8,
      difficulty: "beginner",
      order: 1,
      body: body(
        "Python has no declaration keyword: **xp = 240** binds the name xp to the integer 240. Types live on the values, not the names, so the same name can later hold a string — which is convenient and also why you should convert explicitly.",
        "## Numbers are not strings",
        "Input from a file or the command line arrives as **str**. **\"5\" + 3** raises TypeError rather than guessing, which is the language telling you to convert: **int(\"5\") + 3** is 8, and **float(\"2.5\")** reads decimals. Integer division with **//** floors the result, **%** gives the remainder, and **** is the exponent operator.",
        "## f-strings",
        "An f-string prefixes a literal with **f** and interpolates braces: **f\"{name} scored {score:.1f}%\"** rounds to one decimal place. This is the idiomatic way to build messages — no concatenation, no **+** chains.",
        "## Falsy values",
        "Empty containers count as false: **\"\"**, **[]**, **{}**, **()**, **set()**, along with **0**, **0.0**, **None** and **False**. That makes **if items:** the natural emptiness check. Use **is None** rather than **== None** when testing for a missing value.",
        "> Choose names in snake_case and let the type show through: questions_done, not qd.",
      ),
      codeExamples: [
        {
          label: "Converting and formatting",
          language: "python",
          runnable: true,
          code: src(
            "name = \"Ada\"",
            "score_text = \"87.5\"",
            "score = float(score_text)",
            "",
            "print(name, score, type(score).__name__)",
            "print(f\"{name} scored {score:.1f}%\")",
            "print(7 // 2, 7 % 2, 2 ** 3)",
          ),
          explanation:
            "float() turns the string into a number, so arithmetic works and the f-string can format it.",
        },
        {
          label: "Empty values are false",
          language: "python",
          runnable: true,
          code: src(
            "answers = []",
            "",
            "if not answers:",
            "    print(\"No answers submitted yet\")",
            "",
            "score = 0",
            "print(score or \"not attempted\")",
            "print(score if score is not None else \"missing\")",
          ),
        },
      ],
      related: [{ label: "Lists and loops", href: "/subjects/python/lessons/lists-and-loops" }],
    },
    {
      slug: "lists-and-loops",
      title: "Lists and loops",
      description:
        "Index and slice sequences, iterate with enumerate, and build lists with comprehensions.",
      moduleSlug: "collections",
      objectives: [
        "Slice and copy a list without aliasing it",
        "Iterate with index and value using enumerate",
        "Replace an append loop with a comprehension",
      ],
      estimatedMinutes: 10,
      difficulty: "beginner",
      order: 1,
      body: body(
        "A **list** is an ordered, mutable sequence written in square brackets. Indexing starts at 0 and negative indexes count from the end, so **items[-1]** is the last element.",
        "## Slicing",
        "**items[1:3]** returns a new list with elements 1 and 2 — the stop index is excluded. **items[:2]** takes the first two, **items[2:]** everything from index 2 onward, and **items[::-1]** reverses. Slicing copies, which matters because **b = a** only creates a second name for the same list: append to b and a changes too.",
        "## Looping",
        "**for item in items:** is the direct form. When you need positions, **for index, item in enumerate(items):** avoids manual counters. **zip()** walks two sequences in parallel, and **sum**, **min**, **max**, **len** and **sorted** cover most aggregates without a loop at all.",
        "## Comprehensions",
        "A list comprehension folds a build-and-append loop into one expression: **squares = [n * n for n in range(5)]**. Add a filter with **if**, and use a dictionary comprehension for keyed results. If a comprehension needs more than one **for** or a nested condition, write the loop instead — clarity beats cleverness.",
      ),
      codeExamples: [
        {
          label: "enumerate and copy",
          language: "python",
          runnable: true,
          code: src(
            "lessons = [\"values\", \"control flow\", \"arrays\"]",
            "",
            "for index, title in enumerate(lessons, start=1):",
            "    print(index, title)",
            "",
            "same = lessons",
            "copy = lessons[:]",
            "copy.append(\"sets\")",
            "print(len(same), len(copy))",
          ),
          explanation:
            "same and lessons are the same list, so only copy grows: 3 and 4.",
        },
        {
          label: "Comprehensions",
          language: "python",
          runnable: true,
          code: src(
            "minutes = [12, 0, 25, 8]",
            "",
            "studied = [value for value in minutes if value > 0]",
            "doubled = [value * 2 for value in studied]",
            "by_lesson = {name: len(name) for name in [\"values\", \"loops\"]}",
            "",
            "print(studied, sum(studied), doubled, by_lesson)",
          ),
        },
      ],
      related: [
        { label: "Variables and types", href: "/subjects/python/lessons/variables-and-types" },
      ],
    },
  ],
  questions: [
    {
      kind: "single",
      prompt: "What does \"5\" + 3 do in Python?",
      options: ["Prints 8", "Prints \"53\"", "Raises TypeError", "Prints 5 3"],
      answer: 2,
      explanation:
        "Python refuses to guess. Convert with int(\"5\") or str(3) so the intent is explicit.",
      difficulty: "beginner",
      lessonSlug: "variables-and-types",
    },
    {
      kind: "multiple",
      prompt: "Which values are falsy in a condition?",
      options: ["[]", "0.0", "\"0\"", "None"],
      answer: [0, 1, 3],
      explanation:
        "Empty containers, zero and None are falsy. The one-character string \"0\" is non-empty, so it is truthy.",
      difficulty: "beginner",
      lessonSlug: "variables-and-types",
    },
    {
      kind: "code",
      prompt:
        "Run the snippet. Expected output: [12, 25, 8] then 45, on two separate lines.",
      answer: "studied, 45",
      expectedOutput: "[12, 25, 8]\n45",
      starterCode: src(
        "minutes = [12, 0, 25, 8]",
        "",
        "studied = [value for value in minutes if value > 0]",
        "total = sum(studied)",
        "",
        "print(studied)",
        "print(total)",
      ),
      explanation:
        "The comprehension drops the zero, and the built-in sum() avoids a manual accumulator loop.",
      hint: "filter with if value > 0, then use sum().",
      points: 3,
      difficulty: "beginner",
      lessonSlug: "lists-and-loops",
    },
    {
      kind: "single",
      prompt: "Which statement creates an independent copy of the list items?",
      options: ["copy = items", "copy = items[:]", "copy = items.append([])", "copy = list"],
      answer: 1,
      explanation:
        "A full slice copies the list. copy = items only adds a second name for the same object.",
      difficulty: "intermediate",
      lessonSlug: "lists-and-loops",
    },
    {
      kind: "short_answer",
      prompt:
        "Which built-in function yields both index and value while iterating a list? Answer with the function name.",
      answer: "enumerate",
      explanation:
        "enumerate(items, start=1) removes the need for a manually maintained counter variable.",
      difficulty: "beginner",
      lessonSlug: "lists-and-loops",
    },
  ],
};

export const sqlSubject: RawSubject = {
  slug: "sql",
  title: "SQL & Databases",
  description:
    "Query relational data with confidence: selection, joins, grouping, indexes and transactions.",
  icon: "DB",
  colorHex: "#22c55e",
  level: "intermediate",
  order: 5,
  modules: [
    {
      slug: "querying",
      title: "Querying",
      description: "SELECT, WHERE, ORDER BY and joins.",
      order: 1,
    },
    {
      slug: "shaping-data",
      title: "Shaping data",
      description: "Aggregation, indexes and transactions.",
      order: 2,
    },
  ],
  lessons: [
    {
      slug: "selecting-and-filtering",
      title: "Selecting and filtering",
      description:
        "How a query is evaluated, why NULL needs its own operators, and how to join related tables.",
      moduleSlug: "querying",
      objectives: [
        "Order the clauses of a SELECT correctly",
        "Handle NULL with IS NULL instead of =",
        "Join tables and choose INNER versus LEFT",
      ],
      estimatedMinutes: 11,
      difficulty: "intermediate",
      order: 1,
      body: body(
        "A SELECT statement is written in one order and evaluated in another. Write **SELECT ... FROM ... JOIN ... WHERE ... GROUP BY ... HAVING ... ORDER BY ... LIMIT**; believe the evaluation order **FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT** when something behaves unexpectedly.",
        "## NULL is unknown, not empty",
        "**NULL = NULL** is not true — it evaluates to unknown, so the row is filtered out. Use **IS NULL** and **IS NOT NULL**, and remember that aggregates ignore NULLs: **AVG(score)** divides by the number of non-null scores, which is usually what you want but worth knowing. **COALESCE(score, 0)** supplies a default for display.",
        "## Joins",
        "An **INNER JOIN** keeps only rows that match on both sides. A **LEFT JOIN** keeps every row from the left table and fills the right side with NULL when there is no match — the right choice for \"list all lessons, with their quiz score if any\". A condition on the right side belongs in the **ON** clause of a LEFT JOIN; putting it in **WHERE** silently turns the join back into an inner join.",
        "> Count rows per table before and after joining. If the count grows, the join is multiplying rows and your aggregate will be wrong.",
      ),
      codeExamples: [
        {
          label: "Filtering and joining",
          language: "sql",
          runnable: false,
          code: src(
            "SELECT l.title, a.percent",
            "FROM lessons AS l",
            "LEFT JOIN attempts AS a",
            "  ON a.lesson_id = l.id AND a.user_id = $1",
            "WHERE l.subject_id = $2",
            "  AND a.percent IS NULL OR a.percent < 70",
            "ORDER BY l.position",
            "LIMIT 5;",
          ),
          explanation:
            "The user condition sits in the ON clause, so lessons with no attempt still appear with NULL percent.",
        },
      ],
      related: [{ label: "Joins and aggregation", href: "/subjects/sql/lessons/joins-and-aggregation" }],
    },
    {
      slug: "joins-and-aggregation",
      title: "Joins and aggregation",
      description:
        "Group rows with GROUP BY and HAVING, then make queries fast with the right index.",
      moduleSlug: "shaping-data",
      objectives: [
        "Aggregate with COUNT, SUM and AVG correctly",
        "Filter groups with HAVING rather than WHERE",
        "Reason about index column order and transactions",
      ],
      estimatedMinutes: 12,
      difficulty: "intermediate",
      order: 1,
      body: body(
        "Aggregation collapses many rows into few. **COUNT(*)**, **SUM(column)**, **AVG(column)**, **MIN** and **MAX** do the arithmetic, and everything in the SELECT list that is not an aggregate must appear in **GROUP BY**.",
        "## WHERE filters rows, HAVING filters groups",
        "**WHERE** runs before grouping, so it cannot reference an aggregate. **HAVING COUNT(*) > 5** runs after grouping and can. Put row-level conditions in WHERE — it reduces the work the aggregate has to do — and keep HAVING for aggregate tests.",
        "## Indexes",
        "An index is a sorted lookup structure. A composite index on **(user_id, created_at)** answers questions about one user ordered by time, and the leftmost column rule means the same index also helps queries filtering on **user_id** alone but not on **created_at** alone. Index the columns you filter and sort by; every index also slows down writes, so do not spray them everywhere.",
        "## Transactions",
        "Wrap related writes in a transaction so they succeed or fail together: **BEGIN** ... **COMMIT**, with **ROLLBACK** on error. That is what keeps a grade record and its XP award consistent. Concurrent writers can still interleave, so choose an isolation level deliberately — the default in PostgreSQL is **READ COMMITTED**.",
        "> Compare COUNT(*) with COUNT(column): the latter skips rows where the column is NULL.",
      ),
      codeExamples: [
        {
          label: "Aggregate per grouping key",
          language: "sql",
          runnable: false,
          code: src(
            "SELECT s.title,",
            "       COUNT(a.id) AS attempts,",
            "       AVG(a.percent) AS avg_percent,",
            "       MAX(a.created_at) AS last_attempt",
            "FROM subjects AS s",
            "JOIN lessons AS l ON l.subject_id = s.id",
            "LEFT JOIN attempts AS a ON a.lesson_id = l.id AND a.user_id = $1",
            "GROUP BY s.id, s.title",
            "HAVING COUNT(a.id) > 0",
            "ORDER BY avg_percent DESC;",
          ),
          explanation:
            "Grouping by the primary key keeps the title valid, and COUNT(a.id) counts only real attempts.",
        },
      ],
      related: [
        { label: "Selecting and filtering", href: "/subjects/sql/lessons/selecting-and-filtering" },
      ],
    },
  ],
  questions: [
    {
      kind: "single",
      prompt: "Which clause filters the groups produced by GROUP BY?",
      options: ["WHERE", "HAVING", "ORDER BY", "LIMIT"],
      answer: 1,
      explanation:
        "WHERE filters rows before grouping and cannot reference aggregates; HAVING runs after grouping.",
      difficulty: "intermediate",
      lessonSlug: "joins-and-aggregation",
    },
    {
      kind: "multiple",
      prompt: "Which statements about NULL are correct?",
      options: [
        "NULL = NULL evaluates to unknown",
        "COUNT(column) skips NULLs",
        "IS NULL always returns false",
        "COALESCE(score, 0) can supply a default",
      ],
      answer: [0, 1, 3],
      explanation:
        "Comparing with = yields unknown, so use IS NULL. Aggregates ignore NULLs, and COALESCE picks the first non-null value.",
      difficulty: "intermediate",
      lessonSlug: "selecting-and-filtering",
    },
    {
      kind: "true_false",
      prompt:
        "Moving a condition on the right table of a LEFT JOIN from WHERE into ON changes which rows are returned.",
      answer: true,
      explanation:
        "Conditions in WHERE are applied after the join and remove unmatched rows, effectively making it an inner join.",
      difficulty: "intermediate",
      lessonSlug: "selecting-and-filtering",
    },
    {
      kind: "single",
      prompt:
        "Which index best supports queries that filter one user and sort by recency?",
      options: [
        "An index on created_at only",
        "A composite index on (user_id, created_at)",
        "A composite index on (created_at, user_id)",
        "An index on every column of the table",
      ],
      answer: 1,
      explanation:
        "Leading with the equality column and following with the sort column matches the leftmost-prefix rule and avoids a sort step.",
      difficulty: "advanced",
      lessonSlug: "joins-and-aggregation",
    },
    {
      kind: "short_answer",
      prompt:
        "Which SQL statement group makes several writes succeed or fail together? Answer with one of the keywords involved.",
      answer: "transaction",
      explanation:
        "BEGIN opens a transaction, COMMIT makes it durable and ROLLBACK discards it, so related writes stay consistent.",
      difficulty: "intermediate",
      lessonSlug: "joins-and-aggregation",
    },
  ],
};


