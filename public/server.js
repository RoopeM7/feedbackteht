import express from "express"; // localhost:3000/feedback on PÄÄSIVU // ei periaatteessa ole väliä loppujen lopuksi mutta silti..
import path from "path";
import mysql from "mysql2/promise";
import session from "express-session";
import { fileURLToPath } from "url";
const port = 3000;
const host = "localhost";

const dbHost = "localhost";
const dbName = "feedback_support";
const dbUser = "root";
const dbPwd = "";

const app = express();
app.set("view engine", "ejs");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);
function checkAuth(req, res, next) {
  if (!req.session.user && req.path !== "/login") {
    return res.redirect("/login");
  }
  next();
}

app.use(checkAuth);
//tähän teen koko kirjautumishoidon..
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { identifier } = req.body;

  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    const [rows] = await connection.execute(
      "SELECT * FROM system_user WHERE id = ? OR email = ?",
      [identifier, identifier]
    );

    if (rows.length > 0) {
      const user = rows[0];
      if (user.admin == 1) {
        req.session.user = {
          id: user.id,
          email: user.email,
          fullname: user.fullname,
        };
        return res.redirect("/feedback");
      }
    }

    res.status(401).send("VÄÄRÄ TUNNUS!!");
  } catch (err) {
    console.error("Tietokantavirhe:", err);
    res.status(500).send("Sisäinen palvelinvirhe");
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});
//tähän loppuu kokokirjautumissivu hommeli..

// LOGOUT KOHTA ALKAA
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
}); // LOGOUT KOHTA LOPPUU

//CUSTOMERS
app.get("/customer", checkAuth, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    const [rows] = await connection.execute("SELECT * FROM customer");
    const [users] = await connection.execute("SELECT * FROM `system_user`");

    res.render("customer", {
      customers: rows,
      users: users,
      user: req.session.user,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error("Error closing connection:", closeError);
      }
    }
  }
}); //CUSTOMERS LOPPUU
// SUPPORT ALKAA
app.get("/support", checkAuth, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    const [rows] = await connection.execute(
      "SELECT support_ticket.id, support_ticket.arrived, customer.name, support_ticket.description, ticket_status.description as status, support_ticket.handled FROM support_ticket join customer on support_ticket.customer_id = customer.id join ticket_status on support_ticket.status = ticket_status.id"
    );
    res.render("support", {
      support: rows,
      user: req.session.user,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error("Error closing connection:", closeError);
      }
    }
  }
}); // SUPPORT LOPPUU
// FEEDBACK ALKAA
app.get("/feedback", checkAuth, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    const [rows] = await connection.execute("SELECT * FROM feedback");

    res.render("feedback", {
      feedback: rows,
      user: req.session.user,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});
//FEEDBACK LOPPUU

//suppportticket
app.get("/supportticket/:id", async (req, res) => {
  const id = req.params.id;
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    const [message] = await connection.execute(
      "SELECT created_at, system_user.fullname, support_message.body FROM support_message join system_user on support_message.from_user = system_user.id where ticket_id = ?",
      [id]
    );
    const [ticket] = await connection.execute(
      "SELECT support_ticket.id, customer.name, ticket_status.description as status, support_ticket.arrived, support_ticket.handled, support_ticket.description FROM support_ticket join customer on support_ticket.customer_id = customer.id join ticket_status on support_ticket.status = ticket_status.id where support_ticket.id = ?",
      [id]
    );

    const [statuses] = await connection.execute(
      "SELECT id, description FROM ticket_status"
    );

    res.render("supportticket", {
      supportticket: message,
      ticket: ticket[0],
      statuses: statuses, //lisätty 10.3 3 tehtävää varten
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error("Error closing connection:", closeError);
      }
    }
  }
});
//supportticket loppuu

//viesti
app.post("/sendMessage", async (req, res) => {
  const { ticket_id, from_user, message } = req.body;

  if (!ticket_id || !message || !from_user) {
    return res
      .status(400)
      .send("Virhe: Tukipyynnön ID, käyttäjä ja viesti vaaditaan.");
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    await connection.execute(
      "INSERT INTO support_message (ticket_id, from_user, body, created_at, reply_to) VALUES (?, ?, ?, NOW(), NULL)",
      [ticket_id, from_user, message]
    );

    res.redirect(`/supportticket/${ticket_id}`);
  } catch (err) {
    console.error("Tietokantavirhe:", err);
    res.status(500).send("Virhe tietokantaan tallennuksessa.");
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}); //viesti kohta loppuu

//UpdateTicketstatus kohta alkaa
app.post("/updateTicketStatus", async (req, res) => {
  const { status, ticket_id } = req.body;

  if (!status || !ticket_id) {
    return res.status(400).send("Virhe: Tila ja tukipyynnön ID vaaditaan.");
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    let query, params;

    if (status === "4") {
      query =
        "UPDATE support_ticket SET status = ?, handled = CURRENT_TIMESTAMP WHERE id = ?";
      params = [status, ticket_id];
    } else {
      query = "UPDATE support_ticket SET status = ? WHERE id = ?";
      params = [status, ticket_id];
    }

    await connection.execute(query, params);

    res.redirect(`/supportticket/${ticket_id}`);
  } catch (err) {
    console.error("Tietokantavirhe:", err);
    res.status(500).send("Virhe tietokannan päivityksessä.");
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});
// update ticketstatus loppuu

app.listen(port, host, () => {
  console.log(`${host}:${port} kuuntelee...`);
});
