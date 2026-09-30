import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  Plus,
  Receipt,
  Trash2,
  Users,
  X,
} from "lucide-react";
import "./styles.css";
type User = { id: string; name: string; initials: string; color: string };
type Expense = {
  id: string;
  paidBy: string;
  expenseFor: string;
  amount: number;
  description: string;
  date: string;
};
type Balance = { from: string; to: string; amount: number };
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
const date = (d: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(d));
function Avatar({ user, size = "md" }: { user: User; size?: "sm" | "md" }) {
  return (
    <span className={"avatar " + size} style={{ background: user.color }}>
      {user.initials}
    </span>
  );
}
export default function App() {
  const [users, setUsers] = useState<User[]>([]),
    [expenses, setExpenses] = useState<Expense[]>([]),
    [balances, setBalances] = useState<Balance[]>([]),
    [modal, setModal] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [form, setForm] = useState({
    paidBy: "",
    expenseFor: "",
    amount: "",
    description: "",
  });
  const user = (id: string) => users.find((u) => u.id === id)!;
  const refresh = async () => {
    setLoading(true);
    const [u, e, b] = await Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/expenses").then((r) => r.json()),
      fetch("/api/balances").then((r) => r.json()),
    ]);
    setUsers(u);
    setExpenses(e);
    setBalances(b);
    if (!form.paidBy && u[0])
      setForm((f) => ({
        ...f,
        paidBy: u[0].id,
        expenseFor: u[1]?.id || u[0].id,
      }));
    setLoading(false);
  };
  useEffect(() => {
    refresh().catch(() =>
      setError("Could not connect to the API. Start the server and refresh."),
    );
  }, []);
  const total = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses],
  );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Unable to add expense");
      return;
    }
    setModal(false);
    setForm((f) => ({ ...f, amount: "", description: "" }));
    refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await fetch("/api/expenses/" + id, { method: "DELETE" });
    refresh();
  };
  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="logo">
            <CircleDollarSign size={22} />
          </div>
          <div>
            <h1>Splitwise</h1>
            <span>Shared expenses, simplified</span>
          </div>
        </div>
        <button className="primary" onClick={() => setModal(true)}>
          <Plus size={18} /> Add expense
        </button>
      </header>
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">YOUR GROUP</p>
            <h2>
              Good morning, team <span>✦</span>
            </h2>
            <p className="sub">
              Keep tabs on shared spending without the spreadsheet.
            </p>
          </div>
          <div className="stat">
            <span>Total tracked</span>
            <strong>{money(total)}</strong>
            <small>
              <Receipt size={14} /> {expenses.length} expenses
            </small>
          </div>
        </section>
        {error && <div className="error">{error}</div>}
        <div className="grid">
          <section className="panel expenses">
            <div className="panelhead">
              <div>
                <h3>Expenses</h3>
                <p>Every transaction in your group</p>
              </div>
              <span className="count">{expenses.length}</span>
            </div>
            <div className="list">
              {loading ? (
                <div className="empty">Loading expenses…</div>
              ) : expenses.length === 0 ? (
                <div className="empty">
                  No expenses yet. Add your first one.
                </div>
              ) : (
                expenses.map((e) => (
                  <article className="expense" key={e.id}>
                    <div className="expenseicon">
                      <Receipt size={18} />
                    </div>
                    <div className="expbody">
                      <div className="exptitle">
                        <strong>{e.description}</strong>
                        <span>{money(e.amount)}</span>
                      </div>
                      <div className="meta">
                        <span>
                          <Avatar user={user(e.paidBy)} size="sm" />
                          {user(e.paidBy).name} paid
                        </span>
                        <ArrowDownLeft size={14} />
                        <span>
                          <Avatar user={user(e.expenseFor)} size="sm" />
                          {user(e.expenseFor).name}
                        </span>
                        <span className="date">
                          <CalendarDays size={13} />
                          {date(e.date)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="iconbtn"
                      onClick={() => remove(e.id)}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
          <section className="panel balances">
            <div className="panelhead">
              <div>
                <h3>Balances</h3>
                <p>Net amounts between everyone</p>
              </div>
              <span className="live">
                <i /> Live
              </span>
            </div>
            <div className="balanceintro">
              <Users size={18} />
              <span>Settled pair by pair, so you only see what matters.</span>
            </div>
            <div className="balancelist">
              {loading ? (
                <div className="empty">Calculating balances…</div>
              ) : balances.length === 0 ? (
                <div className="settled">
                  <Check size={22} />
                  <strong>All settled up!</strong>
                  <span>No outstanding balances.</span>
                </div>
              ) : (
                balances.map((b, i) => (
                  <div className="balance" key={i}>
                    <Avatar user={user(b.from)} />
                    <div className="balancecopy">
                      <strong>{user(b.from).name}</strong>
                      <span>owes</span>
                      <strong>{user(b.to).name}</strong>
                    </div>
                    <div className="balanceamount">
                      <ArrowUpRight size={15} />
                      {money(b.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
        <footer>
          <Clock3 size={14} /> Changes are saved automatically <span>•</span>{" "}
          {users.length} people in this group
        </footer>
      </main>
      {modal && (
        <div
          className="overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setModal(false)}
        >
          <div className="modal">
            <div className="modalhead">
              <div>
                <p className="eyebrow">NEW TRANSACTION</p>
                <h3>Add an expense</h3>
                <p>Record who paid and who owes them.</p>
              </div>
              <button className="close" onClick={() => setModal(false)}>
                <X />
              </button>
            </div>
            <form onSubmit={submit}>
              <label>
                Paid by
                <select
                  value={form.paidBy}
                  onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Expense for
                <select
                  value={form.expenseFor}
                  onChange={(e) =>
                    setForm({ ...form, expenseFor: e.target.value })
                  }
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Amount
                <div className="inputmoney">
                  <span>$</span>
                  <input
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                  />
                </div>
              </label>
              <label>
                Description
                <input
                  required
                  placeholder="e.g. Dinner, hotel, groceries"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              {error && <div className="formerror">{error}</div>}
              <div className="modalactions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setModal(false)}
                >
                  Cancel
                </button>
                <button className="primary" type="submit">
                  <Check size={17} /> Save expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
