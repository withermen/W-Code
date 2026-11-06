<?php
// Simple PHP example: user list with SQLite
$db = new SQLite3('users.db');
$db->exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['name'])) {
    $stmt = $db->prepare('INSERT INTO users (name, email) VALUES (:name, :email)');
    $stmt->bindValue(':name', $_POST['name']);
    $stmt->bindValue(':email', $_POST['email'] ?? '');
    $stmt->execute();
}

$users = $db->query('SELECT * FROM users ORDER BY id DESC');
?>
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Users</title>
  <link rel="stylesheet" href="../design-system/tokens.css">
  <style>
    body { background: var(--bg); color: var(--text); font-family: var(--font-sans); padding: var(--space-8); }
    form { margin-bottom: var(--space-6); }
    input { padding: var(--space-2); margin-right: var(--space-2); background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: var(--radius-md); }
    button { background: var(--primary); color: white; border: none; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); cursor: pointer; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: var(--space-3); border-bottom: 1px solid var(--border); text-align: left; }
  </style>
</head>
<body>
  <h1>Users</h1>
  <form method="post">
    <input name="name" placeholder="Name" required>
    <input name="email" placeholder="Email">
    <button type="submit">Add</button>
  </form>
  <table>
    <tr><th>ID</th><th>Name</th><th>Email</th></tr>
    <?php while ($row = $users->fetchArray(SQLITE3_ASSOC)): ?>
      <tr>
        <td><?= htmlspecialchars($row['id']) ?></td>
        <td><?= htmlspecialchars($row['name']) ?></td>
        <td><?= htmlspecialchars($row['email']) ?></td>
      </tr>
    <?php endwhile; ?>
  </table>
</body>
</html>
