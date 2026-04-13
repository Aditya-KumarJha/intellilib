import type { MyBookIssue, MyBookIssueRow, MyBooksStats } from "@/components/dashboard/user/my-books/types";

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function mapMyBookIssueRow(row: MyBookIssueRow): MyBookIssue | null {
  const copy = pickOne(row.book_copies);
  if (!copy) return null;

  const book = pickOne(copy.books);
  if (!book) return null;

  return {
    id: row.id,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    returnDate: row.return_date,
    status: row.status,
    fineAmount: row.fine_amount ?? 0,
    copyType: copy.type,
    copyStatus: copy.status,
    location: copy.location,
    accessUrl: copy.access_url,
    book: {
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.cover_url,
      publisher: book.publisher,
      publishedYear: book.published_year,
      type: book.type,
    },
  };
}

export function getIssueVisualStatus(issue: MyBookIssue): "issued" | "returned" | "overdue" {
  if (issue.returnDate) return "returned";

  const now = Date.now();
  const due = issue.dueDate ? new Date(issue.dueDate).getTime() : null;
  if (issue.status === "overdue") return "overdue";
  if (due && due < now) return "overdue";

  return "issued";
}

export function getDaysLabel(issue: MyBookIssue): string {
  if (!issue.dueDate) return "No due date";
  if (issue.returnDate) return "Returned";

  const due = new Date(issue.dueDate).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  return `${diffDays}d left`;
}

export function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
  } catch (e) {
    return `Rs. ${Math.round(value)}`;
  }
}

export function buildMyBooksStats(issues: MyBookIssue[]): MyBooksStats {
  return issues.reduce<MyBooksStats>(
    (acc, issue) => {
      const status = getIssueVisualStatus(issue);
      if (status === "issued") acc.activeCount += 1;
      if (status === "overdue") {
        acc.overdueCount += 1;
        acc.dueFineAmount += issue.fineAmount;
      }
      if (status === "returned") acc.returnedCount += 1;
      return acc;
    },
    {
      activeCount: 0,
      overdueCount: 0,
      returnedCount: 0,
      dueFineAmount: 0,
    }
  );
}
