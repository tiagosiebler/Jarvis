# Restoring the DB Schema

1. First, log in to the database as root or another user with sufficient privileges to create new databases:

`mysql -u root -p`

This will bring you into the MySQL shell prompt.

1. Next, create a new database with the following command. In this example, the new database is called `JarvisDB`:

`CREATE DATABASE JarvisDB;`

You'll see this output confirming that it was created.
`Query OK, 1 row affected (0.00 sec)`

1. Then exit the MySQL shell by pressing CTRL+D. From the normal command line, you can import the dump file with the following command:

`mysql -u root -p JarvisDB < ./_notes/sql/JarvisDB_skeleton.sql`

# Confirming successful restore

1. Log into the database as your user:
`mysql -u root -p JarvisDB`

1. Print out a list of tables:
`show tables;`

You'll see this output conirming that all tables were successfully created:
```
mysql> show tables;
+---------------------+
| Tables_in_jarvisdb2 |
+---------------------+
| lu_slack_channels   |
| lu_slack_users      |
| rob                 |
| sf_auth             |
| slack_threads       |
| stats_posts         |
| test1               |
+---------------------+
7 rows in set (0.00 sec)
```