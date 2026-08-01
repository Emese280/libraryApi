import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { CurrentUser } from "../App";
import { Button } from "../components/Button/Button";
import Input from "../components/Input/Input";

type BookSearchResult = {
  id: string;
  title: string;
  author: string;
  firstPublishYear: number | null;
  coverUrl: string | null;
  rating: number | null;
  ratingCount: number;
};


const featuredBooks = [
  {
    title: "The Midnight Library",
    author: "Matt Haig",
    status: "Available",
  },
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    status: "Borrowed",
  },
  {
    title: "Dune",
    author: "Frank Herbert",
    status: "Available",
  },
];

type HomeProps = {
  currentUser: CurrentUser | null;
  onLogout: () => void;
};

export default function Home({ currentUser, onLogout }: HomeProps) {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<BookSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      // Közvetlenül az Open Library nyilvános API-ját hívjuk meg
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query.trim())}`
      );

      if (!response.ok) {
        throw new Error("Book search failed on Open Library.");
      }

      const result = await response.json();

      // Az Open Library adatait átalakítjuk a BookSearchResult struktúrára
      const transformedBooks: BookSearchResult[] = (result.docs || []).slice(0, 20).map((doc: any) => ({
        id: doc.key, 
        title: doc.title,
        author: doc.author_name ? doc.author_name.join(", ") : "Unknown Author",
        firstPublishYear: doc.first_publish_year || null,
        coverUrl: doc.cover_i 
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` 
          : null,
        rating: doc.ratings_average || null,
        ratingCount: doc.ratings_count || 0,
      }));

      setBooks(transformedBooks);
      setTotal(result.numFound || 0);
      setStatus("success");
    } catch (error) {
      setBooks([]);
      setTotal(0);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Book search failed.");
    }
  }

  return (
    <main className="library-page">
      <header className="library-header">
        <div>
          <p className="eyebrow">Book Community</p>
          <h1>Library</h1>
        </div>
        {currentUser ? (
          <div className="header-actions">
            <span className="user-pill">{currentUser.name}</span>
            <Button className="button-secondary" onClick={onLogout}>
              Logout
            </Button>
          </div>
        ) : (
          <nav className="header-actions" aria-label="Account">
            <Link className="text-link" to="/login">
              Login
            </Link>
            <Link className="button button-secondary" to="/register">
              Register
            </Link>
          </nav>
        )}
      </header>

      <section className="search-panel" aria-label="Book search">
        <form className="book-search" onSubmit={handleSearch}>
          <Input
            type="search"
            placeholder="Search by title, author or ISBN"
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
          />
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Searching..." : "Search"}
          </Button>
        </form>
        <p>
          Results come from Open Library. Your own uploaded books and reviews can
          use your database later.
        </p>
      </section>

      {status === "error" && <p className="form-message error">{message}</p>}

      {status === "success" && (
        <section className="search-results" aria-label="Search results">
          <div className="section-heading">
            <h2>Search results</h2>
            <span>{total.toLocaleString()} matches</span>
          </div>

          <div className="book-grid">
            {books.map((book) => (
              <article className="result-card" key={book.id}>
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt="" />
                ) : (
                  <div className="cover-placeholder">No cover</div>
                )}
                <div>
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                  <span>
                    {book.firstPublishYear ? `${book.firstPublishYear}` : "Unknown year"}
                    {book.rating
                      ? ` · ${book.rating.toFixed(1)} stars (${book.ratingCount})`
                      : ""}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="library-toolbar" aria-label="Library summary">
        <div>
          <strong>{featuredBooks.length}</strong>
          <span>Featured books</span>
        </div>
        <div>
          <strong>
            {featuredBooks.filter((book) => book.status === "Available").length}
          </strong>
          <span>Available</span>
        </div>
      </section>

      <section className="book-list" aria-label="Featured books">
        {featuredBooks.map((book) => (
          <article className="book-card" key={book.title}>
            <div>
              <h2>{book.title}</h2>
              <p>{book.author}</p>
            </div>
            <span className={book.status === "Available" ? "status" : "status muted"}>
              {book.status}
            </span>
          </article>
        ))}
      </section>
    </main>
  );
}