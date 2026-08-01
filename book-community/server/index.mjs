import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
const dbPath = join(dataDir, "library.sqlite");
const port = Number(process.env.PORT ?? 3001);

mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");

  return {
    passwordHash,
    salt,
  };
}

function verifyPassword(password, storedHash, storedSalt) {
  const passwordHash = scryptSync(password, storedSalt, 64);
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (passwordHash.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(passwordHash, storedHashBuffer);
}

function seedTemporaryUser() {
  const email = "demo@library.test";
  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);

  if (existingUser) {
    return;
  }

  const { passwordHash, salt } = hashPassword("demo12345");
  db.prepare(`
    INSERT INTO users (name, email, password_hash, password_salt)
    VALUES (?, ?, ?, ?)
  `).run("Demo User", email, passwordHash, salt);
}

seedTemporaryUser();

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function register(request, response) {
  let body;

  try {
    body = await readJson(request);
  } catch {
    sendJson(response, 400, { message: "Invalid JSON." });
    return;
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name || !email || password.length < 8) {
    sendJson(response, 400, {
      message: "Name, email and an at least 8 character password are required.",
    });
    return;
  }

  const { passwordHash, salt } = hashPassword(password);

  try {
    const statement = db.prepare(`
      INSERT INTO users (name, email, password_hash, password_salt)
      VALUES (?, ?, ?, ?)
    `);
    statement.run(name, email, passwordHash, salt);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      sendJson(response, 409, { message: "This email is already registered." });
      return;
    }

    sendJson(response, 500, { message: "Could not create user." });
    return;
  }

  sendJson(response, 201, { message: "User created." });
}

async function login(request, response) {
  let body;

  try {
    body = await readJson(request);
  } catch {
    sendJson(response, 400, { message: "Invalid JSON." });
    return;
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    sendJson(response, 400, { message: "Email and password are required." });
    return;
  }

  const user = db
    .prepare(
      `
      SELECT id, name, email, password_hash, password_salt
      FROM users
      WHERE email = ?
    `,
    )
    .get(email);

  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    sendJson(response, 401, { message: "Invalid email or password." });
    return;
  }

  sendJson(response, 200, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
}

async function searchBooks(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const query = url.searchParams.get("q")?.trim();

  if (!query) {
    sendJson(response, 400, { message: "Search query is required." });
    return;
  }

  const searchUrl = new URL("https://openlibrary.org/search.json");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("limit", "12");
  searchUrl.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i,ratings_average,ratings_count",
  );

  try {
    const openLibraryResponse = await fetch(searchUrl);

    if (!openLibraryResponse.ok) {
      sendJson(response, 502, { message: "Book search is temporarily unavailable." });
      return;
    }

    const data = await openLibraryResponse.json();
    const books = data.docs.map((book) => ({
      id: book.key,
      title: book.title,
      author: book.author_name?.join(", ") ?? "Unknown author",
      firstPublishYear: book.first_publish_year ?? null,
      coverUrl: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : null,
      rating: book.ratings_average ?? null,
      ratingCount: book.ratings_count ?? 0,
    }));

    sendJson(response, 200, {
      total: data.numFound ?? 0,
      books,
    });
  } catch {
    sendJson(response, 502, { message: "Book search is temporarily unavailable." });
  }
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "POST" && request.url === "/api/register") {
    await register(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/login") {
    await login(request, response);
    return;
  }

  if (request.method === "GET" && request.url?.startsWith("/api/books/search")) {
    await searchBooks(request, response);
    return;
  }

  sendJson(response, 404, { message: "Not found." });
});

server.listen(port, () => {
  console.log(`API server running on http://127.0.0.1:${port}`);
});
