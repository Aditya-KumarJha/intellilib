export type MyBookIssueRow = {
  id: number;
  issue_date: string | null;
  due_date: string | null;
  return_date: string | null;
  status: "issued" | "returned" | "overdue";
  fine_amount: number | null;
  book_copies:
    | {
        id: number;
        type: "physical" | "digital";
        status: string;
        location: string | null;
        access_url: string | null;
        books:
          | {
              id: number;
              title: string;
              author: string;
              cover_url: string | null;
              publisher: string | null;
              published_year: number | null;
              type: "physical" | "digital" | "both";
            }
          | Array<{
              id: number;
              title: string;
              author: string;
              cover_url: string | null;
              publisher: string | null;
              published_year: number | null;
              type: "physical" | "digital" | "both";
            }>
          | null;
      }
    | Array<{
        id: number;
        type: "physical" | "digital";
        status: string;
        location: string | null;
        access_url: string | null;
        books:
          | {
              id: number;
              title: string;
              author: string;
              cover_url: string | null;
              publisher: string | null;
              published_year: number | null;
              type: "physical" | "digital" | "both";
            }
          | Array<{
              id: number;
              title: string;
              author: string;
              cover_url: string | null;
              publisher: string | null;
              published_year: number | null;
              type: "physical" | "digital" | "both";
            }>
          | null;
      }>
    | null;
};

export type MyBookIssue = {
  id: number;
  issueDate: string | null;
  dueDate: string | null;
  returnDate: string | null;
  status: "issued" | "returned" | "overdue";
  fineAmount: number;
  finePaid?: boolean;
  finePaidAt?: string | null;
  copyType: "physical" | "digital";
  copyStatus: string;
  location: string | null;
  accessUrl: string | null;
  book: {
    id: number;
    title: string;
    author: string;
    coverUrl: string | null;
    publisher: string | null;
    publishedYear: number | null;
    type: "physical" | "digital" | "both";
  };
};

export type MyBooksStats = {
  activeCount: number;
  overdueCount: number;
  returnedCount: number;
  dueFineAmount: number;
};
