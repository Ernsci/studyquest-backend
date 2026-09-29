import { body, src, type RawLesson, type RawQuestion, type RawSubject } from "./types";

type LessonInput = {
  slug: string;
  title: string;
  moduleSlug: string;
  description: string;
  minutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  objectives: string[];
  sections: string[];
  example: string;
  code: string[];
  explanation?: string;
};

function lesson(input: LessonInput): RawLesson {
  return {
    slug: input.slug,
    title: input.title,
    moduleSlug: input.moduleSlug,
    description: input.description,
    objectives: input.objectives,
    body: body(...input.sections),
    codeExamples: [{
      label: input.example,
      language: "java",
      runnable: false,
      code: src(...input.code),
      ...(input.explanation ? { explanation: input.explanation } : {}),
    }],
    estimatedMinutes: input.minutes,
    difficulty: input.difficulty,
    order: 0,
  };
}

const lessons: RawLesson[] = [
  lesson({ slug: "java-and-the-jvm", title: "Java, the JDK, and your first program", moduleSlug: "foundations", description: "Understand source code, the compiler, bytecode, and the Java runtime before writing your first class.", minutes: 14, difficulty: "beginner", objectives: ["Distinguish the JDK, JVM, source code, and bytecode", "Compile and run a small Java class", "Read the structure of a main method"], sections: [
    "Java is a statically typed, class-based language. You write source files ending in **.java**. The Java compiler (**javac**) checks the source and turns it into platform-independent bytecode in **.class** files. A Java Virtual Machine (JVM) runs that bytecode on a specific operating system.",
    "## JDK, JVM, and the launch command",
    "The Java Development Kit (JDK) includes the compiler, runtime, and development tools. In a terminal, **javac Hello.java** compiles a class and **java Hello** launches it. Modern Java can also run a single source file with **java Hello.java**, which is convenient for small experiments.",
    "## Program entry point",
    "A traditional application starts in **public static void main(String[] args)**. The class name must match the file name when the class is public. Java statements end with semicolons and blocks use braces. Java is case-sensitive: **String** and **string** are different names.",
    "> Compile often. The compiler is an early feedback tool: fix the first clear error, then compile again.",
  ], example: "A first Java program", code: ["public class Hello {", "    public static void main(String[] args) {", "        System.out.println(\"Hello, Java!\");", "    }", "}"], explanation: "Save as Hello.java, compile with javac Hello.java, then run java Hello." }),
  lesson({ slug: "variables-and-types", title: "Variables and primitive types", moduleSlug: "foundations", description: "Declare values with clear types and choose primitives or reference types deliberately.", minutes: 16, difficulty: "beginner", objectives: ["Declare variables with explicit types or local var", "Choose between int, long, double, boolean, and char", "Explain the difference between a primitive and a reference"], sections: [
    "Java checks types at compile time. A declaration names a type and a variable: **int attempts = 3;**. A local variable may use **var** when its initializer makes the type obvious, but **var** is still statically typed and cannot be used for fields or method parameters.",
    "## Primitive values",
    "The eight primitives are **byte**, **short**, **int**, **long**, **float**, **double**, **char**, and **boolean**. Use **int** for ordinary whole numbers, **long** for larger integer ranges, and **double** for general floating-point calculations. Add **L** to a long literal when needed, such as **9_000_000_000L**.",
    "## References and defaults",
    "Strings, arrays, and objects are reference types. A reference can be **null**; a primitive cannot. Fields receive default values, but local variables must be assigned before use. Prefer **final** for a value that should not be reassigned.",
    "> Choose the narrowest type that correctly expresses the value, and use descriptive names such as completedLessons.",
  ], example: "Types and constants", code: ["int completedLessons = 4;", "long population = 8_100_000_000L;", "double passRate = 0.75;", "boolean passed = passRate >= 0.70;", "final String course = \"Java\";", "System.out.println(course + \": \" + passed);"] }),
  lesson({ slug: "operators-and-strings", title: "Operators, conversions, and strings", moduleSlug: "foundations", description: "Use arithmetic and comparisons safely, and build text without accidental type conversions.", minutes: 17, difficulty: "beginner", objectives: ["Predict integer division and remainder", "Convert numeric values explicitly", "Compare strings by value and format output"], sections: [
    "Arithmetic operators include **+**, **-**, **\***, **/**, and **%**. If both operands are integers, division truncates toward zero: **7 / 2** is **3**. Use a floating-point operand when you need a fractional result. Integer overflow wraps around, so use **Math.addExact** when overflow must be detected.",
    "## Conversion and equality",
    "Widening conversions such as **int** to **long** happen automatically. Narrowing conversions need a cast and may lose information. **==** compares primitive values, but for objects it compares identity. Compare string contents with **equals** (or **Objects.equals** when either side may be null).",
    "## Build readable strings",
    "The **+** operator concatenates strings. **StringBuilder** is useful when building text repeatedly in a loop. **String.format** and **printf** support formatted output; use **Locale.ROOT** when output must be independent of the machine's locale.",
  ], example: "Integer math and string comparison", code: ["int whole = 7 / 2;", "double fraction = 7 / 2.0;", "int remainder = 7 % 2;", "String language = new String(\"Java\");", "System.out.printf(\"%d, %.1f, %d%n\", whole, fraction, remainder);", "System.out.println(language.equals(\"Java\"));"] }),
  lesson({ slug: "conditionals-and-switch", title: "Decisions with if and switch", moduleSlug: "control-flow", description: "Express branches clearly and use switch expressions to produce values.", minutes: 15, difficulty: "beginner", objectives: ["Build if/else branches with boolean conditions", "Avoid accidental switch fall-through", "Use a switch expression for a value"], sections: [
    "Use **if**, **else if**, and **else** to choose between paths. Conditions must be boolean; Java does not treat numbers or strings as truthy or falsy. Put the most specific branches first and use braces consistently, even for one statement.",
    "## Switch statements and expressions",
    "A traditional **switch** statement can fall through between cases if you omit **break**. The arrow form **case X ->** does not fall through. A switch expression returns a value, covers its cases explicitly, and can use **yield** in a multi-statement block.",
    "## Compare values correctly",
    "Use **==** for primitive comparisons and **equals** for object values such as strings. When branching on enums, a switch expression can make adding a new enum value visible to the compiler.",
  ], example: "A switch expression", code: ["String label = switch (score / 10) {", "    case 10, 9 -> \"excellent\";", "    case 8, 7 -> \"good\";", "    case 6 -> \"passing\";", "    default -> \"keep practising\";", "};", "System.out.println(label);"] }),
  lesson({ slug: "loops-and-iteration", title: "Loops and iteration", moduleSlug: "control-flow", description: "Repeat work with for, while, and enhanced for loops without off-by-one errors.", minutes: 16, difficulty: "beginner", objectives: ["Choose a loop based on whether the count is known", "Use break and continue deliberately", "Iterate through arrays and collections"], sections: [
    "Use a **for** loop when the iteration count or index matters, a **while** loop when repetition depends on a condition, and **do/while** when the body must run at least once. The enhanced **for** loop reads each array or collection element without exposing an index.",
    "## Boundaries and loop control",
    "Array indexes begin at zero and end at **length - 1**, so the common loop condition is **i < array.length**. **break** exits the nearest loop; **continue** skips to its next iteration. A labeled break can leave nested loops, but extracting a method is often clearer.",
    "## Avoid changing what you are iterating",
    "Changing a collection's structure during an enhanced for loop can cause **ConcurrentModificationException**. Use an iterator's **remove** method, a collection's **removeIf**, or build a new collection instead.",
  ], example: "Index and enhanced loops", code: ["int[] scores = {82, 95, 71};", "int total = 0;", "for (int i = 0; i < scores.length; i++) {", "    total += scores[i];", "}", "for (int score : scores) {", "    System.out.println(score);", "}", "System.out.println(total);"] }),
  lesson({ slug: "methods-and-overloading", title: "Methods, parameters, and overloading", moduleSlug: "control-flow", description: "Break programs into methods with clear inputs, outputs, and responsibilities.", minutes: 18, difficulty: "beginner", objectives: ["Define methods with return types and parameters", "Explain Java's pass-by-value behavior", "Use overloads without creating ambiguity"], sections: [
    "A method names a unit of behavior. Its signature includes its name and parameter types; its return type describes the result. **void** means it returns no value. Return early for invalid or completed cases to reduce deeply nested code.",
    "## Parameters are passed by value",
    "Java always passes arguments by value. For an object parameter, the copied value is a reference to the same object, so the method can mutate that object; reassigning the parameter does not reassign the caller's variable. This is not pass-by-reference.",
    "## Overloading and varargs",
    "Methods can share a name when their parameter lists differ. The compiler chooses an overload using the argument types; return type alone cannot distinguish overloads. A varargs parameter (**String... values**) behaves like an array and must be the final parameter.",
  ], example: "A small, testable method", code: ["static double average(int[] values) {", "    if (values.length == 0) {", "        throw new IllegalArgumentException(\"values must not be empty\");", "    }", "    long sum = 0;", "    for (int value : values) sum += value;", "    return (double) sum / values.length;", "}", "System.out.println(average(new int[] {80, 90}));"] }),
  lesson({ slug: "arrays-and-copying", title: "Arrays and array operations", moduleSlug: "data-modeling", description: "Store fixed-size sequences and understand copying, sorting, and array utilities.", minutes: 15, difficulty: "beginner", objectives: ["Create and traverse one-dimensional arrays", "Copy arrays without aliasing the same storage", "Use Arrays utilities for sorting and comparison"], sections: [
    "An array has a fixed length and stores values of one component type. **int[] scores = new int[3]** creates three zero-initialized integers. Indexing out of bounds throws **ArrayIndexOutOfBoundsException** at runtime.",
    "## Copying and sorting",
    "Assigning one array variable to another copies only the reference; both names point to the same array. Use **Arrays.copyOf** or **System.arraycopy** to copy elements. **Arrays.sort** sorts in place, while **Arrays.equals** compares elements by value.",
    "## Choose the right structure",
    "Arrays are compact and fast when the size is known. When a sequence needs to grow or shrink, use **ArrayList**. For a two-dimensional structure, Java uses arrays of arrays, which may have rows of different lengths.",
  ], example: "Copy, sort, and inspect", code: ["import java.util.Arrays;", "int[] original = {9, 3, 7};", "int[] sorted = Arrays.copyOf(original, original.length);", "Arrays.sort(sorted);", "System.out.println(Arrays.toString(sorted));", "System.out.println(Arrays.equals(original, sorted));"] }),
  lesson({ slug: "classes-and-encapsulation", title: "Classes, objects, and encapsulation", moduleSlug: "object-oriented-java", description: "Model state and behavior while protecting invariants behind a small public API.", minutes: 20, difficulty: "beginner", objectives: ["Define a class with fields and methods", "Create objects with constructors", "Protect state using encapsulation"], sections: [
    "A class defines a type; an object is an instance of that type. Fields hold state and methods define behavior. Each object has its own instance fields, while **static** members belong to the class itself.",
    "## Constructors and invariants",
    "A constructor establishes a valid initial state. Use **this.field = parameter** to distinguish a field from a parameter. Validate inputs at the boundary and keep fields **private** so callers cannot bypass the class's rules.",
    "## Encapsulation is a design tool",
    "Expose operations that make sense for the domain instead of generating getters and setters for every field. A class can return immutable views or copies of mutable state. Keep constructors and methods small enough that their invariants are easy to reason about.",
  ], example: "A class that guards its state", code: ["class Counter {", "    private int value;", "    void increment() { value++; }", "    int value() { return value; }", "}", "Counter counter = new Counter();", "counter.increment();", "System.out.println(counter.value());"] }),
  lesson({ slug: "constructors-records-and-enums", title: "Constructors, records, and enums", moduleSlug: "object-oriented-java", description: "Represent data with constructors, immutable records, and finite enum values.", minutes: 17, difficulty: "intermediate", objectives: ["Use constructor chaining to avoid duplicate initialization", "Choose records for transparent data carriers", "Replace fragile string constants with enums"], sections: [
    "Constructors can delegate to another constructor with **this(...)** as the first statement. A class with final fields can represent immutable state, provided it does not leak mutable internals.",
    "## Records",
    "A **record** is a concise data carrier. The compiler provides a canonical constructor, accessors, **equals**, **hashCode**, and **toString**. Add a compact constructor to validate inputs. A record is only shallowly immutable: a mutable object stored inside it can still change.",
    "## Enums",
    "An enum defines a closed set of instances and can have fields, methods, and constructors. Use it when a value must be one of a known set, rather than passing strings that can contain typos.",
  ], example: "Validated data and finite choices", code: ["enum Status { NEW, ACTIVE, COMPLETE }", "record Lesson(String title, int minutes) {", "    Lesson {", "        if (minutes <= 0) throw new IllegalArgumentException();", "    }", "}", "Lesson lesson = new Lesson(\"Records\", 12);", "System.out.println(lesson.title() + \" (\" + lesson.minutes() + \" min)\");"] }),
  lesson({ slug: "inheritance-and-polymorphism", title: "Inheritance and polymorphism", moduleSlug: "object-oriented-java", description: "Use subtypes and dynamic dispatch carefully, and prefer composition when behavior is shared.", minutes: 19, difficulty: "intermediate", objectives: ["Override methods using @Override", "Explain dynamic dispatch through a base type", "Choose composition instead of unsuitable inheritance"], sections: [
    "A subclass extends a superclass with **extends** and can override accessible instance methods. Add **@Override** so the compiler catches a misspelled method or mismatched signature. Java classes have one direct superclass, while a class can implement many interfaces.",
    "## Polymorphism",
    "A variable typed as a superclass or interface can refer to a subtype. At runtime, an overridden instance method is selected from the object's actual class. Fields are not polymorphic in the same way, and static methods are hidden rather than overridden.",
    "## Prefer composition for reuse",
    "Inheritance communicates an **is-a** relationship and couples subclasses to base-class decisions. If an object merely uses another object's behavior, store that collaborator as a field and delegate. Favor small interfaces and composition for flexible designs.",
  ], example: "Dynamic dispatch through an interface", code: ["interface Notifier { void send(String message); }", "class EmailNotifier implements Notifier {", "    public void send(String message) { System.out.println(\"Email: \" + message); }", "}", "Notifier notifier = new EmailNotifier();", "notifier.send(\"Lesson complete\");"] }),
  lesson({ slug: "interfaces-and-sealed-types", title: "Interfaces and sealed hierarchies", moduleSlug: "object-oriented-java", description: "Define capabilities with interfaces and constrain a type hierarchy when the domain is closed.", minutes: 18, difficulty: "intermediate", objectives: ["Design an interface around a capability", "Use default and static interface methods appropriately", "Describe permitted subtypes with sealed classes"], sections: [
    "An interface defines a contract a class can implement. Program to the interface so callers depend on the capability they need, not a particular implementation. Keep interfaces cohesive; clients should not be forced to implement unrelated methods.",
    "## Default and static methods",
    "A default method provides inherited behavior and can help evolve an interface, but it should not turn the interface into a utility class. Static interface methods belong to the interface and are called through its name.",
    "## Sealed types",
    "A **sealed** class or interface lists its permitted direct subtypes. A permitted subtype must be **final**, **sealed**, or **non-sealed**. Sealed hierarchies make domain alternatives explicit and work well with exhaustive pattern matching in supported Java versions.",
  ], example: "A closed result model", code: ["sealed interface Result permits Success, Failure {}", "record Success(String value) implements Result {}", "record Failure(String reason) implements Result {}", "static String describe(Result result) {", "    return switch (result) {", "        case Success s -> \"OK: \" + s.value();", "        case Failure f -> \"Error: \" + f.reason();", "    };", "}"] }),
  lesson({ slug: "collections-list-set-map", title: "Collections: List, Set, and Map", moduleSlug: "collections-generics", description: "Choose collection interfaces by behavior and use generics for type-safe data structures.", minutes: 20, difficulty: "intermediate", objectives: ["Choose List, Set, or Map for a task", "Use diamond syntax and generic types", "Select a collection implementation based on access patterns"], sections: [
    "The Collections Framework separates interfaces from implementations. **List** preserves order and allows duplicates; **Set** models unique elements; **Map** associates keys with values. Declare variables using the interface and choose a concrete implementation to match the required behavior.",
    "## Common implementations",
    "**ArrayList** offers fast indexed reads and amortized append. **HashSet** and **HashMap** offer expected constant-time lookup when hash codes are well distributed. **TreeSet** and **TreeMap** keep values ordered. **LinkedHashMap** preserves insertion order.",
    "## Generics and equality",
    "Use generics such as **List<String>** so the compiler checks element types. The diamond operator infers constructor type arguments. Hash collections rely on **equals** and **hashCode** agreeing: equal objects must have equal hash codes, and keys should not mutate in ways that change their equality while stored.",
  ], example: "Count words with a map", code: ["import java.util.HashMap;", "import java.util.Map;", "Map<String, Integer> counts = new HashMap<>();", "for (String word : List.of(\"java\", \"code\", \"java\")) {", "    counts.merge(word, 1, Integer::sum);", "}", "System.out.println(counts.get(\"java\"));"] }),
  lesson({ slug: "generics-and-wildcards", title: "Generics, bounds, and wildcards", moduleSlug: "collections-generics", description: "Write reusable type-safe APIs and understand invariance and wildcard bounds.", minutes: 22, difficulty: "advanced", objectives: ["Create a generic class or method", "Explain why List<Integer> is not a List<Number>", "Apply extends and super wildcard bounds"], sections: [
    "A generic class or method declares a type parameter such as **T**. Generic types are invariant: even though Integer extends Number, **List<Integer>** is not a subtype of **List<Number>**. This prevents adding an arbitrary Number to a list that only accepts Integers.",
    "## Upper and lower bounds",
    "Use **? extends T** when an API reads values as T (a producer), and **? super T** when it writes T values (a consumer). The mnemonic **PECS** means Producer Extends, Consumer Super. A wildcard is useful at an API boundary; a named type parameter is clearer when two inputs must share the same type.",
    "## Type erasure",
    "Java implements most generics with type erasure: type arguments are checked at compile time and are not generally available as distinct runtime classes. This explains restrictions such as not creating **new T[]** directly and not using **instanceof List<String>**.",
  ], example: "A bounded generic method", code: ["static <T extends Comparable<? super T>> T max(List<T> values) {", "    if (values.isEmpty()) throw new IllegalArgumentException();", "    T best = values.get(0);", "    for (T value : values) {", "        if (value.compareTo(best) > 0) best = value;", "    }", "    return best;", "}"] }),
  lesson({ slug: "lambdas-and-functional-interfaces", title: "Lambdas and functional interfaces", moduleSlug: "collections-generics", description: "Pass behavior as a value using functional interfaces, method references, and lambdas.", minutes: 19, difficulty: "intermediate", objectives: ["Recognize a functional interface", "Write a lambda and a method reference", "Keep captured state effectively final"], sections: [
    "A functional interface has one abstract method and can be implemented by a lambda. Common library types include **Predicate<T>** for a test, **Function<T,R>** for a transformation, **Consumer<T>** for an action, and **Supplier<T>** for a value created on demand.",
    "## Lambda syntax",
    "A lambda such as **score -> score >= 70** supplies the implementation. When a lambda only calls an existing method, a method reference such as **String::trim** can be clearer. Captured local variables must be final or effectively final.",
    "## Keep side effects visible",
    "Lambdas are still ordinary code. Prefer transformations that return values over hidden mutation, especially with parallel streams. A small named method is often easier to debug than a long chain of nested lambdas.",
  ], example: "Filter and transform", code: ["List<String> names = List.of(\" Ada \", \"Lin\", \" Grace \");", "List<String> cleaned = names.stream()", "    .map(String::trim)", "    .filter(name -> name.length() >= 4)", "    .toList();", "System.out.println(cleaned);"] }),
  lesson({ slug: "streams-and-collectors", title: "Streams and collectors", moduleSlug: "collections-generics", description: "Express data pipelines with intermediate operations and terminal results.", minutes: 22, difficulty: "intermediate", objectives: ["Distinguish intermediate and terminal operations", "Use map, filter, reduce, and collectors", "Avoid side effects and incorrect parallelization"], sections: [
    "A stream describes a pipeline over data; it does not store the data. Intermediate operations such as **filter** and **map** are lazy. A terminal operation such as **toList**, **count**, or **reduce** triggers the pipeline, and a stream should be consumed only once.",
    "## Transform, then collect",
    "Use **map** to transform each element, **flatMap** to flatten nested streams, and **collect** to build a collection or summary. **Collectors.groupingBy** groups values by a key; **joining** combines strings. Prefer a clear loop when a stream pipeline obscures state or control flow.",
    "## Parallel streams are not automatic speedups",
    "Parallel streams split work across threads, which has overhead and can make shared mutable state unsafe. Measure a real workload first. They fit independent, CPU-heavy operations more readily than small inputs or blocking I/O.",
  ], example: "Group and summarize values", code: ["Map<String, Long> byStatus = lessons.stream()", "    .collect(Collectors.groupingBy(", "        Lesson::status,", "        Collectors.counting()", "    ));"] }),
  lesson({ slug: "exceptions-and-error-design", title: "Exceptions and error handling", moduleSlug: "errors-and-io", description: "Handle exceptional conditions with useful types, context, and resource-safe code.", minutes: 20, difficulty: "intermediate", objectives: ["Distinguish checked and unchecked exceptions", "Throw exceptions with useful context", "Avoid swallowing errors or using exceptions for normal branching"], sections: [
    "An exception signals that normal work could not continue. Checked exceptions must be caught or declared; unchecked exceptions extend **RuntimeException** and often represent invalid arguments or violated assumptions. Choose a specific exception type and include context that helps the caller recover.",
    "## Catch at a boundary",
    "Catch an exception where you can handle it, translate it, or add useful context. Do not catch **Exception** broadly just to continue, and never silently ignore a failure. A `finally` block runs for cleanup, but resource types should usually use try-with-resources instead.",
    "## Design for recovery",
    "Exceptions are not a substitute for ordinary conditionals. Validate user input at boundaries, preserve the original cause when wrapping an exception, and avoid exposing stack traces or implementation details in user-facing messages.",
  ], example: "Validate and preserve the cause", code: ["static int parsePort(String value) {", "    try {", "        int port = Integer.parseInt(value);", "        if (port < 1 || port > 65_535) throw new IllegalArgumentException(\"port out of range\");", "        return port;", "    } catch (NumberFormatException cause) {", "        throw new IllegalArgumentException(\"port must be a number\", cause);", "    }", "}"] }),
  lesson({ slug: "files-and-resource-management", title: "Files and resource management", moduleSlug: "errors-and-io", description: "Read and write files with java.nio.file and close resources reliably.", minutes: 20, difficulty: "intermediate", objectives: ["Use Path and Files for common file tasks", "Manage streams with try-with-resources", "Handle character encoding and I/O failures"], sections: [
    "The **java.nio.file** API represents paths with **Path** and performs common operations through **Files**. Prefer these higher-level helpers to manually managing low-level streams when the whole file fits comfortably in memory.",
    "## Try-with-resources",
    "An object that implements **AutoCloseable** can be declared in a try-with-resources header. Java closes it even if an exception occurs. This is the standard pattern for streams, readers, writers, and many database resources.",
    "## Text encoding and large files",
    "Specify **StandardCharsets.UTF_8** when reading or writing text rather than relying on the machine default. For very large files, process lines as a stream and close that stream with try-with-resources. Validate paths and permissions at the application boundary.",
  ], example: "Write and read UTF-8 text", code: ["Path path = Path.of(\"notes.txt\");", "Files.writeString(path, \"Study a little each day\\n\", StandardCharsets.UTF_8);", "try (var lines = Files.lines(path, StandardCharsets.UTF_8)) {", "    lines.forEach(System.out::println);", "}"] }),
  lesson({ slug: "optional-null-safety", title: "Null handling and Optional", moduleSlug: "errors-and-io", description: "Make absence explicit at API boundaries and avoid Optional misuse.", minutes: 17, difficulty: "intermediate", objectives: ["Prevent common null dereferences", "Use Optional as a return value for possible absence", "Choose map, flatMap, orElse, and orElseGet correctly"], sections: [
    "A null reference represents the absence of an object, but it is easy to forget to check it. Establish clear nullability rules at API boundaries, validate constructor inputs, and return empty collections rather than null when there are no results.",
    "## Optional for possibly absent results",
    "**Optional<T>** makes a possibly missing return value visible to the caller. Use **map** to transform a present value, **orElse** for a fallback value, and **orElseGet** for a fallback computed lazily. Avoid calling **get()** without checking presence.",
    "## Keep it in its lane",
    "Optional is primarily intended as a method return type, not as a field, method parameter, or collection element. It does not replace validation or make a badly designed null-heavy API safe by itself.",
  ], example: "Transform an optional result", code: ["Optional<String> nickname = findNickname(userId);", "String label = nickname", "    .map(String::trim)", "    .filter(name -> !name.isEmpty())", "    .orElse(\"Learner\");", "System.out.println(label);"] }),
  lesson({ slug: "dates-and-regular-expressions", title: "Dates, time, and regular expressions", moduleSlug: "modern-java", description: "Use java.time for real dates and regex for carefully bounded text patterns.", minutes: 18, difficulty: "intermediate", objectives: ["Choose LocalDate, Instant, or ZonedDateTime", "Format and parse time explicitly", "Use regex APIs without confusing matches and contains"], sections: [
    "Use the immutable **java.time** types instead of legacy **Date** and **Calendar**. **LocalDate** is a calendar date without a time zone, **Instant** is a point on the UTC timeline, and **ZonedDateTime** combines a date-time with a time zone's rules.",
    "## Parse and format intentionally",
    "Use **DateTimeFormatter** with an explicit format for external text. Store instants for event timestamps and convert to a user's zone for display. A local time may be ambiguous or nonexistent around daylight-saving transitions, so use a zone-aware type for scheduling.",
    "## Regular expressions",
    "The **Pattern** and **Matcher** APIs support regular expressions. **matches()** checks the entire input; **find()** searches for a matching region. Compile a repeated pattern once and avoid overly complex patterns on untrusted, very long input.",
  ], example: "Parse a date and inspect a pattern", code: ["LocalDate exam = LocalDate.parse(\"2026-06-15\");", "System.out.println(exam.plusDays(7));", "Pattern code = Pattern.compile(\"[A-Z]{2}-\\\\d{4}\");", "System.out.println(code.matcher(\"CS-2048\").matches());"] }),
  lesson({ slug: "modern-java-language-features", title: "Modern Java: var, records, and pattern matching", moduleSlug: "modern-java", description: "Read modern Java syntax and check language-version requirements before adopting new features.", minutes: 20, difficulty: "advanced", objectives: ["Use local var without hiding important types", "Recognize record patterns and pattern matching", "Check the project release level for language features"], sections: [
    "Java evolves in regular releases. A feature may be preview-only in one release and permanent later, so check the project's configured Java release before using it. Build files and CI should agree on the supported JDK.",
    "## Local type inference",
    "Local **var** infers a static type from the initializer; it does not make Java dynamically typed. Use it when the right-hand side makes the type obvious. Avoid it when it hides an important abstraction or produces a vague type such as **var result = get()** with no visible clue.",
    "## Pattern matching and switch",
    "Pattern matching can combine a type test and binding in one operation. Modern switch expressions can match enum constants, values, and supported patterns. Use exhaustive switches for closed models and retain a clear fallback when handling data from an open world.",
  ], example: "Pattern matching for instanceof", code: ["static String describe(Object value) {", "    if (value instanceof String text) {", "        return text.isBlank() ? \"blank\" : text.strip();", "    }", "    return String.valueOf(value);", "}"] }),
  lesson({ slug: "packages-and-build-tools", title: "Packages, Maven, and Gradle", moduleSlug: "foundations", description: "Organize Java source into packages and use a build tool to compile, test, and manage dependencies.", minutes: 22, difficulty: "intermediate", objectives: ["Declare packages and match them to source directories", "Explain what Maven or Gradle manages", "Run a project build and tests with the wrapper"], sections: [
    "Packages organize related types and prevent name collisions. A package declaration appears at the top of a source file, and the directory layout normally mirrors it: **com.example.app** maps to **com/example/app**. Use imports to refer to public types from another package.",
    "## Build tools",
    "Maven and Gradle compile source, resolve declared dependencies, run tests, and package applications. Maven describes project configuration in **pom.xml**; Gradle uses **build.gradle** or **build.gradle.kts**. Pick one for a project and let its wrapper pin the build-tool version.",
    "## Repeatable builds",
    "Use **./mvnw test** or **./gradlew test** so teammates and continuous integration use the checked-in wrapper. Declare the Java release level and dependency versions explicitly. Avoid committing generated output or credentials into the repository.",
  ], example: "A conventional Maven source layout", code: ["src/main/java/com/example/app/Main.java", "src/test/java/com/example/app/MainTest.java", "pom.xml", "", "// From the project root:", "./mvnw test"] }),
  lesson({ slug: "jdbc-and-safe-queries", title: "JDBC, prepared statements, and transactions", moduleSlug: "data-access", description: "Connect Java applications to relational databases with parameterized SQL and reliable resource handling.", minutes: 25, difficulty: "advanced", objectives: ["Use JDBC connections and prepared statements", "Keep SQL values separate from query text", "Commit or roll back related writes in a transaction"], sections: [
    "JDBC is Java's standard API for relational database access. A **DataSource** provides connections, and a **PreparedStatement** sends SQL with parameters. Keep credentials in runtime configuration and never build a query by concatenating user input.",
    "## Parameterized queries",
    "A placeholder such as **?** marks a value. Bind values with typed setter methods, then execute the statement. Parameters represent values, not table or column names; dynamic identifiers need a strict allowlist.",
    "## Transactions and cleanup",
    "Use try-with-resources for connections, statements, and result sets. Group related writes in a transaction: disable auto-commit, execute the work, commit on success, and roll back on failure. Keep transactions short and handle exceptions without returning database details to end users.",
  ], example: "Query with a bound value", code: ["String sql = \"SELECT display_name FROM learners WHERE id = ?\";", "try (Connection connection = dataSource.getConnection();", "     PreparedStatement statement = connection.prepareStatement(sql)) {", "    statement.setLong(1, learnerId);", "    try (ResultSet rows = statement.executeQuery()) {", "        if (rows.next()) System.out.println(rows.getString(\"display_name\"));", "    }", "}"] }),
  lesson({ slug: "threads-and-executors", title: "Threads, executors, and shared state", moduleSlug: "concurrency", description: "Run independent tasks safely with executor services and understand race conditions.", minutes: 24, difficulty: "advanced", objectives: ["Distinguish a task from the thread that runs it", "Use an ExecutorService and shut it down", "Recognize a data race and protect shared mutable state"], sections: [
    "A thread is a path of execution; a task is work that can be scheduled. Creating a thread for every small task is expensive and difficult to manage. **ExecutorService** separates task submission from thread management and provides a place to control lifecycle and concurrency.",
    "## Race conditions and visibility",
    "A race condition occurs when the result depends on the timing of unsynchronized operations. **synchronized**, locks, atomic classes, and concurrent collections provide different coordination guarantees. The Java Memory Model defines when writes by one thread become visible to another.",
    "## Keep concurrency bounded",
    "Use a bounded executor appropriate to the workload and shut it down. Avoid holding locks during slow I/O or calling unknown code while locked. Prefer immutable messages and thread-safe abstractions over shared mutable state.",
  ], example: "Submit tasks and close the executor", code: ["try (var executor = Executors.newFixedThreadPool(4)) {", "    List<Future<Integer>> results = List.of(", "        executor.submit(() -> 20 + 22),", "        executor.submit(() -> 6 * 7)", "    );", "    for (Future<Integer> result : results) {", "        System.out.println(result.get());", "    }", "}"] }),
  lesson({ slug: "completable-future", title: "Asynchronous work with CompletableFuture", moduleSlug: "concurrency", description: "Compose asynchronous operations and handle failures without blocking every step.", minutes: 22, difficulty: "advanced", objectives: ["Compose stages with thenApply and thenCompose", "Combine independent asynchronous results", "Handle failures and choose an executor deliberately"], sections: [
    "**CompletableFuture<T>** represents a result that may become available later. **thenApply** transforms a completed value; **thenCompose** chains a function that itself returns a future. **thenCombine** joins independent results.",
    "## Failure paths",
    "Asynchronous stages can fail. Use **exceptionally**, **handle**, or **whenComplete** according to whether you want to recover, transform both outcomes, or observe completion. Do not silently turn every failure into a plausible-looking default.",
    "## Blocking and executors",
    "Calling **join()** or **get()** blocks the current thread. Compose stages until a synchronous boundary is genuinely needed. The default async executor may not suit blocking I/O; supply a dedicated executor when workload isolation matters.",
  ], example: "Combine independent results", code: ["CompletableFuture<String> name = loadName(id);", "CompletableFuture<Integer> score = loadScore(id);", "CompletableFuture<String> summary = name.thenCombine(", "    score,", "    (n, s) -> n + \" scored \" + s", ");", "summary.thenAccept(System.out::println);"] }),
  lesson({ slug: "jvm-memory-and-garbage-collection", title: "JVM memory and garbage collection", moduleSlug: "jvm-and-quality", description: "Understand object reachability, garbage collection, and how to investigate memory problems.", minutes: 22, difficulty: "advanced", objectives: ["Distinguish stack frames from heap objects conceptually", "Explain reachability-based garbage collection", "Use measurement and profiling before optimizing"], sections: [
    "Each thread has a call stack of frames for active method calls. Objects are generally allocated in a managed heap. These are useful conceptual models; JVM implementations optimize aggressively, so source code does not map one-to-one to machine memory.",
    "## Reachability and collection",
    "Garbage collectors reclaim objects that are no longer reachable from live references. They do not guarantee immediate cleanup or run at a predictable moment. Use try-with-resources for files and sockets; garbage collection is not a resource-management strategy.",
    "## Diagnose before tuning",
    "A memory leak in Java usually means objects remain reachable unintentionally, for example through a static collection or listener that was never removed. Capture measurements, inspect heap usage, and profile representative workloads before changing garbage-collector flags.",
  ], example: "Avoid retaining every processed item", code: ["// Prefer a bounded summary over an unbounded static cache.", "Map<String, Integer> recentCounts = new LinkedHashMap<>();", "void record(String key) {", "    recentCounts.merge(key, 1, Integer::sum);", "    if (recentCounts.size() > 1_000) {", "        recentCounts.remove(recentCounts.keySet().iterator().next());", "    }", "}"] }),
  lesson({ slug: "testing-with-junit", title: "Unit testing with JUnit", moduleSlug: "jvm-and-quality", description: "Write focused tests that make expected behavior and edge cases executable.", minutes: 22, difficulty: "intermediate", objectives: ["Arrange, act, and assert a behavior", "Test boundaries and failure cases", "Keep unit tests deterministic and independent"], sections: [
    "A unit test checks a small unit of behavior without relying on external services. The common structure is **Arrange**, **Act**, **Assert**: set up input, call the behavior, and verify an observable result. A test name should describe the condition and expected outcome.",
    "## Test boundaries, not implementation trivia",
    "Cover ordinary behavior, boundary values, and invalid input. Test public behavior so a refactor that preserves the contract does not break a brittle test. Keep tests isolated and avoid order-dependent shared state.",
    "## Fast feedback and test doubles",
    "Use a fake or mock when a dependency is slow or nondeterministic, but avoid mocking every object. Integration tests should verify important boundaries such as database configuration and serialization. Run the same checks in CI that developers use locally.",
  ], example: "A JUnit 5 test", code: ["class ScoreTest {", "    @Test", "    void roundsToWholePercent() {", "        Score score = new Score(2, 3);", "        assertEquals(67, score.percent());", "    }", "}"] }),
  lesson({ slug: "clean-design-and-patterns", title: "Clean design and useful patterns", moduleSlug: "design-and-capstone", description: "Reduce coupling with cohesive types, dependency inversion, and patterns used for a reason.", minutes: 24, difficulty: "advanced", objectives: ["Recognize high coupling and low cohesion", "Use dependency injection to separate policy from implementation", "Choose patterns only when they simplify a real design"], sections: [
    "Good design keeps related behavior together and limits how much one component must know about another. High cohesion means a type has a focused responsibility; low coupling means changes remain localized. Clear names and small APIs often matter more than clever abstractions.",
    "## Dependency inversion",
    "A high-level policy should depend on a stable abstraction rather than constructing a concrete database or network client itself. Pass dependencies through constructors. This makes substitution and focused testing easier without requiring a framework.",
    "## Patterns solve recurring trade-offs",
    "Strategy swaps an algorithm behind an interface; Factory centralizes complex creation; Builder assembles objects with many optional settings. Patterns add types and indirection, so apply them when they make change or testing easier, not just to match a catalog.",
  ], example: "Inject a storage capability", code: ["interface ProgressStore {", "    void save(String learnerId, int xp);", "}", "final class AwardXp {", "    private final ProgressStore store;", "    AwardXp(ProgressStore store) { this.store = store; }", "    void apply(String learner, int xp) { store.save(learner, xp); }", "}"] }),
  lesson({ slug: "capstone-java-learning-tracker", title: "Capstone: build a learning tracker", moduleSlug: "design-and-capstone", description: "Bring Java fundamentals, collections, file handling, tests, and design together in a small application.", minutes: 30, difficulty: "advanced", objectives: ["Model lessons and study sessions with cohesive types", "Use collections and files to summarize learning", "Plan tests for valid, empty, and invalid input"], sections: [
    "Build a command-line tracker that records a lesson title, subject, and minutes studied. Start with a small model and a service that records sessions. Keep input/output at the edge so the core logic can be tested without a terminal or file system.",
    "## Suggested milestones",
    "1. Define immutable **StudySession** data and validate positive minutes. 2. Add a service that groups minutes by subject with a **Map**. 3. Save and load UTF-8 data using **Files** and try-with-resources. 4. Add JUnit tests for summaries, empty input, and malformed records.",
    "## Stretch goals",
    "Add date-based summaries using **java.time**, a CSV export, or asynchronous import of multiple files. Keep persistence behind an interface if you need to test alternate implementations. Measure before adding concurrency or caching.",
    "> A finished small project with clear tests is a stronger learning artifact than a large unfinished framework demo.",
  ], example: "Summarize minutes by subject", code: ["record StudySession(String subject, int minutes) {}", "Map<String, Integer> totals = new HashMap<>();", "for (StudySession session : sessions) {", "    totals.merge(session.subject(), session.minutes(), Integer::sum);", "}", "totals.forEach((subject, minutes) ->", "    System.out.println(subject + \": \" + minutes + \" min\"));"] }),
];

lessons.forEach((item, index) => { item.order = index + 1; });

function lessonDifficulty(lessonSlug: string): RawQuestion["difficulty"] {
  return lessons.find((item) => item.slug === lessonSlug)?.difficulty ?? "beginner";
}

function single(lessonSlug: string, prompt: string, options: string[], answer: number, explanation: string, difficulty?: RawQuestion["difficulty"]): RawQuestion {
  return { kind: "single", lessonSlug, prompt, options, answer, explanation, difficulty: difficulty ?? lessonDifficulty(lessonSlug) };
}

function multi(lessonSlug: string, prompt: string, options: string[], answer: number[], explanation: string, difficulty?: RawQuestion["difficulty"]): RawQuestion {
  return { kind: "multiple", lessonSlug, prompt, options, answer, explanation, difficulty: difficulty ?? lessonDifficulty(lessonSlug) };
}

function short(lessonSlug: string, prompt: string, answer: string, explanation: string, difficulty?: RawQuestion["difficulty"]): RawQuestion {
  return { kind: "short_answer", lessonSlug, prompt, answer, explanation, difficulty: difficulty ?? lessonDifficulty(lessonSlug) };
}

const questions: RawQuestion[] = [
  single("java-and-the-jvm", "Which tool compiles Java source into bytecode?", ["java", "javac", "javadoc", "jar"], 1, "javac is the Java compiler; java launches compiled classes or source files."),
  single("java-and-the-jvm", "What is the JVM's primary role?", ["Edit .java files", "Run Java bytecode", "Manage source control", "Generate SQL"], 1, "The Java Virtual Machine runs bytecode on a platform-specific runtime."),
  single("variables-and-types", "Which is a primitive Java type?", ["String", "Integer", "boolean", "List"], 2, "boolean is a primitive; String and the wrapper and collection types are references."),
  multi("variables-and-types", "Which statements about Java var are correct?", ["It infers a static local-variable type", "It makes Java dynamically typed", "It requires an initializer", "It can be used for method parameters"], [0, 2], "var is local type inference, still statically typed, and requires an initializer."),
  single("operators-and-strings", "What is the value of 7 / 2 when both values are int?", ["3", "3.5", "4", "Compilation error"], 0, "Integer division truncates the fractional part."),
  single("operators-and-strings", "How should two String values usually be compared by content?", ["a == b", "a.equals(b)", "a > b", "a sameAs b"], 1, "equals compares String contents; == compares object identity."),
  single("conditionals-and-switch", "What does an arrow case (case X ->) in a switch avoid?", ["Type checking", "Fall-through to the next case", "Returning a value", "Using enums"], 1, "Arrow-style switch rules do not fall through."),
  short("conditionals-and-switch", "Which Java keyword begins the fallback branch of an if chain?", "else", "else handles cases not matched by earlier conditions."),
  single("loops-and-iteration", "Which condition visits every index of an array named values exactly once?", ["i <= values.length", "i < values.length", "i > values.length", "i != 0"], 1, "The valid indexes are 0 through length - 1."),
  single("loops-and-iteration", "What does break do inside a loop?", ["Skips the current iteration", "Exits the nearest loop", "Restarts the program", "Closes the JVM"], 1, "break exits the nearest loop; continue skips to the next iteration."),
  single("methods-and-overloading", "Which change alone can create a method overload?", ["Change only the return type", "Change the parameter list", "Change only the method body", "Add a comment"], 1, "Overloads differ by parameter lists, not return types alone."),
  trueFalse("methods-and-overloading", "Java passes object references by reference.", false, "Java passes every argument by value; for objects, the copied value is a reference."),
  single("arrays-and-copying", "Which statement creates a copy of an int array?", ["int[] b = a;", "int[] b = Arrays.copyOf(a, a.length);", "int[] b = a.length;", "int[] b = copy(a);"], 1, "Arrays.copyOf copies the array elements into a new array."),
  single("arrays-and-copying", "What happens when code reads an invalid array index?", ["It returns null", "It wraps to index zero", "An index-out-of-bounds exception is thrown", "The array grows"], 2, "Array size is fixed and invalid indexing throws at runtime."),
  single("classes-and-encapsulation", "What is the main reason to make a field private?", ["To prevent all methods using it", "To protect invariants behind a class API", "To make the field static", "To store it on disk"], 1, "Encapsulation lets a class control how its state is observed and changed."),
  single("classes-and-encapsulation", "Which member belongs to each object instance?", ["An instance field", "A static field", "A package name", "A class literal"], 0, "Each object has its own instance fields; static fields belong to the class."),
  single("constructors-records-and-enums", "What does a record automatically provide?", ["A database table", "Accessors and value-based equals/hashCode", "A thread pool", "Mutable public fields"], 1, "Records generate accessors and value-oriented methods for their components."),
  trueFalse("constructors-records-and-enums", "A record is deeply immutable even if it contains a mutable List.", false, "Record components are final references, but referenced objects can still mutate."),
  single("inheritance-and-polymorphism", "How does Java choose an overridden instance method call?", ["By the variable's declared type only", "By the object's runtime class", "By alphabetical method name", "At random"], 1, "Dynamic dispatch selects the implementation for the runtime object's class."),
  single("inheritance-and-polymorphism", "What relationship is inheritance generally intended to model?", ["is-a", "has-a only", "writes-to", "runs-before"], 0, "Inheritance models an is-a subtype relationship; composition models has-a."),
  short("interfaces-and-sealed-types", "Which keyword declares a capability contract that classes can implement?", "interface", "An interface describes a contract that one or more classes can implement."),
  single("interfaces-and-sealed-types", "A permitted subtype of a sealed class must be which of these?", ["final, sealed, or non-sealed", "abstract only", "static only", "an enum only"], 0, "Java requires each direct permitted subtype to state whether extension is closed or open."),
  single("collections-list-set-map", "Which interface models unique elements?", ["List", "Set", "Queue only", "Map.Entry"], 1, "Set models uniqueness; List allows duplicates and Map stores key-value mappings."),
  single("collections-list-set-map", "What must hold for objects that are equal in a HashMap?", ["They must have the same identity", "They must have the same hash code", "They must be Strings", "Their hash codes must differ"], 1, "Equal objects must have equal hash codes for hash-based lookup to work correctly."),
  single("generics-and-wildcards", "Why is List<Integer> not a subtype of List<Number>?", ["Generics are invariant", "Integer is not a Number", "Lists cannot hold numbers", "The JVM has no heap"], 0, "Invariance prevents adding an arbitrary Number to a list intended to hold only Integers."),
  single("generics-and-wildcards", "For a parameter that produces T values for the caller, which bound is commonly useful?", ["? extends T", "? super T", "? == T", "? final T"], 0, "An extends wildcard lets the caller read produced values as T."),
  single("lambdas-and-functional-interfaces", "What does a Predicate<T> represent?", ["A function from T to boolean", "A function from void to T", "A mutable list", "A thread"], 0, "Predicate<T> tests a T and returns a boolean."),
  trueFalse("lambdas-and-functional-interfaces", "A lambda can capture and mutate any local variable in its enclosing method.", false, "Captured local variables must be final or effectively final."),
  single("streams-and-collectors", "Which stream operation triggers a pipeline and produces a result?", ["filter", "map", "count", "peek"], 2, "count is a terminal operation; filter and map are intermediate operations."),
  single("streams-and-collectors", "How many times should a stream generally be consumed?", ["Once", "Twice", "Any number", "Never"], 0, "A stream is intended for one pipeline consumption."),
  single("exceptions-and-error-design", "When should an exception generally be caught?", ["Where it can be handled or useful context can be added", "At every method regardless of action", "Only in constructors", "Never"], 0, "Catch at a boundary that can recover, translate, or add useful context."),
  single("exceptions-and-error-design", "Which is a common use for an unchecked exception?", ["An invalid method argument", "A required import", "A successful return", "A package declaration"], 0, "IllegalArgumentException is unchecked and commonly reports invalid input."),
  single("files-and-resource-management", "What does try-with-resources guarantee for AutoCloseable resources?", ["They close when the try exits", "They never throw", "They stay open forever", "They are encrypted"], 0, "Java closes resources at the end of the try, including exceptional exits."),
  single("files-and-resource-management", "Which charset should portable text files use when explicitly specified?", ["UTF-8", "Machine default only", "Binary32", "ASCII-only always"], 0, "UTF-8 is a portable explicit choice for text encoding."),
  single("optional-null-safety", "What does Optional.map do?", ["Transforms a present value", "Always throws", "Deletes a file", "Starts a thread"], 0, "map applies a transformation if a value is present and wraps the result."),
  trueFalse("optional-null-safety", "Optional.get() is safe to call without checking whether a value is present.", false, "get throws when empty; use map/orElse/orElseGet or explicitly check presence."),
  single("dates-and-regular-expressions", "Which java.time type represents a point on the UTC timeline?", ["LocalDate", "Instant", "Period", "Month"], 1, "Instant represents a point on the UTC timeline."),
  single("dates-and-regular-expressions", "Which Matcher method searches for a matching region inside input?", ["matches()", "find()", "parseAll()", "containsRegex()"], 1, "find searches for a matching subsequence; matches checks the entire input."),
  trueFalse("modern-java-language-features", "Java var makes a local variable dynamically typed.", false, "var infers a static type at compile time."),
  single("modern-java-language-features", "What should a team check before adopting a newer Java language feature?", ["The configured JDK and release level", "Only the developer's editor theme", "The operating system wallpaper", "The database row count"], 0, "The build and deployment JDK must support the language feature used."),
  single("packages-and-build-tools", "What does a Java build tool commonly automate?", ["Compilation, dependency resolution, and tests", "The JVM garbage collector only", "Database authorization only", "Changing source code into HTML"], 0, "Build tools provide repeatable compilation, dependency management, tests, and packaging."),
  trueFalse("packages-and-build-tools", "A project wrapper helps teammates use a consistent build-tool version.", true, "The Maven or Gradle wrapper pins and invokes the project's chosen build-tool version."),
  single("jdbc-and-safe-queries", "Which JDBC API should hold a user-supplied value in a SQL query?", ["PreparedStatement parameter", "String concatenation", "A comment", "A table name from request input"], 0, "Prepared statement parameters keep values separate from the SQL syntax."),
  trueFalse("jdbc-and-safe-queries", "Two related database writes can be committed or rolled back together in one transaction.", true, "A transaction groups writes into one atomic unit from the application's perspective."),
  single("threads-and-executors", "What does ExecutorService separate?", ["Task submission from thread management", "Java from SQL", "Fields from methods", "Source from comments"], 0, "Executors manage worker threads while callers submit tasks."),
  single("threads-and-executors", "What is a race condition?", ["A result that depends on unsynchronized operation timing", "A fast compiler", "A garbage collector", "A checked exception"], 0, "Unsynchronized access to shared state can produce timing-dependent results."),
  single("completable-future", "Which method chains a function that itself returns a CompletableFuture?", ["thenCompose", "thenApply", "toString", "hashCode"], 0, "thenCompose flattens an asynchronous stage that returns another future."),
  trueFalse("completable-future", "Calling CompletableFuture.join() blocks the current thread until completion.", true, "join waits for completion and throws an unchecked CompletionException on failure."),
  single("jvm-memory-and-garbage-collection", "When can a garbage collector reclaim an object?", ["When it is no longer reachable", "Immediately after every method", "Only after a manual delete call", "Never"], 0, "Reachability is the basis for reclaiming ordinary heap objects."),
  single("jvm-memory-and-garbage-collection", "What should you do before tuning garbage-collector flags?", ["Measure and profile a representative workload", "Guess based on class names", "Disable all tests", "Add static caches everywhere"], 0, "Measure first so tuning addresses a demonstrated bottleneck."),
  single("testing-with-junit", "What does the Arrange-Act-Assert test structure mean?", ["Set up, call behavior, verify result", "Compile, deploy, delete", "Sort, add, archive", "Authenticate, authorize, encrypt"], 0, "Arrange sets up inputs, Act invokes behavior, Assert checks the result."),
  single("testing-with-junit", "Which test is typically most stable under an internal refactor?", ["One checking public behavior", "One checking private variable names", "One relying on test order", "One requiring a live production database"], 0, "Tests should verify observable behavior rather than implementation details."),
  single("clean-design-and-patterns", "What does constructor dependency injection help achieve?", ["Separate policy from concrete dependencies", "Hide every class", "Avoid all interfaces", "Make methods static"], 0, "Passing collaborators makes dependencies explicit and simpler to substitute in tests."),
  single("clean-design-and-patterns", "When should a design pattern be introduced?", ["When it simplifies a real recurring design problem", "Whenever a pattern name is available", "Before understanding the requirements", "Only to increase class count"], 0, "Patterns are useful when they clarify a real trade-off, not as decoration."),
  multi("capstone-java-learning-tracker", "Which are sensible capstone milestones?", ["Model sessions and validate minutes", "Group totals by subject", "Test empty and invalid inputs", "Add unbounded shared mutable state first"], [0, 1, 2], "Start with a valid model, useful aggregation, and tests for boundary behavior."),
  short("capstone-java-learning-tracker", "Which Java API represents filesystem paths with the modern NIO API?", "path", "Path represents a filesystem path and works with java.nio.file.Files."),
];

function trueFalse(lessonSlug: string, prompt: string, answer: boolean, explanation: string): RawQuestion {
  return { kind: "true_false", lessonSlug, prompt, answer, explanation, difficulty: lessonDifficulty(lessonSlug) };
}

export const javaSubject: RawSubject = {
  slug: "java",
  title: "Java",
  description: "A structured path from your first Java program to object-oriented design, collections, concurrency, testing, and JVM fundamentals.",
  icon: "JV",
  colorHex: "#e76f00",
  level: "beginner",
  order: 6,
  modules: [
    { slug: "foundations", title: "1 · Java foundations", description: "The JDK, types, operators, and your first programs.", order: 1 },
    { slug: "control-flow", title: "2 · Control flow and methods", description: "Decisions, loops, and reusable methods.", order: 2 },
    { slug: "data-modeling", title: "3 · Arrays and data modeling", description: "Sequences, objects, constructors, and domain types.", order: 3 },
    { slug: "object-oriented-java", title: "4 · Object-oriented Java", description: "Encapsulation, polymorphism, interfaces, and sealed types.", order: 4 },
    { slug: "collections-generics", title: "5 · Collections and functional Java", description: "Collections, generics, lambdas, and streams.", order: 5 },
    { slug: "errors-and-io", title: "6 · Errors, files, and null safety", description: "Exceptions, resource management, and Optional.", order: 6 },
    { slug: "data-access", title: "7 · Database access", description: "JDBC, parameterized queries, and database transactions.", order: 7 },
    { slug: "modern-java", title: "8 · Modern Java and tooling", description: "Packages, builds, time, regular expressions, and modern language features.", order: 8 },
    { slug: "concurrency", title: "9 · Concurrency", description: "Threads, shared state, executors, and asynchronous composition.", order: 9 },
    { slug: "jvm-and-quality", title: "10 · JVM and software quality", description: "Memory, garbage collection, testing, and diagnosis.", order: 10 },
    { slug: "design-and-capstone", title: "11 · Design and capstone", description: "Maintainable architecture and an end-to-end learning tracker.", order: 11 },
  ],
  lessons,
  questions,
};
